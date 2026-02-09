import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch, BlingRateLimitError } from '@/lib/bling-fetch'
import { FRETE_POR_CONTA_MAP, FretePorContaLabel } from '@/types/pedido-compra'

// Interface para item do pedido
interface ItemPedidoRequest {
  descricao: string
  codigoFornecedor?: string
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
interface PedidoCompraEditRequest {
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
  situacao?: number
  politicaId?: number
  itens: ItemPedidoRequest[]
  parcelas?: ParcelaRequest[]
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

// Funcao para montar o payload do Bling (PUT - edicao)
function buildBlingPayload(data: PedidoCompraEditRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    data: data.data,
    fornecedor: { id: data.fornecedor_id_bling },
    itens: data.itens.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemPayload: Record<string, any> = {
        descricao: item.descricao,
        unidade: item.unidade || 'UN',
        valor: item.valor,
        quantidade: item.quantidade,
        aliquotaIPI: item.aliquotaIPI || 0,
      }

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

    const freteNaoSoma = data.fretePorConta === 'CIF' || data.fretePorConta === 'SEM_FRETE'

    if (data.frete && !freteNaoSoma) {
      payload.transporte.frete = data.frete
    }
    if (data.transportador) {
      payload.transporte.transportador = data.transportador
    }
    if (data.fretePorConta) {
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
      if (p.formaPagamento?.id) {
        parcelaPayload.formaPagamento = { id: p.formaPagamento.id }
      }
      return parcelaPayload
    })
  }

  return payload
}

