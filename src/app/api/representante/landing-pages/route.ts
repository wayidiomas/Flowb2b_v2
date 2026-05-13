import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { slugify, generateUniqueSlug } from '@/lib/lp-helpers'
import type { CreateLpRepRequest, LpRepListItem, LpModo } from '@/types/landing-page'

/**
 * Resolve representante_ids do user logado (1+ por empresa).
 * Tambem retorna mapa de fornecedor_ids agregados via representante_fornecedores.
 */
async function resolveRepresentanteContext() {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
    return { error: NextResponse.json({ error: 'Nao autenticado' }, { status: 401 }) }
  }

  const supabase = createServerSupabaseClient()

  const { data: representantes, error: repError } = await supabase
    .from('representantes')
    .select('id, empresa_id, nome, telefone')
    .eq('user_representante_id', user.representanteUserId)
    .eq('ativo', true)

  if (repError) {
    console.error('Erro ao buscar representantes:', repError)
    return { error: NextResponse.json({ error: 'Erro ao buscar representantes' }, { status: 500 }) }
  }

  const representanteIds = (representantes || []).map(r => r.id)
  if (representanteIds.length === 0) {
    return { error: NextResponse.json({ error: 'Sem acesso' }, { status: 403 }) }
  }

  const { data: vinculos, error: vincError } = await supabase
    .from('representante_fornecedores')
    .select('fornecedor_id, representante_id')
    .in('representante_id', representanteIds)

  if (vincError) {
    console.error('Erro ao buscar vinculos:', vincError)
    return { error: NextResponse.json({ error: 'Erro ao buscar fornecedores vinculados' }, { status: 500 }) }
  }

  const fornecedorIds = [...new Set((vinculos || []).map(v => v.fornecedor_id))] as number[]

  return {
    user,
    supabase,
    representantes: representantes || [],
    representanteIds,
    fornecedorIds,
  }
}

