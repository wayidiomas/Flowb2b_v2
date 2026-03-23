import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/auth/representante/validar-cnpj?cnpj=12345678000190
// Retorna { fornecedor: { nome: "ADIMAX..." } } ou { fornecedor: null }
// Nao requer autenticacao (usado na tela de registro)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get('cnpj')

    if (!cnpj) {
      return NextResponse.json(
        { fornecedor: null, error: 'CNPJ nao informado' },
        { status: 400 }
      )
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '')

    if (cnpjLimpo.length !== 14) {
      return NextResponse.json(
        { fornecedor: null, error: 'CNPJ invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar fornecedores com este CNPJ (pode existir em varias empresas)
    const { data: fornecedores, error } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia, cnpj')
      .eq('cnpj', cnpjLimpo)
      .limit(1)

    if (error) {
      console.error('Erro ao buscar fornecedor por CNPJ:', error)
      return NextResponse.json(
        { fornecedor: null, error: 'Erro ao buscar fornecedor' },
        { status: 500 }
      )
    }

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ fornecedor: null })
    }

    const forn = fornecedores[0]
    return NextResponse.json({
      fornecedor: {
        nome: forn.nome_fantasia || forn.nome,
      },
    })
  } catch (error) {
    console.error('Erro na validacao de CNPJ:', error)
    return NextResponse.json(
      { fornecedor: null, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
