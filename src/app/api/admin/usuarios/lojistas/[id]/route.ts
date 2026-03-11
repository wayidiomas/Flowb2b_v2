import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/usuarios/lojistas/[id]
 *
 * Retorna detalhes completos de um usuario (lojista):
 * - Dados do usuario
 * - Empresas vinculadas (via users_empresas)
 * - Contagens por empresa: pedidos, produtos, fornecedores
 * - Tipo de usuario computado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Buscar usuario
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, nome, email, role, ativo, created_at, updated_at')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar empresas vinculadas via users_empresas
    const { data: userEmpresas, error: ueError } = await supabase
      .from('users_empresas')
      .select('user_id, role, empresa_id, empresas(id, nome_fantasia, razao_social, cnpj, created_date)')
      .eq('user_id', id)

    if (ueError) {
      console.error('[Admin Lojista Detail] Erro ao buscar users_empresas:', ueError)
    }

    // Computar tipo_usuario
    let tipo_usuario: string
    if (user.role === 'superadmin') {
      tipo_usuario = 'superadmin'
    } else if (userEmpresas && userEmpresas.some((ue) => ue.role === 'admin')) {
      tipo_usuario = 'lojista'
    } else if (userEmpresas && userEmpresas.length > 0) {
      tipo_usuario = 'colaborador'
    } else {
      tipo_usuario = 'sem_empresa'
    }

    // Para cada empresa, buscar contagens em paralelo
    const empresaIds = (userEmpresas || []).map((ue) => {
      const empresa = ue.empresas as unknown as {
        id: number
        nome_fantasia: string | null
        razao_social: string | null
        cnpj: string | null
        created_date: string | null
      } | null
      return empresa?.id
    }).filter((id): id is number => id != null)

    // Buscar contagens para todas as empresas em paralelo
    const countsPromises = empresaIds.map(async (empresaId) => {
      const [pedidosResult, produtosResult, fornecedoresResult] = await Promise.all([
        supabase
          .from('pedidos_compra')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
        supabase
          .from('produtos')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
        supabase
          .from('fornecedores')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
      ])

      return {
        empresa_id: empresaId,
        pedidos: pedidosResult.count || 0,
        produtos: produtosResult.count || 0,
        fornecedores: fornecedoresResult.count || 0,
      }
    })

    const allCounts = await Promise.all(countsPromises)
    const countsMap: Record<number, { pedidos: number; produtos: number; fornecedores: number }> = {}
    for (const c of allCounts) {
      countsMap[c.empresa_id] = {
        pedidos: c.pedidos,
        produtos: c.produtos,
        fornecedores: c.fornecedores,
      }
    }

    // Montar lista de empresas com contagens
    const empresas = (userEmpresas || []).map((ue) => {
      const empresa = ue.empresas as unknown as {
        id: number
        nome_fantasia: string | null
        razao_social: string | null
        cnpj: string | null
        created_date: string | null
      } | null

      const empId = empresa?.id ?? 0
      const counts = countsMap[empId] || { pedidos: 0, produtos: 0, fornecedores: 0 }

      return {
        id: empId,
        nome_fantasia: empresa?.nome_fantasia ?? null,
        razao_social: empresa?.razao_social ?? null,
        cnpj: empresa?.cnpj ?? null,
        created_date: empresa?.created_date ?? null,
        role: ue.role || 'user',
        pedidos: counts.pedidos,
        produtos: counts.produtos,
        fornecedores: counts.fornecedores,
      }
    })

    // Somar totais
    const stats = {
      total_empresas: empresas.length,
      total_pedidos: empresas.reduce((sum, e) => sum + e.pedidos, 0),
      total_produtos: empresas.reduce((sum, e) => sum + e.produtos, 0),
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        ativo: user.ativo,
        created_at: user.created_at,
        updated_at: user.updated_at,
        tipo_usuario,
      },
      empresas,
      stats,
    })
  } catch (error) {
    console.error('[Admin Lojista Detail] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
