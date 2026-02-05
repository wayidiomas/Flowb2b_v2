import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, email, password, cnpj, telefone } = body

    // Validar campos obrigatorios
    if (!nome || !email || !password || !cnpj) {
      return NextResponse.json(
        { success: false, error: 'Nome, email, senha e CNPJ sao obrigatorios' },
        { status: 400 }
      )
    }

    // Validar tamanho minimo da senha
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter no minimo 8 caracteres' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email invalido' },
        { status: 400 }
      )
    }

    // Limpar CNPJ (remover pontos, barras, hifen)
    const cnpjClean = cnpj.replace(/[^\d]/g, '')

    if (cnpjClean.length !== 14) {
      return NextResponse.json(
        { success: false, error: 'CNPJ deve ter 14 digitos' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verificar se CNPJ existe em fornecedores (pelo menos 1 lojista trabalha com esse CNPJ)
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, nome, empresa_id')
      .eq('cnpj', cnpjClean)
      .limit(1)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CNPJ nao encontrado. Seu CNPJ precisa estar cadastrado como fornecedor por pelo menos um lojista FlowB2B.' },
        { status: 400 }
      )
    }

    // Verificar se email ja existe
    const { data: existingUser } = await supabase
      .from('users_fornecedor')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email ja esta cadastrado' },
        { status: 409 }
      )
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(password)

    // Inserir novo usuario fornecedor
    const { data: newUser, error: insertError } = await supabase
      .from('users_fornecedor')
      .insert({
        nome,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        cnpj: cnpjClean,
        telefone: telefone || null,
      })
      .select()
      .single()

    if (insertError || !newUser) {
      console.error('Fornecedor register error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Faca login para acessar o portal.',
    })
  } catch (error) {
    console.error('Fornecedor register error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
