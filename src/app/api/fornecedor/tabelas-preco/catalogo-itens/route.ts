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
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')
    const { searchParams } = new URL(request.url)

    const empresaId = searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id obrigatorio' }, { status: 400 })
    }

    // Validar que o fornecedor está vinculado a esta empresa
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .eq('empresa_id', Number(empresaId))
      .limit(1)
      .single()

    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
    }

    // Buscar catalogo do fornecedor via CNPJ
    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Buscar todos os itens ativos do catalogo para o lojista
    const { data: itens, error: itensError } = await supabase
      .from('catalogo_itens')
      .select('id, produto_id, codigo, nome, marca, unidade, itens_por_caixa, preco_base, imagem_url')
      .eq('catalogo_id', catalogo.id)
      .eq('empresa_id', Number(empresaId))
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (itensError) {
      console.error('Erro ao buscar itens do catalogo:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
    }

    return NextResponse.json({ itens: itens || [] })
  } catch (error) {
    console.error('Erro ao buscar catalogo-itens para tabela de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
