import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const fornecedorId = searchParams.get('fornecedor_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({
        success: true,
        pedidos: [],
        total: 0,
        page,
        limit,
      })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json({
        success: true,
        pedidos: [],
        total: 0,
        page,
        limit,
      })
    }

    // Montar query de pedidos
    let query = supabase
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
        fornecedor_id,
        empresa_id,
        created_at,
        updated_at,
        fornecedores (
          id,
          nome,
          cnpj
        ),
        empresas (
          id,
          razao_social,
          nome_fantasia
        )
      `, { count: 'exact' })
      .in('fornecedor_id', fornecedorIds)
      .in('status', ['enviado_ao_fornecedor', 'sugestao_enviada', 'aprovado', 'recusado', 'cancelado', 'contra_proposta'])

    // Filtros opcionais
    if (status) {
      query = query.eq('status', status)
    }

    if (fornecedorId) {
      query = query.eq('fornecedor_id', parseInt(fornecedorId))
    }

    // Ordenacao e paginacao
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: pedidos, error, count } = await query

    if (error) {
      console.error('Erro ao buscar pedidos:', error)
      throw error
    }

    // Formatar pedidos
    const pedidosFormatados = pedidos?.map(p => {
      const fornData = p.fornecedores as unknown
      const forn = Array.isArray(fornData) ? fornData[0] : fornData
      const typedForn = forn as { nome: string; cnpj?: string } | null

      const empData = p.empresas as unknown
      const emp = Array.isArray(empData) ? empData[0] : empData
      const typedEmp = emp as { nome_fantasia?: string; razao_social: string } | null

      return {
        id: p.id,
        numero: p.numero,
        data: p.data,
        data_prevista: p.data_prevista,
        status: p.status,
        total: p.total,
        desconto: p.desconto,
        valor_frete: p.valor_frete,
        fornecedor_id: p.fornecedor_id,
        fornecedor_nome: typedForn?.nome || '',
        fornecedor_cnpj: typedForn?.cnpj,
        empresa_id: p.empresa_id,
        empresa_nome: typedEmp?.nome_fantasia || typedEmp?.razao_social || '',
        created_at: p.created_at,
        updated_at: p.updated_at,
      }
    }) || []

    return NextResponse.json({
      success: true,
      pedidos: pedidosFormatados,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Representante pedidos error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
