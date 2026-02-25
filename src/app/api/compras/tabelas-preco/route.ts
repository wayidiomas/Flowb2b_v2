import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'lojista' || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const fornecedorId = searchParams.get('fornecedor_id')
    const tabelaId = searchParams.get('tabela_id')

    // Se tabela_id passado, retornar itens dessa tabela
    if (tabelaId) {
      // Verificar que a tabela pertence a esta empresa
      const { data: tabela, error: tabCheckError } = await supabase
        .from('tabelas_preco')
        .select('id')
        .eq('id', Number(tabelaId))
        .eq('empresa_id', user.empresaId)
        .single()

      if (tabCheckError || !tabela) {
        return NextResponse.json({ error: 'Tabela nao encontrada' }, { status: 404 })
      }

      const { data: itens, error: itensError } = await supabase
        .from('itens_tabela_preco')
        .select('*')
        .eq('tabela_preco_id', Number(tabelaId))

      if (itensError) {
        console.error('Erro ao buscar itens da tabela:', itensError)
        return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
      }

      return NextResponse.json({ itens: itens || [] })
    }

    // Buscar tabelas de preço para esta empresa
    let query = supabase
      .from('tabelas_preco')
      .select('*')
      .eq('empresa_id', user.empresaId)
      .order('created_at', { ascending: false })

    if (fornecedorId) {
      query = query.eq('fornecedor_id', Number(fornecedorId))
    }

    const { data: tabelas, error: tabError } = await query

    if (tabError) {
      console.error('Erro ao buscar tabelas de preco:', tabError)
      return NextResponse.json({ error: 'Erro ao buscar tabelas' }, { status: 500 })
    }

    // Buscar nomes dos fornecedores e contagem de itens
    const fornecedorIds = [...new Set((tabelas || []).map(t => t.fornecedor_id))]
    const tabelaIds = (tabelas || []).map(t => t.id)

    const [fornecedoresResult, itensResult] = await Promise.all([
      supabase
        .from('fornecedores')
        .select('id, nome, nome_fantasia')
        .in('id', fornecedorIds.length > 0 ? fornecedorIds : [0]),
      supabase
        .from('itens_tabela_preco')
        .select('tabela_preco_id')
        .in('tabela_preco_id', tabelaIds.length > 0 ? tabelaIds : [0]),
    ])

    const fornecedorMap = new Map((fornecedoresResult.data || []).map(f => [f.id, f]))
    const itensCountMap = new Map<number, number>()
    ;(itensResult.data || []).forEach(item => {
      itensCountMap.set(item.tabela_preco_id, (itensCountMap.get(item.tabela_preco_id) || 0) + 1)
    })

    const tabelasFormatted = (tabelas || []).map(t => ({
      ...t,
      fornecedor_nome: fornecedorMap.get(t.fornecedor_id)?.nome_fantasia || fornecedorMap.get(t.fornecedor_id)?.nome || '',
      total_itens: itensCountMap.get(t.id) || 0,
    }))

    return NextResponse.json({ tabelas: tabelasFormatted })
  } catch (error) {
    console.error('Erro ao listar tabelas de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
