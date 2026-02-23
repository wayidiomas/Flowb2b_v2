import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { normalizePhone } from '@/lib/phone'

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
        telefone,
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

    // Verificar se ja existe user com mesmo telefone (para auto-link)
    let existingUserMatch = false
    if (!representante.user_representante_id && representante.telefone) {
      const phoneNorm = normalizePhone(representante.telefone)
      if (phoneNorm) {
        const { data: users } = await supabase
          .from('users_representante')
          .select('id, telefone')
          .eq('ativo', true)

        if (users) {
          existingUserMatch = users.some(u => normalizePhone(u.telefone) === phoneNorm)
        }
      }
    }

    return NextResponse.json({
      success: true,
      representante: {
        id: representante.id,
        nome: representante.nome,
        telefone: representante.telefone,
        empresa_nome: emp?.nome_fantasia || emp?.razao_social || '',
        ja_vinculado: !!representante.user_representante_id,
        existing_user_match: existingUserMatch,
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

// POST - Auto-vincular representante a user existente por telefone
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

    const supabase = createServerSupabaseClient()

    const { data: representante } = await supabase
      .from('representantes')
      .select('id, telefone, user_representante_id')
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
        { success: false, error: 'Ja vinculado' },
        { status: 400 }
      )
    }

    const phoneNorm = normalizePhone(representante.telefone)
    if (!phoneNorm) {
      return NextResponse.json(
        { success: false, error: 'Representante sem telefone valido' },
        { status: 400 }
      )
    }

    const { data: users } = await supabase
      .from('users_representante')
      .select('id, telefone')
      .eq('ativo', true)

    const matchUser = users?.find(u => normalizePhone(u.telefone) === phoneNorm)
    if (!matchUser) {
      return NextResponse.json(
        { success: false, error: 'Nenhum usuario encontrado com este telefone' },
        { status: 404 }
      )
    }

    await supabase
      .from('representantes')
      .update({
        user_representante_id: matchUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', representante.id)

    return NextResponse.json({
      success: true,
      message: 'Conta vinculada automaticamente',
    })
  } catch (error) {
    console.error('Convite auto-link error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
