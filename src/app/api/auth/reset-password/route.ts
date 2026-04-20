import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import type { ResetPasswordRequest, ResetPasswordResponse } from '@/types/auth'

const TABLES = ['users', 'users_fornecedor', 'users_representante'] as const

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

    if (password.length < 8) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Procura o token nas 3 tabelas de usuarios
    let matchedTable: (typeof TABLES)[number] | null = null
    let userId: string | number | null = null
    let expiresAtRaw: string | null = null

    for (const table of TABLES) {
      const { data } = await supabase
        .from(table)
        .select('id, reset_token_expires_at')
        .eq('reset_token', token)
        .eq('ativo', true)
        .single()
      if (data) {
        matchedTable = table
        userId = data.id
        expiresAtRaw = data.reset_token_expires_at
        break
      }
    }

    if (!matchedTable || userId === null) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 400 }
      )
    }

    if (!expiresAtRaw || new Date(expiresAtRaw) < new Date()) {
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Token expirado. Solicite um novo link.' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const { error: updateError } = await supabase
      .from(matchedTable)
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Reset password update error:', updateError)
      return NextResponse.json<ResetPasswordResponse>(
        { success: false, error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }

    const userType =
      matchedTable === 'users_fornecedor'
        ? 'fornecedor'
        : matchedTable === 'users_representante'
          ? 'representante'
          : 'lojista'

    return NextResponse.json<ResetPasswordResponse>({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode fazer login.',
      userType,
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json<ResetPasswordResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
