import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { refreshBlingTokens } from '@/lib/bling'
import { estornarContasPedidoCompra } from '@/lib/bling-pedido-compra'
import { ESTADOS_FINAIS } from '@/types/pedido-compra'

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

// POST - Finalizar pedido (lojista)
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

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, bling_id, situacao, status_interno')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar se nao esta em estado final
    if (pedido.status_interno && ESTADOS_FINAIS.includes(pedido.status_interno)) {
      return NextResponse.json(
        { error: `Pedido ja esta em estado "${pedido.status_interno}"` },
        { status: 400 }
      )
    }

    // Verificar se o pedido esta em estado que permite finalizacao
    // Pode finalizar de: aceito, sugestao_pendente (caso queira pular negociacao), enviado_fornecedor
    const statusPermitidos = ['aceito', 'sugestao_pendente', 'enviado_fornecedor', 'rascunho']
    if (pedido.status_interno && !statusPermitidos.includes(pedido.status_interno)) {
      return NextResponse.json(
        { error: `Pedido em estado "${pedido.status_interno}" nao pode ser finalizado` },
        { status: 400 }
      )
    }

    if (pedido.situacao === 2) {
      return NextResponse.json(
        { error: 'Pedido cancelado nao pode ser finalizado' },
        { status: 400 }
      )
    }

    // ── CORRECAO A: finalizar NAO altera o status do pedido no Bling. ──
    // A cliente controla a baixa manualmente: so marca "Atendido" no Bling quando a
    // mercadoria de fato chega — e e ai que o Bling lanca estoque + conta a pagar
    // (Gerenciador de Transicoes). Por isso NAO fazemos mais o
    // PATCH /pedidos/compras/{id}/situacoes { valor: 1 } aqui.
    //
    // REDE DE SEGURANCA (estorno): o Bling pode lancar conta a pagar automaticamente na
    // criacao/abertura do pedido. Como a conta so deve existir quando a mercadoria chega,
    // estornamos a conta auto-lancada ao finalizar. So estorna se o pedido NAO estiver
    // Atendido (situacao 1) — pedido ja atendido tem conta legitima. Best-effort:
    // conta paga/baixada nao e mexida; "sem conta" e tratado como sucesso.
    let estornoWarning = ''
    if (pedido.bling_id && pedido.situacao !== 1) {
      const accessToken = await getBlingAccessToken(empresaId, supabase)
      if (accessToken) {
        const estorno = await estornarContasPedidoCompra(pedido.bling_id, accessToken)
        if (!estorno.ok) {
          estornoWarning = estorno.warning
          console.warn('[finalizar] estorno de contas (rede de seguranca):', estorno.warning)
        }
      }
    }

    // Atualizar status no Supabase — apenas o estado interno; a situacao do Bling
    // (e a do Supabase) ficam intactas. O "Atendido" so acontece manualmente.
    const updateData: Record<string, unknown> = {
      status_interno: 'finalizado',
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update(updateData)
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)

    if (updateError) {
      console.error('Erro ao atualizar Supabase:', updateError)
      return NextResponse.json({ error: 'Erro ao finalizar pedido' }, { status: 500 })
    }

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'finalizado',
        descricao: 'Pedido finalizado pelo lojista (status no Bling inalterado; baixa/conta sao manuais na chegada da mercadoria)',
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      message: 'Pedido finalizado com sucesso',
      estorno_aviso: estornoWarning || undefined,
    })

  } catch (error) {
    console.error('Erro ao finalizar pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao finalizar pedido' },
      { status: 500 }
    )
  }
}
