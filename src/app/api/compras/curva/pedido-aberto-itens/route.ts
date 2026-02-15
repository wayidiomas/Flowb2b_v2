import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface ItemPedido {
  produto_id: number
  nome: string
  codigo: string
  quantidade: number
  valor: number
}

interface PedidoAberto {
  id: number
  numero: string
  data: string
  total: number
  situacao: number
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fornecedorId = searchParams.get('fornecedor_id')

    if (!fornecedorId) {
      return NextResponse.json({ error: 'fornecedor_id obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Calcular data limite (30 dias atras)
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)
    const dataLimiteStr = dataLimite.toISOString().split('T')[0]

    // Buscar pedidos em aberto/andamento do fornecedor (situacao 0=aberto, 3=parcial)
    // Filtrar apenas pedidos dos ultimos 30 dias
    const { data: pedidosAbertos, error: pedidosError } = await supabase
      .from('pedidos_compra')
      .select('id, numero, data, total, situacao')
      .eq('fornecedor_id', parseInt(fornecedorId))
      .eq('empresa_id', user.empresaId)
      .in('situacao', [0, 3])
      .gte('data', dataLimiteStr)
      .order('data', { ascending: false })

    if (pedidosError) {
      console.error('Erro ao buscar pedidos em aberto:', pedidosError)
      throw pedidosError
    }

    if (!pedidosAbertos || pedidosAbertos.length === 0) {
      return NextResponse.json({
        success: true,
        pedidos: [],
        itens: [],
      })
    }

    // Pegar apenas o pedido mais recente (primeiro da lista ordenada por data desc)
    const pedidoMaisRecente = pedidosAbertos[0]
    const pedidoIds = [pedidoMaisRecente.id]

    // Buscar itens de todos os pedidos em aberto
    const { data: itensRaw, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select(`
        id,
        pedido_compra_id,
        produto_id,
        descricao,
        codigo_produto,
        quantidade,
        valor
      `)
      .in('pedido_compra_id', pedidoIds)

    if (itensError) {
      console.error('Erro ao buscar itens do pedido:', itensError)
      throw itensError
    }

    // Agrupar quantidades por produto (soma se mesmo produto em varios pedidos)
    const produtoMap = new Map<number, { nome: string; codigo: string; quantidade: number; valor: number }>()

    itensRaw?.forEach(item => {
      if (!item.produto_id) return

      const existing = produtoMap.get(item.produto_id)
      if (existing) {
        existing.quantidade += item.quantidade || 0
        existing.valor += (item.quantidade || 0) * (item.valor || 0)
      } else {
        produtoMap.set(item.produto_id, {
          nome: item.descricao || 'Produto sem nome',
          codigo: item.codigo_produto || '-',
          quantidade: item.quantidade || 0,
          valor: (item.quantidade || 0) * (item.valor || 0),
        })
      }
    })

    // Converter para array
    const itens: ItemPedido[] = Array.from(produtoMap.entries()).map(([produto_id, data]) => ({
      produto_id,
      ...data,
    }))

    // Formatar pedidos (apenas o mais recente)
    const pedidos: PedidoAberto[] = [{
      id: pedidoMaisRecente.id,
      numero: pedidoMaisRecente.numero?.toString() || '',
      data: pedidoMaisRecente.data,
      total: pedidoMaisRecente.total || 0,
      situacao: pedidoMaisRecente.situacao,
    }]

    return NextResponse.json({
      success: true,
      pedidos,
      itens,
      totais: {
        total_pedidos: pedidos.length,
        total_itens: itens.length,
        total_quantidade: itens.reduce((sum, i) => sum + i.quantidade, 0),
        total_valor: itens.reduce((sum, i) => sum + i.valor, 0),
      },
    })
  } catch (error) {
    console.error('Erro ao buscar itens do pedido em aberto:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar itens' },
      { status: 500 }
    )
  }
}
