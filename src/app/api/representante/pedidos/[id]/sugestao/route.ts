import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface SugestaoItem {
  item_id: number | null  // null para itens novos
  quantidade_sugerida: number
  valor_unitario_sugerido: number
  desconto_percentual?: number
  bonificacao_quantidade?: number
  validade?: string
  observacao?: string
  // Novos campos para troca e adição de produtos
  gtin?: string | null
  codigo_fornecedor?: string | null
  is_substituicao?: boolean
  is_novo?: boolean
  produto_nome?: string | null
  preco_unitario?: number | null
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const params = await context.params
    const pedidoId = parseInt(params.id)

    if (isNaN(pedidoId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const { sugestoes, observacao_geral }: { sugestoes: SugestaoItem[]; observacao_geral?: string } = body

    if (!sugestoes || !Array.isArray(sugestoes) || sugestoes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sugestoes sao obrigatorias' },
        { status: 400 }
      )
    }

    // Validação extra para itens novos e substituições
    for (const item of sugestoes) {
      if (item.is_novo) {
        if (!item.produto_nome) {
          return NextResponse.json(
            { success: false, error: 'produto_nome e obrigatorio para itens novos' },
            { status: 400 }
          )
        }
        if (!item.gtin && !item.codigo_fornecedor) {
          return NextResponse.json(
            { success: false, error: 'gtin ou codigo_fornecedor e obrigatorio para itens novos' },
            { status: 400 }
          )
        }
      }
      if (item.is_substituicao && !item.item_id) {
        return NextResponse.json(
          { success: false, error: 'item_id e obrigatorio para substituicoes' },
          { status: 400 }
        )
      }
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    // Verificar se pedido existe e pertence a um fornecedor vinculado
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, fornecedor_id')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // Verificar status do pedido
    if (!['enviado_fornecedor', 'contra_proposta'].includes(pedido.status_interno)) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao pode receber sugestoes neste status' },
        { status: 400 }
      )
    }

    // Deletar sugestoes anteriores
    await supabase
      .from('sugestoes_pedido_compra')
      .delete()
      .eq('pedido_compra_id', pedidoId)

    // Inserir novas sugestoes
    const sugestoesParaInserir = sugestoes.map(s => ({
      pedido_compra_id: pedidoId,
      item_id: s.item_id || null,
      quantidade_sugerida: s.quantidade_sugerida,
      valor_unitario_sugerido: s.valor_unitario_sugerido,
      desconto_percentual: s.desconto_percentual || 0,
      bonificacao_quantidade: s.bonificacao_quantidade || 0,
      validade: s.validade || null,
      observacao: s.observacao || null,
      gtin: s.gtin || null,
      codigo_fornecedor: s.codigo_fornecedor || null,
      is_substituicao: s.is_substituicao || false,
      is_novo: s.is_novo || false,
      produto_nome: s.produto_nome || null,
      preco_unitario: s.preco_unitario || null,
    }))

    const { error: insertError } = await supabase
      .from('sugestoes_pedido_compra')
      .insert(sugestoesParaInserir)

    if (insertError) {
      console.error('Erro ao inserir sugestoes:', insertError)
      throw insertError
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        status_interno: 'sugestao_enviada',
        observacao: observacao_geral || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .eq('is_excluded', false)

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError)
      throw updateError
    }

    // Registrar na timeline
    await supabase.from('pedido_compra_timeline').insert({
      pedido_compra_id: pedidoId,
      status: 'sugestao_enviada',
      descricao: 'Sugestao enviada pelo representante',
      usuario_tipo: 'representante',
      usuario_id: user.representanteUserId,
    })

    void logActivity({
      userId: String(user.representanteUserId),
      userType: 'representante',
      userEmail: user.email || undefined,
      userNome: user.nome || undefined,
      action: 'sugestao_enviada',
      empresaId: null,
      metadata: { pedido_id: pedidoId },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Sugestao enviada com sucesso',
    })
  } catch (error) {
    console.error('Representante sugestao error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
