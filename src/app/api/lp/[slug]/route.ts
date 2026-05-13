import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/lp/[slug] (publico)
 *
 * Resolve LP por slug. Tenta primeiro landing_pages_representante,
 * depois landing_pages_fornecedor (compat com fluxo legado).
 *
 * Para LP do representante:
 *  - LP NAO expoe nome do fornecedor publicamente (representante eh o "dono" da curadoria).
 *  - Produtos sempre carregam fornecedor_id internamente (pro checkout agrupar N pedidos).
 *
 * viewer_state:
 *  - 'anonimo'           — nao logado
 *  - 'lojista_vinculado' — logado como lojista com vinculo a (ao menos um) fornecedor da LP
 *  - 'lojista_sem_vinculo' — lojista logado mas sem vinculo
 *  - 'outro_tipo'        — fornecedor / representante / superadmin
 */

export type LpViewerState =
  | 'anonimo'
  | 'lojista_vinculado'
  | 'lojista_sem_vinculo'
  | 'outro_tipo'

type ProdRow = {
  id: number
  codigo: string | null
  nome: string
  gtin: string | null
  marca: string | null
  preco: number | null
  unidade: string | null
  itens_por_caixa: number | null
  curva: string | null
  imagem_url: string | null
  /** Sempre presente internamente — usado pelo checkout pra agrupar pedidos. */
  fornecedor_id: number
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Slug invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // ─── 1) Tentar LP do REPRESENTANTE primeiro ────────────────────────────────
    const { data: lpRep } = await supabase
      .from('landing_pages_representante')
      .select(`
        id, slug, nome, modo, cor_marca, logo_url, banner_url,
        hero_titulo, hero_subtitulo, ativa,
        descricao, whatsapp_contato, instagram_url, site_url, endereco_resumido,
        representante_id, empresa_id_lojista
      `)
      .eq('slug', slug)
      .is('deletada_em', null)
      .maybeSingle()

    if (lpRep) {
      if (!lpRep.ativa) {
        return NextResponse.json({ error: 'Landing page inativa' }, { status: 410 })
      }
      return await handleRepresentanteLp(supabase, lpRep)
    }

    // ─── 2) Fallback: LP do FORNECEDOR (fluxo legado) ──────────────────────────
    return await handleFornecedorLp(supabase, slug)
  } catch (error) {
    console.error('Erro em GET /api/lp/[slug]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── Handler: LP do REPRESENTANTE ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRepresentanteLp(supabase: any, lp: {
  id: number
  slug: string
  nome: string
  modo: 'todos' | 'comprados' | 'selecao'
  cor_marca: string | null
  logo_url: string | null
  banner_url: string | null
  hero_titulo: string | null
  hero_subtitulo: string | null
  ativa: boolean
  descricao: string | null
  whatsapp_contato: string | null
  instagram_url: string | null
  site_url: string | null
  endereco_resumido: string | null
  representante_id: number
  empresa_id_lojista: number | null
}) {
  // 1) Resolve fornecedor_ids do representante
  const { data: vinculos } = await supabase
    .from('representante_fornecedores')
    .select('fornecedor_id')
    .eq('representante_id', lp.representante_id)
  const fornecedorIds = [...new Set(((vinculos || []) as { fornecedor_id: number }[]).map(v => v.fornecedor_id))] as number[]

  // Carrega dados do representante
  const { data: rep } = await supabase
    .from('representantes')
    .select('id, nome, telefone, empresa_id')
    .eq('id', lp.representante_id)
    .maybeSingle()

  // 2) Viewer state
  let viewer_state: LpViewerState = 'anonimo'
  let user_empresa_id: number | null = null
  let user_role: string | null = null
  const user = await getCurrentUser()

  if (user) {
    if (user.tipo === 'lojista') {
      user_empresa_id = user.empresaId || null
      user_role = (user.role as string) || 'user'
      // Lojista vinculado: tem fornecedor na empresa do lojista com CNPJ em algum dos fornecedores do rep
      if (user_empresa_id && fornecedorIds.length > 0) {
        // Pega CNPJs dos fornecedores que o rep atende
        const { data: cnpjs } = await supabase
          .from('fornecedores')
          .select('cnpj')
          .in('id', fornecedorIds)
        const cnpjList = Array.from(new Set(((cnpjs || []) as { cnpj: string | null }[])
          .map(c => (c.cnpj || '').replace(/\D/g, ''))
          .filter(Boolean)))
        if (cnpjList.length > 0) {
          const { data: matching } = await supabase
            .from('fornecedores')
            .select('id')
            .eq('empresa_id', user_empresa_id)
            .in('cnpj', cnpjList)
            .limit(1)
          viewer_state = (matching && matching.length > 0) ? 'lojista_vinculado' : 'lojista_sem_vinculo'
        } else {
          viewer_state = 'lojista_sem_vinculo'
        }
      } else {
        viewer_state = 'lojista_sem_vinculo'
      }
    } else {
      viewer_state = 'outro_tipo'
    }
  }

  // 3) Resolve produtos agregados por modo
  let produtos: ProdRow[] = []

  if (fornecedorIds.length === 0) {
    produtos = []
  } else if (lp.modo === 'todos') {
    // Pega CNPJs dos fornecedores e busca catalogos correspondentes
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, cnpj')
      .in('id', fornecedorIds)
    type FornRow = { id: number; cnpj: string | null }
    const fornByCnpj = new Map<string, number>()
    for (const f of (fornecedores || []) as FornRow[]) {
      const cnpj = (f.cnpj || '').replace(/\D/g, '')
      if (cnpj && !fornByCnpj.has(cnpj)) fornByCnpj.set(cnpj, f.id)
    }
    const cnpjList = Array.from(fornByCnpj.keys())

    if (cnpjList.length > 0) {
      const { data: catalogos } = await supabase
        .from('catalogo_fornecedor')
        .select('id, cnpj')
        .in('cnpj', cnpjList)
      type CatRow = { id: number; cnpj: string | null }
      const catalogoIdsByCnpj = new Map<number, string>()
      for (const c of (catalogos || []) as CatRow[]) {
        const cnpj = (c.cnpj || '').replace(/\D/g, '')
        if (cnpj) catalogoIdsByCnpj.set(c.id, cnpj)
      }
      const catalogoIds = Array.from(catalogoIdsByCnpj.keys())

      if (catalogoIds.length > 0) {
        type CatItemRow = {
          id: number
          catalogo_id: number
          codigo: string | null
          ean: string | null
          nome: string | null
          marca: string | null
          unidade: string | null
          itens_por_caixa: number | null
          preco_base: number | null
          imagem_url: string | null
          ativo: boolean | null
        }
        const itens: CatItemRow[] = []
        const PAGE = 1000
        for (let from = 0; ; from += PAGE) {
          const { data: chunk, error: chunkErr } = await supabase
            .from('catalogo_itens')
            .select('id, catalogo_id, codigo, ean, nome, marca, unidade, itens_por_caixa, preco_base, imagem_url, ativo')
            .in('catalogo_id', catalogoIds)
            .eq('ativo', true)
            .order('nome', { ascending: true })
            .range(from, from + PAGE - 1)
          if (chunkErr) {
            console.error('Erro paginar catalogo_itens (LP rep modo=todos):', chunkErr)
            break
          }
          if (!chunk || chunk.length === 0) break
          itens.push(...(chunk as CatItemRow[]))
          if (chunk.length < PAGE) break
        }

        produtos = itens.map((it: CatItemRow) => {
          const cnpj = catalogoIdsByCnpj.get(it.catalogo_id) || ''
          const fornId = fornByCnpj.get(cnpj) || 0
          return {
            id: it.id,
            codigo: it.codigo || null,
            nome: it.nome || '',
            gtin: it.ean || null,
            marca: it.marca || null,
            preco: it.preco_base != null ? Number(it.preco_base) : null,
            unidade: it.unidade || null,
            itens_por_caixa: it.itens_por_caixa || null,
            curva: null,
            imagem_url: it.imagem_url || null,
            fornecedor_id: fornId,
          }
        })
      }
    }
  } else if (lp.modo === 'comprados') {
    if (!lp.empresa_id_lojista) {
      return NextResponse.json({ error: 'Modo "comprados" requer lojista alvo' }, { status: 400 })
    }
    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - 12)

    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id, fornecedor_id')
      .eq('empresa_id', lp.empresa_id_lojista)
      .in('fornecedor_id', fornecedorIds)
      .gte('data', dataLimite.toISOString().slice(0, 10))
      .limit(2000)

    type PedidoRow = { id: number; fornecedor_id: number }
    const pedidoIds = ((pedidos || []) as PedidoRow[]).map(p => p.id)
    const fornByPedido = new Map<number, number>()
    for (const p of (pedidos || []) as PedidoRow[]) fornByPedido.set(p.id, p.fornecedor_id)

    if (pedidoIds.length > 0) {
      const { data: itens } = await supabase
        .from('itens_pedido_compra')
        .select('produto_id, pedido_compra_id, valor')
        .in('pedido_compra_id', pedidoIds)
        .not('produto_id', 'is', null)

      type ItemRow = { produto_id: number; pedido_compra_id: number; valor: number | null }
      const produtoForn = new Map<number, number>()
      for (const it of (itens || []) as ItemRow[]) {
        const fornId = fornByPedido.get(it.pedido_compra_id)
        if (fornId && !produtoForn.has(it.produto_id)) {
          produtoForn.set(it.produto_id, fornId)
        }
      }
      const produtoIds = Array.from(produtoForn.keys())

      const { data: vinculosProd } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, fornecedor_id, valor_de_compra')
        .in('produto_id', produtoIds)
        .in('fornecedor_id', fornecedorIds)
      type VincRow = { produto_id: number; fornecedor_id: number; valor_de_compra: number | null }
      const precoPorProd = new Map<number, number | null>()
      for (const v of (vinculosProd || []) as VincRow[]) {
        if (v.produto_id) precoPorProd.set(v.produto_id, v.valor_de_compra ?? null)
      }

      const { data: prods } = await supabase
        .from('produtos')
        .select('id, codigo, nome, gtin, marca, unidade, itens_por_caixa, curva')
        .eq('empresa_id', lp.empresa_id_lojista)
        .in('id', produtoIds)

      type ProdRow2 = {
        id: number
        codigo: string | null
        nome: string
        gtin: string | null
        marca: string | null
        unidade: string | null
        itens_por_caixa: number | null
        curva: string | null
      }
      produtos = ((prods || []) as ProdRow2[]).map(p => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        gtin: p.gtin,
        marca: p.marca,
        preco: precoPorProd.get(p.id) ?? null,
        unidade: p.unidade,
        itens_por_caixa: p.itens_por_caixa,
        curva: p.curva,
        imagem_url: null,
        fornecedor_id: produtoForn.get(p.id) || 0,
      }))
    }
  } else if (lp.modo === 'selecao') {
    const { data: pivots } = await supabase
      .from('landing_page_representante_produtos')
      .select('produto_id, fornecedor_id, ordem, preco_override, destaque')
      .eq('landing_page_id', lp.id)
      .order('ordem', { ascending: true })

    type PivotRow = {
      produto_id: number
      fornecedor_id: number
      ordem: number
      preco_override: number | null
      destaque: boolean
    }
    const pivotsArr = (pivots || []) as PivotRow[]
    const produtoIds = pivotsArr.map(p => p.produto_id)
    const overrides = new Map<number, { preco: number | null; destaque: boolean; fornecedor_id: number }>()
    for (const pv of pivotsArr) {
      overrides.set(pv.produto_id, {
        preco: pv.preco_override,
        destaque: pv.destaque,
        fornecedor_id: pv.fornecedor_id,
      })
    }

    if (produtoIds.length > 0) {
      const { data: vinculosProd } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, fornecedor_id, valor_de_compra')
        .in('produto_id', produtoIds)
        .in('fornecedor_id', fornecedorIds)
      type VincRow = { produto_id: number; fornecedor_id: number; valor_de_compra: number | null }
      const precoPorProd = new Map<number, number | null>()
      for (const v of (vinculosProd || []) as VincRow[]) {
        if (v.produto_id) precoPorProd.set(v.produto_id, v.valor_de_compra ?? null)
      }

      // produtos vem da empresa do lojista (se setado) ou de qq empresa
      let prodsQuery = supabase
        .from('produtos')
        .select('id, codigo, nome, gtin, marca, unidade, itens_por_caixa, curva')
        .in('id', produtoIds)
      if (lp.empresa_id_lojista) {
        prodsQuery = prodsQuery.eq('empresa_id', lp.empresa_id_lojista)
      }
      const { data: prods } = await prodsQuery

      type ProdRow3 = {
        id: number
        codigo: string | null
        nome: string
        gtin: string | null
        marca: string | null
        unidade: string | null
        itens_por_caixa: number | null
        curva: string | null
      }
      produtos = ((prods || []) as ProdRow3[]).map(p => {
        const ov = overrides.get(p.id)
        return {
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          gtin: p.gtin,
          marca: p.marca,
          preco: ov?.preco ?? precoPorProd.get(p.id) ?? null,
          unidade: p.unidade,
          itens_por_caixa: p.itens_por_caixa,
          curva: p.curva,
          imagem_url: null,
          fornecedor_id: ov?.fornecedor_id || 0,
        }
      })
    }
  }

  // 4) Resposta — IMPORTANTE: nao expor nome de fornecedor (rep eh o dono da curadoria)
  return NextResponse.json({
    landing_page: {
      id: lp.id,
      slug: lp.slug,
      nome: lp.nome,
      modo: lp.modo,
      cor_marca: null,
      logo_url: lp.logo_url || null,
      banner_url: lp.banner_url || null,
      hero_titulo: lp.hero_titulo,
      hero_subtitulo: lp.hero_subtitulo,
      descricao: lp.descricao || null,
      whatsapp_contato: lp.whatsapp_contato || null,
      instagram_url: lp.instagram_url || null,
      site_url: lp.site_url || null,
      endereco_resumido: lp.endereco_resumido || null,
      // owner: representante (NAO fornecedor)
      owner_tipo: 'representante' as const,
      representante: {
        id: rep?.id || lp.representante_id,
        nome: rep?.nome || 'Representante',
        telefone: rep?.telefone || null,
      },
      // legacy fornecedor key (mantida pra compat com UI publica antiga)
      // Para LP de representante, sempre null/generico
      fornecedor: {
        id: 0,
        cnpj: '',
        nome: rep?.nome || 'Representante',
        nome_fantasia: rep?.nome || null,
        razao_social: rep?.nome || '',
        logo: lp.logo_url || null,
      },
    },
    produtos,
    viewer_state,
    user_role,
  })
}

