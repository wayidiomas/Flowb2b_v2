import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// GET - Listar sugestoes de um pedido (para o lojista)
export async function GET(
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

    // Verificar que o pedido pertence a empresa do lojista
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Buscar sugestoes com itens
    const { data: sugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select(`
        id, status, observacao_fornecedor, observacao_lojista, created_at,
        users_fornecedor!inner(nome, email)
      `)
      .eq('pedido_compra_id', pedidoId)
      .order('created_at', { ascending: false })

    // Para a sugestao mais recente pendente, buscar itens
    const pendente = (sugestoes || []).find(s => s.status === 'pendente')
    let sugestaoItens = null
    if (pendente) {
      const { data: itens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', pendente.id)

      sugestaoItens = itens
    }

    return NextResponse.json({
      sugestoes: sugestoes || [],
      sugestaoItens,
      statusInterno: pedido.status_interno,
    })
  } catch (error) {
    console.error('Erro ao listar sugestoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Aceitar ou rejeitar sugestao
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
    const body = await request.json()
    const { action, observacao, sugestao_id }: { action: 'aceitar' | 'rejeitar'; observacao?: string; sugestao_id: number } = body

    if (!action || !sugestao_id) {
      return NextResponse.json({ error: 'Acao e sugestao_id sao obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar pedido pertence a empresa
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar sugestao existe e esta pendente
    const { data: sugestao } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status')
      .eq('id', sugestao_id)
      .eq('pedido_compra_id', pedidoId)
      .single()

    if (!sugestao || sugestao.status !== 'pendente') {
      return NextResponse.json({ error: 'Sugestao nao encontrada ou ja processada' }, { status: 400 })
    }

    if (action === 'aceitar') {
      // Buscar itens da sugestao
      const { data: sugestaoItens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', sugestao_id)

      // Aplicar sugestao: atualizar itens do pedido
      if (sugestaoItens && sugestaoItens.length > 0) {
        for (const sItem of sugestaoItens) {
          if (sItem.item_pedido_compra_id) {
            await supabase
              .from('itens_pedido_compra')
              .update({ quantidade: sItem.quantidade_sugerida })
              .eq('id', sItem.item_pedido_compra_id)
          }
        }

        // Recalcular total do pedido
        const { data: itensAtualizados } = await supabase
          .from('itens_pedido_compra')
          .select('valor, quantidade')
          .eq('pedido_compra_id', pedidoId)

        const novoTotal = (itensAtualizados || []).reduce(
          (sum, item) => sum + item.valor * item.quantidade,
          0
        )

        await supabase
          .from('pedidos_compra')
          .update({
            total_produtos: novoTotal,
            total: novoTotal, // Simplificado - sem recalcular frete/desconto
            status_interno: 'aceito',
          })
          .eq('id', pedidoId)
      }

      // Marcar sugestao como aceita
      await supabase
        .from('sugestoes_fornecedor')
        .update({
          status: 'aceita',
          observacao_lojista: observacao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sugestao_id)

      // Timeline
      await supabase
        .from('pedido_timeline')
        .insert({
          pedido_compra_id: parseInt(pedidoId),
          evento: 'sugestao_aceita',
          descricao: observacao
            ? `Sugestao aceita pelo lojista: "${observacao}"`
            : 'Sugestao do fornecedor foi aceita',
          autor_tipo: 'lojista',
          autor_nome: user.email,
        })

      return NextResponse.json({ success: true, message: 'Sugestao aceita com sucesso' })
    }

    if (action === 'rejeitar') {
      // Marcar sugestao como rejeitada
      await supabase
        .from('sugestoes_fornecedor')
        .update({
          status: 'rejeitada',
          observacao_lojista: observacao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sugestao_id)

      // Atualizar status do pedido
      await supabase
        .from('pedidos_compra')
        .update({ status_interno: 'rejeitado' })
        .eq('id', pedidoId)

      // Timeline
      await supabase
        .from('pedido_timeline')
        .insert({
          pedido_compra_id: parseInt(pedidoId),
          evento: 'sugestao_rejeitada',
          descricao: observacao
            ? `Sugestao rejeitada: "${observacao}"`
            : 'Sugestao do fornecedor foi rejeitada',
          autor_tipo: 'lojista',
          autor_nome: user.email,
        })

      return NextResponse.json({ success: true, message: 'Sugestao rejeitada' })
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
