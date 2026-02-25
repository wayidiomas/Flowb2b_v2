import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar instâncias do fornecedor
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar conferência validando ownership
    const { data: conferencia, error: confError } = await supabase
      .from('conferencias_estoque')
      .select('*')
      .eq('id', conferenciaId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (confError || !conferencia) {
      return NextResponse.json({ error: 'Conferencia nao encontrada' }, { status: 404 })
    }

    // Buscar itens da conferência
    const { data: itens, error: itensError } = await supabase
      .from('itens_conferencia_estoque')
      .select('*')
      .eq('conferencia_id', conferenciaId)
      .order('created_at', { ascending: true })

    if (itensError) {
      console.error('Erro ao buscar itens da conferencia:', itensError)
    }

    // Buscar nome da empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('id', conferencia.empresa_id)
      .single()

    return NextResponse.json({
      conferencia: {
        ...conferencia,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
      },
      itens: itens || [],
    })
  } catch (error) {
    console.error('Erro ao buscar conferencia:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