// ─── GET: Lista LPs do representante ─────────────────────────────────────────
export async function GET() {
  try {
    const ctx = await resolveRepresentanteContext()
    if ('error' in ctx) return ctx.error
    const { supabase, representanteIds } = ctx

    const { data: lps, error } = await supabase
      .from('landing_pages_representante')
      .select(`
        *,
        empresa_lojista:empresa_id_lojista (id, razao_social, nome_fantasia, cnpj)
      `)
      .in('representante_id', representanteIds)
      .is('deletada_em', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao listar LPs do representante:', error)
      return NextResponse.json({ error: 'Erro ao listar landing pages' }, { status: 500 })
    }

    const lpIds = (lps || []).map(l => l.id)
    const produtosCount = new Map<number, number>()
    if (lpIds.length > 0) {
      const { data: pivots } = await supabase
        .from('landing_page_representante_produtos')
        .select('landing_page_id')
        .in('landing_page_id', lpIds)
      for (const p of pivots || []) {
        produtosCount.set(p.landing_page_id, (produtosCount.get(p.landing_page_id) || 0) + 1)
      }
    }

    const landing_pages: LpRepListItem[] = (lps || []).map(lp => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emp = (lp as any).empresa_lojista
      return {
        ...lp,
        produtos_count: produtosCount.get(lp.id) || 0,
        lojista_nome: emp?.nome_fantasia || emp?.razao_social || null,
        lojista_cnpj: emp?.cnpj || null,
      }
    })

    return NextResponse.json({ landing_pages })
  } catch (error) {
    console.error('Erro em GET /api/representante/landing-pages:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST: Cria LP do representante ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveRepresentanteContext()
    if ('error' in ctx) return ctx.error
    const { supabase, representantes, representanteIds } = ctx

    const body = (await request.json()) as CreateLpRepRequest

    if (!body.nome?.trim()) {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    }
    if (!['todos', 'comprados', 'selecao'].includes(body.modo as LpModo)) {
      return NextResponse.json({ error: 'Modo invalido' }, { status: 400 })
    }
    if (body.modo === 'comprados' && !body.empresa_id_lojista) {
      return NextResponse.json(
        { error: 'Modo "comprados" exige um lojista alvo.' },
        { status: 400 }
      )
    }

    // Validar representante_id (se passado, deve ser do user). Se nao passado, pega o primeiro.
    let representanteIdAlvo = representanteIds[0]
    if (body.representante_id) {
      const idNum = Number(body.representante_id)
      if (!representanteIds.includes(idNum)) {
        return NextResponse.json({ error: 'Sem acesso a esse representante' }, { status: 403 })
      }
      representanteIdAlvo = idNum
    }

    // Se empresa_id_lojista informada, validar que pelo menos um representante do user atende essa empresa
    if (body.empresa_id_lojista) {
      const empresaIdsRep = representantes.map(r => r.empresa_id)
      if (!empresaIdsRep.includes(body.empresa_id_lojista)) {
        return NextResponse.json(
          { error: 'Voce nao tem representacao nessa empresa lojista.' },
          { status: 422 }
        )
      }
      // Ajusta representanteIdAlvo pra ser o que tem aquela empresa
      const repCorrespondente = representantes.find(r => r.empresa_id === body.empresa_id_lojista)
      if (repCorrespondente) representanteIdAlvo = repCorrespondente.id
    }

    // Slug auto-gerado se nao informado
    let slug = body.slug ? slugify(body.slug) : ''
    if (!slug) {
      const { data: existing } = await supabase
        .from('landing_pages_representante')
        .select('slug')
        .is('deletada_em', null)
      const slugs = (existing || []).map(e => e.slug)
      // Tambem checa colisao com LPs de fornecedor (compartilham namespace /lp/[slug])
      const { data: fornSlugs } = await supabase
        .from('landing_pages_fornecedor')
        .select('slug')
        .is('deletada_em', null)
      slugs.push(...(fornSlugs || []).map(e => e.slug))
      slug = generateUniqueSlug(body.nome, slugs)
    } else {
      const [{ data: collisionRep }, { data: collisionForn }] = await Promise.all([
        supabase
          .from('landing_pages_representante')
          .select('id')
          .eq('slug', slug)
          .is('deletada_em', null)
          .maybeSingle(),
        supabase
          .from('landing_pages_fornecedor')
          .select('id')
          .eq('slug', slug)
          .is('deletada_em', null)
          .maybeSingle(),
      ])
      if (collisionRep || collisionForn) {
        return NextResponse.json({ error: 'Slug ja em uso', code: 'SLUG_EM_USO' }, { status: 409 })
      }
    }

    // Defaults amigaveis
    const repRef = representantes.find(r => r.id === representanteIdAlvo)
    const repNome = repRef?.nome || 'Representante'
    let heroSubtituloDefault = 'Veja o catalogo completo dos fornecedores que represento'
    if (body.empresa_id_lojista) {
      const { data: empLojista } = await supabase
        .from('empresas')
        .select('razao_social, nome_fantasia')
        .eq('id', body.empresa_id_lojista)
        .maybeSingle()
      const lojistaNome = empLojista?.nome_fantasia || empLojista?.razao_social || 'sua loja'
      heroSubtituloDefault = `Selecionado para ${lojistaNome}`
    }
    const heroTituloDefault = `Catalogo ${repNome}`

    const { data: lp, error: lpErr } = await supabase
      .from('landing_pages_representante')
      .insert({
        representante_id: representanteIdAlvo,
        empresa_id_lojista: body.empresa_id_lojista || null,
        slug,
        nome: body.nome.trim(),
        modo: body.modo,
        cor_marca: null,
        logo_url: body.logo_url || null,
        banner_url: body.banner_url || null,
        hero_titulo: body.hero_titulo?.trim() || heroTituloDefault,
        hero_subtitulo: body.hero_subtitulo?.trim() || heroSubtituloDefault,
        descricao: body.descricao?.trim() || null,
        whatsapp_contato: body.whatsapp_contato?.replace(/\D/g, '') || null,
        instagram_url: body.instagram_url?.trim() || null,
        site_url: body.site_url?.trim() || null,
        endereco_resumido: body.endereco_resumido?.trim() || null,
      })
      .select('*')
      .single()

    if (lpErr || !lp) {
      console.error('Erro ao criar LP do representante:', lpErr)
      return NextResponse.json({ error: 'Erro ao criar landing page' }, { status: 500 })
    }

    return NextResponse.json({ success: true, landing_page: lp }, { status: 201 })
  } catch (error) {
    console.error('Erro em POST /api/representante/landing-pages:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
