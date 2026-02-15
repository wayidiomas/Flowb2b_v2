import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET - Buscar pedido para visualizacao publica (sem autenticacao)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Buscar detalhes do pedido usando RPC
    const { data, error } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
      p_pedido_id: parseInt(pedidoId)
    })

    if (error) {
      console.error('Erro ao buscar pedido:', error)
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // RPC retorna array, pegar primeiro elemento
    const pedido = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar se tem representante vinculado
    let representante = null
    if (pedido.representante_id) {
      const { data: repData } = await supabase
        .from('representantes')
        .select('id, codigo_acesso, nome')
        .eq('id', pedido.representante_id)
        .single()

      if (repData) {
        representante = {
          id: repData.id,
          codigo_acesso: repData.codigo_acesso,
          nome: repData.nome,
        }
      }
    }

    // Retornar dados do pedido (sem informacoes sensiveis)
    return NextResponse.json({
      id: pedido.id,
      numero: pedido.numero,
      data: pedido.data,
      data_prevista: pedido.data_prevista,
      fornecedor_nome: pedido.fornecedor_nome,
      situacao: pedido.situacao,
      total_produtos: pedido.total_produtos,
      total: pedido.total,
      desconto: pedido.desconto,
      frete: pedido.frete,
      frete_por_conta: pedido.frete_por_conta,
      transportador: pedido.transportador,
      observacoes: pedido.observacoes,
      representante,
      itens: pedido.itens?.map((item: any) => ({
        codigo_produto: item.codigo_produto,
        codigo_fornecedor: item.codigo_fornecedor,
        ean: item.ean || item.gtin,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor: item.valor,
      })) || [],
      parcelas: pedido.parcelas?.map((p: any) => ({
        valor: p.valor,
        data_vencimento: p.data_vencimento,
        forma_pagamento_nome: p.forma_pagamento_nome,
      })) || [],
    })

  } catch (error) {
    console.error('Erro ao buscar pedido publico:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pedido' },
      { status: 500 }
    )
  }
}
