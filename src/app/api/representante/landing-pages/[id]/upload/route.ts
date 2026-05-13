import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

async function resolveLpForRepresentante(lpId: number) {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
    return { error: NextResponse.json({ error: 'Nao autenticado' }, { status: 401 }) }
  }

  const supabase = createServerSupabaseClient()

  const { data: representantes } = await supabase
    .from('representantes')
    .select('id')
    .eq('user_representante_id', user.representanteUserId)
    .eq('ativo', true)

  const representanteIds = (representantes || []).map(r => r.id)
  if (representanteIds.length === 0) {
    return { error: NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 }) }
  }

  const { data: lp } = await supabase
    .from('landing_pages_representante')
    .select('id, slug, representante_id, logo_url, banner_url')
    .eq('id', lpId)
    .maybeSingle()

  if (!lp || !representanteIds.includes(lp.representante_id)) {
    return { error: NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 }) }
  }

  return { supabase, lp }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const ctx = await resolveLpForRepresentante(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase, lp } = ctx

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const ts = Date.now()
    const path = `rep/${lp.slug}/${kind}-${ts}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage
      .from('lp-assets')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) {
      console.error('Erro upload (rep):', uploadErr)
      return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from('lp-assets').getPublicUrl(path)
    const publicUrl = pub.publicUrl

    const updates = kind === 'logo' ? { logo_url: publicUrl } : { banner_url: publicUrl }
    const { error: updErr } = await supabase
      .from('landing_pages_representante')
      .update(updates)
      .eq('id', lpId)

    if (updErr) {
      console.error('Erro update LP rep:', updErr)
      return NextResponse.json({ error: 'Upload OK mas erro ao salvar URL' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl, kind })
  } catch (error) {
    console.error('Erro em POST upload (rep):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lpId = Number(id)
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') || 'logo'

    if (!['logo', 'banner'].includes(kind)) {
      return NextResponse.json({ error: 'kind invalido' }, { status: 400 })
    }

    const ctx = await resolveLpForRepresentante(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase, lp } = ctx

    const url = kind === 'logo' ? lp.logo_url : lp.banner_url
    if (url) {
      const match = url.match(/\/lp-assets\/(.+)$/)
      if (match?.[1]) {
        await supabase.storage.from('lp-assets').remove([match[1]])
      }
    }

    const updates = kind === 'logo' ? { logo_url: null } : { banner_url: null }
    await supabase.from('landing_pages_representante').update(updates).eq('id', lpId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em DELETE upload (rep):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
