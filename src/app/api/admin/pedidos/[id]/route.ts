import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const { id: idParam } = await params
    const pedidoId = parseInt(idParam, 10)

    if (isNaN(pedidoId)) {
      return NextResponse.json(
        { error: 'ID de pedido invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // 1. Fetch pedido with all joins
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select(
        `
        *,
        empresas ( id, nome_fantasia ),
        fornecedores ( id, nome, cnpj ),
        representantes ( id, nome )
        `
      )
      .eq('id', pedidoId)
      .single()

    if (pedidoError || !pedido) {
      console.error('Error fetching pedido:', pedidoError)
      return NextResponse.json(
        { error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    // 2. Fetch itens_pedido_compra
    const { data: itens, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select('id, pedido_compra_id, produto_id, descricao, codigo_fornecedor, codigo_produto, unidade, quantidade, valor, valor_unitario_final, quantidade_bonificacao')
      .eq('pedido_compra_id', pedidoId)
      .order('id', { ascending: true })

    if (itensError) {
      console.error('Error fetching itens:', itensError)
    }

    // 3. Fetch pedido_timeline ordered by created_at ASC
    const { data: timeline, error: timelineError } = await supabase
      .from('pedido_timeline')
      .select('id, pedido_compra_id, evento, descricao, autor_tipo, autor_nome, created_at')
      .eq('pedido_compra_id', pedidoId)
      .order('created_at', { ascending: true })

    if (timelineError) {
      console.error('Error fetching timeline:', timelineError)
    }

    // 4. Fetch sugestoes_fornecedor with sugestoes_fornecedor_itens
    const { data: sugestoes, error: sugestoesError } = await supabase
      .from('sugestoes_fornecedor')
      .select(
        `
        id,
        pedido_compra_id,
        status,
        autor_tipo,
        observacao_fornecedor,
        observacao_lojista,
        valor_minimo_pedido,
        desconto_geral,
        bonificacao_quantidade_geral,
        prazo_entrega_dias,
        validade_proposta,
        created_at,
        sugestoes_fornecedor_itens (
          id,
          sugestao_id,
          item_pedido_compra_id,
          quantidade_sugerida,
          desconto_percentual,
          bonificacao_quantidade
        )
        `
      )
      .eq('pedido_compra_id', pedidoId)
      .order('created_at', { ascending: true })

    if (sugestoesError) {
      console.error('Error fetching sugestoes:', sugestoesError)
    }

    // Build response with flattened fields
    const empresa = pedido.empresas as { id: number; nome_fantasia: string | null } | null
    const fornecedor = pedido.fornecedores as { id: number; nome: string | null; cnpj: string | null } | null
    const representante = pedido.representantes as { id: number; nome: string | null } | null

    return NextResponse.json({
      pedido: {
        id: pedido.id,
        bling_id: pedido.bling_id,
        numero: pedido.numero,
        data: pedido.data,
        data_prevista: pedido.data_prevista,
        total_produtos: pedido.total_produtos,
        total: pedido.total,
        desconto: pedido.desconto,
        frete: pedido.frete,
        situacao: pedido.situacao,
        status_interno: pedido.status_interno,
        origem: pedido.origem,
        is_excluded: pedido.is_excluded,
        empresa_id: pedido.empresa_id,
        fornecedor_id: pedido.fornecedor_id,
        representante_id: pedido.representante_id,
        updated_at: pedido.updated_at,
        empresa_nome: empresa?.nome_fantasia || `Empresa #${pedido.empresa_id}`,
        fornecedor_nome: fornecedor?.nome || '-',
        fornecedor_cnpj: fornecedor?.cnpj || null,
        representante_nome: representante?.nome || null,
      },
      itens: itens || [],
      timeline: timeline || [],
      sugestoes: sugestoes || [],
    })
  } catch (error) {
    console.error('Unexpected error in admin pedido detail GET:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
