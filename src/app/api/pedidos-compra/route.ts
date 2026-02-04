import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { FRETE_POR_CONTA_MAP, FretePorContaLabel } from '@/types/pedido-compra'

// Helper: retry fetch com delay para erros transientes do Bling
async function fetchBlingWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 1,
  delayMs = 3000
): Promise<Response> {
  let lastResponse = await fetch(url, options)

  for (let attempt = 0; attempt < maxRetries && !lastResponse.ok; attempt++) {
    // Ler body para verificar se e erro transiente
    const errorText = await lastResponse.text()
    const isTransient = lastResponse.status === 400 && (
      errorText.includes('n\\u00e3o existe') ||
      errorText.includes('não existe') ||
      errorText.includes('nao existe')
    )

    if (!isTransient) {
      // Retornar response com body recarregado (nao e transiente, nao faz retry)
      return new Response(errorText, {
        status: lastResponse.status,
        statusText: lastResponse.statusText,
        headers: lastResponse.headers,
      })
    }

    console.log(`Bling retornou erro transiente, retry ${attempt + 1}/${maxRetries} em ${delayMs}ms...`)
    await new Promise(resolve => setTimeout(resolve, delayMs))
    lastResponse = await fetch(url, options)
  }

  return lastResponse
}

// Interface para item do pedido
interface ItemPedidoRequest {
  descricao: string
  codigoFornecedor?: string  // Codigo do produto no fornecedor
  unidade: string
  valor: number
  quantidade: number
  aliquotaIPI?: number
  produto_id?: number  // ID interno do Supabase (para FK em itens_pedido_compra)
  produto?: {
    id: number  // id_produto_bling (para API Bling)
    codigo?: string
  }
}

// Interface para parcela
interface ParcelaRequest {
  valor: number
  dataVencimento: string
  observacao?: string
  formaPagamento?: {
    id: number  // id_forma_de_pagamento_bling
  }
}

// Interface para o corpo da requisicao
interface PedidoCompraRequest {
  fornecedor_id: number        // ID interno (Supabase)
  fornecedor_id_bling: number  // ID Bling do fornecedor
  data: string
  dataPrevista?: string
  totalProdutos: number
  total: number
  desconto?: number
  frete?: number
  transportador?: string
  fretePorConta?: string
  observacoes?: string
  observacoesInternas?: string
  ordemCompra?: string
  totalIcms?: number
  totalIpi?: number
  pesoBruto?: number
  volumes?: number
  politicaId?: number  // ID da politica de compra selecionada
  itens: ItemPedidoRequest[]
  parcelas?: ParcelaRequest[]
}

// Interface para resposta do Bling
interface BlingPedidoCompraResponse {
  data: {
    id: number
    numero?: number
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
    throw new Error('Bling nao conectado. Conecte sua conta Bling primeiro.')
  }

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()

  // Se o token expirou ou vai expirar em 5 minutos, renovar
  if (expiresAt < new Date(now.getTime() + 5 * 60 * 1000)) {
    try {
      const newTokens = await refreshBlingTokens(tokens.refresh_token)

      // Atualizar tokens no banco
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
    } catch (err) {
      console.error('Erro ao renovar token Bling:', err)
      throw new Error('Erro ao renovar token do Bling. Reconecte sua conta.')
    }
  }

  return tokens.access_token
}

// Funcao para obter o proximo numero de pedido de compra
async function getNextNumeroPedido(empresaId: number, supabase: ReturnType<typeof createServerSupabaseClient>): Promise<number> {
  const { data, error } = await supabase
    .from('pedidos_compra')
    .select('numero')
    .eq('empresa_id', empresaId)
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return 1
  }

  return (parseInt(data.numero, 10) || 0) + 1
}

