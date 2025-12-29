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

    // Buscar dados completos do usuário
    const supabase = createServerSupabaseClient()
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

    // Buscar dados da empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj')
      .eq('id', user.empresa_id)
      .single()

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        empresa,
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
