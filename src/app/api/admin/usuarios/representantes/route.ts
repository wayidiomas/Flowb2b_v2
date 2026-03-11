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

    // Fetch users_representante
    let query = supabase
      .from('users_representante')
      .select('id, nome, email, telefone, ativo, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (status === 'ativo') {
      query = query.eq('ativo', true)
    } else if (status === 'inativo') {
      query = query.eq('ativo', false)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: representantes, error, count } = await query

    if (error) {
      console.error('Error fetching representantes:', error)
      return NextResponse.json({ error: 'Erro ao buscar representantes' }, { status: 500 })
    }

    if (!representantes || representantes.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // Fetch representantes entities linked to these users
    const userRepIds = representantes.map((r) => r.id)

    const { data: repEntities, error: repError } = await supabase
      .from('representantes')
      .select('id, user_representante_id, empresa_id, codigo_acesso, nome, ativo, empresas(id, nome_fantasia, razao_social)')
      .in('user_representante_id', userRepIds)

    if (repError) {
      console.error('Error fetching representante entities:', repError)
    }

    // Fetch fornecedores linked to each representante entity
    const repEntityIds = (repEntities || []).map((r) => r.id)
    let repFornecedores: Array<{
      representante_id: number
      fornecedor_id: number
      fornecedores: { id: number; nome: string } | null
    }> = []

    if (repEntityIds.length > 0) {
      const { data: rf } = await supabase
        .from('representante_fornecedores')
        .select('representante_id, fornecedor_id, fornecedores(id, nome)')
        .in('representante_id', repEntityIds)

      repFornecedores = (rf || []) as unknown as typeof repFornecedores
    }

    // Build map: user_representante_id -> { empresas, fornecedores, codigo_acesso }
    type RepData = {
      empresas: Array<{ id: number; nome: string }>
      fornecedores: Array<{ id: number; nome: string }>
      codigo_acesso: string | null
    }

    const repDataByUser: Record<number, RepData> = {}

    for (const entity of (repEntities || [])) {
      const userId = entity.user_representante_id
      if (!repDataByUser[userId]) {
        repDataByUser[userId] = { empresas: [], fornecedores: [], codigo_acesso: null }
      }

      // Add empresa
      const empresa = entity.empresas as unknown as {
        id: number
        nome_fantasia: string | null
        razao_social: string | null
      } | null
      if (empresa) {
        const alreadyAdded = repDataByUser[userId].empresas.some((e) => e.id === empresa.id)
        if (!alreadyAdded) {
          repDataByUser[userId].empresas.push({
            id: empresa.id,
            nome: empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`,
          })
        }
      }

      // Set codigo_acesso (take the first non-null one)
      if (!repDataByUser[userId].codigo_acesso && entity.codigo_acesso) {
        repDataByUser[userId].codigo_acesso = entity.codigo_acesso
      }

      // Add fornecedores for this representante entity
      const entityFornecedores = repFornecedores.filter((rf) => rf.representante_id === entity.id)
      for (const rf of entityFornecedores) {
        const forn = rf.fornecedores as unknown as { id: number; nome: string } | null
        if (forn) {
          const alreadyAdded = repDataByUser[userId].fornecedores.some((f) => f.id === forn.id)
          if (!alreadyAdded) {
            repDataByUser[userId].fornecedores.push({
              id: forn.id,
              nome: forn.nome,
            })
          }
        }
      }
    }

    // Merge data
    const data = representantes.map((rep) => ({
      ...rep,
      empresas: repDataByUser[rep.id]?.empresas || [],
      fornecedores: repDataByUser[rep.id]?.fornecedores || [],
      codigo_acesso: repDataByUser[rep.id]?.codigo_acesso || null,
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
    console.error('Unexpected error in representantes GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
