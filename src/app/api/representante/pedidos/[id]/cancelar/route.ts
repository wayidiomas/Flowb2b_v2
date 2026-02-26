import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
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

    const body = await request.json()
    const { motivo } = body

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

    // Verificar se pedido existe e pertence a um fornecedor vinculado
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, fornecedor_id')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // Verificar status do pedido - so pode cancelar se estiver em alguns status
    const statusPermitidos = ['enviado_fornecedor', 'sugestao_enviada', 'contra_proposta']
    if (!statusPermitidos.includes(pedido.status_interno)) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao pode ser cancelado neste status' },
        { status: 400 }
      )
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        status_interno: 'cancelado',
        observacao: motivo ? `Cancelado pelo representante: ${motivo}` : 'Cancelado pelo representante',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)

    if (updateError) {
      console.error('Erro ao cancelar pedido:', updateError)
      throw updateError
    }

    // Registrar na timeline
    await supabase.from('pedido_compra_timeline').insert({
      pedido_compra_id: pedidoId,
      status: 'cancelado',
      descricao: motivo ? `Pedido cancelado: ${motivo}` : 'Pedido cancelado pelo representante',
      usuario_tipo: 'representante',
      usuario_id: user.representanteUserId,
    })

    return NextResponse.json({
      success: true,
      message: 'Pedido cancelado com sucesso',
    })
  } catch (error) {
    console.error('Representante cancelar error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
