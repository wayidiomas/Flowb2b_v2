import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha sao obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar usuario representante pelo email
    const { data: user, error: userError } = await supabase
      .from('users_representante')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    // Verificar se usuario esta ativo
    if (!user.ativo) {
      return NextResponse.json(
        { success: false, error: 'Conta desativada. Entre em contato com o suporte.' },
        { status: 401 }
      )
    }

    // Gerar token JWT com empresaId null (representante acessa todas as empresas via representanteUserId)
    const token = await generateToken({
      userId: String(user.id),
      empresaId: null,
      email: user.email,
      role: 'user',
      tipo: 'representante',
      representanteUserId: user.id,
    })

    // Definir cookie
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        telefone: user.telefone,
        tipo: 'representante',
      },
    })
  } catch (error) {
    console.error('Representante login error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
