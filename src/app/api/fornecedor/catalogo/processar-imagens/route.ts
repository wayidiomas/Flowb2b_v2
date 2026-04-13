import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import sharp from 'sharp'

const SCRAPER_API = process.env.VALIDACAO_EAN_URL || 'https://validacao-ean-cwrd.onrender.com'
const BATCH_SIZE = 1
const SCRAPER_TIMEOUT_MS = 90_000

export const maxDuration = 300

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { catalogo_id, offset = 0 } = body
    console.log(`[IMG] chunk catalogo=${catalogo_id} offset=${offset}`)

    if (!catalogo_id) {
      return NextResponse.json({ error: 'catalogo_id obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // Verify ownership
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('id', catalogo_id)
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
    }

    // Count total without image that have EAN
    const { count: totalSemImagem } = await supabase
      .from('catalogo_itens')
      .select('id', { count: 'exact', head: true })
      .eq('catalogo_id', catalogo_id)
      .eq('ativo', true)
      .is('imagem_url', null)
      .not('ean', 'is', null)

    // Get next batch - usa offset passado pelo client pra avancar
    // (produtos nao encontrados continuam com imagem_url=null, entao
    // sem offset daria loop no mesmo item)
    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('id, ean, nome')
      .eq('catalogo_id', catalogo_id)
      .eq('ativo', true)
      .is('imagem_url', null)
      .not('ean', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (!itens || itens.length === 0) {
      return NextResponse.json({
        done: true,
        processed: 0,
        total_sem_imagem: 0,
        com_imagem: 0,
      })
    }

    // Process each item via scraper API
    let comImagem = 0
    for (const item of itens) {
      console.log(`[IMG] start ${item.ean} (${item.nome?.substring(0, 40)})`)
      const startTs = Date.now()
      try {
        const res = await fetchWithTimeout(`${SCRAPER_API}/scraper/buscar_imagem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ean: item.ean, nome: item.nome || '' }),
        }, SCRAPER_TIMEOUT_MS)

        if (!res.ok) { console.log(`[IMG] ${item.ean} scraper HTTP ${res.status}`); continue }

        const data = await res.json()
        const elapsed = Math.round((Date.now() - startTs) / 1000)
        if (!data.success || !data.image_url) { console.log(`[IMG] ${item.ean} not found in ${elapsed}s (source: ${data.source || 'none'})`); continue }

        console.log(`[IMG] ${item.ean} found on ${data.source}: ${data.image_url.substring(0, 80)}`)

        // Whitelist: aceitar somente jpg/jpeg/png/webp
        const imgUrl: string = data.image_url
        const imgLower = imgUrl.toLowerCase().split('?')[0]
        const formatosAceitos = ['.jpg', '.jpeg', '.png', '.webp']
        if (!formatosAceitos.some(ext => imgLower.endsWith(ext))) {
          console.log(`[IMG] ${item.ean} formato nao suportado: ${imgUrl.substring(0, 80)}`)
          continue
        }
        if (imgLower.includes('icon') || imgLower.includes('logo') || imgLower.includes('/sprite')) {
          console.log(`[IMG] ${item.ean} icone/logo descartado: ${imgUrl.substring(0, 60)}`)
          continue
        }

        // Download image
        const imgRes = await fetch(imgUrl)
        if (!imgRes.ok) { console.log(`[IMG] ${item.ean} download failed: ${imgRes.status}`); continue }

        const rawBuffer = Buffer.from(await imgRes.arrayBuffer())
        if (rawBuffer.length < 5000) { console.log(`[IMG] ${item.ean} too small: ${rawBuffer.length} bytes`); continue }

        // Resize to max 800x800 and convert to JPEG
        const imgBuffer = await sharp(rawBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer()

        const storagePath = `${catalogo_id}/${item.ean}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('catalogo-imagens')
          .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: true })

        if (uploadError) { console.log(`[IMG] ${item.ean} upload error:`, uploadError.message); continue }

        const { data: publicUrl } = supabase.storage
          .from('catalogo-imagens')
          .getPublicUrl(storagePath)

        if (publicUrl?.publicUrl) {
          await supabase
            .from('catalogo_itens')
            .update({ imagem_url: publicUrl.publicUrl })
            .eq('id', item.id)
          comImagem++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`[IMG] ${item.ean} ERROR: ${msg}`)
        continue
      }
    }

    // Recount remaining
    const { count: remaining } = await supabase
      .from('catalogo_itens')
      .select('id', { count: 'exact', head: true })
      .eq('catalogo_id', catalogo_id)
      .eq('ativo', true)
      .is('imagem_url', null)
      .not('ean', 'is', null)

    // Proximo offset: avanca pelos produtos NAO encontrados, mantem no 0 pros encontrados
    // (quando um eh achado, imagem_url deixa de ser null e sai da query, entao offset nao precisa mudar)
    const nextOffset = offset + (itens.length - comImagem)

    return NextResponse.json({
      done: (remaining || 0) === 0 || itens.length === 0,
      processed: itens.length,
      com_imagem: comImagem,
      total_sem_imagem: totalSemImagem || 0,
      remaining: remaining || 0,
      next_offset: nextOffset,
    })
  } catch (error) {
    console.error('Erro processar imagens:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
