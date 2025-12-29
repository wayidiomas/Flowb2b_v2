import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar dados completos do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nome, empresa_id, role, ativo, created_at, updated_at')
      .eq('id', sessionUser.userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Determinar empresa_id: primeiro do usuario, senao buscar de users_empresas
    let empresaId = user.empresa_id

    if (!empresaId) {
      // Buscar primeira empresa vinculada em users_empresas
      const { data: userEmpresa } = await supabase
        .from('users_empresas')
        .select('empresa_id, role')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (userEmpresa) {
        empresaId = userEmpresa.empresa_id
      }
    }

    // Buscar dados da empresa
    let empresa = null
    if (empresaId) {
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj')
        .eq('id', empresaId)
        .single()
      empresa = empresaData
    }

    // Buscar todas as empresas do usuario (para multi-tenant)
    const { data: empresasVinculadas } = await supabase
      .from('users_empresas')
      .select('empresa_id, role, ativo, empresas:empresa_id(id, razao_social, nome_fantasia, cnpj)')
      .eq('user_id', user.id)
      .eq('ativo', true)

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        empresa_id: empresaId,
        empresa,
        empresas: empresasVinculadas?.map(ue => ({
          ...ue.empresas,
          role: ue.role,
        })) || [],
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
