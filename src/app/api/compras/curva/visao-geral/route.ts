import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { calcularCobertura } from '@/lib/cobertura'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Recalcular curvas ABC (faturamento e quantidade) antes de buscar dados
    // Isso garante que as classificações estão sempre atualizadas
    const { error: calcError } = await supabase.rpc('calcular_abc_completo', {
      p_empresa_id: user.empresaId
    })

    if (calcError) {
      console.error('Erro ao recalcular curvas ABC:', calcError)
      // Continua mesmo se falhar - usa os dados existentes
    }

    // Buscar todos os produtos ativos (incluindo curva_qtd)
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, curva, curva_qtd, estoque_atual, estoque_minimo')
      .eq('empresa_id', user.empresaId)
      .eq('situacao', 'A')

    if (produtosError) {
      console.error('Erro ao buscar produtos:', produtosError)
      throw produtosError
    }

    // Buscar vinculos fornecedor-produto
    const { data: fornecedoresProdutos, error: fpError } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, fornecedor_id')
      .eq('empresa_id', user.empresaId)

    if (fpError) {
      console.error('Erro ao buscar fornecedores_produtos:', fpError)
    }

    // Buscar fornecedores
    const { data: fornecedores, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia, cnpj')
      .eq('empresa_id', user.empresaId)

    if (fornError) {
      console.error('Erro ao buscar fornecedores:', fornError)
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

    // Buscar ultimo pedido de compra por fornecedor (finalizados - situacao = 1)
    const { data: ultimosPedidos } = await supabase
      .from('pedidos_compra')
      .select('fornecedor_id, data, total')
      .eq('empresa_id', user.empresaId)
      .eq('situacao', 1) // Apenas finalizados
      .order('data', { ascending: false })

    const ultimoPedidoMap = new Map<number, { data: string; total: number }>()
    ultimosPedidos?.forEach(p => {
      if (!ultimoPedidoMap.has(p.fornecedor_id)) {
        ultimoPedidoMap.set(p.fornecedor_id, { data: p.data, total: p.total })
      }
    })

    // Calcular data limite (30 dias atras)
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)
    const dataLimiteStr = dataLimite.toISOString().split('T')[0]

    // Buscar pedidos em aberto/andamento por fornecedor (situacao 0=aberto, 3=parcial)
    // Excluir pedidos cancelados no FlowB2B (status_interno = cancelado/recusado)
    // Filtrar apenas pedidos dos ultimos 30 dias
    const { data: pedidosEmAberto } = await supabase
      .from('pedidos_compra')
      .select('fornecedor_id, numero, data, total, situacao')
      .eq('empresa_id', user.empresaId)
      .in('situacao', [0, 3])
      .not('status_interno', 'in', '("cancelado","recusado")')
      .gte('data', dataLimiteStr)
      .order('data', { ascending: false })

    const pedidoEmAbertoMap = new Map<number, { numero: string; data: string; total: number; situacao: number }>()
    pedidosEmAberto?.forEach(p => {
      if (!pedidoEmAbertoMap.has(p.fornecedor_id)) {
        pedidoEmAbertoMap.set(p.fornecedor_id, {
          numero: p.numero?.toString() || '',
          data: p.data,
          total: p.total,
          situacao: p.situacao
        })
      }
    })

    // Buscar politicas de compra para prazo_entrega por fornecedor
    const { data: politicas } = await supabase
      .from('politica_compra')
      .select('fornecedor_id, prazo_entrega')
      .eq('empresa_id', user.empresaId)

    const prazoEntregaMap = new Map<number, number | null>()
    politicas?.forEach(p => {
      prazoEntregaMap.set(p.fornecedor_id, p.prazo_entrega)
    })

    // Buscar vendas dos ultimos 90 dias para calculo de media diaria
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

      // Agregar quantidade por produto
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vendasData?.forEach((item: any) => {
        const prodId = item.produto_id
        const existing = vendasMap.get(prodId) || 0
        vendasMap.set(prodId, existing + (item.quantidade || 0))
      })
    }

    // Agrupar por fornecedor
    const fornecedorMap = new Map<number, {
      fornecedor_id: number
      fornecedor_nome: string
      fornecedor_cnpj: string
      total_produtos: number
      curva_faturamento: {
        A: { total: number; ruptura: number }
        B: { total: number; ruptura: number }
        C: { total: number; ruptura: number }
        D: { total: number; ruptura: number }
      }
      curva_quantidade: {
        A: { total: number; ruptura: number }
        B: { total: number; ruptura: number }
        C: { total: number; ruptura: number }
        D: { total: number; ruptura: number }
      }
      por_urgencia: {
        CRITICA: number
        ALTA: number
        MEDIA: number
        OK: number
      }
      ruptura_total: number  // CRITICA + ALTA
      valor_ruptura_estimado: number
      ultimo_pedido_data: string | null
      ultimo_pedido_valor: number | null
      dias_sem_pedido: number | null
      faturamento_90d: number
      prazo_entrega: number | null
      pedido_em_aberto: {
        numero: string
        data: string
        total: number
        situacao: number
      } | null
    }>()

    let totalRupturaGeral = 0
    let rupturasCriticas = 0
    let rupturasAltas = 0
    let rupturasMedias = 0
    const valorRupturaTotal = 0

    produtos?.forEach(produto => {
      const fornecedorId = produtoFornecedorMap.get(produto.id)
      if (!fornecedorId) return // Pular produtos sem fornecedor

      const fornecedorInfo = fornecedorInfoMap.get(fornecedorId)
      if (!fornecedorInfo) return

      // Ignorar fornecedor "fantasma" sem nome (criado pela edge function)
      const fornecedorNome = fornecedorInfo.nome
      if (!fornecedorNome) return

      if (!fornecedorMap.has(fornecedorId)) {
        const ultimoPedido = ultimoPedidoMap.get(fornecedorId)
        let diasSemPedido = null
        if (ultimoPedido?.data) {
          const diffTime = Math.abs(new Date().getTime() - new Date(ultimoPedido.data).getTime())
          diasSemPedido = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        fornecedorMap.set(fornecedorId, {
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedorNome,
          fornecedor_cnpj: fornecedorInfo.cnpj || '',
          total_produtos: 0,
          curva_faturamento: {
            A: { total: 0, ruptura: 0 },
            B: { total: 0, ruptura: 0 },
            C: { total: 0, ruptura: 0 },
            D: { total: 0, ruptura: 0 },
          },
          curva_quantidade: {
            A: { total: 0, ruptura: 0 },
            B: { total: 0, ruptura: 0 },
            C: { total: 0, ruptura: 0 },
            D: { total: 0, ruptura: 0 },
          },
          por_urgencia: {
            CRITICA: 0,
            ALTA: 0,
            MEDIA: 0,
            OK: 0,
          },
          ruptura_total: 0,
          valor_ruptura_estimado: 0,
          ultimo_pedido_data: ultimoPedido?.data || null,
          ultimo_pedido_valor: ultimoPedido?.total || null,
          dias_sem_pedido: diasSemPedido,
          faturamento_90d: 0,
          prazo_entrega: prazoEntregaMap.get(fornecedorId) ?? null,
          pedido_em_aberto: pedidoEmAbertoMap.get(fornecedorId) || null,
        })
      }

      const fornecedor = fornecedorMap.get(fornecedorId)!
      fornecedor.total_produtos++

      // Classificar por curva faturamento (usando curva existente ou 'D' se null)
      const curvaFat = (produto.curva || 'D') as 'A' | 'B' | 'C' | 'D'
      fornecedor.curva_faturamento[curvaFat].total++

      // Classificar por curva quantidade (usando curva_qtd real)
      const curvaQtd = (produto.curva_qtd || 'D') as 'A' | 'B' | 'C' | 'D'
      fornecedor.curva_quantidade[curvaQtd].total++

      // Calcular cobertura de estoque
      const estoqueAtual = produto.estoque_atual || 0
      const quantidade90d = vendasMap.get(produto.id) || 0
      const prazoEntrega = prazoEntregaMap.get(fornecedorId) ?? null

      const cobertura = calcularCobertura({
        estoque_atual: estoqueAtual,
        quantidade_90d: quantidade90d,
        prazo_entrega: prazoEntrega,
        curva_fat: curvaFat,
        curva_qtd: curvaQtd,
      })

      // Contar por urgencia
      fornecedor.por_urgencia[cobertura.urgencia]++

      // em_ruptura = CRITICA ou ALTA
      if (cobertura.em_ruptura) {
        fornecedor.curva_faturamento[curvaFat].ruptura++
        fornecedor.curva_quantidade[curvaQtd].ruptura++
        fornecedor.ruptura_total++
        totalRupturaGeral++

        // Contabilizar totais por urgencia
        if (cobertura.urgencia === 'CRITICA') {
          rupturasCriticas++
        } else if (cobertura.urgencia === 'ALTA') {
          rupturasAltas++
        }
      } else if (cobertura.urgencia === 'MEDIA') {
        rupturasMedias++
      }
    })

    // Converter mapa para array
    const fornecedoresFormatados = Array.from(fornecedorMap.values())
      .sort((a, b) => b.ruptura_total - a.ruptura_total)

    // Calcular totais
    const totais = {
      total_fornecedores: fornecedoresFormatados.length,
      total_produtos: produtos?.length || 0,
      total_ruptura: totalRupturaGeral,
      valor_ruptura_total: valorRupturaTotal,
      por_urgencia: {
        CRITICA: rupturasCriticas,
        ALTA: rupturasAltas,
        MEDIA: rupturasMedias,
        BAIXA: totalRupturaGeral - rupturasCriticas - rupturasAltas - rupturasMedias,
      },
    }

    return NextResponse.json({
      success: true,
      fornecedores: fornecedoresFormatados,
      totais,
    })
  } catch (error) {
    console.error('Erro ao buscar visao de curvas:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar visao de curvas' },
      { status: 500 }
    )
  }
}
