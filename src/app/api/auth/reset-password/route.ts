import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import type { ResetPasswordRequest, ResetPasswordResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequest = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Token e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tamanho mínimo da senha
    if (password.length < 8) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar usuário pelo token de reset
    const { data: user } = await supabase
      .from('users')
      .select('id, email, reset_token_expires_at')
      .eq('reset_token', token)
      .eq('ativo', true)
      .single()

    if (!user) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 400 }
      )
    }

    // Verificar se token não expirou
    const expiresAt = new Date(user.reset_token_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Token expirado. Solicite um novo link.' },
        { status: 400 }
      )
    }

    // Criar hash da nova senha
    const passwordHash = await hashPassword(password)

    // Atualizar senha e limpar token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Reset password update error:', updateError)
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }

    return NextResponse.json<ResetPasswordResponse>({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode fazer login.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json<ResetPasswordResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