// Funcao para montar o payload do Bling
function buildBlingPayload(data: PedidoCompraRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    data: data.data,
    // Nota: totalProdutos e total sao calculados automaticamente pelo Bling
    fornecedor: { id: data.fornecedor_id_bling },
    situacao: { valor: 0 }, // Em aberto (Registrada)
    itens: data.itens.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemPayload: Record<string, any> = {
        descricao: item.descricao,
        unidade: item.unidade || 'UN',
        valor: item.valor,
        quantidade: item.quantidade,
        aliquotaIPI: item.aliquotaIPI || 0,
      }

      // Codigo do produto no fornecedor
      if (item.codigoFornecedor) {
        itemPayload.codigoFornecedor = item.codigoFornecedor
      }

      if (item.produto?.id) {
        itemPayload.produto = {
          id: Number(item.produto.id),
        }
        if (item.produto.codigo) {
          itemPayload.produto.codigo = item.produto.codigo
        }
      }

      return itemPayload
    }),
  }

  // Campos opcionais
  if (data.dataPrevista) {
    payload.dataPrevista = data.dataPrevista
  }

  if (data.ordemCompra) {
    payload.ordemCompra = data.ordemCompra
  }

  if (data.observacoes) {
    payload.observacoes = data.observacoes
  }

  if (data.observacoesInternas) {
    payload.observacoesInternas = data.observacoesInternas
  }

  // Desconto
  if (data.desconto && data.desconto > 0) {
    payload.desconto = {
      valor: data.desconto,
      unidade: 'REAL',
    }
  }

  // Tributacao
  if (data.totalIcms && data.totalIcms > 0) {
    payload.tributacao = {
      totalICMS: data.totalIcms,
    }
  }

  // Transporte
  if (data.frete || data.transportador || data.fretePorConta) {
    payload.transporte = {}

    // Se CIF ou SEM_FRETE, o frete NAO deve ser enviado ao Bling
    // pois ja esta incluso no preco ou nao existe transporte
    const freteNaoSoma = data.fretePorConta === 'CIF' || data.fretePorConta === 'SEM_FRETE'

    if (data.frete && !freteNaoSoma) {
      payload.transporte.frete = data.frete
    }
    if (data.transportador) {
      payload.transporte.transportador = data.transportador
    }
    if (data.fretePorConta) {
      // Usar mapeamento completo para todos os tipos de frete do Bling
      payload.transporte.fretePorConta = FRETE_POR_CONTA_MAP[data.fretePorConta as FretePorContaLabel] ?? 0
    }
    if (data.pesoBruto) {
      payload.transporte.pesoBruto = data.pesoBruto
    }
    if (data.volumes) {
      payload.transporte.volumes = data.volumes
    }
  }

  // Parcelas
  if (data.parcelas && data.parcelas.length > 0) {
    payload.parcelas = data.parcelas.map(p => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parcelaPayload: Record<string, any> = {
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        observacao: p.observacao || '',
      }
      // Adiciona forma de pagamento se informada
      if (p.formaPagamento?.id) {
        parcelaPayload.formaPagamento = { id: p.formaPagamento.id }
      }
      return parcelaPayload
    })
  }

  return payload
}

