import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

// POST - Soft delete pedido de compra (marca is_excluded = true)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, numero, situacao, status_interno, is_excluded')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (pedido.is_excluded) {
      return NextResponse.json({ error: 'Pedido ja foi excluido' }, { status: 400 })
    }

    // Soft delete: marcar como excluido
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        is_excluded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)

    if (updateError) {
      console.error('Erro ao excluir pedido:', updateError)
      return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 })
    }

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'excluido',
        descricao: `Pedido #${pedido.numero || pedidoId} excluido pelo lojista`,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      message: 'Pedido excluido com sucesso',
    })

  } catch (error) {
    console.error('Erro ao excluir pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir pedido' },
      { status: 500 }
    )
  }
}
