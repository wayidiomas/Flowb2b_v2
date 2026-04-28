import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

/**
 * POST /api/fornecedor/landing-pages/[id]/upload
 *
 * multipart/form-data:
 *   - file (image/*, max 2MB)
 *   - kind = 'logo' | 'banner'
 *
 * Salva em bucket lp-assets/{slug}/{kind}-{timestamp}.{ext} e
 * atualiza logo_url ou banner_url. Retorna a public URL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const kind = (formData.get('kind') as string) || 'logo'

    if (!file) return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    if (!['logo', 'banner'].includes(kind)) {
      return NextResponse.json({ error: 'kind invalido' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato invalido (use PNG, JPG, WEBP ou SVG)' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo maior que 2MB' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)

    // Valida ownership
    const { data: lp } = await supabase
      .from('landing_pages_fornecedor')
      .select(`id, slug, fornecedor:fornecedor_id (cnpj)`)
      .eq('id', lpId)
      .is('deletada_em', null)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fornCnpj = (lp as any)?.fornecedor?.cnpj
    if (!lp || fornCnpj !== cnpjFornecedor) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    // Upload
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const ts = Date.now()
    const path = `${lp.slug}/${kind}-${ts}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage
      .from('lp-assets')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) {
      console.error('Erro upload:', uploadErr)
      return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from('lp-assets').getPublicUrl(path)
    const publicUrl = pub.publicUrl

    // Atualiza coluna correspondente
    const updates = kind === 'logo'
      ? { logo_url: publicUrl }
      : { banner_url: publicUrl }

    const { error: updErr } = await supabase
      .from('landing_pages_fornecedor')
      .update(updates)
      .eq('id', lpId)

    if (updErr) {
      console.error('Erro update LP:', updErr)
      return NextResponse.json({ error: 'Upload OK mas erro ao salvar URL' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl, kind })
  } catch (error) {
    console.error('Erro em POST upload:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/fornecedor/landing-pages/[id]/upload?kind=logo|banner
 * Remove o arquivo e zera a coluna.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const lpId = Number(id)
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') || 'logo'

    if (!['logo', 'banner'].includes(kind)) {
      return NextResponse.json({ error: 'kind invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)

    const { data: lp } = await supabase
      .from('landing_pages_fornecedor')
      .select(`id, slug, logo_url, banner_url, fornecedor:fornecedor_id (cnpj)`)
      .eq('id', lpId)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fornCnpj = (lp as any)?.fornecedor?.cnpj
    if (!lp || fornCnpj !== cnpjFornecedor) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    const url = kind === 'logo' ? lp.logo_url : lp.banner_url
    if (url) {
      // Extrai path do url publico
      const match = url.match(/\/lp-assets\/(.+)$/)
      if (match?.[1]) {
        await supabase.storage.from('lp-assets').remove([match[1]])
      }
    }

    const updates = kind === 'logo' ? { logo_url: null } : { banner_url: null }
    await supabase.from('landing_pages_fornecedor').update(updates).eq('id', lpId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em DELETE upload:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
