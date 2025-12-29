import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { connected: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    if (!user.empresaId) {
      return NextResponse.json({
        connected: false,
        error: 'Usuário sem empresa vinculada',
      })
    }

    const supabase = createServerSupabaseClient()

    // Buscar tokens do Bling
    const { data: tokens } = await supabase
      .from('bling_tokens')
      .select('expires_at, updated_at')
      .eq('empresa_id', user.empresaId)
      .single()

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        message: 'Bling não conectado',
      })
    }

    const expiresAt = new Date(tokens.expires_at)
    const isExpired = expiresAt < new Date()

    return NextResponse.json({
      connected: !isExpired,
      expiresAt: tokens.expires_at,
      updatedAt: tokens.updated_at,
      isExpired,
      message: isExpired ? 'Token expirado' : 'Bling conectado',
    })
  } catch (error) {
    console.error('Bling status error:', error)
    return NextResponse.json(
      { connected: false, error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
