import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresa_id')

    // Buscar instâncias do fornecedor
    const { data: fornecedores, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (fornError || !fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ tabelas: [] })
    }

    let fornecedorIds = fornecedores.map(f => f.id)

    if (empresaId) {
      const fornecedor = fornecedores.find(f => f.empresa_id === Number(empresaId))
      if (!fornecedor) {
        return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
      }
      fornecedorIds = [fornecedor.id]
    }

    // Buscar tabelas de preço
    const { data: tabelas, error: tabError } = await supabase
      .from('tabelas_preco')
      .select('*')
      .in('fornecedor_id', fornecedorIds)
      .order('created_at', { ascending: false })

    if (tabError) {
      console.error('Erro ao buscar tabelas de preco:', tabError)
      return NextResponse.json({ error: 'Erro ao buscar tabelas' }, { status: 500 })
    }

    // Buscar nomes das empresas e contagem de itens
    const empresaIds = [...new Set((tabelas || []).map(t => t.empresa_id))]
    const tabelaIds = (tabelas || []).map(t => t.id)

    const [empresasResult, itensResult] = await Promise.all([
      supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia')
        .in('id', empresaIds.length > 0 ? empresaIds : [0]),
      supabase
        .from('itens_tabela_preco')
        .select('tabela_preco_id')
        .in('tabela_preco_id', tabelaIds.length > 0 ? tabelaIds : [0]),
    ])

    const empresaMap = new Map((empresasResult.data || []).map(e => [e.id, e]))
    const itensCountMap = new Map<number, number>()
    ;(itensResult.data || []).forEach(item => {
      itensCountMap.set(item.tabela_preco_id, (itensCountMap.get(item.tabela_preco_id) || 0) + 1)
    })

    const tabelasFormatted = (tabelas || []).map(t => ({
      ...t,
      empresa_nome: empresaMap.get(t.empresa_id)?.nome_fantasia || empresaMap.get(t.empresa_id)?.razao_social || '',
      total_itens: itensCountMap.get(t.id) || 0,
    }))

    return NextResponse.json({ tabelas: tabelasFormatted })
  } catch (error) {
    console.error('Erro ao listar tabelas de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { empresa_id, nome, vigencia_inicio, vigencia_fim, observacao, itens } = body

    if (!empresa_id || !nome) {
      return NextResponse.json({ error: 'empresa_id e nome obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Validar vínculo fornecedor-empresa
    const { data: fornecedor, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)
      .eq('empresa_id', Number(empresa_id))
      .single()

    if (fornError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
    }

    // Criar tabela de preço
    const { data: tabela, error: createError } = await supabase
      .from('tabelas_preco')
      .insert({
        fornecedor_id: fornecedor.id,
        empresa_id: Number(empresa_id),
        nome,
        vigencia_inicio: vigencia_inicio || null,
        vigencia_fim: vigencia_fim || null,
        observacao: observacao || null,
        status: 'ativa',
      })
      .select()
      .single()

    if (createError) {
      console.error('Erro ao criar tabela de preco:', createError)
      return NextResponse.json({ error: 'Erro ao criar tabela' }, { status: 500 })
    }

    // Inserir itens se fornecidos
    if (itens && Array.isArray(itens) && itens.length > 0) {
      const itensToInsert = itens.map((item: { produto_id?: number; codigo?: string; nome?: string; unidade?: string; itens_por_caixa?: number; preco_original?: number; preco_tabela: number; desconto_percentual?: number }) => ({
        tabela_preco_id: tabela.id,
        produto_id: item.produto_id || null,
        codigo: item.codigo || null,
        nome: item.nome || null,
        unidade: item.unidade || null,
        itens_por_caixa: item.itens_por_caixa || null,
        preco_original: item.preco_original || null,
        preco_tabela: item.preco_tabela,
        desconto_percentual: item.desconto_percentual || null,
      }))

      const { error: itensError } = await supabase
        .from('itens_tabela_preco')
        .insert(itensToInsert)

      if (itensError) {
        console.error('Erro ao inserir itens da tabela:', itensError)
        // Tabela foi criada, mas itens falharam - não reverter, apenas logar
      }
    }

    return NextResponse.json({ tabela }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tabela de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
