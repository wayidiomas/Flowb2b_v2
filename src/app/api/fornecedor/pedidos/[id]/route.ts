import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Verificar que o pedido pertence a um fornecedor com o CNPJ do usuario
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, nome, nome_fantasia')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('*')
      .eq('id', id)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Buscar itens do pedido
    const { data: itens } = await supabase
      .from('itens_pedido_compra')
      .select('id, descricao, codigo_produto, codigo_fornecedor, unidade, valor, quantidade, aliquota_ipi, produto_id')
      .eq('pedido_compra_id', id)

    // Buscar nome da empresa (lojista)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('id', pedido.empresa_id)
      .single()

    // Buscar sugestoes existentes
    const { data: sugestoes } = await supabase
      .from('sugestoes_fornecedor')
      .select('id, status, observacao_fornecedor, observacao_lojista, created_at')
      .eq('pedido_compra_id', id)
      .order('created_at', { ascending: false })

    // Se ha sugestao, buscar itens da sugestao mais recente
    let sugestaoItens = null
    if (sugestoes && sugestoes.length > 0) {
      const { data: sItens } = await supabase
        .from('sugestoes_fornecedor_itens')
        .select('*')
        .eq('sugestao_id', sugestoes[0].id)

      sugestaoItens = sItens
    }

    // Timeline
    const { data: timeline } = await supabase
      .from('pedido_timeline')
      .select('*')
      .eq('pedido_compra_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      pedido: {
        ...pedido,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
      },
      itens: itens || [],
      sugestoes: sugestoes || [],
      sugestaoItens,
      timeline: timeline || [],
    })
  } catch (error) {
    console.error('Erro ao buscar pedido fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
