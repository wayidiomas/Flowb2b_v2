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

    // Mapear itens para incluir ean e codigo_fornecedor correto
    const itens = itensTyped.map(item => ({
      id: item.id,
      descricao: item.descricao,
      codigo_produto: item.codigo_produto,
      // Usar APENAS codigo_fornecedor de fornecedores_produtos, sem fallback
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
