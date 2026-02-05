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

    // Buscar usuario fornecedor pelo email
    const { data: user, error } = await supabase
      .from('users_fornecedor')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
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

    // Gerar token JWT com tipo fornecedor
    const token = await generateToken({
      userId: String(user.id),
      empresaId: null, // Fornecedor nao tem empresa fixa
      email: user.email,
      role: 'user',
      tipo: 'fornecedor',
      cnpj: user.cnpj,
      fornecedorUserId: user.id,
    })

    // Definir cookie
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        cnpj: user.cnpj,
        tipo: 'fornecedor',
      },
    })
  } catch (error) {
    console.error('Fornecedor login error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
