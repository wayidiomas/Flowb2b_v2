import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch, BlingRateLimitError } from '@/lib/bling-fetch'

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

// POST - Lancar conta a pagar no Bling
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

    const { id } = await params
    const pedidoId = parseInt(id)

    if (isNaN(pedidoId)) {
      return NextResponse.json({ error: 'ID do pedido invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // 1. Buscar o pedido para obter o bling_id
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, bling_id, numero, fornecedor_id')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    if (!pedido.bling_id) {
      return NextResponse.json(
        { error: 'Pedido nao esta sincronizado com o Bling' },
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

    // 3. POST para Bling - Lancar contas (com retry para rate limit)
    let blingResponse: Response
    try {
      const result = await blingFetch(
        `${BLING_CONFIG.apiUrl}/pedidos/compras/${pedido.bling_id}/lancar-contas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}),
        },
        { context: 'lancar conta', maxRetries: 3 }
      )
      blingResponse = result.response

      if (result.hadRateLimit) {
        console.log(`Conta lancada apos ${result.retriesUsed} retries por rate limit`)
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
      console.error('Erro Bling API (lancar-contas):', blingResponse.status, errorText)

      // Tentar extrair mensagem de erro
      let errorMessage = 'Erro ao lancar conta no Bling'
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

    console.log('Conta lancada com sucesso para pedido:', pedido.bling_id)

    return NextResponse.json({
      success: true,
      message: 'Conta lancada com sucesso no Bling',
      pedido_id: pedidoId,
      bling_id: pedido.bling_id,
    })

  } catch (error) {
    console.error('Erro ao lancar conta:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao lancar conta' },
      { status: 500 }
    )
  }
}
