import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'lojista' || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar conferência filtrando por empresa_id
    const { data: conferencia, error: confError } = await supabase
      .from('conferencias_estoque')
      .select('*')
      .eq('id', conferenciaId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (confError || !conferencia) {
      return NextResponse.json({ error: 'Sugestao nao encontrada' }, { status: 404 })
    }

    // Buscar itens
    const { data: itens } = await supabase
      .from('itens_conferencia_estoque')
      .select('*')
      .eq('conferencia_id', conferenciaId)
      .order('created_at', { ascending: true })

    // Buscar nome do fornecedor
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia')
      .eq('id', conferencia.fornecedor_id)
      .single()

    return NextResponse.json({
      sugestao: {
        ...conferencia,
        fornecedor_nome: fornecedor?.nome_fantasia || fornecedor?.nome || '',
      },
      itens: itens || [],
    })
  } catch (error) {
    console.error('Erro ao buscar sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
