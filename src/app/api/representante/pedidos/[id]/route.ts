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

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const params = await context.params
    const pedidoId = parseInt(params.id)

    if (isNaN(pedidoId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar pedido (select * para pegar todos os campos corretos)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('*')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar itens do pedido (com EAN do produto)
    const { data: itensRaw } = await supabase
      .from('itens_pedido_compra')
      .select('id, descricao, codigo_produto, codigo_fornecedor, unidade, valor, quantidade, aliquota_ipi, produto_id, produtos(gtin)')
      .eq('pedido_compra_id', pedidoId)

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

    // Mapear itens para incluir ean e codigo_fornecedor correto
    const itens = itensTyped.map(item => ({
      id: item.id,
      descricao: item.descricao,
      codigo_produto: item.codigo_produto,
      codigo_fornecedor: (item.produto_id && codigosFornecedor[item.produto_id]) || null,
      unidade: item.unidade,
      valor: item.valor,
      quantidade: item.quantidade,
      aliquota_ipi: item.aliquota_ipi,
      produto_id: item.produto_id,
      ean: getGtin(item.produtos)
    }))

    // Buscar nome da empresa (lojista)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('id', pedido.empresa_id)
      .single()

    // Buscar nome do fornecedor
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia')
      .eq('id', pedido.fornecedor_id)
      .single()

    // Buscar sugestoes existentes
    const { data: sugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, observacao_fornecedor, observacao_lojista, created_at, autor_tipo, valor_minimo_pedido, desconto_geral, bonificacao_geral, prazo_entrega_dias, validade_proposta')
      .eq('pedido_compra_id', pedidoId)
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
      .eq('pedido_compra_id', pedidoId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      pedido: {
        ...pedido,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
        fornecedor_nome: fornecedor?.nome_fantasia || fornecedor?.nome || '',
      },
      itens: itens || [],
      sugestoes: sugestoes || [],
      sugestaoItens,
      timeline: timeline || [],
    })
  } catch (error) {
    console.error('Representante pedido detail error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
