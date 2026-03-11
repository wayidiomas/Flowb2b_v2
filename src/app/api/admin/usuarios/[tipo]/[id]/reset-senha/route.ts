import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendResetPasswordEmail } from '@/lib/email'

const TABLE_MAP: Record<string, string> = {
  lojistas: 'users',
  fornecedores: 'users_fornecedor',
  representantes: 'users_representante',
}

const RESET_PATH_MAP: Record<string, string> = {
  lojistas: '/reset-senha',
  fornecedores: '/fornecedor/reset-senha',
  representantes: '/representante/reset-senha',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const { tipo, id } = await params
    const table = TABLE_MAP[tipo]

    if (!table) {
      return NextResponse.json(
        { error: 'Tipo de usuario invalido. Use: lojistas, fornecedores ou representantes.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Fetch user
    const { data: user, error: fetchError } = await supabase
      .from(table)
      .select('id, nome, email')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado.' },
        { status: 404 }
      )
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'Usuario nao possui email cadastrado.' },
        { status: 400 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomUUID() + crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    // Store token in the user's table
    const { error: updateError } = await supabase
      .from(table)
      .update({
        reset_token: resetToken,
        reset_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error storing reset token:', updateError)
      return NextResponse.json(
        { error: 'Erro ao gerar token de reset.' },
        { status: 500 }
      )
    }

    // Build reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowb2b-v2.onrender.com'
    const resetPath = RESET_PATH_MAP[tipo] || '/reset-senha'
    const resetUrl = `${appUrl}${resetPath}?token=${resetToken}`

    // Send email
    const emailResult = await sendResetPasswordEmail(user.email, user.nome || '', resetUrl)

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      return NextResponse.json(
        { error: 'Token gerado, mas falha ao enviar email. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Email de reset de senha enviado para ${user.email}.`,
    })
  } catch (error) {
    console.error('Unexpected error in reset-senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
