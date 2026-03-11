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
    const tipo = searchParams.get('tipo') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // When a tipo filter is active, we need to fetch ALL users first (since
    // tipo_usuario is computed from the users_empresas join), then filter and
    // paginate in memory. The user list is small (~12) so this is fine.
    let query = supabase
      .from('users')
      .select('id, nome, email, role, ativo, created_at')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (status === 'ativo') {
      query = query.eq('ativo', true)
    } else if (status === 'inativo') {
      query = query.eq('ativo', false)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching lojistas:', error)
      return NextResponse.json({ error: 'Erro ao buscar lojistas' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // Fetch empresas for each user via users_empresas junction
    const userIds = users.map((u) => u.id)

    const { data: userEmpresas, error: ueError } = await supabase
      .from('users_empresas')
      .select('user_id, role, empresa_id, empresas(id, nome_fantasia, razao_social)')
      .in('user_id', userIds)

    if (ueError) {
      console.error('Error fetching user-empresa relations:', ueError)
    }

    // Build a map of user_id -> empresas[]
    const empresasByUser: Record<string, Array<{
      id: number
      nome: string
      role: string
    }>> = {}

    if (userEmpresas) {
      for (const ue of userEmpresas) {
        const userId = ue.user_id
        if (!empresasByUser[userId]) {
          empresasByUser[userId] = []
        }
        const empresa = ue.empresas as unknown as {
          id: number
          nome_fantasia: string | null
          razao_social: string | null
        } | null
        if (empresa) {
          empresasByUser[userId].push({
            id: empresa.id,
            nome: empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`,
            role: ue.role || 'user',
          })
        }
      }
    }

    // Merge data and compute tipo_usuario
    const allData = users.map((user) => {
      const userEmps = empresasByUser[user.id] || []

      let tipo_usuario: string
      if (user.role === 'superadmin') {
        tipo_usuario = 'superadmin'
      } else if (userEmps.some((e) => e.role === 'admin')) {
        tipo_usuario = 'lojista'
      } else if (userEmps.length > 0) {
        tipo_usuario = 'colaborador'
      } else {
        tipo_usuario = 'sem_empresa'
      }

      return {
        ...user,
        empresas: userEmps,
        tipo_usuario,
      }
    })

    // Filter by tipo if specified
    const filtered = tipo
      ? allData.filter((u) => u.tipo_usuario === tipo)
      : allData

    // Paginate in memory
    const total = filtered.length
    const offset = (page - 1) * limit
    const data = filtered.slice(offset, offset + limit)

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
    console.error('Unexpected error in lojistas GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
