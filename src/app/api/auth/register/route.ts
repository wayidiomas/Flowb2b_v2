import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { sendEmailConfirmation } from '@/lib/email'
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
      .select('id, email_confirmed_at')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      // Se o email existe mas não foi confirmado, informar ao usuário
      if (!existingUser.email_confirmed_at) {
        return NextResponse.json<AuthResponse>(
          { success: false, error: 'Este email já está cadastrado. Verifique sua caixa de entrada para confirmar.' },
          { status: 409 }
        )
      }
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Este email já está cadastrado' },
        { status: 409 }
      )
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(password)

    // Gerar UUID para o novo usuário
    const newUserId = crypto.randomUUID()

    // Gerar token de confirmação de email
    const confirmationToken = crypto.randomUUID()

    // Inserir novo usuário (inativo até confirmar email)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        nome,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'user',
        ativo: false, // Inativo até confirmar email
        confirmation_token: confirmationToken,
        confirmation_sent_at: new Date().toISOString(),
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

    // Montar URL de confirmação
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const confirmationUrl = `${baseUrl}/verify-email?token=${confirmationToken}`

    // Enviar email de confirmação
    const emailResult = await sendEmailConfirmation(
      newUser.email,
      newUser.nome,
      confirmationUrl
    )

    if (!emailResult.success) {
      console.error('Failed to send confirmation email:', emailResult.error)
      // Não falhar o registro, apenas logar o erro
    }

    return NextResponse.json<AuthResponse>({
      success: true,
      message: 'Conta criada! Verifique seu email para confirmar o cadastro.',
      requiresEmailConfirmation: true,
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
