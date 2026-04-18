import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// Tipo para item do pedido com produto relacionado
interface ItemPedidoRaw {
  id: number
  descricao: string
  codigo_produto: string | null
  codigo_fornecedor: string | null
  unidade: string
  valor: number
  quantidade: number
  aliquota_ipi: number
  produto_id: number | null
  produtos: { gtin: string | null } | { gtin: string | null }[] | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Verificar que o pedido pertence a um fornecedor com o CNPJ do usuario
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, nome, nome_fantasia')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('*')
      .eq('id', id)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Buscar itens do pedido (com EAN do produto)
    const { data: itensRaw } = await supabase
      .from('itens_pedido_compra')
      .select('id, descricao, codigo_produto, codigo_fornecedor, unidade, valor, quantidade, aliquota_ipi, produto_id, produtos(gtin)')
      .eq('pedido_compra_id', id)

    // Buscar codigos do fornecedor para os produtos deste pedido
    const itensTyped = (itensRaw || []) as ItemPedidoRaw[]
    const produtoIds = itensTyped
      .map(item => item.produto_id)
      .filter((id): id is number => id !== null)

    let codigosFornecedor: Record<number, string> = {}
    if (produtoIds.length > 0) {
      const { data: fpData } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, codigo_fornecedor')
        .eq('fornecedor_id', pedido.fornecedor_id)
        .in('produto_id', produtoIds)

      if (fpData) {
        codigosFornecedor = Object.fromEntries(
          fpData.map(fp => [fp.produto_id, fp.codigo_fornecedor])
        )
      }
    }

    // Helper para extrair gtin do produto (pode ser objeto ou array)
    const getGtin = (produtos: ItemPedidoRaw['produtos']): string | null => {
      if (!produtos) return null
      if (Array.isArray(produtos)) return produtos[0]?.gtin || null
      return produtos.gtin || null
    }

    // Buscar catalogo do fornecedor pra preço de referência
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    const precoCatalogoMap = new Map<string, number>()
    if (catalogo) {
      const { data: catItens } = await supabase
        .from('catalogo_itens')
        .select('codigo, ean, preco_base')
        .eq('catalogo_id', catalogo.id)
        .eq('ativo', true)
      for (const ci of catItens || []) {
        if (ci.codigo) precoCatalogoMap.set(ci.codigo, ci.preco_base)
        if (ci.ean) precoCatalogoMap.set(ci.ean, ci.preco_base)
      }
    }

    // Mapear itens para incluir ean e codigo_fornecedor correto
    // Ordem: fornecedores_produtos (produto_id) > itens_pedido_compra.codigo_fornecedor (catalogo/restauracao)
    const itens = itensTyped.map(item => {
      const codForn = (item.produto_id && codigosFornecedor[item.produto_id])
        || item.codigo_fornecedor
        || null
      const ean = getGtin(item.produtos)
      return {
        id: item.id,
        descricao: item.descricao,
        codigo_produto: item.codigo_produto,
        codigo_fornecedor: codForn,
        unidade: item.unidade,
        preco_catalogo: precoCatalogoMap.get(codForn || '') || precoCatalogoMap.get(ean || '') || null,
        quantidade: item.quantidade,
        aliquota_ipi: item.aliquota_ipi,
        produto_id: item.produto_id,
        ean,
      }
    })

    // Buscar nome da empresa (lojista)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('id', pedido.empresa_id)
      .single()

    // Buscar representante se vinculado
    let representante = null
    if (pedido.representante_id) {
      const { data: repData } = await supabase
        .from('representantes')
        .select('id, nome')
        .eq('id', pedido.representante_id)
        .single()

      if (repData) {
        representante = { id: repData.id, nome: repData.nome }
      }
    }

    // Buscar sugestoes existentes (incluindo autor_tipo para identificar contra-propostas)
    const { data: sugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, observacao_fornecedor, observacao_lojista, created_at, autor_tipo, valor_minimo_pedido, desconto_geral, bonificacao_geral, prazo_entrega_dias, validade_proposta')
      .eq('pedido_compra_id', id)
      .order('created_at', { ascending: false })

    // Se ha sugestao, buscar itens da sugestao mais recente
    let sugestaoItens = null
    if (sugestoes && sugestoes.length > 0) {
      const { data: sItens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', sugestoes[0].id)

      sugestaoItens = sItens
    }

    // Timeline
    const { data: timeline } = await supabase
      .from('pedido_timeline')
      .select('*')
      .eq('pedido_compra_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      pedido: {
        ...pedido,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
        representante,
      },
      itens: itens || [],
      sugestoes: sugestoes || [],
      sugestaoItens,
      timeline: timeline || [],
    })
  } catch (error) {
    console.error('Erro ao buscar pedido fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
