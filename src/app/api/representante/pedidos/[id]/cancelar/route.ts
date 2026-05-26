import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
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

// POST - Cancelar pedido (representante)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

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

    // Validar acesso: representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id, empresa_id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    if (!representantes || representantes.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const representanteIds = representantes.map(r => r.id)

    // Buscar pedido (verificar que pertence ao representante)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, bling_id, situacao, status_interno, empresa_id')
      .eq('id', pedidoId)
      .in('representante_id', representanteIds)
      .eq('is_excluded', false)
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

    // Verificar situacao no Bling
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
      const accessToken = await getBlingAccessToken(pedido.empresa_id, supabase)

      if (accessToken) {
        try {
          // Endpoint correto API Bling v3: PATCH /pedidos/compras/{id}/situacoes body { valor: 2 } (Cancelado)
          const blingResponse = await fetch(
            `${BLING_CONFIG.apiUrl}/pedidos/compras/${pedido.bling_id}/situacoes`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ valor: 2 }),
            }
          )

          if (blingResponse.ok) {
            blingSyncSuccess = true
          } else {
            const errorText = await blingResponse.text()
            blingSyncError = `Bling: ${errorText}`
            console.error('Erro ao cancelar no Bling:', errorText)
          }
        } catch (err) {
          blingSyncError = err instanceof Error ? err.message : 'Erro desconhecido'
          console.error('Erro na chamada Bling:', err)
        }
      }
    }

    // Buscar nome do representante (autor)
    const { data: representanteUser } = await supabase
      .from('users_representante')
      .select('nome')
      .eq('id', user.representanteUserId)
      .single()

    // Atualizar status no Supabase
    const updateData: Record<string, unknown> = {
      status_interno: 'cancelado',
      updated_at: new Date().toISOString(),
    }

    if (blingSyncSuccess) {
      updateData.situacao = 2
    }

    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update(updateData)
      .eq('id', pedidoId)
      .eq('is_excluded', false)

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
        descricao: `Pedido cancelado pelo representante. Motivo: "${motivo}"${blingSyncSuccess ? ' (sincronizado com Bling)' : ''}`,
        autor_tipo: 'representante',
        autor_nome: representanteUser?.nome || user.email,
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
