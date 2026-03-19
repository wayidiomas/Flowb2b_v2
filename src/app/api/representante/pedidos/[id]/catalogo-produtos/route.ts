import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface ProdutoRelation {
  id: number
  nome: string
  gtin: string | null
  marca: string | null
  unidade: string | null
  codigo: string | null
}

interface FornecedorProdutoRaw {
  produto_id: number
  valor_de_compra: number | null
  precocusto: number | null
  codigo_fornecedor: string | null
  empresa_id: number
  produtos: ProdutoRelation | ProdutoRelation[]
}

interface CatalogoProduto {
  nome: string
  gtin: string | null
  codigo_fornecedor: string | null
  marca: string | null
  unidade: string | null
  preco: number | null
  vinculado_empresa: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth: mesma logica do /representante/pedidos/[id]/route.ts
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado como representante' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    // Buscar fornecedores vinculados ao representante
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIdsDoRepresentante = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIdsDoRepresentante.length === 0) {
      return NextResponse.json({ error: 'Sem fornecedores vinculados' }, { status: 403 })
    }

    // 2. Buscar o pedido para pegar empresa_id e fornecedor_id, validar acesso
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, empresa_id, fornecedor_id')
      .eq('id', id)
      .in('fornecedor_id', fornecedorIdsDoRepresentante)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    const pedidoEmpresaId = pedido.empresa_id

    // 3. Buscar o fornecedor do pedido para pegar o CNPJ
    const { data: fornecedorDoPedido } = await supabase
      .from('fornecedores')
      .select('id, cnpj')
      .eq('id', pedido.fornecedor_id)
      .single()

    if (!fornecedorDoPedido || !fornecedorDoPedido.cnpj) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // 4. Buscar todos os fornecedores com esse CNPJ (pode ter um por empresa)
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, nome, nome_fantasia')
      .eq('cnpj', fornecedorDoPedido.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // 5. Query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)))

    // 6. Buscar TODOS os produtos do fornecedor (de todas as empresas)
    const { data: allProductsRaw, error: productsError } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, valor_de_compra, precocusto, codigo_fornecedor, empresa_id, produtos!inner(id, nome, gtin, marca, unidade, codigo)')
      .in('fornecedor_id', fornecedorIds)
      .limit(5000)

    if (productsError) {
      console.error('Erro ao buscar produtos do fornecedor:', productsError)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    const allProducts = (allProductsRaw || []) as FornecedorProdutoRaw[]

    // Helper: extract produto from relation (can be object or array)
    const getProduto = (produtos: ProdutoRelation | ProdutoRelation[]): ProdutoRelation => {
      if (Array.isArray(produtos)) return produtos[0]
      return produtos
    }

    // 7. Deduplicar por: gtin (quando existe) > codigo_fornecedor > nome
    const seen = new Map<string, CatalogoProduto>()

    for (const item of allProducts) {
      const produto = getProduto(item.produtos)
      const key = produto.gtin || item.codigo_fornecedor || produto.nome
      if (!key) continue

      if (!seen.has(key)) {
        seen.set(key, {
          nome: produto.nome,
          gtin: produto.gtin,
          codigo_fornecedor: item.codigo_fornecedor,
          marca: produto.marca,
          unidade: produto.unidade,
          preco: item.valor_de_compra || item.precocusto,
          vinculado_empresa: item.empresa_id === pedidoEmpresaId,
        })
      } else if (item.empresa_id === pedidoEmpresaId) {
        // Se ja vimos mas esse eh da empresa certa, marcar como vinculado
        const existing = seen.get(key)!
        existing.vinculado_empresa = true
        // Usar o preco dessa empresa especificamente
        existing.preco = item.valor_de_compra || item.precocusto || existing.preco
      }
    }

    // 8. Aplicar filtro de busca
    let results = Array.from(seen.values())

    if (search) {
      const searchLower = search.toLowerCase()
      results = results.filter(p =>
        p.nome?.toLowerCase().includes(searchLower) ||
        p.gtin?.includes(search) ||
        p.codigo_fornecedor?.toLowerCase().includes(searchLower)
      )
    }

    // 9. Ordenar: vinculados primeiro, depois por nome
    results.sort((a, b) => {
      if (a.vinculado_empresa !== b.vinculado_empresa) {
        return a.vinculado_empresa ? -1 : 1
      }
      return (a.nome || '').localeCompare(b.nome || '')
    })

    // 10. Paginar
    const total = results.length
    const startIndex = (page - 1) * limit
    const paginatedResults = results.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      produtos: paginatedResults,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Erro ao buscar catalogo de produtos (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
