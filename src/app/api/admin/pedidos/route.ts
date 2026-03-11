import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const empresaId = searchParams.get('empresa_id')
    const fornecedorId = searchParams.get('fornecedor_id')
    const statusInterno = searchParams.get('status_interno')
    const dataDe = searchParams.get('data_de')
    const dataAte = searchParams.get('data_ate')
    const search = searchParams.get('search')
    const origem = searchParams.get('origem')
    const excluidos = searchParams.get('excluidos')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('per_page') || '20', 10)
    const offset = (page - 1) * perPage

    // Build query with joins
    let query = supabase
      .from('pedidos_compra')
      .select(
        `
        id,
        numero,
        data,
        total,
        status_interno,
        situacao,
        origem,
        is_excluded,
        updated_at,
        empresa_id,
        fornecedor_id,
        representante_id,
        empresas ( id, nome_fantasia ),
        fornecedores ( id, nome ),
        representantes ( id, nome )
        `,
        { count: 'exact' }
      )
      .order('data', { ascending: false })

    // Apply filters
    if (empresaId) {
      query = query.eq('empresa_id', parseInt(empresaId, 10))
    }

    if (fornecedorId) {
      query = query.eq('fornecedor_id', parseInt(fornecedorId, 10))
    }

    if (statusInterno) {
      // Support comma-separated multi-select
      const statuses = statusInterno.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length === 1) {
        query = query.eq('status_interno', statuses[0])
      } else if (statuses.length > 1) {
        query = query.in('status_interno', statuses)
      }
    }

    if (dataDe) {
      query = query.gte('data', dataDe)
    }

    if (dataAte) {
      query = query.lte('data', dataAte)
    }

    if (search) {
      query = query.ilike('numero', `%${search}%`)
    }

    if (origem) {
      query = query.eq('origem', origem)
    }

    if (excluidos === 'true') {
      query = query.eq('is_excluded', true)
    } else {
      // By default, hide excluded orders
      query = query.or('is_excluded.is.null,is_excluded.eq.false')
    }

    // Pagination
    query = query.range(offset, offset + perPage - 1)

    const { data: pedidos, error, count } = await query

    if (error) {
      console.error('Error fetching pedidos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar pedidos', details: error.message },
        { status: 500 }
      )
    }

    // Transform response to flatten joins
    const data = (pedidos || []).map((p: Record<string, unknown>) => {
      const empresa = p.empresas as { id: number; nome_fantasia: string | null } | null
      const fornecedor = p.fornecedores as { id: number; nome: string | null } | null
      const representante = p.representantes as { id: number; nome: string | null } | null

      return {
        id: p.id,
        numero: p.numero,
        data: p.data,
        total: p.total,
        status_interno: p.status_interno,
        situacao: p.situacao,
        origem: p.origem,
        is_excluded: p.is_excluded,
        updated_at: p.updated_at,
        empresa_nome: empresa?.nome_fantasia || `Empresa #${p.empresa_id}`,
        fornecedor_nome: fornecedor?.nome || '-',
        representante_nome: representante?.nome || null,
      }
    })

    const total = count ?? 0

    return NextResponse.json({
      data,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error('Unexpected error in admin pedidos GET:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
