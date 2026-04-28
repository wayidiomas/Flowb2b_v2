import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'
import { slugify, generateUniqueSlug } from '@/lib/lp-helpers'
import type { CreateLpRequest, LpListItem, LpModo } from '@/types/landing-page'

// ─── GET: Lista LPs do fornecedor ────────────────────────────────────────────
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)

    // Busca instâncias do fornecedor (mesmo CNPJ pode ter vários ids por empresa)
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjFornecedor)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ landing_pages: [] })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    const { data: lps, error } = await supabase
      .from('landing_pages_fornecedor')
      .select(`
        *,
        empresa_lojista:empresa_id_lojista (id, razao_social, nome_fantasia, cnpj)
      `)
      .in('fornecedor_id', fornecedorIds)
      .is('deletada_em', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao listar LPs:', error)
      return NextResponse.json({ error: 'Erro ao listar landing pages' }, { status: 500 })
    }

    // Conta produtos por LP (modo='selecao')
    const lpIds = (lps || []).map(l => l.id)
    const produtosCount = new Map<number, number>()
    if (lpIds.length > 0) {
      const { data: pivots } = await supabase
        .from('landing_page_produtos')
        .select('landing_page_id')
        .in('landing_page_id', lpIds)
      for (const p of pivots || []) {
        produtosCount.set(p.landing_page_id, (produtosCount.get(p.landing_page_id) || 0) + 1)
      }
    }

    const landing_pages: LpListItem[] = (lps || []).map(lp => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emp = (lp as any).empresa_lojista
      return {
        ...lp,
        lojista_razao_social: emp?.razao_social || '',
        lojista_nome_fantasia: emp?.nome_fantasia || null,
        lojista_cnpj: emp?.cnpj || '',
        produtos_count: produtosCount.get(lp.id) || 0,
      }
    })

    return NextResponse.json({ landing_pages })
  } catch (error) {
    console.error('Erro em GET /api/fornecedor/landing-pages:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST: Cria LP ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as CreateLpRequest

    if (!body.nome?.trim()) {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    }
    if (!['todos', 'comprados', 'selecao'].includes(body.modo as LpModo)) {
      return NextResponse.json({ error: 'Modo invalido' }, { status: 400 })
    }
    if (body.modo === 'selecao' && (!body.produtos_ids || body.produtos_ids.length === 0)) {
      return NextResponse.json({ error: 'Selecione ao menos um produto' }, { status: 400 })
    }
    if (body.modo === 'comprados' && !body.empresa_id_lojista) {
      return NextResponse.json(
        { error: 'Modo "comprados" exige um lojista alvo. Use modo "todos" para LP generica.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)

    // Pega QUALQUER instancia do fornecedor logado pra ser referencia
    const { data: fornecedorRef } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, cnpj, nome, nome_fantasia, razao_social')
      .eq('cnpj', cnpjFornecedor)
      .limit(1)
      .maybeSingle()

    if (!fornecedorRef) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 422 })
    }

    let fornecedorIdParaLp = fornecedorRef.id
    let empresaIdFornecedor = fornecedorRef.empresa_id

    // Se tem lojista alvo, resolve fornecedor_id no tenant dele (vinculo invertido)
    if (body.empresa_id_lojista) {
      const { data: fornNoLojista } = await supabase
        .from('fornecedores')
        .select('id, empresa_id')
        .eq('cnpj', cnpjFornecedor)
        .eq('empresa_id', body.empresa_id_lojista)
        .maybeSingle()
      if (!fornNoLojista) {
        return NextResponse.json(
          { error: 'Voce nao tem vinculo com esse lojista. Cadastre-o primeiro em /fornecedor/lojistas.' },
          { status: 422 }
        )
      }
      fornecedorIdParaLp = fornNoLojista.id

      // Pega empresa_id_fornecedor (uma instancia do CNPJ que NAO seja a do lojista)
      const { data: ownList } = await supabase
        .from('fornecedores')
        .select('empresa_id')
        .eq('cnpj', cnpjFornecedor)
        .neq('empresa_id', body.empresa_id_lojista)
        .limit(1)
      empresaIdFornecedor = ownList?.[0]?.empresa_id || fornNoLojista.empresa_id
    }

    // Slug auto-gerado se nao informado
    let slug = body.slug ? slugify(body.slug) : ''
    if (!slug) {
      // Busca slugs existentes pra evitar colisao
      const { data: existing } = await supabase
        .from('landing_pages_fornecedor')
        .select('slug')
        .is('deletada_em', null)
      const slugs = (existing || []).map(e => e.slug)
      slug = generateUniqueSlug(body.nome, slugs)
    } else {
      // Validar unicidade
      const { data: collision } = await supabase
        .from('landing_pages_fornecedor')
        .select('id')
        .eq('slug', slug)
        .is('deletada_em', null)
        .maybeSingle()
      if (collision) {
        return NextResponse.json({ error: 'Slug ja em uso', code: 'SLUG_EM_USO' }, { status: 409 })
      }
    }

    // Defaults inteligentes
    const fornecedorNomeAmigavel =
      fornecedorRef.nome_fantasia || fornecedorRef.nome || fornecedorRef.razao_social || 'Fornecedor'

    let heroSubtituloDefault = 'Veja todo o catalogo e faca seu pedido em poucos cliques'
    if (body.empresa_id_lojista) {
      const { data: empLojista } = await supabase
        .from('empresas')
        .select('razao_social, nome_fantasia')
        .eq('id', body.empresa_id_lojista)
        .maybeSingle()
      const lojistaNomeAmigavel =
        empLojista?.nome_fantasia || empLojista?.razao_social || 'sua loja'
      heroSubtituloDefault = `Selecionado para ${lojistaNomeAmigavel}`
    }
    const heroTituloDefault = `Catalogo ${fornecedorNomeAmigavel}`

    // Insert LP
    const { data: lp, error: lpErr } = await supabase
      .from('landing_pages_fornecedor')
      .insert({
        fornecedor_id: fornecedorIdParaLp,
        empresa_id_fornecedor: empresaIdFornecedor,
        empresa_id_lojista: body.empresa_id_lojista || null,
        slug,
        nome: body.nome.trim(),
        modo: body.modo,
        cor_marca: null, // legado, nao usa
        logo_url: body.logo_url || null,
        banner_url: body.banner_url || null,
        hero_titulo: body.hero_titulo?.trim() || heroTituloDefault,
        hero_subtitulo: body.hero_subtitulo?.trim() || heroSubtituloDefault,
        descricao: body.descricao?.trim() || null,
        whatsapp_contato: body.whatsapp_contato?.replace(/\D/g, '') || null,
        instagram_url: body.instagram_url?.trim() || null,
        site_url: body.site_url?.trim() || null,
        endereco_resumido: body.endereco_resumido?.trim() || null,
        created_by_user_id: null,
      })
      .select('*')
      .single()

    if (lpErr || !lp) {
      console.error('Erro ao criar LP:', lpErr)
      return NextResponse.json({ error: 'Erro ao criar landing page' }, { status: 500 })
    }

    // Insert pivots (modo='selecao')
    if (body.modo === 'selecao' && body.produtos_ids && body.produtos_ids.length > 0) {
      const pivots = body.produtos_ids.map((produto_id, idx) => ({
        landing_page_id: lp.id,
        produto_id,
        ordem: idx,
      }))
      const { error: pivotErr } = await supabase.from('landing_page_produtos').insert(pivots)
      if (pivotErr) {
        // Rollback: deleta LP recem-criada
        await supabase.from('landing_pages_fornecedor').delete().eq('id', lp.id)
        console.error('Erro ao salvar produtos da LP:', pivotErr)
        return NextResponse.json({ error: 'Erro ao salvar produtos' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, landing_page: lp }, { status: 201 })
  } catch (error) {
    console.error('Erro em POST /api/fornecedor/landing-pages:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
