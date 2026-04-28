import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/lp/[slug] (publico)
 *
 * Retorna a LP publica + produtos resolvidos por modo + viewer_state
 * pra UI saber qual banner / CTA mostrar.
 *
 * viewer_state:
 *  - 'anonimo'           — nao logado
 *  - 'lojista_vinculado' — logado como lojista (incluindo lojista_lp) com vinculo a esse fornecedor
 *  - 'lojista_sem_vinculo' — logado como lojista mas nao tem vinculo com esse fornecedor
 *  - 'outro_tipo'        — fornecedor / representante / superadmin
 */

export type LpViewerState =
  | 'anonimo'
  | 'lojista_vinculado'
  | 'lojista_sem_vinculo'
  | 'outro_tipo'

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

    // 1. Carrega LP + fornecedor (publico)
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

    // 2. Resolve viewer_state via cookie JWT
    let viewer_state: LpViewerState = 'anonimo'
    let user_empresa_id: number | null = null
    let user_role: string | null = null
    const user = await getCurrentUser()

    if (user) {
      if (user.tipo === 'lojista') {
        user_empresa_id = user.empresaId || null
        user_role = (user.role as string) || 'user'
        // Lojista vinculado: existe fornecedor com mesmo CNPJ na empresa do lojista
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

    // 3. Resolve produtos por modo
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
    }
    let produtos: ProdRow[] = []

    if (lp.modo === 'todos') {
      // Modo 'todos': busca o catalogo proprio do fornecedor (catalogo_itens via CNPJ).
      // Independe de empresa_id_lojista — funciona em LP generica.
      const cnpjForn = String(fornecedorData?.cnpj || '').replace(/\D/g, '')
      if (cnpjForn) {
        const { data: catFor } = await supabase
          .from('catalogo_fornecedor')
          .select('id')
          .eq('cnpj', cnpjForn)
          .limit(1)
          .maybeSingle()

        if (catFor) {
          const { data: itens } = await supabase
            .from('catalogo_itens')
            .select('id, codigo, ean, nome, marca, unidade, itens_por_caixa, preco_base, imagem_url, ativo')
            .eq('catalogo_id', catFor.id)
            .eq('ativo', true)
            .order('nome', { ascending: true })
            .limit(500)

          produtos = (itens || []).map(it => ({
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
          }))
        }
      }
    } else if (lp.modo === 'comprados') {
      // Produtos que esse lojista ja comprou nesse fornecedor (ultimos 12 meses)
      // 'comprados' so faz sentido com lojista alvo
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

      const pedidoIds = (pedidos || []).map(p => p.id)
      if (pedidoIds.length > 0) {
        const { data: itens } = await supabase
          .from('itens_pedido_compra')
          .select('produto_id, valor')
          .in('pedido_compra_id', pedidoIds)
          .not('produto_id', 'is', null)

        const produtoIds = Array.from(new Set((itens || []).map(i => i.produto_id))).filter(Boolean) as number[]
        // Preco padrao: pega valor_de_compra do fornecedores_produtos
        const { data: vinculos } = await supabase
          .from('fornecedores_produtos')
          .select('produto_id, valor_de_compra')
          .eq('fornecedor_id', lp.fornecedor_id)
          .in('produto_id', produtoIds)
        const precoPorProd = new Map<number, number | null>()
        for (const v of vinculos || []) {
          if (v.produto_id) precoPorProd.set(v.produto_id, v.valor_de_compra ?? null)
        }
        const { data: prods } = await supabase
          .from('produtos')
          .select('id, codigo, nome, gtin, marca, unidade, itens_por_caixa, curva')
          .eq('empresa_id', lp.empresa_id_lojista)
          .in('id', produtoIds)
        produtos = (prods || []).map(p => ({
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
        }))
      }
    } else if (lp.modo === 'selecao') {
      const { data: pivots } = await supabase
        .from('landing_page_produtos')
        .select('produto_id, ordem, preco_override, destaque')
        .eq('landing_page_id', lp.id)
        .order('ordem', { ascending: true })

      const produtoIds = (pivots || []).map(p => p.produto_id)
      if (produtoIds.length > 0) {
        const overrides = new Map<number, { preco: number | null; destaque: boolean }>()
        for (const pv of pivots || []) {
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
        const precoPorProd = new Map<number, number | null>()
        for (const v of vinculos || []) {
          if (v.produto_id) precoPorProd.set(v.produto_id, v.valor_de_compra ?? null)
        }
        produtos = (prods || []).map(p => ({
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
        }))
      }
    }

    return NextResponse.json({
      landing_page: {
        id: lp.id,
        slug: lp.slug,
        nome: lp.nome,
        modo: lp.modo,
        cor_marca: null, // legacy, sempre null pra forcar paleta FlowB2B
        logo_url: lp.logo_url || null,
        banner_url: lp.banner_url || null,
        hero_titulo: lp.hero_titulo,
        descricao: lp.descricao || null,
        whatsapp_contato: lp.whatsapp_contato || null,
        instagram_url: lp.instagram_url || null,
        site_url: lp.site_url || null,
        endereco_resumido: lp.endereco_resumido || null,
        hero_subtitulo: lp.hero_subtitulo,
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
  } catch (error) {
    console.error('Erro em GET /api/lp/[slug]:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
