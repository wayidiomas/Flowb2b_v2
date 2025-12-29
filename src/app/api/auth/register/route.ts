import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth'
import type { RegisterCredentials, AuthResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: RegisterCredentials = await request.json()
    const { nome, email, password, acceptedTerms } = body

    // Validar campos obrigatórios
    if (!nome || !email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar aceite dos termos
    if (!acceptedTerms) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Você deve aceitar os termos de uso' },
        { status: 400 }
      )
    }

    // Validar tamanho mínimo da senha
    if (password.length < 8) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Este email já está cadastrado' },
        { status: 409 }
      )
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(password)

    // Gerar UUID para o novo usuário (auth própria, não depende de auth.uid())
    const newUserId = crypto.randomUUID()

    // Inserir novo usuário
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        nome,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'user',
        ativo: true,
      })
      .select()
      .single()

    if (insertError || !newUser) {
      console.error('Register insert error:', insertError)
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Erro ao criar conta' },
        { status: 500 }
      )
    }

    // Gerar token JWT (sem empresa_id por enquanto - usuário precisa vincular depois)
    const token = await generateToken({
      userId: newUser.id,
      empresaId: newUser.empresa_id || 0,
      email: newUser.email,
      role: newUser.role,
    })

    // Definir cookie
    await setAuthCookie(token)

    // Retornar usuário (sem password_hash)
    const { password_hash: _, ...userWithoutPassword } = newUser

    return NextResponse.json<AuthResponse>({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}