// POST - Criar novo pedido de compra
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: PedidoCompraRequest = await request.json()
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Validacoes basicas
    if (!body.fornecedor_id || !body.fornecedor_id_bling) {
      return NextResponse.json(
        { error: 'Fornecedor e obrigatorio e deve estar sincronizado com Bling' },
        { status: 400 }
      )
    }

    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json({ error: 'Pedido deve ter pelo menos um item' }, { status: 400 })
    }

    // 1. Obter token do Bling
    let accessToken: string
    try {
      accessToken = await getBlingAccessToken(empresaId, supabase)
    } catch (err) {
      console.error('Erro ao obter token Bling:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erro ao conectar com Bling' },
        { status: 400 }
      )
    }

    // 2. Montar payload do Bling (sem numeroPedido inicialmente)
    const blingPayload = buildBlingPayload(body)
    console.log('Payload Bling:', JSON.stringify(blingPayload, null, 2))

    // 3. POST para Bling (com retry para erros transientes)
    let blingResponse = await fetchBlingWithRetry(`${BLING_CONFIG.apiUrl}/pedidos/compras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(blingPayload),
    })

    // 3.1 Se Bling exigir numeroPedido (numeracao manual), retry com numero
    if (!blingResponse.ok) {
      const errorText = await blingResponse.text()
      let needsNumero = false

      try {
        const errorJson = JSON.parse(errorText)
        const fields = errorJson.error?.fields || []
        needsNumero = fields.some((f: { element?: string }) => f.element === 'numeroPedido')
      } catch { /* ignore parse error */ }

      if (needsNumero) {
        console.log('Bling exige numeroPedido, buscando proximo numero...')
        const nextNumero = await getNextNumeroPedido(empresaId, supabase)
        const retryPayload = { ...blingPayload, numeroPedido: nextNumero }
        console.log('Retry com numeroPedido:', nextNumero)

        blingResponse = await fetch(`${BLING_CONFIG.apiUrl}/pedidos/compras`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(retryPayload),
        })
      }

      if (!blingResponse.ok) {
        const retryErrorText = needsNumero ? await blingResponse.text() : errorText
        console.error('Erro Bling API:', blingResponse.status, retryErrorText)

        let errorMessage = 'Erro ao criar pedido no Bling'
        try {
          const errorJson = JSON.parse(retryErrorText)
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message
          } else if (errorJson.error?.description) {
            errorMessage = errorJson.error.description
          }
        } catch {
          errorMessage = retryErrorText || 'Erro desconhecido do Bling'
        }

        return NextResponse.json(
          { error: errorMessage, details: retryErrorText },
          { status: 400 }
        )
      }
    }

    const blingData: BlingPedidoCompraResponse = await blingResponse.json()
    const blingId = blingData.data.id
    const numeroPedido = blingData.data.numero

    console.log('Pedido criado no Bling:', { blingId, numeroPedido })

    // 4. Estornar contas automaticamente (Bling cria contas a pagar ao enviar parcelas)
    // Isso evita que o pedido gere contas a pagar indesejadas
    let estornoWarning: string | null = null
    try {
      const estornoResponse = await fetch(`${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}/estornar-contas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      })

      if (estornoResponse.ok) {
        console.log('Contas estornadas com sucesso para pedido:', blingId)
      } else {
        const estornoError = await estornoResponse.text()
        console.warn('Aviso: Nao foi possivel estornar contas:', estornoError)
        estornoWarning = 'Nao foi possivel estornar contas a pagar automaticamente. Verifique no Bling.'
      }
    } catch (estornoErr) {
      console.warn('Aviso: Erro ao tentar estornar contas:', estornoErr)
      estornoWarning = 'Nao foi possivel estornar contas a pagar automaticamente. Verifique no Bling.'
    }

    // 5. Preparar itens para RPC (JSONB - sem JSON.stringify)
    // produto_id = ID interno Supabase (para FK em itens_pedido_compra)
    // produto.id = id_produto_bling (para referencia)
    const itensRPC = body.itens.map(item => ({
      descricao: item.descricao,
      codigo_fornecedor: item.codigoFornecedor || item.produto?.codigo || '',
      unidade: item.unidade || 'UN',
      valor: item.valor,
      quantidade: item.quantidade,
      aliquotaIPI: item.aliquotaIPI || 0,
      produto_id: item.produto_id || null, // ID interno para FK
      produto: item.produto ? {
        id: item.produto.id, // id_produto_bling
        codigo: item.produto.codigo,
      } : null,
    }))

    // 5. Preparar parcelas para RPC (se houver)
    const parcelasRPC = body.parcelas && body.parcelas.length > 0
      ? body.parcelas.map(p => ({
          valor: p.valor,
          data_vencimento: p.dataVencimento,
          observacao: p.observacao || '',
          forma_pagamento_id: p.formaPagamento?.id || null,
        }))
      : null

    // 6. Salvar no Supabase com bling_id
    const { data: pedido, error } = await supabase.rpc('flowb2b_add_pedido_compra', {
      p_empresa_id: empresaId,
      p_fornecedor_id: body.fornecedor_id,
      p_bling_id: blingId,
      p_numero: numeroPedido,
      p_data: body.data,
      p_data_prevista: body.dataPrevista || null,
      p_situacao: 0, // Em aberto (Registrada)
      p_total_produtos: body.totalProdutos,
      p_total: body.total,
      p_desconto: body.desconto || 0,
      p_frete: body.frete || 0,
      p_total_icms: body.totalIcms || 0,
      p_total_ipi: body.totalIpi || 0,
      p_transportador: body.transportador || null,
      p_frete_por_conta: body.fretePorConta || 'CIF',
      p_peso_bruto: body.pesoBruto || 0,
      p_volumes: body.volumes || 0,
      p_ordem_compra: body.ordemCompra || null,
      p_observacoes: body.observacoes || null,
      p_observacoes_internas: body.observacoesInternas || null,
      p_politica_compra_id: body.politicaId || null,
      p_itens: itensRPC,
      p_parcelas: parcelasRPC,
    })

    if (error) {
      console.error('Erro ao salvar no Supabase:', error)
      // Pedido ja foi criado no Bling, retornar warning
      const warnings = [
        'Pedido criado no Bling mas houve erro ao salvar localmente.',
        estornoWarning,
      ].filter(Boolean).join(' ')

      return NextResponse.json({
        success: true,
        warning: warnings,
        bling_id: blingId,
        numero: numeroPedido,
        supabase_error: error.message,
      })
    }

    const pedidoId = typeof pedido === 'object' ? pedido?.pedido_id : pedido

    // Se teve warning de estorno, retornar como warning (yellow alert)
    if (estornoWarning) {
      return NextResponse.json({
        success: true,
        warning: estornoWarning,
        id: pedidoId,
        bling_id: blingId,
        numero: numeroPedido,
      })
    }

    return NextResponse.json({
      success: true,
      id: pedidoId,
      bling_id: blingId,
      numero: numeroPedido,
      message: 'Pedido criado com sucesso no Bling e Supabase',
    })

  } catch (error) {
    console.error('Erro ao criar pedido de compra:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar pedido de compra' },
      { status: 500 }
    )
  }
}
