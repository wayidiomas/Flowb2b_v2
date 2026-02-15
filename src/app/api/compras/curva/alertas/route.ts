import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { calcularCobertura, Urgencia } from '@/lib/cobertura'

interface Alerta {
  produto_id: number
  codigo: string
  produto_nome: string
  fornecedor_id: number
  fornecedor_nome: string
  fornecedor_cnpj: string
  curva_fat: string
  curva_qtd: string
  estoque_atual: number
  estoque_minimo: number
  // Novos campos de cobertura
  media_diaria: number
  dias_cobertura: number | null
  dias_necessarios: number
  faturamento_90d: number
  quantidade_90d: number
  dias_sem_entrada: number
  urgencia: Urgencia
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar produtos ativos (incluindo curva_qtd)
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, codigo, nome, curva, curva_qtd, estoque_atual, estoque_minimo')
      .eq('empresa_id', user.empresaId)
      .eq('situacao', 'A')

    if (produtosError) {
      console.error('Erro ao buscar produtos:', produtosError)
      throw produtosError
    }

    // Buscar vinculos fornecedor-produto
    const { data: fornecedoresProdutos } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, fornecedor_id')
      .eq('empresa_id', user.empresaId)

    // Buscar fornecedores
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia, cnpj')
      .eq('empresa_id', user.empresaId)

    // Buscar politicas de compra para prazo_entrega
    const { data: politicas } = await supabase
      .from('politica_compra')
      .select('fornecedor_id, prazo_entrega')
      .eq('empresa_id', user.empresaId)

    const prazoEntregaMap = new Map<number, number | null>()
    politicas?.forEach(p => {
      prazoEntregaMap.set(p.fornecedor_id, p.prazo_entrega)
    })

    // Buscar fornecedores com pedidos em aberto/andamento (situacao 0=aberto, 3=parcial)
    // Esses fornecedores NAO devem aparecer nos alertas pois ja tem pedido em processo
    const { data: pedidosEmAberto } = await supabase
      .from('pedidos_compra')
      .select('fornecedor_id')
      .eq('empresa_id', user.empresaId)
      .in('situacao', [0, 3])

    const fornecedoresComPedidoEmAberto = new Set<number>()
    pedidosEmAberto?.forEach(p => {
      fornecedoresComPedidoEmAberto.add(p.fornecedor_id)
    })

    // Buscar vendas 90 dias para media diaria
    const produtoIds = produtos?.map(p => p.id) || []
    const vendasMap = new Map<number, number>()

    if (produtoIds.length > 0) {
      const data90dias = new Date()
      data90dias.setDate(data90dias.getDate() - 90)
      const data90diasStr = data90dias.toISOString().split('T')[0]

      const { data: vendasData } = await supabase
        .from('itens_pedido_venda')
        .select(`
          produto_id,
          quantidade,
          pedidos_venda!inner(data, empresa_id)
        `)
        .in('produto_id', produtoIds)
        .gte('pedidos_venda.data', data90diasStr)
        .eq('pedidos_venda.empresa_id', user.empresaId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vendasData?.forEach((item: any) => {
        const prodId = item.produto_id
        const existing = vendasMap.get(prodId) || 0
        vendasMap.set(prodId, existing + (item.quantidade || 0))
      })
    }

    // Criar mapas
    const produtoFornecedorMap = new Map<number, number>()
    fornecedoresProdutos?.forEach(fp => {
      produtoFornecedorMap.set(fp.produto_id, fp.fornecedor_id)
    })

    const fornecedorInfoMap = new Map<number, { nome: string; nome_fantasia: string | null; cnpj: string | null }>()
    fornecedores?.forEach(f => {
      fornecedorInfoMap.set(f.id, { nome: f.nome, nome_fantasia: f.nome_fantasia, cnpj: f.cnpj })
    })

    // Filtrar produtos por urgencia de cobertura e criar alertas
    const alertasAgrupados: Record<string, Alerta[]> = {
      CRITICA: [],
      ALTA: [],
      MEDIA: [],
      OK: [],
    }

    let faturamentoEmRisco = 0
    let quantidadeEmRisco = 0

    produtos?.forEach(produto => {
      const fornecedorId = produtoFornecedorMap.get(produto.id)
      const fornecedorInfo = fornecedorId ? fornecedorInfoMap.get(fornecedorId) : null

      // Ignorar produtos vinculados ao fornecedor "fantasma" sem nome
      const fornecedorNome = fornecedorInfo?.nome
      if (!fornecedorNome) return

      // Ignorar fornecedores que ja tem pedido em andamento
      // Esses aparecem na tabela com badge "Em andamento", nao precisam de alerta
      if (fornecedorId && fornecedoresComPedidoEmAberto.has(fornecedorId)) return

      const estoqueAtual = produto.estoque_atual || 0
      const estoqueMinimo = produto.estoque_minimo || 0
      const curvaFat = (produto.curva || 'D') as string
      const curvaQtd = (produto.curva_qtd || 'D') as string
      const quantidade90d = vendasMap.get(produto.id) || 0
      const prazoEntrega = fornecedorId ? prazoEntregaMap.get(fornecedorId) ?? null : null

      // Calcular cobertura de estoque
      const cobertura = calcularCobertura({
        estoque_atual: estoqueAtual,
        quantidade_90d: quantidade90d,
        prazo_entrega: prazoEntrega,
        curva_fat: curvaFat,
        curva_qtd: curvaQtd,
      })

      // Apenas incluir alertas (CRITICA, ALTA, MEDIA) - ignorar OK
      if (cobertura.urgencia === 'OK') return

      const alerta: Alerta = {
        produto_id: produto.id,
        codigo: produto.codigo || '',
        produto_nome: produto.nome || '',
        fornecedor_id: fornecedorId || 0,
        fornecedor_nome: fornecedorNome,
        fornecedor_cnpj: fornecedorInfo?.cnpj || '',
        curva_fat: curvaFat,
        curva_qtd: curvaQtd,
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        media_diaria: cobertura.media_diaria,
        dias_cobertura: cobertura.dias_cobertura,
        dias_necessarios: cobertura.dias_necessarios,
        faturamento_90d: 0, // TODO: calcular a partir de vendas com valores
        quantidade_90d: quantidade90d,
        dias_sem_entrada: 0, // TODO: calcular a partir de movimentacoes
        urgencia: cobertura.urgencia,
      }

      alertasAgrupados[cobertura.urgencia].push(alerta)

      // Contabilizar impacto apenas para CRITICA e ALTA
      if (cobertura.em_ruptura) {
        quantidadeEmRisco += quantidade90d
      }
    })

    const totais = {
      CRITICA: alertasAgrupados.CRITICA.length,
      ALTA: alertasAgrupados.ALTA.length,
      MEDIA: alertasAgrupados.MEDIA.length,
      total:
        alertasAgrupados.CRITICA.length +
        alertasAgrupados.ALTA.length +
        alertasAgrupados.MEDIA.length,
    }

    return NextResponse.json({
      success: true,
      alertas: alertasAgrupados,
      totais,
      impacto: {
        faturamento_em_risco: faturamentoEmRisco,
        quantidade_em_risco: quantidadeEmRisco,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar alertas:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar alertas' },
      { status: 500 }
    )
  }
}
