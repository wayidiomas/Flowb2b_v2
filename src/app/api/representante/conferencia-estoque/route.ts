import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresa_id')
    const statusFilter = searchParams.get('status')

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({ conferencias: [] })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    let fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json({ conferencias: [] })
    }

    // Se empresa_id específico, filtrar fornecedores desta empresa
    if (empresaId) {
      const { data: fornecedoresEmpresa } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('empresa_id', Number(empresaId))
        .in('id', fornecedorIds)

      if (!fornecedoresEmpresa || fornecedoresEmpresa.length === 0) {
        return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
      }
      fornecedorIds = fornecedoresEmpresa.map(f => f.id)
    }

    // Buscar conferencias
    let query = supabase
      .from('conferencias_estoque')
      .select(`
        id, empresa_id, fornecedor_id, status, data_inicio, data_envio,
        data_resposta, total_itens, total_divergencias, observacao_fornecedor,
        observacao_lojista, created_at
      `)
      .in('fornecedor_id', fornecedorIds)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: conferencias, error: confError } = await query

    if (confError) {
      console.error('Erro ao buscar conferencias:', confError)
      return NextResponse.json({ error: 'Erro ao buscar conferencias' }, { status: 500 })
    }

    // Buscar nomes das empresas
    const empresaIds = [...new Set((conferencias || []).map(c => c.empresa_id))]
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .in('id', empresaIds.length > 0 ? empresaIds : [0])

    const empresaMap = new Map((empresas || []).map(e => [e.id, e]))

    const conferenciasFormatted = (conferencias || []).map(c => ({
      ...c,
      empresa_nome: empresaMap.get(c.empresa_id)?.nome_fantasia || empresaMap.get(c.empresa_id)?.razao_social || '',
    }))

    return NextResponse.json({ conferencias: conferenciasFormatted })
  } catch (error) {
    console.error('Erro ao listar conferencias:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { empresa_id, fornecedor_id } = body

    if (!empresa_id || !fornecedor_id) {
      return NextResponse.json({ error: 'empresa_id e fornecedor_id obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    // Validar que fornecedor_id pertence ao representante
    if (!fornecedorIds.includes(Number(fornecedor_id))) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado ao representante' }, { status: 403 })
    }

    // Validar vinculo fornecedor-empresa
    const { data: fornecedor, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('id', Number(fornecedor_id))
      .eq('empresa_id', Number(empresa_id))
      .single()

    if (fornError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
    }

    // Criar conferencia
    const { data: conferencia, error: createError } = await supabase
      .from('conferencias_estoque')
      .insert({
        empresa_id: Number(empresa_id),
        fornecedor_id: fornecedor.id,
        user_fornecedor_id: null,
        status: 'em_andamento',
      })
      .select()
      .single()

    if (createError) {
      console.error('Erro ao criar conferencia:', createError)
      return NextResponse.json({ error: 'Erro ao criar conferencia' }, { status: 500 })
    }

    return NextResponse.json({ conferencia }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar conferencia:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
