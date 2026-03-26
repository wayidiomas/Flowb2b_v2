import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface SugestaoItem {
  item_id: number | null  // null para itens novos
  produto_id?: number | null
  quantidade_sugerida: number
  valor_unitario_sugerido?: number
  desconto_percentual?: number
  bonificacao_quantidade?: number
  validade?: string
  observacao?: string
  // Campos para troca e adição de produtos
  gtin?: string | null
  codigo_fornecedor?: string | null
  is_substituicao?: boolean
  is_novo?: boolean
  produto_nome?: string | null
  preco_unitario?: number | null
}

interface CondicoesComerciais {
  valor_minimo_pedido?: number
  desconto_geral?: number
  bonificacao_quantidade_geral?: number
  prazo_entrega_dias?: number
  validade_proposta?: string
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
    // Aceitar tanto 'sugestoes' (formato antigo) quanto 'itens' (formato novo)
    const rawItens = body.sugestoes || body.itens || []
    const observacao_geral: string | undefined = body.observacao_geral || body.observacao
    const condicoesComerciais: CondicoesComerciais | undefined = body.condicoes_comerciais

    // Mapear campos: frontend envia 'item_pedido_compra_id', API usa 'item_id'
    const sugestoes: SugestaoItem[] = rawItens.map((item: Record<string, unknown>) => ({
      ...item,
      item_id: item.item_id ?? item.item_pedido_compra_id ?? null,
      valor_unitario_sugerido: item.valor_unitario_sugerido ?? item.preco_unitario ?? 0,
    })) as SugestaoItem[]

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
      .select('id, status_interno, fornecedor_id, empresa_id')
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

    // Deletar sugestoes anteriores do representante (pendentes) em sugestoes_fornecedor + sugestoes_fornecedor_itens
    const { data: sugestoesPendentes } = await supabase
      .from('sugestoes_fornecedor')
      .select('id')
      .eq('pedido_compra_id', pedidoId)
      .eq('autor_tipo', 'representante')
      .eq('status', 'pendente')

    if (sugestoesPendentes && sugestoesPendentes.length > 0) {
      const idsParaDeletar = sugestoesPendentes.map(s => s.id)

      // Deletar itens primeiro (FK)
      await supabase
        .from('sugestoes_fornecedor_itens')
        .delete()
        .in('sugestao_id', idsParaDeletar)

      // Deletar headers
      await supabase
        .from('sugestoes_fornecedor')
        .delete()
        .in('id', idsParaDeletar)
    }

    // Criar sugestao header em sugestoes_fornecedor
    const { data: sugestao, error: sugestaoError } = await supabase
      .from('sugestoes_fornecedor')
      .insert({
        pedido_compra_id: pedidoId,
        fornecedor_user_id: null, // representante não tem fornecedor_user_id
        empresa_id: pedido.empresa_id,
        status: 'pendente',
        observacao_fornecedor: observacao_geral || null,
        autor_tipo: 'representante', // CRÍTICO: marca como representante
        // Condições comerciais
        valor_minimo_pedido: condicoesComerciais?.valor_minimo_pedido || null,
        desconto_geral: condicoesComerciais?.desconto_geral || 0,
        bonificacao_quantidade_geral: condicoesComerciais?.bonificacao_quantidade_geral || 0,
        prazo_entrega_dias: condicoesComerciais?.prazo_entrega_dias || null,
        validade_proposta: condicoesComerciais?.validade_proposta || null,
      })
      .select('id')
      .single()

    if (sugestaoError || !sugestao) {
      console.error('Erro ao criar sugestao:', sugestaoError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar sugestao' },
        { status: 500 }
      )
    }

    // Inserir itens da sugestao em sugestoes_fornecedor_itens
    const itensParaInserir = sugestoes.map(s => ({
      sugestao_id: sugestao.id,
      item_pedido_compra_id: s.item_id || null,
      produto_id: s.produto_id || null,
      quantidade_sugerida: s.quantidade_sugerida,
      desconto_percentual: s.desconto_percentual || 0,
      bonificacao_quantidade: s.bonificacao_quantidade || 0,
      validade: s.validade || null,
      gtin: s.gtin || null,
      codigo_fornecedor: s.codigo_fornecedor || null,
      is_substituicao: s.is_substituicao || false,
      is_novo: s.is_novo || false,
      produto_nome: s.produto_nome || null,
      preco_unitario: s.preco_unitario || null,
    }))

