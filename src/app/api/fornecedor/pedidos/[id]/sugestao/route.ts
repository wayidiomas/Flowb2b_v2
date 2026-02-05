import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface SugestaoItemRequest {
  item_pedido_compra_id: number
  produto_id: number | null
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_percentual: number
  validade: string | null
}

interface CondicoesComerciais {
  valor_minimo_pedido?: number
  desconto_geral?: number
  bonificacao_geral?: number
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
        // Condicoes comerciais
        valor_minimo_pedido: condicoes_comerciais?.valor_minimo_pedido || null,
        desconto_geral: condicoes_comerciais?.desconto_geral || 0,
        bonificacao_geral: condicoes_comerciais?.bonificacao_geral || 0,
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
      item_pedido_compra_id: item.item_pedido_compra_id,
      produto_id: item.produto_id,
      quantidade_sugerida: item.quantidade_sugerida,
      desconto_percentual: item.desconto_percentual || 0,
      bonificacao_percentual: item.bonificacao_percentual || 0,
      validade: item.validade || null,
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
