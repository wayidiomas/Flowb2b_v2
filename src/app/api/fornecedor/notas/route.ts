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

    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id obrigatorio' }, { status: 400 })
    }

    // Buscar fornecedor específico para essa empresa
    const { data: fornecedor, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)
      .eq('empresa_id', Number(empresaId))
      .single()

    if (fornError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
    }

    // Buscar notas fiscais
    const { data: notas, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero, serie, tipo, situacao, data_emissao, data_operacao, chave_acesso')
      .eq('fornecedor_id', fornecedor.id)
      .eq('empresa_id', Number(empresaId))
      .order('data_emissao', { ascending: false })

    if (notasError) {
      console.error('Erro ao buscar notas fornecedor:', notasError)
      return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 })
    }

    return NextResponse.json({ notas: notas || [] })
  } catch (error) {
    console.error('Erro ao listar notas fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
