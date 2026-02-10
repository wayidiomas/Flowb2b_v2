import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch } from '@/lib/bling-fetch'

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

// Funcao para sincronizar status com Bling (com retry para rate limit)
async function syncBlingStatus(blingId: number, situacao: number, accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await blingFetch(
      `${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}/situacoes/${situacao}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      },
      { context: 'sincronizar status sugestao', maxRetries: 3 }
    )

    if (result.response.ok) {
      if (result.hadRateLimit) {
        console.log(`Status sincronizado apos ${result.retriesUsed} retries por rate limit`)
      }
      return { success: true }
    } else {
      const errorText = await result.response.text()
      return { success: false, error: errorText }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}

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

    // Buscar sugestoes com itens e condicoes comerciais
    const { data: sugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select(`
        id, status, observacao_fornecedor, observacao_lojista, created_at,
        valor_minimo_pedido, desconto_geral, bonificacao_geral,
        prazo_entrega_dias, validade_proposta, autor_tipo,
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
    const { action, observacao, sugestao_id }: { action: 'aceitar' | 'rejeitar' | 'manter_original'; observacao?: string; sugestao_id: number } = body

    if (!action || !sugestao_id) {
      return NextResponse.json({ error: 'Acao e sugestao_id sao obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar pedido pertence a empresa
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, bling_id, situacao')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    const empresaId = user.empresaId

    // Verificar sugestao existe e esta pendente COM condicoes comerciais
    const { data: sugestao } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, valor_minimo_pedido, desconto_geral, bonificacao_geral')
      .eq('id', sugestao_id)
      .eq('pedido_compra_id', pedidoId)
      .single()

    if (!sugestao || sugestao.status !== 'pendente') {
      return NextResponse.json({ error: 'Sugestao nao encontrada ou ja processada' }, { status: 400 })
    }

    if (action === 'aceitar') {
      // Buscar itens da sugestao COM desconto e bonificacao
      const { data: sugestaoItens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', sugestao_id)

      // Aplicar sugestao: atualizar itens do pedido COM desconto e bonificacao
      if (sugestaoItens && sugestaoItens.length > 0) {
        // Primeiro, buscar os itens atuais para calcular valores
        const { data: itensAtuais } = await supabase
          .from('itens_pedido_compra')
          .select('id, valor, quantidade')
          .eq('pedido_compra_id', pedidoId)

        const itensMap = new Map((itensAtuais || []).map(i => [i.id, i]))

        // Atualizar cada item com quantidade, desconto aplicado e bonificacao
        for (const sItem of sugestaoItens) {
          if (sItem.item_pedido_compra_id) {
            const itemAtual = itensMap.get(sItem.item_pedido_compra_id)
            if (itemAtual) {
              // Calcular valor com desconto
              const descontoItem = sItem.desconto_percentual || 0
              const valorComDesconto = itemAtual.valor * (1 - descontoItem / 100)

              // Calcular quantidade bonificada (gratis)
              const bonifItem = sItem.bonificacao_percentual || 0
              const qtdBonificacao = Math.floor(sItem.quantidade_sugerida * bonifItem / 100)

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

        // Recalcular total do pedido COM DESCONTO APLICADO
        const { data: itensAtualizados } = await supabase
          .from('itens_pedido_compra')
          .select('id, valor, quantidade, valor_unitario_final')
          .eq('pedido_compra_id', pedidoId)

        // Calcular total usando valor_unitario_final quando disponivel
        let novoTotalProdutos = (itensAtualizados || []).reduce((sum, item) => {
          // Usar valor_unitario_final se existir (desconto aplicado), senao valor original
          const valorEfetivo = item.valor_unitario_final ?? item.valor
          return sum + valorEfetivo * item.quantidade
        }, 0)

        // Aplicar desconto geral se atingir valor minimo
        let descontoGeralAplicado = 0
        const valorMinimo = sugestao.valor_minimo_pedido || 0
        const descontoGeral = sugestao.desconto_geral || 0

        if (valorMinimo > 0 && novoTotalProdutos >= valorMinimo && descontoGeral > 0) {
          descontoGeralAplicado = novoTotalProdutos * (descontoGeral / 100)
          novoTotalProdutos = novoTotalProdutos - descontoGeralAplicado
        }

        // Preparar dados de atualizacao
        const updateData: Record<string, unknown> = {
          total_produtos: novoTotalProdutos,
          total: novoTotalProdutos,
          status_interno: 'aceito',
        }

        // Sincronizar com Bling - mudar para "Em Andamento" (3)
        let blingSyncSuccess = false
        let blingSyncError = ''

        if (pedido.bling_id && pedido.situacao !== 1 && pedido.situacao !== 2) {
          const accessToken = await getBlingAccessToken(empresaId, supabase)
          if (accessToken) {
            const syncResult = await syncBlingStatus(pedido.bling_id, 3, accessToken)
            blingSyncSuccess = syncResult.success
            if (!syncResult.success) {
              blingSyncError = syncResult.error || ''
              console.error('Erro ao sincronizar com Bling:', syncResult.error)
            } else {
              updateData.situacao = 3 // Em Andamento
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
            evento: 'sugestao_aceita',
            descricao: observacao
              ? `Sugestao aceita pelo lojista: "${observacao}"${blingSyncSuccess ? ' (Bling: Em Andamento)' : ''}`
              : `Sugestao do fornecedor foi aceita${blingSyncSuccess ? ' (Bling: Em Andamento)' : ''}`,
            autor_tipo: 'lojista',
            autor_nome: user.email,
          })

        // Se houve erro no Bling, registrar na timeline
        if (blingSyncError) {
          await supabase
            .from('pedido_timeline')
            .insert({
              pedido_compra_id: parseInt(pedidoId),
              evento: 'erro_sync_bling',
              descricao: `Falha ao sincronizar status com Bling: ${blingSyncError}`,
              autor_tipo: 'sistema',
              autor_nome: 'FlowB2B',
            })
        }
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

    if (action === 'manter_original') {
      // Rejeita a sugestao mas mantem o pedido original para continuar o fluxo
      // Diferente de 'rejeitar' que encerra o pedido

      // Marcar sugestao como rejeitada
      await supabase
        .from('sugestoes_fornecedor')
        .update({
          status: 'rejeitada',
          observacao_lojista: observacao || 'Lojista optou por manter pedido original',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sugestao_id)

      // Sincronizar com Bling - mudar para "Em Andamento" (3)
      let blingSyncSuccess = false
      let blingSyncError = ''

      if (pedido.bling_id && pedido.situacao !== 1 && pedido.situacao !== 2) {
        const accessToken = await getBlingAccessToken(empresaId, supabase)
        if (accessToken) {
          const syncResult = await syncBlingStatus(pedido.bling_id, 3, accessToken)
          blingSyncSuccess = syncResult.success
          if (!syncResult.success) {
            blingSyncError = syncResult.error || ''
            console.error('Erro ao sincronizar com Bling:', syncResult.error)
          }
        }
      }

      // Atualizar status do pedido para aceito (continua o fluxo)
      const updateData: Record<string, unknown> = {
        status_interno: 'aceito',
      }
      if (blingSyncSuccess) {
        updateData.situacao = 3 // Em Andamento
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
          evento: 'sugestao_rejeitada_manter_original',
          descricao: observacao
            ? `Sugestao rejeitada, mantendo pedido original: "${observacao}"${blingSyncSuccess ? ' (Bling: Em Andamento)' : ''}`
            : `Sugestao do fornecedor rejeitada - pedido original mantido${blingSyncSuccess ? ' (Bling: Em Andamento)' : ''}`,
          autor_tipo: 'lojista',
          autor_nome: user.email,
        })

      // Se houve erro no Bling, registrar na timeline
      if (blingSyncError) {
        await supabase
          .from('pedido_timeline')
          .insert({
            pedido_compra_id: parseInt(pedidoId),
            evento: 'erro_sync_bling',
            descricao: `Falha ao sincronizar status com Bling: ${blingSyncError}`,
            autor_tipo: 'sistema',
            autor_nome: 'FlowB2B',
          })
      }

      return NextResponse.json({
        success: true,
        message: 'Sugestao rejeitada, pedido original mantido para processamento'
      })
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
