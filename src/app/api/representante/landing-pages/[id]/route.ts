import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { slugify } from '@/lib/lp-helpers'
import type { UpdateLpRepRequest } from '@/types/landing-page'

/**
 * Resolve LP do representante + valida ownership.
 */
async function resolveLpForRepresentante(lpId: number) {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
    return { error: NextResponse.json({ error: 'Nao autenticado' }, { status: 401 }) }
  }

  const supabase = createServerSupabaseClient()

  const { data: representantes } = await supabase
    .from('representantes')
    .select('id, empresa_id, nome, telefone')
    .eq('user_representante_id', user.representanteUserId)
    .eq('ativo', true)

  const representanteIds = (representantes || []).map(r => r.id)
  if (representanteIds.length === 0) {
    return { error: NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 }) }
  }

  const { data: vinculos } = await supabase
    .from('representante_fornecedores')
    .select('fornecedor_id')
    .in('representante_id', representanteIds)
  const fornecedorIds = [...new Set((vinculos || []).map(v => v.fornecedor_id))] as number[]

  const { data: lp } = await supabase
    .from('landing_pages_representante')
    .select('*')
    .eq('id', lpId)
    .is('deletada_em', null)
    .maybeSingle()

  if (!lp || !representanteIds.includes(lp.representante_id)) {
    return { error: NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 }) }
  }

  return { user, supabase, lp, representantes: representantes || [], representanteIds, fornecedorIds }
}

// ─── GET: detalhe da LP + produtos agregados ─────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const ctx = await resolveLpForRepresentante(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase, lp, fornecedorIds } = ctx

    // Produtos curados via pivot (qualquer modo guarda esses dados; UI usa quando modo='selecao')
    const { data: pivots } = await supabase
      .from('landing_page_representante_produtos')
      .select('id, produto_id, fornecedor_id, ordem, preco_override, destaque')
      .eq('landing_page_id', lpId)
      .order('ordem', { ascending: true })

    return NextResponse.json({
      landing_page: lp,
      produtos: pivots || [],
      fornecedor_ids: fornecedorIds,
    })
  } catch (error) {
    console.error('Erro em GET /api/representante/landing-pages/[id]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── PUT: atualizar LP ────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const body = (await request.json()) as UpdateLpRepRequest
    const ctx = await resolveLpForRepresentante(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase, lp } = ctx

    if (body.cor_marca && !/^#[0-9A-Fa-f]{6}$/.test(body.cor_marca)) {
      return NextResponse.json({ error: 'cor_marca invalida (use #RRGGBB)' }, { status: 400 })
    }
    if (body.modo && !['todos', 'comprados', 'selecao'].includes(body.modo)) {
      return NextResponse.json({ error: 'Modo invalido' }, { status: 400 })
    }
    if (body.modo === 'comprados' && body.empresa_id_lojista === null) {
      return NextResponse.json({ error: 'Modo "comprados" exige um lojista alvo' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.nome !== undefined) updates.nome = body.nome.trim()
    if (body.modo !== undefined) updates.modo = body.modo
    if (body.empresa_id_lojista !== undefined) updates.empresa_id_lojista = body.empresa_id_lojista || null
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
    if (body.cor_marca !== undefined) updates.cor_marca = body.cor_marca
    if (body.slug !== undefined) {
      const newSlug = slugify(body.slug)
      if (newSlug !== lp.slug) {
        const [{ data: collisionRep }, { data: collisionForn }] = await Promise.all([
          supabase
            .from('landing_pages_representante')
            .select('id')
            .eq('slug', newSlug)
            .is('deletada_em', null)
            .neq('id', lpId)
            .maybeSingle(),
          supabase
            .from('landing_pages_fornecedor')
            .select('id')
            .eq('slug', newSlug)
            .is('deletada_em', null)
            .maybeSingle(),
        ])
        if (collisionRep || collisionForn) {
          return NextResponse.json({ error: 'Slug ja em uso', code: 'SLUG_EM_USO' }, { status: 409 })
        }
        updates.slug = newSlug
      }
    }

    const { error: updErr } = await supabase
      .from('landing_pages_representante')
      .update(updates)
      .eq('id', lpId)
    if (updErr) {
      console.error('Erro ao atualizar LP rep:', updErr)
      return NextResponse.json({ error: 'Erro ao atualizar landing page' }, { status: 500 })
    }

    // Se mudou de modo='selecao' pra outro, limpa pivot
    if (body.modo && body.modo !== 'selecao' && lp.modo === 'selecao') {
      await supabase.from('landing_page_representante_produtos').delete().eq('landing_page_id', lpId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em PUT /api/representante/landing-pages/[id]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── DELETE: soft-delete ──────────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const ctx = await resolveLpForRepresentante(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase } = ctx

    const { error } = await supabase
      .from('landing_pages_representante')
      .update({ deletada_em: new Date().toISOString(), ativa: false })
      .eq('id', lpId)

    if (error) {
      console.error('Erro ao deletar LP rep:', error)
      return NextResponse.json({ error: 'Erro ao deletar landing page' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em DELETE /api/representante/landing-pages/[id]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
