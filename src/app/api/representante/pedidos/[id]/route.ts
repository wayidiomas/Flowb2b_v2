import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
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

    if (fornecedorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar pedido
    const { data: pedido, error } = await supabase
      .from('pedidos_compra')
      .select(`
        id,
        numero,
        data,
        data_prevista,
        status,
        total,
        desconto,
        valor_frete,
        observacao,
        fornecedor_id,
        empresa_id,
        created_at,
        updated_at,
        fornecedores (
          id,
          nome,
          cnpj,
          telefone,
          celular,
          email
        ),
        empresas (
          id,
          razao_social,
          nome_fantasia,
          cnpj,
          telefone,
          email
        )
      `)
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (error || !pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar itens do pedido
    const { data: itens } = await supabase
      .from('itens_pedido_compra')
      .select(`
        id,
        produto_id,
        codigo_produto,
        nome_produto,
        quantidade,
        valor_unitario,
        desconto,
        valor_total,
        unidade,
        produtos (
          id,
          nome,
          codigo,
          gtin
        )
      `)
      .eq('pedido_compra_id', pedidoId)
      .order('id', { ascending: true })

    // Buscar sugestoes se existirem
    const { data: sugestoes } = await supabase
      .from('sugestoes_pedido_compra')
      .select('*')
      .eq('pedido_compra_id', pedidoId)
      .order('item_id', { ascending: true })

    // Buscar parcelas
    const { data: parcelas } = await supabase
      .from('parcelas_pedido_compra')
      .select('*')
      .eq('pedido_compra_id', pedidoId)
      .order('numero', { ascending: true })

    return NextResponse.json({
      success: true,
      pedido: {
        id: pedido.id,
        numero: pedido.numero,
        data: pedido.data,
        data_prevista: pedido.data_prevista,
        status: pedido.status,
        total: pedido.total,
        desconto: pedido.desconto,
        valor_frete: pedido.valor_frete,
        observacao: pedido.observacao,
        created_at: pedido.created_at,
        updated_at: pedido.updated_at,
        fornecedor: pedido.fornecedores,
        empresa: pedido.empresas,
      },
      itens: itens?.map(item => ({
        id: item.id,
        produto_id: item.produto_id,
        codigo: item.codigo_produto || (item.produtos as { codigo?: string })?.codigo,
        nome: item.nome_produto || (item.produtos as { nome?: string })?.nome,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        valor_total: item.valor_total,
        unidade: item.unidade,
        gtin: (item.produtos as { gtin?: string })?.gtin,
      })) || [],
      sugestoes: sugestoes || [],
      parcelas: parcelas || [],
    })
  } catch (error) {
    console.error('Representante pedido detail error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
