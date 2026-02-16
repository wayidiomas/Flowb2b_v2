import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Detalhes do representante
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const params = await context.params
    const representanteId = parseInt(params.id)

    if (isNaN(representanteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar representante
    const { data: representante, error } = await supabase
      .from('representantes')
      .select('*')
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (error || !representante) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Buscar email do usuario se cadastrado
    let email: string | undefined
    if (representante.user_representante_id) {
      const { data: userRep } = await supabase
        .from('users_representante')
        .select('email')
        .eq('id', representante.user_representante_id)
        .single()

      email = userRep?.email
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select(`
        id,
        fornecedor_id,
        created_at,
        fornecedores (
          id,
          nome,
          cnpj
        )
      `)
      .eq('representante_id', representanteId)

    // Tipo para o fornecedor retornado pelo Supabase (relação many-to-one retorna objeto)
    type FornecedorRelation = { id: number; nome: string; cnpj?: string } | null

    const fornecedores = vinculos?.map(v => {
      // Supabase pode inferir tipos incorretamente em queries complexas, usar unknown como intermediário
      const forn = v.fornecedores as unknown as FornecedorRelation
      return {
        id: v.fornecedor_id,
        nome: forn?.nome || '',
        cnpj: forn?.cnpj,
        vinculado_em: v.created_at,
      }
    }) || []

    return NextResponse.json({
      success: true,
      representante: {
        ...representante,
        cadastrado: !!representante.user_representante_id,
        email,
        fornecedores,
        fornecedores_count: fornecedores.length,
      },
    })

  } catch (error) {
    console.error('Erro ao buscar representante:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar representante' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar representante
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const params = await context.params
    const representanteId = parseInt(params.id)

    if (isNaN(representanteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()

    // Verificar se representante existe
    const { data: existente, error: fetchError } = await supabase
      .from('representantes')
      .select('id')
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (fetchError || !existente) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Montar dados para atualizar
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.nome !== undefined) updateData.nome = body.nome
    if (body.telefone !== undefined) updateData.telefone = body.telefone
    if (body.ativo !== undefined) updateData.ativo = body.ativo

    const { error } = await supabase
      .from('representantes')
      .update(updateData)
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Representante atualizado com sucesso',
    })

  } catch (error) {
    console.error('Erro ao atualizar representante:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar representante' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar representante
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const params = await context.params
    const representanteId = parseInt(params.id)

    if (isNaN(representanteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar se representante existe
    const { data: existente } = await supabase
      .from('representantes')
      .select('id')
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Desativar (soft delete)
    const { error } = await supabase
      .from('representantes')
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Representante desativado com sucesso',
    })

  } catch (error) {
    console.error('Erro ao desativar representante:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao desativar representante' },
      { status: 500 }
    )
  }
}
