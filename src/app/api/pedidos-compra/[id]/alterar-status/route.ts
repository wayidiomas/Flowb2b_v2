import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'

// Situacoes do Bling para pedido de compra
// 0: Em aberto (Registrada)
// 1: Atendido
// 2: Cancelado
// 3: Em andamento

interface AlterarStatusRequest {
  situacao: number
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

// PUT - Alterar status do pedido
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
    const body: AlterarStatusRequest = await request.json()
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Validar situacao (valores do Bling)
    // 0: Em aberto, 1: Atendido, 2: Cancelado, 3: Em andamento
    const situacoesValidas = [0, 1, 2, 3]
    if (!situacoesValidas.includes(body.situacao)) {
      return NextResponse.json(
        { error: 'Situacao invalida. Use: 0 (Em Aberto), 1 (Atendido), 2 (Cancelado), ou 3 (Em Andamento)' },
        { status: 400 }
      )
    }

    // Buscar pedido para obter bling_id
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, bling_id, situacao')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (!pedido.bling_id) {
      return NextResponse.json(
        { error: 'Pedido nao possui ID do Bling vinculado' },
        { status: 400 }
      )
    }

    // Obter token do Bling
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

    // Alterar situacao no Bling
    // PUT /pedidos/compras/{idPedidoCompra}/situacoes/{valor}
    const blingResponse = await fetch(
      `${BLING_CONFIG.apiUrl}/pedidos/compras/${pedido.bling_id}/situacoes/${body.situacao}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!blingResponse.ok) {
      const errorText = await blingResponse.text()
      console.error('Erro Bling API:', blingResponse.status, errorText)

      let errorMessage = 'Erro ao alterar status no Bling'
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

    // Atualizar situacao no Supabase
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({ situacao: body.situacao, updated_at: new Date().toISOString() })
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)

    if (updateError) {
      console.error('Erro ao atualizar Supabase:', updateError)
      // Nao retorna erro pois o Bling ja foi atualizado
    }

    const situacaoNomes: Record<number, string> = {
      0: 'Em Aberto',
      1: 'Atendido',
      2: 'Cancelado',
      3: 'Em Andamento',
    }

    return NextResponse.json({
      success: true,
      situacao: body.situacao,
      situacao_nome: situacaoNomes[body.situacao],
      message: `Status alterado para "${situacaoNomes[body.situacao]}" com sucesso`,
    })

  } catch (error) {
    console.error('Erro ao alterar status do pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao alterar status do pedido' },
      { status: 500 }
    )
  }
}
