import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total_pedidos: 0,
          pedidos_pendentes: 0,
          pedidos_aprovados: 0,
          pedidos_recusados: 0,
          valor_total: 0,
          fornecedores_ativos: 0,
        },
      })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total_pedidos: 0,
          pedidos_pendentes: 0,
          pedidos_aprovados: 0,
          pedidos_recusados: 0,
          valor_total: 0,
          fornecedores_ativos: 0,
        },
      })
    }

    // Buscar pedidos dos fornecedores vinculados
    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, total')
      .in('fornecedor_id', fornecedorIds)
      .in('status_interno', ['enviado_fornecedor', 'sugestao_enviada', 'aprovado', 'recusado', 'cancelado', 'contra_proposta'])

    const totalPedidos = pedidos?.length || 0
    const pedidosPendentes = pedidos?.filter(p => p.status_interno === 'enviado_fornecedor').length || 0
    const pedidosAprovados = pedidos?.filter(p => p.status_interno === 'aprovado').length || 0
    const pedidosRecusados = pedidos?.filter(p => p.status_interno === 'recusado' || p.status_interno === 'cancelado').length || 0
    const valorTotal = pedidos?.reduce((sum, p) => sum + (p.total || 0), 0) || 0

    return NextResponse.json({
      success: true,
      stats: {
        total_pedidos: totalPedidos,
        pedidos_pendentes: pedidosPendentes,
        pedidos_aprovados: pedidosAprovados,
        pedidos_recusados: pedidosRecusados,
        valor_total: valorTotal,
        fornecedores_ativos: fornecedorIds.length,
      },
    })
  } catch (error) {
    console.error('Representante dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
