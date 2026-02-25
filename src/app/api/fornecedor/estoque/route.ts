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

    // Buscar produtos via fornecedores_produtos
    const { data: produtos, error: prodError } = await supabase
      .from('fornecedores_produtos')
      .select(`
        valor_de_compra, precocusto,
        produtos!inner(
          id, codigo, nome, gtin, gtin_embalagem,
          estoque_atual, estoque_minimo, unidade,
          itens_por_caixa, marca, curva
        )
      `)
      .eq('fornecedor_id', fornecedor.id)
      .eq('empresa_id', Number(empresaId))

    if (prodError) {
      console.error('Erro ao buscar produtos estoque fornecedor:', prodError)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    const produtosFlat = (produtos || []).map((item: any) => ({
      id: item.produtos.id,
      codigo: item.produtos.codigo,
      nome: item.produtos.nome,
      gtin: item.produtos.gtin,
      gtin_embalagem: item.produtos.gtin_embalagem,
      estoque_atual: item.produtos.estoque_atual,
      estoque_minimo: item.produtos.estoque_minimo,
      unidade: item.produtos.unidade,
      itens_por_caixa: item.produtos.itens_por_caixa,
      marca: item.produtos.marca,
      curva: item.produtos.curva,
      valor_de_compra: item.valor_de_compra,
      precocusto: item.precocusto,
    }))

    return NextResponse.json({ produtos: produtosFlat })
  } catch (error) {
    console.error('Erro ao listar estoque fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