// PUT - Editar pedido de compra existente (sync com Bling)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const body: PedidoCompraEditRequest = await request.json()
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

    // 1. Buscar pedido existente para obter bling_id
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, bling_id, numero, situacao')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (!pedido.bling_id) {
      return NextResponse.json(
        { error: 'Pedido nao possui ID do Bling vinculado. Nao e possivel editar no Bling.' },
        { status: 400 }
      )
    }

    // 2. Obter token do Bling
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

    // 3. Montar payload do Bling
    const blingPayload = buildBlingPayload(body)
    console.log('Payload Bling (PUT):', JSON.stringify(blingPayload, null, 2))

    // 4. PUT para Bling (com retry inteligente para rate limit e erros transientes)
    let blingResponse: Response
    try {
      const result = await blingFetch(
        `${BLING_CONFIG.apiUrl}/pedidos/compras/${pedido.bling_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(blingPayload),
        },
        { context: 'editar pedido de compra', maxRetries: 5 }
      )
      blingResponse = result.response

      if (result.hadRateLimit) {
        console.log(`Pedido editado apos ${result.retriesUsed} retries por rate limit`)
      }
    } catch (err) {
      if (err instanceof BlingRateLimitError) {
        return NextResponse.json(
          { error: err.message },
          { status: 503 }
        )
      }
      throw err
    }

    if (!blingResponse.ok) {
      const errorText = await blingResponse.text()
      console.error('Erro Bling API (PUT):', blingResponse.status, errorText)

      let errorMessage = 'Erro ao atualizar pedido no Bling'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message
        } else if (errorJson.error?.description) {
          errorMessage = errorJson.error.description
        }
      } catch {
        errorMessage = errorText || 'Erro desconhecido do Bling'
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: 400 }
      )
    }

    // 5. Estornar contas automaticamente (Bling pode recriar contas a pagar ao editar parcelas)
    let estornoWarning: string | null = null
    try {
      const estornoResult = await blingFetch(
        `${BLING_CONFIG.apiUrl}/pedidos/compras/${pedido.bling_id}/estornar-contas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}),
        },
        { context: 'estornar contas', maxRetries: 3 }
      )

      if (estornoResult.response.ok) {
        console.log('Contas estornadas com sucesso para pedido:', pedido.bling_id)
      } else {
        const estornoError = await estornoResult.response.text()
        console.warn('Aviso: Nao foi possivel estornar contas:', estornoError)
        estornoWarning = 'Nao foi possivel estornar contas a pagar automaticamente. Verifique no Bling.'
      }
    } catch (estornoErr) {
      console.warn('Aviso: Erro ao tentar estornar contas:', estornoErr)
      estornoWarning = 'Nao foi possivel estornar contas a pagar automaticamente. Verifique no Bling.'
    }

    // 6. Atualizar Supabase - cabecalho do pedido
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        fornecedor_id: body.fornecedor_id,
        data: body.data,
        data_prevista: body.dataPrevista || null,
        total_produtos: body.totalProdutos,
        total: body.total,
        desconto: body.desconto || 0,
        frete: body.frete || 0,
        total_icms: body.totalIcms || 0,
        total_ipi: body.totalIpi || 0,
        transportador: body.transportador || null,
        frete_por_conta: body.fretePorConta || 'CIF',
        peso_bruto: body.pesoBruto || 0,
        volumes: body.volumes || 0,
        ordem_compra: body.ordemCompra || null,
        observacoes: body.observacoes || null,
        observacoes_internas: body.observacoesInternas || null,
        politica_id: body.politicaId || null,
      })
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)

    if (updateError) {
      console.error('Erro ao atualizar cabecalho no Supabase:', updateError)
    }

    // 7. Atualizar itens - DELETE existentes + INSERT novos
    const { error: deleteItensError } = await supabase
      .from('itens_pedido_compra')
      .delete()
      .eq('pedido_compra_id', pedidoId)

    if (deleteItensError) {
      console.error('Erro ao deletar itens antigos:', deleteItensError)
    }

    const itensInsert = body.itens.map(item => ({
      pedido_compra_id: parseInt(pedidoId),
      descricao: item.descricao,
      codigo_fornecedor: item.codigoFornecedor || item.produto?.codigo || '',
      codigo_produto: item.produto?.codigo || '',
      unidade: item.unidade || 'UN',
      valor: item.valor,
      quantidade: item.quantidade,
      aliquota_ipi: item.aliquotaIPI || 0,
      produto_id: item.produto_id || null,
    }))

    const { error: insertItensError } = await supabase
      .from('itens_pedido_compra')
      .insert(itensInsert)

    if (insertItensError) {
      console.error('Erro ao inserir novos itens:', insertItensError)
    }

    // 8. Atualizar parcelas - DELETE existentes + INSERT novas
    const { error: deleteParcelasError } = await supabase
      .from('parcelas_pedido_compra')
      .delete()
      .eq('pedido_compra_id', pedidoId)

    if (deleteParcelasError) {
      console.error('Erro ao deletar parcelas antigas:', deleteParcelasError)
    }

    if (body.parcelas && body.parcelas.length > 0) {
      const parcelasInsert = body.parcelas.map(p => ({
        pedido_compra_id: parseInt(pedidoId),
        valor: p.valor,
        data_vencimento: p.dataVencimento,
        observacao: p.observacao || '',
        forma_pagamento_id: p.formaPagamento?.id || null,
        empresa_id: empresaId,
      }))

      const { error: insertParcelasError } = await supabase
        .from('parcelas_pedido_compra')
        .insert(parcelasInsert)

      if (insertParcelasError) {
        console.error('Erro ao inserir novas parcelas:', insertParcelasError)
      }
    }

    // 9. Retornar sucesso
    const warnings = [estornoWarning].filter(Boolean)
    if (updateError || deleteItensError || insertItensError || deleteParcelasError) {
      warnings.push('Pedido atualizado no Bling mas houve erro ao salvar alguns dados localmente.')
    }

    return NextResponse.json({
      success: true,
      id: pedido.id,
      bling_id: pedido.bling_id,
      numero: pedido.numero,
      message: 'Pedido atualizado com sucesso no Bling e Supabase',
      ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
    })

  } catch (error) {
    console.error('Erro ao editar pedido de compra:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao editar pedido de compra' },
      { status: 500 }
    )
  }
}
