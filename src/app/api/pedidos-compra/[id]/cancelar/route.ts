import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch } from '@/lib/bling-fetch'
import { ESTADOS_FINAIS } from '@/types/pedido-compra'

interface CancelarRequest {
  motivo: string
}

// Funcao para obter e validar o token do Bling
async function getBlingAccessToken(empresaId: number, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: tokens, error } = await supabase
    .from('bling_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('empresa_id', empresaId)
    .single()

  if (error || !tokens) {
    return null // Bling nao conectado - nao e erro fatal
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

// POST - Cancelar pedido (lojista)
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
    const body: CancelarRequest = await request.json()
    const { motivo } = body

    if (!motivo || motivo.trim().length < 5) {
      return NextResponse.json(
        { error: 'Motivo do cancelamento e obrigatorio (minimo 5 caracteres)' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, bling_id, situacao, status_interno')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar se nao esta em estado final
    if (pedido.status_interno && ESTADOS_FINAIS.includes(pedido.status_interno)) {
      return NextResponse.json(
        { error: `Pedido em estado "${pedido.status_interno}" nao pode ser cancelado` },
        { status: 400 }
      )
    }

    // Verificar situacao no Bling (1=Atendido, 2=Cancelado sao finais)
    if (pedido.situacao === 1 || pedido.situacao === 2) {
      return NextResponse.json(
        { error: 'Pedido ja foi concluido ou cancelado no Bling' },
        { status: 400 }
      )
    }

    let blingSyncSuccess = false
    let blingSyncError = ''

    // Tentar sincronizar com Bling se tiver bling_id
    if (pedido.bling_id) {
      const accessToken = await getBlingAccessToken(empresaId, supabase)

      if (accessToken) {
        try {
          const result = await blingFetch(
            `${BLING_CONFIG.apiUrl}/pedidos/compras/${pedido.bling_id}/situacoes/2`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            },
            { context: 'cancelar pedido', maxRetries: 3 }
          )

          if (result.response.ok) {
            blingSyncSuccess = true
            if (result.hadRateLimit) {
              console.log(`Pedido cancelado apos ${result.retriesUsed} retries por rate limit`)
            }
          } else {
            const errorText = await result.response.text()
            blingSyncError = `Bling: ${errorText}`
            console.error('Erro ao cancelar no Bling:', errorText)
          }
        } catch (err) {
          blingSyncError = err instanceof Error ? err.message : 'Erro desconhecido'
          console.error('Erro na chamada Bling:', err)
        }
      }
    }

    // Atualizar status no Supabase
    const updateData: Record<string, unknown> = {
      status_interno: 'cancelado',
      updated_at: new Date().toISOString(),
    }

    // Se sincronizou com Bling, atualizar situacao tambem
    if (blingSyncSuccess) {
      updateData.situacao = 2
    }

    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update(updateData)
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)

    if (updateError) {
      console.error('Erro ao atualizar Supabase:', updateError)
      return NextResponse.json({ error: 'Erro ao cancelar pedido' }, { status: 500 })
    }

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'cancelado',
        descricao: `Pedido cancelado pelo lojista. Motivo: "${motivo}"${blingSyncSuccess ? ' (sincronizado com Bling)' : ''}`,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      message: 'Pedido cancelado com sucesso',
      bling_sync: blingSyncSuccess,
      bling_error: blingSyncError || undefined,
    })

  } catch (error) {
    console.error('Erro ao cancelar pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cancelar pedido' },
      { status: 500 }
    )
  }
}
