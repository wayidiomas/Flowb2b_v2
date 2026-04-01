import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch, BlingRateLimitError } from '@/lib/bling-fetch'
import { logActivity } from '@/lib/activity-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogoItemRequest {
  produto_id?: number | null
  codigo: string
  descricao: string
  unidade: string
  quantidade: number
  valor: number
  itens_por_caixa?: number
}

interface CatalogoOrderRequest {
  fornecedor_id: number
  empresa_id: number
  itens: CatalogoItemRequest[]
  observacoes?: string
  observacoes_internas?: string
  data_prevista?: string
  sync_bling?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a local order number when Bling is not available.
 * Queries the highest existing numero for the empresa and increments by 1.
 */
async function generateLocalNumber(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  empresaId: number
): Promise<string> {
  const { data, error } = await supabase
    .from('pedidos_compra')
    .select('numero')
    .eq('empresa_id', empresaId)
    .order('id', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return '1'
  }

  const lastNum = data.numero ? parseInt(data.numero, 10) : 0
  return String((isNaN(lastNum) ? 0 : lastNum) + 1)
}

/**
 * Attempt to get a valid Bling access token for the empresa.
 * Returns the token string or null if Bling is not connected / token cannot be
 * refreshed.
 */
async function tryGetBlingToken(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  empresaId: number
): Promise<string | null> {
  try {
    const { data: tokens, error } = await supabase
      .from('bling_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('empresa_id', empresaId)
      .single()

    if (error || !tokens) return null

    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()

    // Refresh if token expires within 5 minutes
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
      } catch (err) {
        console.error('[catalogo] Erro ao renovar token Bling:', err)
        return null
      }
    }

    return tokens.access_token
  } catch {
    return null
  }
}

/**
 * Try to create the purchase order in Bling.
 * Returns { blingId, numero } on success or { error } on failure.
 * Never throws -- failures are gracefully captured.
 */
