import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

// GET - Buscar catalogo de produtos de um fornecedor por fornecedor_id (direto, sem pedido)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // 1. Params (fornecedor_id obrigatorio)
    const { searchParams } = new URL(request.url)
    const fornecedorIdRaw = searchParams.get('fornecedor_id')
    const fornecedorId = fornecedorIdRaw ? parseInt(fornecedorIdRaw) : NaN

    if (!fornecedorIdRaw || Number.isNaN(fornecedorId)) {
      return NextResponse.json({ error: 'fornecedor_id e obrigatorio' }, { status: 400 })
    }

    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30')))
    const offset = (page - 1) * limit

    // Helper para mapear o contrato de retorno (FIXO)
    const mapProduto = (fp: Record<string, unknown>) => {
      const prod = (fp.produtos as Record<string, unknown>) || {}
      return {
        produto_id: fp.produto_id,
        id_produto_bling: prod.id_produto_bling ?? null,
        nome: (prod.nome as string) || '',
        gtin: (prod.gtin as string) ?? null,
        codigo_fornecedor: (fp.codigo_fornecedor as string) ?? null,
        unidade: (prod.unidade as string) || 'UN',
        preco: fp.valor_de_compra ?? prod.preco ?? null,
        itens_por_caixa: prod.itens_por_caixa ?? 1,
      }
    }

    // 2. Buscar produtos do fornecedor vinculados a empresa
    let query = supabase
      .from('fornecedores_produtos')
      .select(`
        produto_id,
        valor_de_compra,
        codigo_fornecedor,
        produtos!inner (
          id,
          id_produto_bling,
          nome,
          gtin,
          codigo,
          unidade,
          preco,
          itens_por_caixa
        )
      `, { count: 'exact' })
      .eq('fornecedor_id', fornecedorId)
      .eq('empresa_id', empresaId)

    // 3. Filtrar por search (nome, gtin, codigo, codigo_fornecedor)
    if (search) {
      query = query.or(
        `codigo_fornecedor.ilike.%${search}%,produtos.nome.ilike.%${search}%,produtos.gtin.ilike.%${search}%,produtos.codigo.ilike.%${search}%`
      )
    }

    // 4. Paginar
    query = query.range(offset, offset + limit - 1)

    const { data: fornProdutos, error: fpError, count } = await query

    if (fpError) {
      console.error('Erro ao buscar catalogo por fornecedor:', fpError)

      // Fallback: buscar sem filtro no join e filtrar client-side
      if (search) {
        const fallbackQuery = supabase
          .from('fornecedores_produtos')
          .select(`
            produto_id,
            valor_de_compra,
            codigo_fornecedor,
            produtos!inner (
              id,
              id_produto_bling,
              nome,
              gtin,
              codigo,
              unidade,
              preco,
              itens_por_caixa
            )
          `, { count: 'exact' })
          .eq('fornecedor_id', fornecedorId)
          .eq('empresa_id', empresaId)
          .range(offset, offset + limit - 1)

        const { data: fallbackData, error: fallbackError } = await fallbackQuery

        if (fallbackError) {
          return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
        }

        const searchLower = search.toLowerCase()
        const filtered = (fallbackData || []).filter((fp: Record<string, unknown>) => {
          const prod = fp.produtos as Record<string, unknown> | null
          if (!prod) return false
          const nome = ((prod.nome as string) || '').toLowerCase()
          const gtin = ((prod.gtin as string) || '').toLowerCase()
          const codForn = ((fp.codigo_fornecedor as string) || '').toLowerCase()
          const codLoja = ((prod.codigo as string) || '').toLowerCase()
          return nome.includes(searchLower) || gtin.includes(searchLower) || codForn.includes(searchLower) || codLoja.includes(searchLower)
        })

        return NextResponse.json({
          produtos: filtered.map(mapProduto),
          total: filtered.length,
          page,
          limit,
        })
      }

      return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
    }

    // 5. Formatar resposta (contrato FIXO)
    return NextResponse.json({
      produtos: (fornProdutos || []).map(mapProduto),
      total: count || 0,
      page,
      limit,
    })

  } catch (error) {
    console.error('Erro no catalogo-fornecedor (by fornecedor_id):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar catalogo' },
      { status: 500 }
    )
  }
}
