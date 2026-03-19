import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'

const ESTADOS_RECOLHIVEIS = ['enviado_fornecedor', 'sugestao_pendente', 'contra_proposta_pendente']

// POST - Recolher envio do pedido (voltar para rascunho)
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

    let motivo = ''
    try {
      const body = await request.json()
      motivo = body.motivo || ''
    } catch {
      // Body opcional
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, numero, status_interno')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Validar que o pedido esta em estado recolhivel
    if (!pedido.status_interno || !ESTADOS_RECOLHIVEIS.includes(pedido.status_interno)) {
      return NextResponse.json(
        { error: `Pedido em estado "${pedido.status_interno || 'desconhecido'}" nao pode ser recolhido. Apenas pedidos enviados ao fornecedor podem ser recolhidos.` },
        { status: 400 }
      )
    }

    // Atualizar status para rascunho
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        status_interno: 'rascunho',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)

    if (updateError) {
      console.error('Erro ao recolher pedido:', updateError)
      return NextResponse.json({ error: 'Erro ao recolher envio do pedido' }, { status: 500 })
    }

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'recolhido',
        descricao: motivo
          ? `Envio recolhido pelo lojista. Motivo: "${motivo}"`
          : 'Envio recolhido pelo lojista. Pedido retornou para rascunho.',
        autor_tipo: 'lojista',
        autor_nome: user.nome || user.email,
      })

    // Activity log fire-and-forget
    void logActivity({
      userId: String(user.userId),
      userType: 'lojista',
      userEmail: user.email,
      userNome: user.nome || user.email,
      action: 'pedido_recolhido',
      empresaId: user.empresaId,
      metadata: {
        pedido_id: pedidoId,
        empresa_id: empresaId,
        numero: pedido.numero,
        status_anterior: pedido.status_interno,
      },
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Envio recolhido. Pedido voltou para rascunho.',
    })

  } catch (error) {
    console.error('Erro ao recolher pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao recolher pedido' },
      { status: 500 }
    )
  }
}
