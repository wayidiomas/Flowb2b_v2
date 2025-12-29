import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendResetPasswordEmail } from '@/lib/email'
import type { ForgotPasswordRequest, ForgotPasswordResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: ForgotPasswordRequest = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json<ForgotPasswordResponse>(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<ForgotPasswordResponse>(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar usuário pelo email
    const { data: user } = await supabase
      .from('users')
      .select('id, email, nome')
      .eq('email', email.toLowerCase())
      .eq('ativo', true)
      .single()

    // IMPORTANTE: Sempre retornar sucesso para não revelar se email existe
    // (segurança contra enumeração de usuários)
    if (!user) {
      return NextResponse.json<ForgotPasswordResponse>({
        success: true,
        message: 'Se o email existir, você receberá as instruções para alterar sua senha.',
      })
    }

    // Gerar token de reset (64 caracteres hex)
    const resetToken = crypto.randomUUID() + crypto.randomUUID()

    // Token expira em 1 hora
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Salvar token no banco
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Forgot password update error:', updateError)
      return NextResponse.json<ForgotPasswordResponse>(
        { success: false, error: 'Erro ao processar solicitação' },
        { status: 500 }
      )
    }

    // Gerar URL de reset
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    // Enviar email com Resend
    const emailResult = await sendResetPasswordEmail(user.email, user.nome, resetUrl)

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      // Não retornar erro ao usuário por segurança
    }

    return NextResponse.json<ForgotPasswordResponse>({
      success: true,
      message: 'Se o email existir, você receberá as instruções para alterar sua senha.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json<ForgotPasswordResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
