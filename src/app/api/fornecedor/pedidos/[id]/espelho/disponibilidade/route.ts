import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// POST - Fornecedor saves motivo_faltante / previsao_retorno on validation items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Validate fornecedor has access to this pedido
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, empresa_id, fornecedor_id')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { itens } = body as {
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
        motivo_faltante?: string | null
        previsao_retorno?: string | null
      }>
    }

    if (!itens || !Array.isArray(itens)) {
      return NextResponse.json({ error: 'Itens sao obrigatorios e devem ser um array' }, { status: 400 })
    }

    // Validate motivo_faltante values
    for (const item of itens) {
      if (item.motivo_faltante && !['ruptura', 'descontinuado'].includes(item.motivo_faltante)) {
        return NextResponse.json(
          { error: 'motivo_faltante invalido. Use "ruptura" ou "descontinuado"' },
          { status: 400 }
        )
      }
    }

    // Get fornecedor user name for tracking
    const { data: fornecedorUser } = await supabase
      .from('users_fornecedor')
      .select('nome')
      .eq('id', user.fornecedorUserId!)
      .single()

    const validadoPor = fornecedorUser?.nome || user.email

    // Calculate totals from items
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
      }
    }

    // Upsert espelho_validacoes for this pedido + empresa
    const { data: validacao, error: upsertError } = await supabase
      .from('espelho_validacoes')
      .upsert(
        {
          pedido_compra_id: parseInt(pedidoId, 10),
          empresa_id: pedido.empresa_id,
          validado_por: `${validadoPor} (fornecedor)`,
          status: 'validado',
          total_ok: totalOk,
          total_divergencias: totalDivergencias,
          total_faltando: totalFaltando,
          total_extras: totalExtras,
          observacao: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'pedido_compra_id,empresa_id',
        }
      )
      .select('id')
      .single()

    if (upsertError || !validacao) {
      console.error('Erro ao salvar validacao (fornecedor disponibilidade):', upsertError)
      return NextResponse.json({ error: 'Erro ao salvar validacao' }, { status: 500 })
    }

    const validacaoId = validacao.id

    // Insert new items
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
        motivo_faltante: item.motivo_faltante || null,
        previsao_retorno: item.previsao_retorno || null,
      }))

      const { data: newItens, error: insertError } = await supabase
        .from('espelho_validacao_itens')
        .insert(itensParaInserir)
        .select('id')

      if (insertError) {
        console.error('Erro ao inserir itens da validacao (fornecedor):', insertError)
        return NextResponse.json({ error: 'Erro ao salvar itens da validacao' }, { status: 500 })
      }

      // Delete old items that are not in the new set
      const newIds = (newItens || []).map(i => i.id)
      if (newIds.length > 0) {
        await supabase
          .from('espelho_validacao_itens')
          .delete()
          .eq('validacao_id', validacaoId)
          .not('id', 'in', `(${newIds.join(',')})`)
      }
    } else {
      await supabase
        .from('espelho_validacao_itens')
        .delete()
        .eq('validacao_id', validacaoId)
    }

    // Register in timeline
    const itensFaltandoComMotivo = itens.filter(i => i.status_ia === 'faltando' && i.motivo_faltante)
    const rupturas = itensFaltandoComMotivo.filter(i => i.motivo_faltante === 'ruptura').length
    const descontinuados = itensFaltandoComMotivo.filter(i => i.motivo_faltante === 'descontinuado').length

    let descricaoTimeline = 'Fornecedor informou disponibilidade dos itens faltantes'
    const partes: string[] = []
    if (rupturas > 0) partes.push(`${rupturas} em ruptura`)
    if (descontinuados > 0) partes.push(`${descontinuados} descontinuado${descontinuados > 1 ? 's' : ''}`)
    if (partes.length > 0) descricaoTimeline += ` (${partes.join(', ')})`

    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId, 10),
        evento: 'disponibilidade_informada',
        descricao: descricaoTimeline,
        autor_tipo: 'fornecedor',
        autor_nome: validadoPor,
      })

    return NextResponse.json({
      success: true,
      validacao_id: validacaoId,
      message: 'Disponibilidade salva com sucesso',
    })
  } catch (error) {
    console.error('Erro ao salvar disponibilidade (fornecedor):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
