import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

interface UpdatePasswordRequest {
  userId: string
  newPassword: string
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdatePasswordRequest = await request.json()
    const { userId, newPassword } = body

    // Validar campos obrigatorios
    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId e newPassword sao obrigatorios' },
        { status: 400 }
      )
    }

    // Validar tamanho minimo da senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no minimo 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verificar se usuario existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    // Criar hash da nova senha
    const passwordHash = await hashPassword(newPassword)

    // Atualizar senha
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Update password error:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso' })
  } catch (error) {
    console.error('Update password error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