async function tryCreateInBling(
  accessToken: string,
  fornecedor: { id_contato_bling: number },
  itens: CatalogoItemRequest[],
  body: CatalogoOrderRequest
): Promise<{ blingId: number | null; numero: number | null; error: string | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blingPayload: Record<string, any> = {
      data: new Date().toISOString().split('T')[0],
      fornecedor: { id: fornecedor.id_contato_bling },
      situacao: { valor: 0 }, // Em aberto
      itens: itens.map(item => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blingItem: Record<string, any> = {
          descricao: item.descricao,
          unidade: item.unidade || 'UN',
          valor: item.valor,
          quantidade: item.quantidade,
        }
        return blingItem
      }),
    }

    if (body.data_prevista) {
      blingPayload.dataPrevista = body.data_prevista
    }
    if (body.observacoes) {
      blingPayload.observacoes = body.observacoes
    }
    if (body.observacoes_internas) {
      blingPayload.observacoesInternas = body.observacoes_internas
    }

    const result = await blingFetch(
      `${BLING_CONFIG.apiUrl}/pedidos/compras`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(blingPayload),
      },
      { context: 'criar pedido catalogo no Bling', maxRetries: 3 }
    )

    if (!result.response.ok) {
      const errorText = await result.response.text()
      console.error('[catalogo] Bling API error:', result.response.status, errorText)

      let errorMessage = 'Erro ao criar pedido no Bling'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorJson.error?.description || errorMessage
      } catch { /* ignore */ }

      return { blingId: null, numero: null, error: errorMessage }
    }

    const blingData = await result.response.json()
    return {
      blingId: blingData.data?.id || null,
      numero: blingData.data?.numero || null,
      error: null,
    }
  } catch (err) {
    if (err instanceof BlingRateLimitError) {
      return { blingId: null, numero: null, error: 'Rate limit do Bling excedido. Pedido salvo localmente.' }
    }
    const msg = err instanceof Error ? err.message : 'Erro desconhecido ao criar no Bling'
    console.error('[catalogo] Bling unexpected error:', msg)
    return { blingId: null, numero: null, error: msg }
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const body: CatalogoOrderRequest = await request.json()
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Validate empresa_id matches authenticated user
    if (body.empresa_id !== empresaId) {
      return NextResponse.json(
        { error: 'empresa_id nao corresponde ao usuario autenticado' },
        { status: 403 }
      )
    }

    // ---------- Basic validations ----------

    if (!body.fornecedor_id) {
      return NextResponse.json(
        { error: 'fornecedor_id e obrigatorio' },
        { status: 400 }
      )
    }

    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json(
        { error: 'Pedido deve ter pelo menos um item' },
        { status: 400 }
      )
    }

    // Validate each item
    for (let i = 0; i < body.itens.length; i++) {
      const item = body.itens[i]
      if (!item.descricao || item.descricao.trim() === '') {
        return NextResponse.json(
          { error: `Item ${i + 1}: descricao e obrigatoria` },
          { status: 400 }
        )
      }
      if (!item.quantidade || item.quantidade <= 0) {
        return NextResponse.json(
          { error: `Item ${i + 1} (${item.descricao}): quantidade deve ser maior que 0` },
          { status: 400 }
        )
      }
      if (item.valor === undefined || item.valor === null || item.valor < 0) {
        return NextResponse.json(
          { error: `Item ${i + 1} (${item.descricao}): valor deve ser >= 0` },
          { status: 400 }
        )
      }
    }

    // 2. Validate fornecedor exists and belongs to this empresa
    const { data: fornecedor, error: fornecedorError } = await supabase
      .from('fornecedores')
      .select('id, nome, id_bling, id_contato_bling')
      .eq('id', body.fornecedor_id)
      .eq('empresa_id', empresaId)
      .single()

    if (fornecedorError || !fornecedor) {
      return NextResponse.json(
        { error: 'Fornecedor nao encontrado ou nao pertence a esta empresa' },
        { status: 404 }
      )
    }

    // 3. Calculate totals
    const totalProdutos = body.itens.reduce(
      (sum, item) => sum + item.quantidade * item.valor,
      0
    )

    // 4. Try Bling integration (optional)
    let blingId: number | null = null
    let blingNumero: number | null = null
    let blingError: string | null = null

    // Determine whether to attempt Bling sync
    const shouldTryBling = body.sync_bling !== false

    if (shouldTryBling) {
      const accessToken = await tryGetBlingToken(supabase, empresaId)

      if (accessToken && fornecedor.id_contato_bling) {
        // Bling is available and fornecedor is synced - try to create in Bling
        console.log('[catalogo] Bling disponivel, criando pedido...')

        const blingResult = await tryCreateInBling(
          accessToken,
          { id_contato_bling: fornecedor.id_contato_bling },
          body.itens,
          body
        )

        blingId = blingResult.blingId
        blingNumero = blingResult.numero
        blingError = blingResult.error

        if (blingId) {
          console.log('[catalogo] Pedido criado no Bling:', { blingId, blingNumero })
        } else {
          console.warn('[catalogo] Bling falhou, salvando apenas localmente:', blingError)
        }
      } else {
        if (!accessToken) {
          console.log('[catalogo] Bling nao conectado, criando pedido apenas localmente')
        } else {
          console.log('[catalogo] Fornecedor sem id_contato_bling, criando pedido apenas localmente')
        }
      }
    }

    // 5. Generate local number if Bling did not provide one
    const numeroPedido = blingNumero
      ? String(blingNumero)
      : await generateLocalNumber(supabase, empresaId)

    // 6. Save to database (always, regardless of Bling)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .insert({
        numero: numeroPedido,
        data: new Date().toISOString().split('T')[0],
        data_prevista: body.data_prevista || null,
        total_produtos: totalProdutos,
        total: totalProdutos,
        desconto: 0,
        frete: 0,
        fornecedor_id: body.fornecedor_id,
        empresa_id: empresaId,
        bling_id: blingId || null,
        situacao: 0,
        status_interno: 'rascunho',
        origem: 'catalogo',
        observacoes: body.observacoes || null,
        observacoes_internas: body.observacoes_internas || null,
        is_excluded: false,
      })
      .select('id, numero')
      .single()

    if (pedidoError || !pedido) {
      console.error('[catalogo] Erro ao salvar pedido:', pedidoError)

      // If it was already saved in Bling, warn about orphaned Bling record
      if (blingId) {
        return NextResponse.json(
          {
            error: 'Pedido criado no Bling mas houve erro ao salvar localmente',
            bling_id: blingId,
            supabase_error: pedidoError?.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Erro ao salvar pedido de compra', details: pedidoError?.message },
        { status: 500 }
      )
    }

    // 7. Insert items
    const itensToInsert = body.itens.map(item => ({
      pedido_compra_id: pedido.id,
      produto_id: item.produto_id || null,
      codigo_produto: item.codigo || null,
      descricao: item.descricao,
      unidade: item.unidade || 'UN',
      quantidade: item.quantidade,
      valor: item.valor,
    }))

    const { error: itensError } = await supabase
      .from('itens_pedido_compra')
      .insert(itensToInsert)

    if (itensError) {
      console.error('[catalogo] Erro ao salvar itens:', itensError)
      // Order header was saved - return partial success with warning
      return NextResponse.json({
        success: true,
        warning: 'Pedido criado mas houve erro ao salvar alguns itens',
        pedido_id: pedido.id,
        numero: pedido.numero,
        bling_sync: !!blingId,
        items_error: itensError.message,
      })
    }

    // 8. Timeline entry
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: pedido.id,
        evento: 'pedido_criado',
        descricao: `Pedido criado via catalogo do fornecedor${blingId ? ' (sincronizado com Bling)' : ' (local)'}`,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })
      .then(({ error: timelineError }) => {
        if (timelineError) {
          console.warn('[catalogo] Erro ao criar timeline (nao critico):', timelineError.message)
        }
      })

    // 9. Activity log (fire and forget)
    void logActivity({
      userId: String(user.userId),
      userType: 'lojista',
      userEmail: user.email,
      userNome: user.nome || user.email,
      action: 'pedido_criado',
      empresaId: user.empresaId,
      metadata: {
        pedido_id: pedido.id,
        empresa_id: empresaId,
        fornecedor_id: body.fornecedor_id,
        numero: pedido.numero,
        origem: 'catalogo',
        bling_sync: !!blingId,
      },
    }).catch(console.error)

    // 10. Response
    return NextResponse.json({
      success: true,
      pedido_id: pedido.id,
      numero: pedido.numero,
      bling_sync: !!blingId,
      bling_error: blingError || undefined,
    })
  } catch (error) {
    console.error('[catalogo] Erro inesperado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar pedido de compra via catalogo' },
      { status: 500 }
    )
  }
}
