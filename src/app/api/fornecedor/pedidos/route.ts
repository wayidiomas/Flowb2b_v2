import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // Buscar fornecedores vinculados ao CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ pedidos: [] })
    }

    const fornecedorIds = fornecedores.map(f => f.id)
    const empresaIds = [...new Set(fornecedores.map(f => f.empresa_id))]

    // Buscar pedidos
    let query = supabase
      .from('pedidos_compra')
      .select('id, numero, data, data_prevista, total, total_produtos, status_interno, empresa_id, fornecedor_id')
      .in('fornecedor_id', fornecedorIds)
      .neq('status_interno', 'rascunho')
      .order('data', { ascending: false })

    if (statusFilter) {
      query = query.eq('status_interno', statusFilter)
    }

    const { data: pedidos } = await query

    // Buscar empresas para nomes
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .in('id', empresaIds)

    const empresaMap = new Map((empresas || []).map(e => [e.id, e]))

    // Contar itens por pedido
    const pedidoIds = (pedidos || []).map(p => p.id)
    const { data: itensCounts } = await supabase
      .from('itens_pedido_compra')
      .select('pedido_compra_id')
      .in('pedido_compra_id', pedidoIds.length > 0 ? pedidoIds : [0])

    const itensCountMap = new Map<number, number>()
    ;(itensCounts || []).forEach(item => {
      itensCountMap.set(item.pedido_compra_id, (itensCountMap.get(item.pedido_compra_id) || 0) + 1)
    })

    const pedidosFormatted = (pedidos || []).map(p => ({
      ...p,
      empresa_nome: empresaMap.get(p.empresa_id)?.nome_fantasia || empresaMap.get(p.empresa_id)?.razao_social || '',
      itens_count: itensCountMap.get(p.id) || 0,
    }))

    return NextResponse.json({ pedidos: pedidosFormatted })
  } catch (error) {
    console.error('Erro ao listar pedidos fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
