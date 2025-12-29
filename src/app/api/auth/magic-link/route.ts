import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendMagicLinkEmail } from '@/lib/email'
import type { MagicLinkRequest, MagicLinkResponse } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: MagicLinkRequest = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json<MagicLinkResponse>(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<MagicLinkResponse>(
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
    if (!user) {
      return NextResponse.json<MagicLinkResponse>({
        success: true,
        message: 'Se o email existir, você receberá o link de acesso.',
      })
    }

    // Gerar token de magic link (64 caracteres hex)
    const magicLinkToken = crypto.randomUUID() + crypto.randomUUID()

    // Token expira em 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    // Salvar token no banco
    const { error: updateError } = await supabase
      .from('users')
      .update({
        magic_link_token: magicLinkToken,
        magic_link_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Magic link update error:', updateError)
      return NextResponse.json<MagicLinkResponse>(
        { success: false, error: 'Erro ao processar solicitação' },
        { status: 500 }
      )
    }

    // Gerar URL de magic link
    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-magic-link?token=${magicLinkToken}`

    // Enviar email com Resend
    const emailResult = await sendMagicLinkEmail(user.email, user.nome, magicLinkUrl)

    if (!emailResult.success) {
      console.error('Failed to send magic link email:', emailResult.error)
      // Não retornar erro ao usuário por segurança
    }

    return NextResponse.json<MagicLinkResponse>({
      success: true,
      message: 'Se o email existir, você receberá o link de acesso.',
    })
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json<MagicLinkResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
