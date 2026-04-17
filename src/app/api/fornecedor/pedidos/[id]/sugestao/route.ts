import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

interface SugestaoItemRequest {
  item_pedido_compra_id: number | null  // null para itens novos
  produto_id: number | null
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_quantidade: number  // Quantidade direta de unidades bonificadas
  validade: string | null
  // Novos campos para troca e adição de produtos
  gtin?: string | null
  codigo_fornecedor?: string | null
  is_substituicao?: boolean
  is_novo?: boolean
  produto_nome?: string | null
  preco_unitario?: number | null
  status_item?: 'ok' | 'depreciado' | 'ruptura' | 'divergente'
  observacao_item?: string | null
}

interface CondicoesComerciais {
  valor_minimo_pedido?: number
  desconto_geral?: number
  bonificacao_quantidade_geral?: number  // Quantidade direta de unidades bonificadas
  prazo_entrega_dias?: number
  validade_proposta?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj || !user.fornecedorUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const body = await request.json()
    const {
      itens,
      observacao,
      condicoes_comerciais,
    }: {
      itens: SugestaoItemRequest[]
      observacao?: string
      condicoes_comerciais?: CondicoesComerciais
    } = body

    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Itens da sugestao sao obrigatorios' }, { status: 400 })
    }

    // Validação extra para itens novos e substituições
    for (const item of itens) {
      if (item.is_novo) {
        if (!item.produto_nome) {
          return NextResponse.json(
            { error: 'produto_nome e obrigatorio para itens novos' },
            { status: 400 }
          )
        }
        if (!item.gtin && !item.codigo_fornecedor) {
          return NextResponse.json(
            { error: 'gtin ou codigo_fornecedor e obrigatorio para itens novos' },
            { status: 400 }
          )
        }
      }
      if (item.is_substituicao && !item.item_pedido_compra_id) {
        return NextResponse.json(
          { error: 'item_pedido_compra_id e obrigatorio para substituicoes' },
          { status: 400 }
        )
      }
    }

    const supabase = createServerSupabaseClient()

    // Validar acesso: verificar que o fornecedor tem CNPJ vinculado
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Verificar que o pedido existe e pertence ao fornecedor
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, empresa_id, status_interno, fornecedor_id')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar status permite sugestao
    if (!['enviado_fornecedor', 'sugestao_pendente'].includes(pedido.status_interno)) {
      return NextResponse.json(
        { error: 'Este pedido nao esta aberto para sugestoes' },
        { status: 400 }
      )
    }

    // Validações ANTES de inserir (evita criar sugestao orfã se falhar)
    const divergenteSemPreco = itens.filter((i: SugestaoItemRequest) =>
      i.status_item === 'divergente' && !i.preco_unitario
    )
    if (divergenteSemPreco.length > 0) {
      return NextResponse.json({
        error: `${divergenteSemPreco.length} item(ns) divergente(s) precisam ter o preco ajustado antes de enviar.`
      }, { status: 400 })
    }

    const extraSemObs = itens.filter((i: SugestaoItemRequest) =>
      i.is_novo && !i.observacao_item?.trim()
    )
    if (extraSemObs.length > 0) {
      return NextResponse.json({
        error: `Itens extras precisam ter observacao.`
      }, { status: 400 })
    }

    // Criar sugestao com condicoes comerciais
    const { data: sugestao, error: sugestaoError } = await supabase
      .from('sugestoes_fornecedor')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        fornecedor_user_id: user.fornecedorUserId,
        empresa_id: pedido.empresa_id,
        status: 'pendente',
        observacao_fornecedor: observacao || null,
        autor_tipo: 'fornecedor',
        valor_minimo_pedido: condicoes_comerciais?.valor_minimo_pedido || null,
        desconto_geral: condicoes_comerciais?.desconto_geral || 0,
        bonificacao_quantidade_geral: condicoes_comerciais?.bonificacao_quantidade_geral || 0,
        prazo_entrega_dias: condicoes_comerciais?.prazo_entrega_dias || null,
        validade_proposta: condicoes_comerciais?.validade_proposta || null,
      })
      .select()
      .single()

    if (sugestaoError || !sugestao) {
      console.error('Erro ao criar sugestao:', sugestaoError)
      return NextResponse.json({ error: 'Erro ao criar sugestao' }, { status: 500 })
    }

    // Inserir itens da sugestao
    const sugestaoItens = itens.map(item => ({
      sugestao_id: sugestao.id,
      item_pedido_compra_id: item.item_pedido_compra_id || null,
      produto_id: item.produto_id || null,
      quantidade_sugerida: item.quantidade_sugerida,
      desconto_percentual: item.desconto_percentual || 0,
      bonificacao_quantidade: item.bonificacao_quantidade || 0,  // Quantidade direta de unidades
      validade: item.validade || null,
      gtin: item.gtin || null,
      codigo_fornecedor: item.codigo_fornecedor || null,
      is_substituicao: item.is_substituicao || false,
      is_novo: item.is_novo || false,
      produto_nome: item.produto_nome || null,
      preco_unitario: item.preco_unitario || null,
      status_item: item.status_item || 'ok',
      observacao_item: item.observacao_item || null,
    }))

    const { error: itensError } = await supabase
      .from('sugestoes_fornecedor_itens')
      .insert(sugestaoItens)

    if (itensError) {
      console.error('Erro ao inserir itens da sugestao:', itensError)
    }

    // Atualizar status_interno do pedido
    await supabase
      .from('pedidos_compra')
      .update({ status_interno: 'sugestao_pendente' })
      .eq('id', pedidoId)
      .eq('is_excluded', false)

    // Registrar na timeline
    // Buscar nome do usuario fornecedor
    const { data: fornecedorUser } = await supabase
      .from('users_fornecedor')
      .select('nome')
      .eq('id', user.fornecedorUserId)
      .single()

    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'sugestao_enviada',
        descricao: observacao
          ? `Sugestao enviada pelo fornecedor: "${observacao}"`
          : 'Sugestao comercial enviada pelo fornecedor',
        autor_tipo: 'fornecedor',
        autor_nome: fornecedorUser?.nome || user.email,
      })

    void logActivity({
      userId: String(user.fornecedorUserId),
      userType: 'fornecedor',
      userEmail: user.email || undefined,
      userNome: user.nome || undefined,
      action: 'sugestao_enviada',
      empresaId: null,
      metadata: { pedido_id: pedidoId, cnpj: user.cnpj },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      sugestao_id: sugestao.id,
      message: 'Sugestao enviada com sucesso',
    })
  } catch (error) {
    console.error('Erro ao enviar sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj || !user.fornecedorUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const { searchParams } = new URL(request.url)
    const sugestaoId = searchParams.get('sugestao_id')

    if (!sugestaoId) {
      return NextResponse.json({ error: 'sugestao_id e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Validar acesso: verificar que o fornecedor tem CNPJ vinculado
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Verificar que o pedido existe e pertence ao fornecedor
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, empresa_id, status_interno, fornecedor_id')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar que a sugestao existe e pertence a este fornecedor
    const { data: sugestao, error: sugestaoError } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, fornecedor_user_id')
      .eq('id', sugestaoId)
      .eq('pedido_compra_id', pedidoId)
      .eq('fornecedor_user_id', user.fornecedorUserId)
      .single()

    if (sugestaoError || !sugestao) {
      return NextResponse.json({ error: 'Sugestao nao encontrada' }, { status: 404 })
    }

    // Apenas sugestoes pendentes podem ser excluidas
    if (sugestao.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Apenas sugestoes pendentes podem ser excluidas' },
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
        .update({ status_interno: 'enviado_fornecedor' })
        .eq('id', pedidoId)
        .eq('is_excluded', false)
    }

    // Buscar nome do usuario fornecedor para a timeline
    const { data: fornecedorUser } = await supabase
      .from('users_fornecedor')
      .select('nome')
      .eq('id', user.fornecedorUserId)
      .single()

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'sugestao_excluida',
        descricao: 'Sugestao comercial excluida pelo fornecedor',
        autor_tipo: 'fornecedor',
        autor_nome: fornecedorUser?.nome || user.email,
      })

    void logActivity({
      userId: String(user.fornecedorUserId),
      userType: 'fornecedor',
      userEmail: user.email || undefined,
      userNome: user.nome || undefined,
      action: 'sugestao_excluida',
      empresaId: null,
      metadata: { pedido_id: pedidoId, sugestao_id: sugestaoId, cnpj: user.cnpj },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Sugestao excluida com sucesso',
    })
  } catch (error) {
    console.error('Erro ao excluir sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
