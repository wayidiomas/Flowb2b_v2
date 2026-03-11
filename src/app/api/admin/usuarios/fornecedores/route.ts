import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    // Fetch users_fornecedor
    let query = supabase
      .from('users_fornecedor')
      .select('id, nome, email, cnpj, telefone, ativo, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cnpj.ilike.%${search}%`)
    }

    if (status === 'ativo') {
      query = query.eq('ativo', true)
    } else if (status === 'inativo') {
      query = query.eq('ativo', false)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: fornecedores, error, count } = await query

    if (error) {
      console.error('Error fetching fornecedores:', error)
      return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
    }

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // For each fornecedor user, count how many lojistas they are linked to
    // and how many pedidos de compra they received (via fornecedores table matched by CNPJ)
    const cnpjs = fornecedores
      .map((f) => f.cnpj)
      .filter((cnpj): cnpj is string => !!cnpj)

    // Find fornecedores entities by CNPJ to get their IDs
    let fornecedorEntities: Array<{ id: number; cnpj: string; empresa_id: number; nome: string }> = []
    if (cnpjs.length > 0) {
      const { data: entities } = await supabase
        .from('fornecedores')
        .select('id, cnpj, empresa_id, nome')
        .in('cnpj', cnpjs)

      fornecedorEntities = entities || []
    }

    // Count pedidos_compra per fornecedor entity
    const fornecedorIds = fornecedorEntities.map((f) => f.id)
    let pedidosCounts: Record<number, number> = {}
    if (fornecedorIds.length > 0) {
      const { data: pedidos } = await supabase
        .from('pedidos_compra')
        .select('fornecedor_id')
        .in('fornecedor_id', fornecedorIds)

      if (pedidos) {
        for (const p of pedidos) {
          pedidosCounts[p.fornecedor_id] = (pedidosCounts[p.fornecedor_id] || 0) + 1
        }
      }
    }

    // Build CNPJ -> aggregated data map
    const cnpjData: Record<string, { lojistas: number; pedidos: number }> = {}
    for (const entity of fornecedorEntities) {
      if (!entity.cnpj) continue
      if (!cnpjData[entity.cnpj]) {
        cnpjData[entity.cnpj] = { lojistas: 0, pedidos: 0 }
      }
      cnpjData[entity.cnpj].lojistas += 1
      cnpjData[entity.cnpj].pedidos += pedidosCounts[entity.id] || 0
    }

    // Merge data
    const data = fornecedores.map((f) => ({
      ...f,
      lojistas_vinculados: f.cnpj ? (cnpjData[f.cnpj]?.lojistas || 0) : 0,
      pedidos_recebidos: f.cnpj ? (cnpjData[f.cnpj]?.pedidos || 0) : 0,
    }))

    const total = count ?? 0

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Unexpected error in fornecedores GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
