import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth'
import type { LoginCredentials, AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar usuário pelo email (sem filtro de ativo para dar mensagem correta)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha primeiro
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // TODO: Reabilitar verificação de email quando domínio verificado no Resend
    // if (!user.email_confirmed_at) {
    //   return NextResponse.json<AuthResponse>(
    //     {
    //       success: false,
    //       error: 'Email ainda não confirmado. Verifique sua caixa de entrada.',
    //       requiresEmailConfirmation: true,
    //     },
    //     { status: 401 }
    //   )
    // }

    // Verificar se usuário está ativo
    if (!user.ativo) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Conta desativada. Entre em contato com o suporte.' },
        { status: 401 }
      )
    }

    // Gerar token JWT
    const token = await generateToken({
      userId: user.id,
      empresaId: user.empresa_id,
      email: user.email,
      role: user.role,
      tipo: 'lojista',
    })

    // Definir cookie
    await setAuthCookie(token)

    // Retornar usuário (sem password_hash)
    const { password_hash: _, ...userWithoutPassword } = user

    return NextResponse.json<AuthResponse>({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
