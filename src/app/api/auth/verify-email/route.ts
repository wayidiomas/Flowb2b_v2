import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

const TOKEN_EXPIRY_HOURS = 24

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar usuário pelo token de confirmação
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, nome, confirmation_sent_at, email_confirmed_at')
      .eq('confirmation_token', token)
      .single()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 400 }
      )
    }

    // Verificar se já foi confirmado
    if (user.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        message: 'Email já foi confirmado anteriormente',
        alreadyConfirmed: true,
      })
    }

    // Verificar se o token expirou (24 horas)
    if (user.confirmation_sent_at) {
      const sentAt = new Date(user.confirmation_sent_at)
      const now = new Date()
      const hoursElapsed = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60)

      if (hoursElapsed > TOKEN_EXPIRY_HOURS) {
        return NextResponse.json(
          { success: false, error: 'Token expirado. Solicite um novo email de confirmação.' },
          { status: 400 }
        )
      }
    }

    // Confirmar email
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_confirmed_at: new Date().toISOString(),
        confirmation_token: null,
        ativo: true,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error confirming email:', updateError)
      return NextResponse.json(
        { success: false, error: 'Erro ao confirmar email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email confirmado com sucesso!',
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
