import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const SCRAPER_API = process.env.VALIDACAO_EAN_URL || 'https://validacao-ean-cwrd.onrender.com'
const BATCH_SIZE = 5

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { catalogo_id, offset = 0 } = body

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

    // Get next batch
    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('id, ean, nome')
      .eq('catalogo_id', catalogo_id)
      .eq('ativo', true)
      .is('imagem_url', null)
      .not('ean', 'is', null)
      .order('id', { ascending: true })
      .range(0, BATCH_SIZE - 1)

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
      try {
        const res = await fetch(`${SCRAPER_API}/scraper/buscar_imagem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ean: item.ean, nome: item.nome || '' }),
        })

        if (!res.ok) continue

        const data = await res.json()
        if (!data.success || !data.image_url) continue

        // Download image
        const imgRes = await fetch(data.image_url)
        if (!imgRes.ok) continue

        const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
        if (imgBuffer.length < 5000) continue

        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
        const storagePath = `${catalogo_id}/${item.ean}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('catalogo-imagens')
          .upload(storagePath, imgBuffer, { contentType, upsert: true })

        if (uploadError) continue

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
      } catch {
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

    return NextResponse.json({
      done: (remaining || 0) === 0,
      processed: itens.length,
      com_imagem: comImagem,
      total_sem_imagem: totalSemImagem || 0,
      remaining: remaining || 0,
    })
  } catch (error) {
    console.error('Erro processar imagens:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