    const { error: itensError } = await supabase
      .from('sugestoes_fornecedor_itens')
      .insert(itensParaInserir)

    if (itensError) {
      console.error('Erro ao inserir itens da sugestao:', itensError)
      throw itensError
    }

    // Atualizar status do pedido para sugestao_pendente (mesmo que o fornecedor)
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        status_interno: 'sugestao_pendente',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .eq('is_excluded', false)

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError)
      throw updateError
    }

    // Buscar nome do representante para a timeline
    const { data: repUser } = await supabase
      .from('users_representante')
      .select('nome')
      .eq('id', user.representanteUserId)
      .single()
    const representanteNome = repUser?.nome || user.email

    // Registrar na timeline (pedido_timeline, mesma tabela do fornecedor)
    await supabase.from('pedido_timeline').insert({
      pedido_compra_id: pedidoId,
      evento: 'sugestao_enviada',
      descricao: observacao_geral
        ? `Sugestao comercial enviada pelo representante: "${observacao_geral}"`
        : 'Sugestao comercial enviada pelo representante',
      autor_tipo: 'representante',
      autor_nome: representanteNome,
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
      sugestao_id: sugestao.id,
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

export async function DELETE(
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
      return NextResponse.json({ success: false, error: 'ID invalido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const sugestaoId = searchParams.get('sugestao_id')

    if (!sugestaoId) {
      return NextResponse.json(
        { success: false, error: 'sugestao_id e obrigatorio' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sem acesso' },
        { status: 403 }
      )
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    // Verificar se pedido existe e pertence a um fornecedor vinculado
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, fornecedor_id, empresa_id')
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

    // Verificar que a sugestao existe, pertence a este pedido, e foi criada por representante
    const { data: sugestao, error: sugestaoError } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, autor_tipo')
      .eq('id', sugestaoId)
      .eq('pedido_compra_id', pedidoId)
      .eq('autor_tipo', 'representante')
      .single()

    if (sugestaoError || !sugestao) {
      return NextResponse.json(
        { success: false, error: 'Sugestao nao encontrada' },
        { status: 404 }
      )
    }

    // Apenas sugestoes pendentes podem ser excluidas
    if (sugestao.status !== 'pendente') {
      return NextResponse.json(
        { success: false, error: 'Apenas sugestoes pendentes podem ser excluidas' },
        { status: 400 }
      )
    }

    // Deletar itens primeiro (FK)
    await supabase
      .from('sugestoes_fornecedor_itens')
      .delete()
      .eq('sugestao_id', sugestao.id)

    // Deletar a sugestao
    await supabase
      .from('sugestoes_fornecedor')
      .delete()
      .eq('id', sugestao.id)

    // Verificar se existem outras sugestoes para este pedido
    const { data: outrasSugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select('id')
      .eq('pedido_compra_id', pedidoId)

    // Se nao ha mais sugestoes, reverter status_interno para enviado_fornecedor
    if (!outrasSugestoes || outrasSugestoes.length === 0) {
      await supabase
        .from('pedidos_compra')
        .update({
          status_interno: 'enviado_fornecedor',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedidoId)
        .eq('is_excluded', false)
    }

    // Buscar nome do representante para a timeline
    const { data: repUser } = await supabase
      .from('users_representante')
      .select('nome')
      .eq('id', user.representanteUserId)
      .single()
    const representanteNome = repUser?.nome || user.email

    // Registrar na timeline
    await supabase.from('pedido_timeline').insert({
      pedido_compra_id: pedidoId,
      evento: 'sugestao_excluida',
      descricao: 'Sugestao comercial excluida pelo representante',
      autor_tipo: 'representante',
      autor_nome: representanteNome,
    })

    void logActivity({
      userId: String(user.representanteUserId),
      userType: 'representante',
      userEmail: user.email || undefined,
      userNome: user.nome || undefined,
      action: 'sugestao_excluida',
      empresaId: null,
      metadata: { pedido_id: pedidoId, sugestao_id: sugestaoId },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Sugestao excluida com sucesso',
    })
  } catch (error) {
    console.error('Representante sugestao delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
