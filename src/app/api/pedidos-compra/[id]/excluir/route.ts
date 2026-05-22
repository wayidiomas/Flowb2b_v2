import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { refreshBlingTokens } from '@/lib/bling'
import { BlingRateLimitError } from '@/lib/bling-fetch'
import { cancelarPedidoCompraBling } from '@/lib/bling-pedido-compra'
import { ESTADOS_FINAIS, type StatusInterno } from '@/types/pedido-compra'

// Estados que ainda permitem cancelar no Bling (situação Bling vira "Cancelado" = 2)
const STATUS_CANCELAVEIS: StatusInterno[] = [
  'rascunho',
  'enviado_fornecedor',
  'sugestao_pendente',
  'contra_proposta_pendente',
  'aceito',
]

type BlingOutcome =
  | 'cancelado'             // PUT situacoes/2 OK
  | 'ja_cancelado'          // situação Bling já era 2 (idempotente)
  | 'nao_encontrado_bling'  // 404 no Bling — pedido já não existe lá
  | 'sem_bling_id'          // pedido local nunca foi enviado pro Bling
  | 'sem_token_bling'       // empresa sem token configurado
  | 'estado_avancado'       // finalizado/atendido/com NF — não cancela
  | 'falha_bling'           // erro 4xx/5xx do Bling (soft-delete mantido, fica órfão)

async function getBlingAccessToken(empresaId: number, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: tokens, error } = await supabase
    .from('bling_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('empresa_id', empresaId)
    .single()

  if (error || !tokens) return null

  const expiresAt = new Date(tokens.expires_at)
  if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
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

// POST - Soft delete pedido (marca is_excluded=true) e, se possível, cancela no Bling
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
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, numero, bling_id, situacao, status_interno, is_excluded, nota_fiscal_id')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (pedido.is_excluded) {
      return NextResponse.json({ error: 'Pedido ja foi excluido' }, { status: 400 })
    }

    // 1. Soft-delete primeiro (sempre)
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({ is_excluded: true, updated_at: new Date().toISOString() })
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)

    if (updateError) {
      console.error('Erro ao excluir pedido:', updateError)
      return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 })
    }

    // 2. Decidir se cancela no Bling
    let outcome: BlingOutcome
    let blingErrorMsg: string | undefined

    const statusInterno = pedido.status_interno as StatusInterno | null
    const estaCancelavel =
      statusInterno != null &&
      STATUS_CANCELAVEIS.includes(statusInterno) &&
      !ESTADOS_FINAIS.includes(statusInterno) &&
      !pedido.nota_fiscal_id &&
      pedido.situacao !== 1 &&
      pedido.situacao !== 2

    if (!pedido.bling_id) {
      outcome = 'sem_bling_id'
    } else if (!estaCancelavel) {
      outcome = 'estado_avancado'
    } else {
      const accessToken = await getBlingAccessToken(empresaId, supabase)
      if (!accessToken) {
        outcome = 'sem_token_bling'
      } else {
        try {
          // Fonte unica de cancelamento no Bling (PATCH /situacoes { valor: 2 })
          const cancelamento = await cancelarPedidoCompraBling(pedido.bling_id, accessToken)
          if (cancelamento.ok) {
            outcome = cancelamento.jaCancelado ? 'ja_cancelado' : 'cancelado'
            // Refletir cancelamento no DB tambem
            await supabase
              .from('pedidos_compra')
              .update({ situacao: 2, status_interno: 'cancelado', updated_at: new Date().toISOString() })
              .eq('id', pedidoId)
              .eq('empresa_id', empresaId)
          } else if (cancelamento.naoEncontrado) {
            outcome = 'nao_encontrado_bling'
          } else {
            outcome = 'falha_bling'
            blingErrorMsg = cancelamento.errorText
            console.error('Erro ao cancelar no Bling:', cancelamento.status, cancelamento.errorText)
          }
        } catch (err) {
          outcome = 'falha_bling'
          blingErrorMsg = err instanceof BlingRateLimitError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Erro desconhecido'
          console.error('Erro na chamada Bling (cancelar via excluir):', err)
        }
      }
    }

    // 3. Timeline
    const descricaoBase = `Pedido #${pedido.numero || pedidoId} excluido pelo lojista`
    const sufixoOutcome: Record<BlingOutcome, string> = {
      cancelado: ' (cancelado no Bling)',
      ja_cancelado: ' (Bling ja estava cancelado)',
      nao_encontrado_bling: ' (pedido nao existe mais no Bling)',
      sem_bling_id: ' (sem vinculo Bling)',
      sem_token_bling: ' (Bling nao conectado — apenas oculto no FlowB2B)',
      estado_avancado: ' (estado avancado — apenas oculto no FlowB2B; Bling preservado)',
      falha_bling: ' (falha ao cancelar no Bling — apenas oculto no FlowB2B)',
    }

    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'excluido',
        descricao: descricaoBase + sufixoOutcome[outcome],
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      outcome,
      bling_canceled: outcome === 'cancelado' || outcome === 'ja_cancelado',
      bling_error: blingErrorMsg,
      message: 'Pedido excluido com sucesso',
    })

  } catch (error) {
    console.error('Erro ao excluir pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir pedido' },
      { status: 500 }
    )
  }
}
