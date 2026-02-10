import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'

// Funcao para obter e validar o token do Bling
async function getBlingAccessToken(empresaId: number, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: tokens, error } = await supabase
    .from('bling_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('empresa_id', empresaId)
    .single()

  if (error || !tokens) {
    return null
  }

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()

  if (expiresAt < new Date(now.getTime() + 5 * 60 * 1000)) {
    try {
      const newTokens = await refreshBlingTokens(tokens.refresh_token)
      await supabase
        .from('bling_tokens')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('empresa_id', empresaId)
      return newTokens.access_token
    } catch {
      return null
    }
  }

  return tokens.access_token
}

// Funcao para sincronizar status com Bling
async function syncBlingStatus(blingId: number, situacao: number, accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}/situacoes/${situacao}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (response.ok) {
      return { success: true }
    } else {
      const errorText = await response.text()
      return { success: false, error: errorText }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}

// POST - Fornecedor aceita ou rejeita contra-proposta do lojista
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const body = await request.json()
    const { action, observacao, sugestao_id }: { action: 'aceitar' | 'rejeitar'; observacao?: string; sugestao_id: number } = body

    if (!action || !sugestao_id) {
      return NextResponse.json({ error: 'Acao e sugestao_id sao obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar que o pedido pertence a um fornecedor com o CNPJ do usuario
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Verificar pedido
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, bling_id, situacao, empresa_id')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar sugestao existe, eh contra-proposta (autor_tipo=lojista) e esta pendente
    const { data: sugestao } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, autor_tipo')
      .eq('id', sugestao_id)
      .eq('pedido_compra_id', pedidoId)
      .single()

    if (!sugestao || sugestao.status !== 'pendente' || sugestao.autor_tipo !== 'lojista') {
      return NextResponse.json({ error: 'Contra-proposta nao encontrada ou ja processada' }, { status: 400 })
    }

    // Buscar nome do usuario fornecedor
    const { data: fornecedorUser } = await supabase
      .from('users_fornecedor')
      .select('nome')
      .eq('id', user.fornecedorUserId)
      .single()

    const autorNome = fornecedorUser?.nome || user.email

    if (action === 'aceitar') {
      // Buscar itens da contra-proposta
      const { data: sugestaoItens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', sugestao_id)

      // Aplicar contra-proposta: atualizar itens do pedido
      if (sugestaoItens && sugestaoItens.length > 0) {
        // Primeiro, buscar os itens atuais para calcular valores
        const { data: itensAtuais } = await supabase
          .from('itens_pedido_compra')
          .select('id, valor, quantidade')
          .eq('pedido_compra_id', pedidoId)

        const itensMap = new Map((itensAtuais || []).map(i => [i.id, i]))

        // Atualizar cada item
        for (const sItem of sugestaoItens) {
          if (sItem.item_pedido_compra_id) {
            const itemAtual = itensMap.get(sItem.item_pedido_compra_id)
            if (itemAtual) {
              const descontoItem = sItem.desconto_percentual || 0
              const valorComDesconto = itemAtual.valor * (1 - descontoItem / 100)
              // bonificacao_quantidade eh quantidade direta de unidades, nao percentual
              const qtdBonificacao = sItem.bonificacao_quantidade || 0

              await supabase
                .from('itens_pedido_compra')
                .update({
                  quantidade: sItem.quantidade_sugerida,
                  valor_unitario_final: valorComDesconto,
                  quantidade_bonificacao: qtdBonificacao,
                })
                .eq('id', sItem.item_pedido_compra_id)
            }
          }
        }

        // Recalcular total
        const { data: itensAtualizados } = await supabase
          .from('itens_pedido_compra')
          .select('id, valor, quantidade, valor_unitario_final')
          .eq('pedido_compra_id', pedidoId)

        const novoTotal = (itensAtualizados || []).reduce((sum, item) => {
          const valorEfetivo = item.valor_unitario_final ?? item.valor
          return sum + valorEfetivo * item.quantidade
        }, 0)

        // Preparar dados de atualizacao
        const updateData: Record<string, unknown> = {
          total_produtos: novoTotal,
          total: novoTotal,
          status_interno: 'aceito',
        }

        // Sincronizar com Bling - mudar para "Em Andamento" (3)
        let blingSyncSuccess = false
        if (pedido.bling_id && pedido.situacao !== 1 && pedido.situacao !== 2) {
          const accessToken = await getBlingAccessToken(pedido.empresa_id, supabase)
          if (accessToken) {
            const syncResult = await syncBlingStatus(pedido.bling_id, 3, accessToken)
            blingSyncSuccess = syncResult.success
            if (syncResult.success) {
              updateData.situacao = 3
            }
          }
        }

        await supabase
          .from('pedidos_compra')
          .update(updateData)
          .eq('id', pedidoId)

        // Timeline
        await supabase
          .from('pedido_timeline')
          .insert({
            pedido_compra_id: parseInt(pedidoId),
            evento: 'contra_proposta_aceita',
            descricao: observacao
              ? `Fornecedor aceitou contra-proposta: "${observacao}"${blingSyncSuccess ? ' (Bling: Em Andamento)' : ''}`
              : `Fornecedor aceitou a contra-proposta do lojista${blingSyncSuccess ? ' (Bling: Em Andamento)' : ''}`,
            autor_tipo: 'fornecedor',
            autor_nome: autorNome,
          })
      }

      // Marcar contra-proposta como aceita
      await supabase
        .from('sugestoes_fornecedor')
        .update({
          status: 'aceita',
          observacao_fornecedor: observacao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sugestao_id)

      return NextResponse.json({ success: true, message: 'Contra-proposta aceita com sucesso' })
    }

    if (action === 'rejeitar') {
      // Marcar contra-proposta como rejeitada
      await supabase
        .from('sugestoes_fornecedor')
        .update({
          status: 'rejeitada',
          observacao_fornecedor: observacao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sugestao_id)

      // Buscar a ultima sugestao do fornecedor (rejeitada quando lojista enviou contra-proposta)
      // e reativar ela para que o lojista possa aceitar ou manter original
      const { data: ultimaSugestaoFornecedor } = await supabase
        .from('sugestoes_fornecedor')
        .select('id')
        .eq('pedido_compra_id', pedidoId)
        .eq('autor_tipo', 'fornecedor')
        .eq('status', 'rejeitada')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (ultimaSugestaoFornecedor) {
        // Reativar a sugestao do fornecedor
        await supabase
          .from('sugestoes_fornecedor')
          .update({
            status: 'pendente',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ultimaSugestaoFornecedor.id)
      }

      // Voltar para sugestao_pendente - NAO permite mais negociacao
      // O lojista so pode: aceitar, manter original, ou cancelar
      await supabase
        .from('pedidos_compra')
        .update({ status_interno: 'sugestao_pendente' })
        .eq('id', pedidoId)

      // Timeline
      await supabase
        .from('pedido_timeline')
        .insert({
          pedido_compra_id: parseInt(pedidoId),
          evento: 'contra_proposta_rejeitada',
          descricao: observacao
            ? `Fornecedor rejeitou contra-proposta: "${observacao}" - Negociacao encerrada`
            : 'Fornecedor rejeitou a contra-proposta - Negociacao encerrada',
          autor_tipo: 'fornecedor',
          autor_nome: autorNome,
        })

      return NextResponse.json({ success: true, message: 'Contra-proposta rejeitada - negociacao encerrada' })
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar contra-proposta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
