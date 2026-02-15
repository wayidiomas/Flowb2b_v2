import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Lista fornecedores vinculados ao representante
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

    // Verificar se representante existe e pertence a empresa
    const { data: representante } = await supabase
      .from('representantes')
      .select('id')
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!representante) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos, error } = await supabase
      .from('representante_fornecedores')
      .select(`
        id,
        fornecedor_id,
        created_at,
        fornecedores (
          id,
          nome,
          nome_fantasia,
          cnpj,
          telefone,
          email
        )
      `)
      .eq('representante_id', representanteId)

    if (error) throw error

    const fornecedores = vinculos?.map(v => ({
      vinculo_id: v.id,
      fornecedor_id: v.fornecedor_id,
      vinculado_em: v.created_at,
      ...(v.fornecedores as object),
    })) || []

    return NextResponse.json({
      success: true,
      fornecedores,
    })

  } catch (error) {
    console.error('Erro ao listar fornecedores:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar fornecedores' },
      { status: 500 }
    )
  }
}

// POST - Vincular fornecedor ao representante
export async function POST(
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
    const { fornecedor_id } = body

    if (!fornecedor_id) {
      return NextResponse.json({ error: 'fornecedor_id e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar se representante existe e pertence a empresa
    const { data: representante } = await supabase
      .from('representantes')
      .select('id')
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!representante) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Verificar se fornecedor existe e pertence a empresa
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id, nome')
      .eq('id', fornecedor_id)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Verificar se ja existe vinculo
    const { data: existente } = await supabase
      .from('representante_fornecedores')
      .select('id')
      .eq('representante_id', representanteId)
      .eq('fornecedor_id', fornecedor_id)
      .single()

    if (existente) {
      return NextResponse.json({ error: 'Fornecedor ja esta vinculado' }, { status: 400 })
    }

    // Criar vinculo
    const { data: vinculo, error } = await supabase
      .from('representante_fornecedores')
      .insert({
        representante_id: representanteId,
        fornecedor_id,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      vinculo_id: vinculo.id,
      message: `Fornecedor ${fornecedor.nome} vinculado com sucesso`,
    })

  } catch (error) {
    console.error('Erro ao vincular fornecedor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao vincular fornecedor' },
      { status: 500 }
    )
  }
}