// ─── Handler: LP do FORNECEDOR (fluxo legado) ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFornecedorLp(supabase: any, slug: string) {
  const { data: lp, error: lpErr } = await supabase
    .from('landing_pages_fornecedor')
    .select(`
      id, slug, nome, modo, cor_marca, logo_url, banner_url,
      hero_titulo, hero_subtitulo, ativa,
      descricao, whatsapp_contato, instagram_url, site_url, endereco_resumido,
      fornecedor_id, empresa_id_fornecedor, empresa_id_lojista,
      fornecedor:fornecedor_id (id, cnpj, nome, nome_fantasia, razao_social, logotipo)
    `)
    .eq('slug', slug)
    .is('deletada_em', null)
    .maybeSingle()

  if (lpErr || !lp) {
    return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
  }
  if (!lp.ativa) {
    return NextResponse.json({ error: 'Landing page inativa' }, { status: 410 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fornecedorData = (lp as any).fornecedor

  // Viewer state
  let viewer_state: LpViewerState = 'anonimo'
  let user_empresa_id: number | null = null
  let user_role: string | null = null
  const user = await getCurrentUser()

  if (user) {
    if (user.tipo === 'lojista') {
      user_empresa_id = user.empresaId || null
      user_role = (user.role as string) || 'user'
      if (user_empresa_id && fornecedorData?.cnpj) {
        const cnpjFornecedor = String(fornecedorData.cnpj).replace(/\D/g, '')
        const { data: vinculo } = await supabase
          .from('fornecedores')
          .select('id')
          .eq('cnpj', cnpjFornecedor)
          .eq('empresa_id', user_empresa_id)
          .limit(1)
          .maybeSingle()
        viewer_state = vinculo ? 'lojista_vinculado' : 'lojista_sem_vinculo'
      } else {
        viewer_state = 'lojista_sem_vinculo'
      }
    } else {
      viewer_state = 'outro_tipo'
    }
  }

  let produtos: ProdRow[] = []

  if (lp.modo === 'todos') {
    const cnpjForn = String(fornecedorData?.cnpj || '').replace(/\D/g, '')
    if (cnpjForn) {
      const { data: catFor } = await supabase
        .from('catalogo_fornecedor')
        .select('id')
        .eq('cnpj', cnpjForn)
        .limit(1)
        .maybeSingle()

      if (catFor) {
        type CatItemRow = {
          id: number
          codigo: string | null
          ean: string | null
          nome: string | null
          marca: string | null
          unidade: string | null
          itens_por_caixa: number | null
          preco_base: number | null
          imagem_url: string | null
          ativo: boolean | null
        }
        const itens: CatItemRow[] = []
        const PAGE = 1000
        for (let from = 0; ; from += PAGE) {
          const { data: chunk, error: chunkErr } = await supabase
            .from('catalogo_itens')
            .select('id, codigo, ean, nome, marca, unidade, itens_por_caixa, preco_base, imagem_url, ativo')
            .eq('catalogo_id', catFor.id)
            .eq('ativo', true)
            .order('nome', { ascending: true })
            .range(from, from + PAGE - 1)
          if (chunkErr) {
            console.error('Erro ao paginar catalogo_itens (LP modo=todos):', chunkErr)
            break
          }
          if (!chunk || chunk.length === 0) break
          itens.push(...(chunk as CatItemRow[]))
          if (chunk.length < PAGE) break
        }

        produtos = itens.map((it: CatItemRow) => ({
          id: it.id,
          codigo: it.codigo || null,
          nome: it.nome || '',
          gtin: it.ean || null,
          marca: it.marca || null,
          preco: it.preco_base != null ? Number(it.preco_base) : null,
          unidade: it.unidade || null,
          itens_por_caixa: it.itens_por_caixa || null,
          curva: null,
          imagem_url: it.imagem_url || null,
          fornecedor_id: lp.fornecedor_id,
        }))
      }
    }
  } else if (lp.modo === 'comprados') {
    if (!lp.empresa_id_lojista) {
      return NextResponse.json({ error: 'Modo "comprados" requer lojista alvo' }, { status: 400 })
    }
    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - 12)
    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id')
      .eq('empresa_id', lp.empresa_id_lojista)
      .eq('fornecedor_id', lp.fornecedor_id)
      .gte('data', dataLimite.toISOString().slice(0, 10))
      .limit(500)

    type PedRow = { id: number }
    const pedidoIds = ((pedidos || []) as PedRow[]).map(p => p.id)
    if (pedidoIds.length > 0) {
      const { data: itens } = await supabase
        .from('itens_pedido_compra')
        .select('produto_id, valor')
        .in('pedido_compra_id', pedidoIds)
        .not('produto_id', 'is', null)

      type ItRow = { produto_id: number; valor: number | null }
      const produtoIds = Array.from(new Set(((itens || []) as ItRow[]).map(i => i.produto_id))).filter(Boolean) as number[]
      const { data: vinculos } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, valor_de_compra')
        .eq('fornecedor_id', lp.fornecedor_id)
        .in('produto_id', produtoIds)
      type VRow = { produto_id: number; valor_de_compra: number | null }
      const precoPorProd = new Map<number, number | null>()
      for (const v of (vinculos || []) as VRow[]) {
        if (v.produto_id) precoPorProd.set(v.produto_id, v.valor_de_compra ?? null)
      }
      const { data: prods } = await supabase
        .from('produtos')
        .select('id, codigo, nome, gtin, marca, unidade, itens_por_caixa, curva')
        .eq('empresa_id', lp.empresa_id_lojista)
        .in('id', produtoIds)
      type PRow = {
        id: number
        codigo: string | null
        nome: string
        gtin: string | null
        marca: string | null
        unidade: string | null
        itens_por_caixa: number | null
        curva: string | null
      }
      produtos = ((prods || []) as PRow[]).map(p => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        gtin: p.gtin,
        marca: p.marca,
        preco: precoPorProd.get(p.id) ?? null,
        unidade: p.unidade,
        itens_por_caixa: p.itens_por_caixa,
        curva: p.curva,
        imagem_url: null,
        fornecedor_id: lp.fornecedor_id,
      }))
    }
  } else if (lp.modo === 'selecao') {
    const { data: pivots } = await supabase
      .from('landing_page_produtos')
      .select('produto_id, ordem, preco_override, destaque')
      .eq('landing_page_id', lp.id)
      .order('ordem', { ascending: true })

    type PivRow = { produto_id: number; ordem: number; preco_override: number | null; destaque: boolean }
    const pivotsArr = (pivots || []) as PivRow[]
    const produtoIds = pivotsArr.map(p => p.produto_id)
    if (produtoIds.length > 0) {
      const overrides = new Map<number, { preco: number | null; destaque: boolean }>()
      for (const pv of pivotsArr) {
        overrides.set(pv.produto_id, { preco: pv.preco_override, destaque: pv.destaque })
      }
      const { data: prods } = await supabase
        .from('produtos')
        .select('id, codigo, nome, gtin, marca, unidade, itens_por_caixa, curva')
        .eq('empresa_id', lp.empresa_id_lojista)
        .in('id', produtoIds)
      const { data: vinculos } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, valor_de_compra')
        .eq('fornecedor_id', lp.fornecedor_id)
        .in('produto_id', produtoIds)
      type VRow = { produto_id: number; valor_de_compra: number | null }
      const precoPorProd = new Map<number, number | null>()
      for (const v of (vinculos || []) as VRow[]) {
        if (v.produto_id) precoPorProd.set(v.produto_id, v.valor_de_compra ?? null)
      }
      type PRow = {
        id: number
        codigo: string | null
        nome: string
        gtin: string | null
        marca: string | null
        unidade: string | null
        itens_por_caixa: number | null
        curva: string | null
      }
      produtos = ((prods || []) as PRow[]).map(p => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        gtin: p.gtin,
        marca: p.marca,
        preco: overrides.get(p.id)?.preco ?? precoPorProd.get(p.id) ?? null,
        unidade: p.unidade,
        itens_por_caixa: p.itens_por_caixa,
        curva: p.curva,
        imagem_url: null,
        fornecedor_id: lp.fornecedor_id,
      }))
    }
  }

  return NextResponse.json({
    landing_page: {
      id: lp.id,
      slug: lp.slug,
      nome: lp.nome,
      modo: lp.modo,
      cor_marca: null,
      logo_url: lp.logo_url || null,
      banner_url: lp.banner_url || null,
      hero_titulo: lp.hero_titulo,
      hero_subtitulo: lp.hero_subtitulo,
      descricao: lp.descricao || null,
      whatsapp_contato: lp.whatsapp_contato || null,
      instagram_url: lp.instagram_url || null,
      site_url: lp.site_url || null,
      endereco_resumido: lp.endereco_resumido || null,
      owner_tipo: 'fornecedor' as const,
      fornecedor: {
        id: fornecedorData?.id || lp.fornecedor_id,
        cnpj: fornecedorData?.cnpj || '',
        nome: fornecedorData?.nome || '',
        nome_fantasia: fornecedorData?.nome_fantasia || null,
        razao_social: fornecedorData?.razao_social || '',
        logo: fornecedorData?.logotipo || null,
      },
    },
    produtos,
    viewer_state,
    user_role,
  })
}
