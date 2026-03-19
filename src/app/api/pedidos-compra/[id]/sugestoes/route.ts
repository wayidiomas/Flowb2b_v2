import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch } from '@/lib/bling-fetch'
import { logActivity } from '@/lib/activity-log'

// ============================================================
// Funcoes auxiliares para resolucao de produtos (troca/novos)
// ============================================================

/**
 * Resolve um produto pelo EAN (gtin) ou codigo_fornecedor.
 * Retorna produto_id, nome e valor se encontrado, null caso contrario.
 */
async function resolverProduto(
  gtin: string | null,
  codigoFornecedor: string | null,
  empresaId: number,
  fornecedorId: number,
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<{ produto_id: number; nome: string; valor: number } | null> {
  // 1. Tentar por EAN
  if (gtin) {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco')
      .eq('gtin', gtin)
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle()
    if (data) return { produto_id: data.id, nome: data.nome, valor: data.preco || 0 }
  }

  // 2. Tentar por codigo do fornecedor
  if (codigoFornecedor) {
    const { data } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, produtos!inner(id, nome, preco)')
      .eq('codigo_fornecedor', codigoFornecedor)
      .eq('empresa_id', empresaId)
      .eq('fornecedor_id', fornecedorId)
      .limit(1)
      .maybeSingle()
    if (data) {
      const produto = data.produtos as unknown as { id: number; nome: string; preco: number | null }
      return {
        produto_id: data.produto_id,
        nome: produto.nome,
        valor: produto.preco || 0,
      }
    }
  }

  return null // Nao encontrou — precisa vincular no Bling
}

/**
 * Cria/resolve produto no Bling e Supabase quando nao existe na empresa do pedido.
 *
 * Cenarios cobertos:
 * A) Produto existe na empresa do pedido mas sem vinculo ao fornecedor → vincula
 * B) Produto existe em outra empresa mas nao nessa → copia + cria no Bling + vincula
 * C) Produto nao existe em nenhuma empresa → cria do zero no Bling + vincula
 *
 * Best-effort: se Bling falhar, cria localmente. Nunca bloqueia o aceite.
 */
async function vincularProdutoBling(
  gtin: string | null,
  codigoFornecedor: string | null,
  produtoNome: string | null,
  valorSugerido: number,
  empresaId: number,
  fornecedorId: number,
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<{ produto_id: number | null; nome: string; valor: number }> {
  const fallback = { produto_id: null, nome: produtoNome || 'Produto sugerido', valor: valorSugerido }

  try {
    // Buscar dados do fornecedor (id_bling) para vincular depois
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id_bling')
      .eq('id', fornecedorId)
      .eq('empresa_id', empresaId)
      .single()

    // Helper: vincular produto ao fornecedor no Bling + Supabase
    async function vincularAoFornecedor(produtoId: number, idProdutoBling: number | null) {
      // Vincular no Bling (best-effort)
      if (idProdutoBling && fornecedor?.id_bling) {
        try {
          const accessToken = await getBlingAccessToken(empresaId, supabase)
          if (accessToken) {
            const blingPayload: Record<string, unknown> = {
              produto: { id: idProdutoBling },
              fornecedor: { id: fornecedor.id_bling },
            }
            if (codigoFornecedor) blingPayload.codigo = codigoFornecedor
            if (valorSugerido > 0) blingPayload.precoCompra = valorSugerido

            const result = await blingFetch(
              `${BLING_CONFIG.apiUrl}/produtos/fornecedores`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(blingPayload),
              },
              { context: 'vincular produto-fornecedor (sugestao)', maxRetries: 2 }
            )
            if (!result.response.ok) {
              const errorText = await result.response.text()
              console.warn(`[vincular] Bling vinculacao erro: ${result.response.status} - ${errorText}`)
            }
          }
        } catch (blingErr) {
          console.warn('[vincular] Falha ao vincular no Bling (best-effort):', blingErr)
        }
      }

      // Vincular no Supabase
      await supabase
        .from('fornecedores_produtos')
        .upsert({
          produto_id: produtoId,
          fornecedor_id: fornecedorId,
          empresa_id: empresaId,
          valor_de_compra: valorSugerido > 0 ? valorSugerido : null,
          codigo_fornecedor: codigoFornecedor || null,
        }, { onConflict: 'fornecedor_id,produto_id' })
    }

    // Helper: criar produto no Bling da empresa
    async function criarProdutoNoBling(dados: {
      nome: string; codigo?: string | null; preco?: number | null; unidade?: string | null;
      gtin?: string | null; marca?: string | null; tipo?: string | null;
      formato?: string | null; peso_liquido?: number | null; peso_bruto?: number | null;
    }): Promise<number | null> {
      try {
        const accessToken = await getBlingAccessToken(empresaId, supabase)
        if (!accessToken) return null

        const blingPayload: Record<string, unknown> = {
          nome: dados.nome,
          tipo: dados.tipo || 'P',
          situacao: 'A',
          formato: dados.formato || 'S',
        }
        if (dados.codigo) blingPayload.codigo = dados.codigo
        if (dados.preco) blingPayload.preco = dados.preco
        if (dados.unidade) blingPayload.unidade = dados.unidade
        if (dados.gtin) blingPayload.gtin = dados.gtin
        if (dados.marca) blingPayload.marca = dados.marca
        if (dados.peso_liquido) blingPayload.pesoLiquido = dados.peso_liquido
        if (dados.peso_bruto) blingPayload.pesoBruto = dados.peso_bruto

        const result = await blingFetch(
          `${BLING_CONFIG.apiUrl}/produtos`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(blingPayload),
          },
          { context: 'criar produto (sugestao fornecedor)', maxRetries: 2 }
        )

        if (result.response.ok) {
          const blingData = await result.response.json()
          return blingData?.data?.id || null
        } else {
          const errorText = await result.response.text()
          console.warn(`[criarProdutoBling] Bling criacao erro: ${result.response.status} - ${errorText}`)
          return null
        }
      } catch (err) {
        console.warn('[criarProdutoBling] Falha ao criar no Bling (best-effort):', err)
        return null
      }
    }

    // ──────────────────────────────────────────────
    // 1. Buscar produto pelo EAN na empresa do pedido
    // ──────────────────────────────────────────────
    if (gtin) {
      const { data: produtoLocal } = await supabase
        .from('produtos')
        .select('id, id_produto_bling, nome, preco')
        .eq('gtin', gtin)
        .eq('empresa_id', empresaId)
        .limit(1)
        .maybeSingle()

      if (produtoLocal) {
        // CENARIO A: existe na empresa, so precisa vincular ao fornecedor
        const { data: existingLink } = await supabase
          .from('fornecedores_produtos')
          .select('produto_id')
          .eq('produto_id', produtoLocal.id)
          .eq('fornecedor_id', fornecedorId)
          .maybeSingle()

        if (!existingLink) {
          await vincularAoFornecedor(produtoLocal.id, produtoLocal.id_produto_bling)
        }
        return { produto_id: produtoLocal.id, nome: produtoLocal.nome, valor: produtoLocal.preco || valorSugerido }
      }
    }

    // ──────────────────────────────────────────────
    // 2. Buscar em OUTRA empresa pelo EAN (para copiar dados)
    // ──────────────────────────────────────────────
    let produtoOrigem: {
      id: number; nome: string; gtin: string | null; codigo: string | null;
      preco: number | null; tipo: string | null; formato: string | null;
      unidade: string | null; marca: string | null; ncm: string | null;
      peso_liquido: number | null; peso_bruto: number | null;
      itens_por_caixa: number | null;
    } | null = null

    if (gtin) {
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, gtin, codigo, preco, tipo, formato, unidade, marca, ncm, peso_liquido, peso_bruto, itens_por_caixa')
        .eq('gtin', gtin)
        .neq('empresa_id', empresaId)
        .limit(1)
        .maybeSingle()
      produtoOrigem = data
    }

    // Se nao achou por EAN, tentar por codigo_fornecedor em fornecedores_produtos de outra empresa
    if (!produtoOrigem && codigoFornecedor) {
      const { data } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, produtos!inner(id, nome, gtin, codigo, preco, tipo, formato, unidade, marca, ncm, peso_liquido, peso_bruto, itens_por_caixa)')
        .eq('codigo_fornecedor', codigoFornecedor)
        .neq('empresa_id', empresaId)
        .limit(1)
        .maybeSingle()
      if (data?.produtos) {
        const p = Array.isArray(data.produtos) ? data.produtos[0] : data.produtos
        produtoOrigem = p as unknown as typeof produtoOrigem
      }
    }

    // ──────────────────────────────────────────────
    // 3. Criar produto na empresa (CENARIO B ou C)
    // ──────────────────────────────────────────────
    const dadosProduto = {
      nome: produtoOrigem?.nome || produtoNome || 'Produto sugerido',
      gtin: produtoOrigem?.gtin || gtin || null,
      codigo: produtoOrigem?.codigo || codigoFornecedor || gtin || `NOVO-${Date.now()}`,
      preco: valorSugerido || produtoOrigem?.preco || 0,
      tipo: produtoOrigem?.tipo || 'P',
      formato: produtoOrigem?.formato || 'S',
      unidade: produtoOrigem?.unidade || 'UN',
      marca: produtoOrigem?.marca || null,
      ncm: produtoOrigem?.ncm || null,
      peso_liquido: produtoOrigem?.peso_liquido || null,
      peso_bruto: produtoOrigem?.peso_bruto || null,
      itens_por_caixa: produtoOrigem?.itens_por_caixa || null,
    }

    // Criar no Bling
    const idProdutoBling = await criarProdutoNoBling(dadosProduto)

    // Criar no Supabase (tabela produtos)
    const { data: novoProduto, error: produtoError } = await supabase
      .from('produtos')
      .insert({
        nome: dadosProduto.nome,
        gtin: dadosProduto.gtin,
        codigo: dadosProduto.codigo,
        preco: dadosProduto.preco,
        tipo: dadosProduto.tipo,
        formato: dadosProduto.formato,
        unidade: dadosProduto.unidade,
        marca: dadosProduto.marca,
        ncm: dadosProduto.ncm,
        peso_liquido: dadosProduto.peso_liquido,
        peso_bruto: dadosProduto.peso_bruto,
        itens_por_caixa: dadosProduto.itens_por_caixa,
        empresa_id: empresaId,
        situacao: 'A',
        id_produto_bling: idProdutoBling,
      })
      .select('id, nome, preco')
      .single()

    if (produtoError || !novoProduto) {
      console.warn('[vincularProdutoBling] Falha ao criar produto no Supabase:', produtoError)
      return fallback
    }

    console.log(`[vincularProdutoBling] Produto criado: id=${novoProduto.id}, bling_id=${idProdutoBling}, nome=${novoProduto.nome} (empresa_id=${empresaId})`)

    // Vincular ao fornecedor
    await vincularAoFornecedor(novoProduto.id, idProdutoBling)

    return { produto_id: novoProduto.id, nome: novoProduto.nome, valor: novoProduto.preco || valorSugerido }

  } catch (err) {
    console.warn('[vincularProdutoBling] Erro inesperado (best-effort):', err)
    return fallback
  }
}

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
      .eq('is_excluded', false)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Buscar sugestoes com itens e condicoes comerciais
    const { data: sugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select(`
        id, status, observacao_fornecedor, observacao_lojista, created_at,
        valor_minimo_pedido, desconto_geral, bonificacao_quantidade_geral,
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

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

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
      .select('id, status_interno, bling_id, situacao, fornecedor_id')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .eq('is_excluded', false)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    const empresaId = user.empresaId

    // Verificar sugestao existe e esta pendente COM condicoes comerciais
    const { data: sugestao } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, valor_minimo_pedido, desconto_geral, bonificacao_quantidade_geral')
      .eq('id', sugestao_id)
      .eq('pedido_compra_id', pedidoId)
      .single()

    if (!sugestao || sugestao.status !== 'pendente') {
      return NextResponse.json({ error: 'Sugestao nao encontrada ou ja processada' }, { status: 400 })
    }

    if (action === 'aceitar') {
      // Buscar itens da sugestao COM desconto, bonificacao e campos de troca/novo
      const { data: sugestaoItens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', sugestao_id)

      const fornecedorId = pedido.fornecedor_id

      // Aplicar sugestao: atualizar itens do pedido COM desconto e bonificacao
      if (sugestaoItens && sugestaoItens.length > 0) {
        // Primeiro, buscar os itens atuais para calcular valores
        const { data: itensAtuais } = await supabase
          .from('itens_pedido_compra')
          .select('id, valor, quantidade')
          .eq('pedido_compra_id', pedidoId)

        const itensMap = new Map((itensAtuais || []).map(i => [i.id, i]))

        for (const sItem of sugestaoItens) {
          if (sItem.is_novo) {
            // ---- NOVO ITEM: resolver produto e criar item no pedido ----
            let resolved = await resolverProduto(
              sItem.gtin || null,
              sItem.codigo_fornecedor || null,
              empresaId,
              fornecedorId,
              supabase
            )

            if (!resolved) {
              // Tentar vincular no Bling (best-effort)
              const vinculado = await vincularProdutoBling(
                sItem.gtin || null,
                sItem.codigo_fornecedor || null,
                sItem.produto_nome || null,
                sItem.preco_unitario || 0,
                empresaId,
                fornecedorId,
                supabase
              )
              if (vinculado.produto_id) {
                resolved = { produto_id: vinculado.produto_id, nome: vinculado.nome, valor: vinculado.valor }
              } else {
                // Nao conseguiu resolver — criar item sem produto_id linkado
                console.warn(`[aceitar] Item novo sem produto resolvido: gtin=${sItem.gtin}, codigo_fornecedor=${sItem.codigo_fornecedor}`)
              }
            }

            const valorBase = resolved?.valor || sItem.preco_unitario || 0
            const descontoItem = sItem.desconto_percentual || 0
            const valorComDesconto = valorBase * (1 - descontoItem / 100)

            await supabase.from('itens_pedido_compra').insert({
              pedido_compra_id: parseInt(pedidoId),
              produto_id: resolved?.produto_id || null,
              descricao: sItem.produto_nome || resolved?.nome || 'Produto sugerido',
              quantidade: sItem.quantidade_sugerida,
              valor: valorBase,
              valor_unitario_final: valorComDesconto,
              quantidade_bonificacao: sItem.bonificacao_quantidade || 0,
              unidade: 'UN',
            })

          } else if (sItem.is_substituicao && sItem.item_pedido_compra_id) {
            // ---- TROCA: resolver novo produto e atualizar item existente ----
            let resolved = await resolverProduto(
              sItem.gtin || null,
              sItem.codigo_fornecedor || null,
              empresaId,
              fornecedorId,
              supabase
            )

            if (!resolved) {
              // Tentar vincular no Bling (best-effort)
              const vinculado = await vincularProdutoBling(
                sItem.gtin || null,
                sItem.codigo_fornecedor || null,
                sItem.produto_nome || null,
                sItem.preco_unitario || 0,
                empresaId,
                fornecedorId,
                supabase
              )
              if (vinculado.produto_id) {
                resolved = { produto_id: vinculado.produto_id, nome: vinculado.nome, valor: vinculado.valor }
              }
            }

            const itemAtual = itensMap.get(sItem.item_pedido_compra_id)
            const valorBase = resolved?.valor || sItem.preco_unitario || itemAtual?.valor || 0
            const descontoItem = sItem.desconto_percentual || 0
            const valorComDesconto = valorBase * (1 - descontoItem / 100)
            const qtdBonificacao = sItem.bonificacao_quantidade || 0

            const updateData: Record<string, unknown> = {
              quantidade: sItem.quantidade_sugerida,
              valor: valorBase,
              valor_unitario_final: valorComDesconto,
              quantidade_bonificacao: qtdBonificacao,
            }

            if (resolved) {
              updateData.produto_id = resolved.produto_id
              updateData.descricao = resolved.nome
            } else if (sItem.produto_nome) {
              updateData.descricao = sItem.produto_nome
            }

            await supabase
              .from('itens_pedido_compra')
              .update(updateData)
              .eq('id', sItem.item_pedido_compra_id)

          } else if (sItem.item_pedido_compra_id) {
            // ---- NORMAL: fluxo atual (atualiza quantidade/desconto no item existente) ----
            const itemAtual = itensMap.get(sItem.item_pedido_compra_id)
            if (itemAtual) {
              // Calcular valor com desconto
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

        // Recalcular total do pedido COM DESCONTO APLICADO (inclui novos itens)
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
        const valorMinimo = sugestao.valor_minimo_pedido || 0
        const descontoGeral = sugestao.desconto_geral || 0

        if (valorMinimo > 0 && novoTotalProdutos >= valorMinimo && descontoGeral > 0) {
          const descontoGeralAplicado = novoTotalProdutos * (descontoGeral / 100)
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
          .eq('is_excluded', false)

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

      // Log activity - fire and forget
      void logActivity({
        userId: String(user.userId),
        userType: 'lojista',
        userEmail: user.email,
        userNome: user.nome || user.email,
        action: 'sugestao_aceita',
        empresaId: user.empresaId,
        metadata: { pedido_id: pedidoId, empresa_id: user.empresaId, sugestao_id },
      }).catch(console.error)

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
        .eq('is_excluded', false)

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

      // Log activity - fire and forget
      void logActivity({
        userId: String(user.userId),
        userType: 'lojista',
        userEmail: user.email,
        userNome: user.nome || user.email,
        action: 'sugestao_rejeitada',
        empresaId: user.empresaId,
        metadata: { pedido_id: pedidoId, empresa_id: user.empresaId, sugestao_id },
      }).catch(console.error)

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
        .eq('is_excluded', false)

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

      // Log activity - fire and forget
      void logActivity({
        userId: String(user.userId),
        userType: 'lojista',
        userEmail: user.email,
        userNome: user.nome || user.email,
        action: 'sugestao_rejeitada',
        empresaId: user.empresaId,
        metadata: { pedido_id: pedidoId, empresa_id: user.empresaId, sugestao_id, manter_original: true },
      }).catch(console.error)

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
