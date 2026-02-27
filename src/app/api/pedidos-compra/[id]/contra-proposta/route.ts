import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

interface ContraPropostaItem {
  item_pedido_compra_id: number
  quantidade_contra_proposta: number
  desconto_percentual: number
  bonificacao_quantidade: number  // Quantidade direta de unidades bonificadas
}

// POST - Lojista envia contra-proposta para o fornecedor
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
    const body = await request.json()
    const { itens, observacao }: { itens: ContraPropostaItem[]; observacao?: string } = body

    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Itens da contra-proposta sao obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar pedido pertence a empresa e esta em status que permite contra-proposta
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, empresa_id, fornecedor_id')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // So pode enviar contra-proposta quando ha sugestao pendente
    if (pedido.status_interno !== 'sugestao_pendente') {
      return NextResponse.json(
        { error: 'Este pedido nao esta em estado que permite contra-proposta' },
        { status: 400 }
      )
    }

    // Buscar sugestao anterior do fornecedor (para pegar fornecedor_user_id)
    const { data: sugestaoAnterior } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, fornecedor_user_id')
      .eq('pedido_compra_id', pedidoId)
      .eq('status', 'pendente')
      .eq('autor_tipo', 'fornecedor')
      .single()

    if (!sugestaoAnterior || !sugestaoAnterior.fornecedor_user_id) {
      return NextResponse.json(
        { error: 'Nao foi encontrada sugestao do fornecedor para responder' },
        { status: 400 }
      )
    }

    // Marcar sugestao anterior como rejeitada
    await supabase
      .from('sugestoes_fornecedor')
      .update({
        status: 'rejeitada',
        observacao_lojista: 'Contra-proposta enviada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sugestaoAnterior.id)

    // Criar nova sugestao com autor_tipo = 'lojista', usando o mesmo fornecedor_user_id
    const { data: novaSugestao, error: sugestaoError } = await supabase
      .from('sugestoes_fornecedor')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        empresa_id: user.empresaId,
        fornecedor_user_id: sugestaoAnterior.fornecedor_user_id,
        status: 'pendente',
        autor_tipo: 'lojista',
        observacao_lojista: observacao || null,
      })
      .select()
      .single()

    if (sugestaoError || !novaSugestao) {
      console.error('Erro ao criar contra-proposta:', sugestaoError)
      return NextResponse.json({ error: 'Erro ao criar contra-proposta' }, { status: 500 })
    }

    // Inserir itens da contra-proposta
    const sugestaoItens = itens.map(item => ({
      sugestao_id: novaSugestao.id,
      item_pedido_compra_id: item.item_pedido_compra_id,
      quantidade_sugerida: item.quantidade_contra_proposta,
      desconto_percentual: item.desconto_percentual || 0,
      bonificacao_quantidade: item.bonificacao_quantidade || 0,  // Quantidade direta de unidades
    }))

    const { error: itensError } = await supabase
      .from('sugestoes_fornecedor_itens')
      .insert(sugestaoItens)

    if (itensError) {
      console.error('Erro ao inserir itens da contra-proposta:', itensError)
    }

    // Atualizar status do pedido
    await supabase
      .from('pedidos_compra')
      .update({ status_interno: 'contra_proposta_pendente' })
      .eq('id', pedidoId)

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'contra_proposta_enviada',
        descricao: observacao
          ? `Lojista enviou contra-proposta: "${observacao}"`
          : 'Lojista enviou contra-proposta ao fornecedor',
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      sugestao_id: novaSugestao.id,
      message: 'Contra-proposta enviada com sucesso',
    })
  } catch (error) {
    console.error('Erro ao enviar contra-proposta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
