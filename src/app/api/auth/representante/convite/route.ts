import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET - Buscar representante por codigo_acesso (publico, para pagina de convite)
export async function GET(request: NextRequest) {
  try {
    const codigo = request.nextUrl.searchParams.get('codigo')

    if (!codigo) {
      return NextResponse.json(
        { success: false, error: 'Codigo de acesso e obrigatorio' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: representante, error } = await supabase
      .from('representantes')
      .select(`
        id,
        nome,
        empresa_id,
        user_representante_id,
        codigo_acesso,
        empresas (
          id,
          nome_fantasia,
          razao_social
        )
      `)
      .eq('codigo_acesso', codigo.toUpperCase())
      .single()

    if (error || !representante) {
      return NextResponse.json(
        { success: false, error: 'Codigo de acesso invalido' },
        { status: 404 }
      )
    }

    type EmpresaRelation = { id: number; nome_fantasia?: string; razao_social: string } | null
    const emp = representante.empresas as unknown as EmpresaRelation

    // Buscar fornecedores vinculados a este representante
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select(`
        fornecedor_id,
        fornecedores (
          id,
          nome
        )
      `)
      .eq('representante_id', representante.id)

    type FornecedorRelation = { id: number; nome: string } | null
    const fornecedores = vinculos?.map(v => {
      const f = v.fornecedores as unknown as FornecedorRelation
      return { id: f?.id ?? 0, nome: f?.nome ?? '' }
    }).filter(f => f.id > 0) || []

    return NextResponse.json({
      success: true,
      representante: {
        id: representante.id,
        nome: representante.nome,
        empresa_nome: emp?.nome_fantasia || emp?.razao_social || '',
        ja_vinculado: !!representante.user_representante_id,
      },
      fornecedores,
    })
  } catch (error) {
    console.error('Convite lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Vincular representante a usuario autenticado
// Requer que o usuario ja esteja logado como representante
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo_acesso } = body

    if (!codigo_acesso) {
      return NextResponse.json(
        { success: false, error: 'Codigo de acesso e obrigatorio' },
        { status: 400 }
      )
    }

    // Importar getCurrentUser para validar autenticacao
    const { getCurrentUser } = await import('@/lib/auth')
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Voce precisa estar logado como representante para vincular um novo codigo' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: representante } = await supabase
      .from('representantes')
      .select('id, user_representante_id')
      .eq('codigo_acesso', codigo_acesso.toUpperCase())
      .single()

    if (!representante) {
      return NextResponse.json(
        { success: false, error: 'Codigo de acesso invalido' },
        { status: 404 }
      )
    }

    if (representante.user_representante_id) {
      return NextResponse.json(
        { success: false, error: 'Este codigo ja foi vinculado a outra conta' },
        { status: 400 }
      )
    }

    // Vincular ao usuario autenticado (consentimento explicito)
    const { error: updateError } = await supabase
      .from('representantes')
      .update({
        user_representante_id: user.representanteUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', representante.id)
      .is('user_representante_id', null)  // Previne race condition

    if (updateError) {
      console.error('Erro ao vincular representante:', updateError)
      return NextResponse.json(
        { success: false, error: 'Erro ao vincular conta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Codigo vinculado a sua conta com sucesso',
    })
  } catch (error) {
    console.error('Convite link error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
