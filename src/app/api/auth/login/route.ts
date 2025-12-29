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

    // Buscar usuário pelo email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('ativo', true)
      .single()

    if (error || !user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Gerar token JWT
    const token = await generateToken({
      userId: user.id,
      empresaId: user.empresa_id,
      email: user.email,
      role: user.role,
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
