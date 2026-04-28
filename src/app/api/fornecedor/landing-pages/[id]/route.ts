import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'
import { slugify } from '@/lib/lp-helpers'
import type { UpdateLpRequest } from '@/types/landing-page'

async function authorizeOwnership(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  cnpj: string,
  lpId: number
) {
  const { data: lp } = await supabase
    .from('landing_pages_fornecedor')
    .select(`
      *,
      fornecedor:fornecedor_id (id, cnpj)
    `)
    .eq('id', lpId)
    .is('deletada_em', null)
    .maybeSingle()

  if (!lp) return { lp: null, allowed: false as const }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fornCnpj = (lp as any).fornecedor?.cnpj
  if (fornCnpj !== cnpj) return { lp, allowed: false as const }
  return { lp, allowed: true as const }
}

// ─── GET: Detalhe da LP (do owner) ───────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)
    const { lp, allowed } = await authorizeOwnership(supabase, cnpjFornecedor, lpId)
    if (!lp || !allowed) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    // Carrega produtos selecionados (se modo='selecao')
    const { data: pivots } = await supabase
      .from('landing_page_produtos')
      .select('produto_id, ordem, preco_override, destaque')
      .eq('landing_page_id', lpId)
      .order('ordem', { ascending: true })

    return NextResponse.json({ landing_page: lp, produtos: pivots || [] })
  } catch (error) {
    console.error('Erro em GET /api/fornecedor/landing-pages/[id]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── PUT: Atualiza LP ────────────────────────────────────────────────────────
export async function PUT(
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
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const body = (await request.json()) as UpdateLpRequest
    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)
    const { lp, allowed } = await authorizeOwnership(supabase, cnpjFornecedor, lpId)
    if (!lp || !allowed) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    // Validacoes
    if (body.cor_marca && !/^#[0-9A-Fa-f]{6}$/.test(body.cor_marca)) {
      return NextResponse.json({ error: 'cor_marca invalida (use #RRGGBB)' }, { status: 400 })
    }
    if (body.modo && !['todos', 'comprados', 'selecao'].includes(body.modo)) {
      return NextResponse.json({ error: 'Modo invalido' }, { status: 400 })
    }
    if (body.modo === 'selecao' && (!body.produtos_ids || body.produtos_ids.length === 0)) {
      return NextResponse.json({ error: 'Selecione ao menos um produto' }, { status: 400 })
    }

    // Update LP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}
    if (body.nome !== undefined) updates.nome = body.nome.trim()
    if (body.modo !== undefined) updates.modo = body.modo
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url || null
    if (body.banner_url !== undefined) updates.banner_url = body.banner_url || null
    if (body.hero_titulo !== undefined) updates.hero_titulo = body.hero_titulo?.trim() || null
    if (body.hero_subtitulo !== undefined) updates.hero_subtitulo = body.hero_subtitulo?.trim() || null
    if (body.descricao !== undefined) updates.descricao = body.descricao?.trim() || null
    if (body.whatsapp_contato !== undefined) updates.whatsapp_contato = body.whatsapp_contato?.replace(/\D/g, '') || null
    if (body.instagram_url !== undefined) updates.instagram_url = body.instagram_url?.trim() || null
    if (body.site_url !== undefined) updates.site_url = body.site_url?.trim() || null
    if (body.endereco_resumido !== undefined) updates.endereco_resumido = body.endereco_resumido?.trim() || null
    if (body.ativa !== undefined) updates.ativa = body.ativa
    if (body.slug !== undefined) {
      const newSlug = slugify(body.slug)
      if (newSlug !== lp.slug) {
        const { data: collision } = await supabase
          .from('landing_pages_fornecedor')
          .select('id')
          .eq('slug', newSlug)
          .is('deletada_em', null)
          .neq('id', lpId)
          .maybeSingle()
        if (collision) {
          return NextResponse.json({ error: 'Slug ja em uso', code: 'SLUG_EM_USO' }, { status: 409 })
        }
        updates.slug = newSlug
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('landing_pages_fornecedor')
        .update(updates)
        .eq('id', lpId)
      if (updErr) {
        console.error('Erro ao atualizar LP:', updErr)
        return NextResponse.json({ error: 'Erro ao atualizar landing page' }, { status: 500 })
      }
    }

    // Sincroniza pivots se modo=selecao e produtos_ids veio
    if (body.modo === 'selecao' && body.produtos_ids) {
      await supabase.from('landing_page_produtos').delete().eq('landing_page_id', lpId)
      const pivots = body.produtos_ids.map((produto_id, idx) => ({
        landing_page_id: lpId,
        produto_id,
        ordem: idx,
      }))
      if (pivots.length > 0) {
        await supabase.from('landing_page_produtos').insert(pivots)
      }
    }
    // Se mudou de selecao pra outro modo, limpa pivots
    if (body.modo && body.modo !== 'selecao' && lp.modo === 'selecao') {
      await supabase.from('landing_page_produtos').delete().eq('landing_page_id', lpId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em PUT /api/fornecedor/landing-pages/[id]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── DELETE: Soft-delete da LP ───────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)
    const { lp, allowed } = await authorizeOwnership(supabase, cnpjFornecedor, lpId)
    if (!lp || !allowed) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from('landing_pages_fornecedor')
      .update({ deletada_em: new Date().toISOString(), ativa: false })
      .eq('id', lpId)

    if (error) {
      console.error('Erro ao deletar LP:', error)
      return NextResponse.json({ error: 'Erro ao deletar landing page' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em DELETE /api/fornecedor/landing-pages/[id]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
