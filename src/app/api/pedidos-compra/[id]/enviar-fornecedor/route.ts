import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Verificar pedido pertence a empresa e esta em rascunho
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, numero')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (pedido.status_interno !== 'rascunho') {
      return NextResponse.json(
        { error: 'Pedido ja foi enviado ao fornecedor anteriormente' },
        { status: 400 }
      )
    }

    // Atualizar status
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({ status_interno: 'enviado_fornecedor' })
      .eq('id', pedidoId)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
    }

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'enviado_fornecedor',
        descricao: 'Pedido enviado ao fornecedor para analise',
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      message: 'Pedido enviado ao fornecedor com sucesso',
    })
  } catch (error) {
    console.error('Erro ao enviar pedido ao fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
