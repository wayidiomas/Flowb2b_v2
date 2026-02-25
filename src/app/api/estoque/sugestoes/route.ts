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
    const statusFilter = searchParams.get('status')

    let query = supabase
      .from('conferencias_estoque')
      .select(`
        id, status, data_inicio, data_envio, data_resposta,
        total_itens, total_divergencias, observacao_fornecedor,
        observacao_lojista, fornecedor_id, created_at
      `)
      .eq('empresa_id', user.empresaId)
      .in('status', ['enviada', 'aceita', 'rejeitada', 'parcialmente_aceita'])
      .order('data_envio', { ascending: false })

    if (statusFilter) {
      query = supabase
        .from('conferencias_estoque')
        .select(`
          id, status, data_inicio, data_envio, data_resposta,
          total_itens, total_divergencias, observacao_fornecedor,
          observacao_lojista, fornecedor_id, created_at
        `)
        .eq('empresa_id', user.empresaId)
        .eq('status', statusFilter)
        .order('data_envio', { ascending: false })
    }

    const { data: conferencias, error: confError } = await query

    if (confError) {
      console.error('Erro ao buscar sugestoes:', confError)
      return NextResponse.json({ error: 'Erro ao buscar sugestoes' }, { status: 500 })
    }

    // Buscar nomes dos fornecedores
    const fornecedorIds = [...new Set((conferencias || []).map(c => c.fornecedor_id))]
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia')
      .in('id', fornecedorIds.length > 0 ? fornecedorIds : [0])

    const fornecedorMap = new Map((fornecedores || []).map(f => [f.id, f]))

    const sugestoes = (conferencias || []).map(c => ({
      ...c,
      fornecedor_nome: fornecedorMap.get(c.fornecedor_id)?.nome_fantasia || fornecedorMap.get(c.fornecedor_id)?.nome || '',
    }))

    return NextResponse.json({ sugestoes })
  } catch (error) {
    console.error('Erro ao listar sugestoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
