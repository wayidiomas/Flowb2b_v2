import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendResetPasswordEmail } from '@/lib/email'
import type { ForgotPasswordRequest, ForgotPasswordResponse } from '@/types/auth'

const TABLES = ['users', 'users_fornecedor', 'users_representante'] as const

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<ForgotPasswordResponse>(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const emailLower = email.toLowerCase()

    // Mesma mensagem pras 3 respostas pra nao vazar qual tipo de usuario existe
    const safeSuccess = NextResponse.json<ForgotPasswordResponse>({
      success: true,
      message: 'Se o email existir, você receberá as instruções para alterar sua senha.',
    })

    // Procura o email nas 3 tabelas (lojista > fornecedor > representante)
    let matchedTable: (typeof TABLES)[number] | null = null
    let userId: string | number | null = null
    let userNome = ''
    let userEmail = ''

    for (const table of TABLES) {
      const { data } = await supabase
        .from(table)
        .select('id, email, nome')
        .eq('email', emailLower)
        .eq('ativo', true)
        .single()
      if (data) {
        matchedTable = table
        userId = data.id
        userNome = data.nome || ''
        userEmail = data.email
        break
      }
    }

    if (!matchedTable || userId === null) {
      return safeSuccess
    }

    const resetToken = crypto.randomUUID() + crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const { error: updateError } = await supabase
      .from(matchedTable)
      .update({
        reset_token: resetToken,
        reset_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Forgot password update error:', updateError)
      return NextResponse.json<ForgotPasswordResponse>(
        { success: false, error: 'Erro ao processar solicitação' },
        { status: 500 }
      )
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-senha?token=${resetToken}`

    const emailResult = await sendResetPasswordEmail(userEmail, userNome, resetUrl)
    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      // Nao revela falha ao usuario (preservar UX uniforme)
    }

    return safeSuccess
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json<ForgotPasswordResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
