import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateToken, setAuthCookie } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=Token inválido', request.url)
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar usuário pelo token
    const { data: user } = await supabase
      .from('users')
      .select('id, email, nome, empresa_id, role, magic_link_expires_at')
      .eq('magic_link_token', token)
      .eq('ativo', true)
      .single()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=Link inválido ou expirado', request.url)
      )
    }

    // Verificar se token não expirou
    const expiresAt = new Date(user.magic_link_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.redirect(
        new URL('/login?error=Link expirado. Solicite um novo.', request.url)
      )
    }

    // Limpar token (uso único)
    await supabase
      .from('users')
      .update({
        magic_link_token: null,
        magic_link_expires_at: null,
      })
      .eq('id', user.id)

    // Gerar JWT
    const jwtToken = await generateToken({
      userId: user.id,
      empresaId: user.empresa_id || null,
      email: user.email,
      role: user.role || 'user',
    })

    // Definir cookie
    await setAuthCookie(jwtToken)

    // Redirecionar para dashboard ou home
    const redirectUrl = user.empresa_id ? '/dashboard' : '/onboarding'

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error('Verify magic link error:', error)
    return NextResponse.redirect(
      new URL('/login?error=Erro ao processar link', request.url)
    )
  }
}
