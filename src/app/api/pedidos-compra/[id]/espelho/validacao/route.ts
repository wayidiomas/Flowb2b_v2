import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

// GET - Carregar validacao salva do espelho
export async function GET(
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
    const pedidoCompraId = parseInt(pedidoId, 10)

    if (isNaN(pedidoCompraId)) {
      return NextResponse.json({ error: 'ID do pedido invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar que o pedido existe e pertence a empresa do usuario
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id')
      .eq('id', pedidoCompraId)
      .eq('empresa_id', user.empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Buscar validacao salva
    const { data: validacao, error: validacaoError } = await supabase
      .from('espelho_validacoes')
      .select('*')
      .eq('pedido_compra_id', pedidoCompraId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (validacaoError || !validacao) {
      return NextResponse.json({ exists: false })
    }

    // Buscar itens da validacao
    const { data: itens, error: itensError } = await supabase
      .from('espelho_validacao_itens')
      .select('*')
      .eq('validacao_id', validacao.id)
      .order('id', { ascending: true })

    if (itensError) {
      console.error('Erro ao buscar itens da validacao:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens da validacao' }, { status: 500 })
    }

    return NextResponse.json({
      exists: true,
      validacao: {
        id: validacao.id,
        pedido_compra_id: validacao.pedido_compra_id,
        status: validacao.status,
        validado_por: validacao.validado_por,
        total_ok: validacao.total_ok,
        total_divergencias: validacao.total_divergencias,
        total_faltando: validacao.total_faltando,
        total_extras: validacao.total_extras,
        observacao: validacao.observacao,
        created_at: validacao.created_at,
        updated_at: validacao.updated_at,
      },
      itens: itens || [],
    })
  } catch (error) {
    console.error('Erro ao carregar validacao do espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Salvar validacao do espelho (upsert)
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
    const pedidoCompraId = parseInt(pedidoId, 10)

    if (isNaN(pedidoCompraId)) {
      return NextResponse.json({ error: 'ID do pedido invalido' }, { status: 400 })
    }

    const body = await request.json()
    const { status, observacao, itens } = body as {
      status: 'pendente' | 'validado' | 'aprovado_com_ressalvas'
      observacao?: string
      itens: Array<{
        status_ia: string
        status_manual: string
        item_pedido_codigo?: string
        item_pedido_descricao?: string
        item_pedido_quantidade?: number
        item_pedido_valor?: number
        item_pedido_gtin?: string
        item_espelho_codigo?: string
        item_espelho_nome?: string
        item_espelho_quantidade?: number
        item_espelho_preco?: number
        diferencas?: string[]
        observacao_item?: string
      }>
    }

    // Validar campos obrigatorios
    if (!status || !['pendente', 'validado', 'aprovado_com_ressalvas'].includes(status)) {
      return NextResponse.json(
        { error: 'Status invalido. Use "pendente", "validado" ou "aprovado_com_ressalvas"' },
        { status: 400 }
      )
    }

    if (!itens || !Array.isArray(itens)) {
      return NextResponse.json({ error: 'Itens sao obrigatorios e devem ser um array' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar que o pedido existe e pertence a empresa do usuario
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id')
      .eq('id', pedidoCompraId)
      .eq('empresa_id', user.empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Buscar nome do usuario para validado_por
    const { data: userData } = await supabase
      .from('users')
      .select('nome')
      .eq('id', user.userId)
      .single()

    const validadoPor = userData?.nome || user.nome || user.email

    // Calcular totais a partir dos itens (usando status_manual quando disponivel, senao status_ia)
    let totalOk = 0
    let totalDivergencias = 0
    let totalFaltando = 0
    let totalExtras = 0

    for (const item of itens) {
      const statusEfetivo = item.status_manual || item.status_ia
      switch (statusEfetivo) {
        case 'ok':
          totalOk++
          break
        case 'divergencia':
          totalDivergencias++
          break
        case 'faltando':
          totalFaltando++
          break
        case 'extra':
          totalExtras++
          break
        // 'ignorado' nao conta em nenhum total
      }
    }

    // Upsert na tabela espelho_validacoes
    const { data: validacao, error: upsertError } = await supabase
      .from('espelho_validacoes')
      .upsert(
        {
          pedido_compra_id: pedidoCompraId,
          empresa_id: user.empresaId,
          validado_por: validadoPor,
          status,
          total_ok: totalOk,
          total_divergencias: totalDivergencias,
          total_faltando: totalFaltando,
          total_extras: totalExtras,
          observacao: observacao || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'pedido_compra_id,empresa_id',
        }
      )
      .select('id')
      .single()

    if (upsertError || !validacao) {
      console.error('Erro ao salvar validacao:', upsertError)
      return NextResponse.json({ error: 'Erro ao salvar validacao' }, { status: 500 })
    }

    const validacaoId = validacao.id

    // Deletar itens antigos
    const { error: deleteError } = await supabase
      .from('espelho_validacao_itens')
      .delete()
      .eq('validacao_id', validacaoId)

    if (deleteError) {
      console.error('Erro ao limpar itens antigos:', deleteError)
      return NextResponse.json({ error: 'Erro ao atualizar itens da validacao' }, { status: 500 })
    }

    // Inserir novos itens
    if (itens.length > 0) {
      const itensParaInserir = itens.map((item) => ({
        validacao_id: validacaoId,
        status_ia: item.status_ia,
        status_manual: item.status_manual || null,
        item_pedido_codigo: item.item_pedido_codigo || null,
        item_pedido_descricao: item.item_pedido_descricao || null,
        item_pedido_quantidade: item.item_pedido_quantidade ?? null,
        item_pedido_valor: item.item_pedido_valor ?? null,
        item_pedido_gtin: item.item_pedido_gtin || null,
        item_espelho_codigo: item.item_espelho_codigo || null,
        item_espelho_nome: item.item_espelho_nome || null,
        item_espelho_quantidade: item.item_espelho_quantidade ?? null,
        item_espelho_preco: item.item_espelho_preco ?? null,
        diferencas: item.diferencas || null,
        observacao_item: item.observacao_item || null,
      }))

      const { error: insertError } = await supabase
        .from('espelho_validacao_itens')
        .insert(itensParaInserir)

      if (insertError) {
        console.error('Erro ao inserir itens da validacao:', insertError)
        return NextResponse.json({ error: 'Erro ao salvar itens da validacao' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      validacao_id: validacaoId,
      status,
      total_ok: totalOk,
      total_divergencias: totalDivergencias,
      total_faltando: totalFaltando,
      total_extras: totalExtras,
      message: 'Validacao salva com sucesso',
    })
  } catch (error) {
    console.error('Erro ao salvar validacao do espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
