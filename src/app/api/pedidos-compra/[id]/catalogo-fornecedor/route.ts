import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

// GET - Buscar catalogo de produtos do fornecedor vinculado ao pedido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // 1. Buscar pedido para pegar fornecedor_id
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, fornecedor_id')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (!pedido.fornecedor_id) {
      return NextResponse.json({ error: 'Pedido sem fornecedor vinculado' }, { status: 400 })
    }

    // 2. Params de busca e paginacao
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30')))
    const offset = (page - 1) * limit

    // 3. Buscar produtos do fornecedor vinculados a empresa
    // Query: fornecedores_produtos JOIN produtos
    let query = supabase
      .from('fornecedores_produtos')
      .select(`
        produto_id,
        valor_de_compra,
        codigo_fornecedor,
        produtos!inner (
          id,
          nome,
          gtin,
          marca,
          unidade,
          preco
        )
      `, { count: 'exact' })
      .eq('fornecedor_id', pedido.fornecedor_id)
      .eq('empresa_id', empresaId)

    // 4. Filtrar por search (nome, gtin, codigo_fornecedor)
    if (search) {
      // Usar or filter across multiple fields
      query = query.or(
        `codigo_fornecedor.ilike.%${search}%,produtos.nome.ilike.%${search}%,produtos.gtin.ilike.%${search}%`
      )
    }

    // 5. Paginar
    query = query.range(offset, offset + limit - 1)

    const { data: fornProdutos, error: fpError, count } = await query

    if (fpError) {
      console.error('Erro ao buscar catalogo:', fpError)

      // Fallback: buscar sem filtro no join se o or falhar
      if (search) {
        const fallbackQuery = supabase
          .from('fornecedores_produtos')
          .select(`
            produto_id,
            valor_de_compra,
            codigo_fornecedor,
            produtos!inner (
              id,
              nome,
              gtin,
              marca,
              unidade,
              preco
            )
          `, { count: 'exact' })
          .eq('fornecedor_id', pedido.fornecedor_id)
          .eq('empresa_id', empresaId)
          .range(offset, offset + limit - 1)

        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery

        if (fallbackError) {
          return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
        }

        // Filter client-side
        const searchLower = search.toLowerCase()
        const filtered = (fallbackData || []).filter((fp: Record<string, unknown>) => {
          const prod = fp.produtos as Record<string, unknown> | null
          if (!prod) return false
          const nome = ((prod.nome as string) || '').toLowerCase()
          const gtin = ((prod.gtin as string) || '').toLowerCase()
          const codForn = ((fp.codigo_fornecedor as string) || '').toLowerCase()
          return nome.includes(searchLower) || gtin.includes(searchLower) || codForn.includes(searchLower)
        })

        const produtos = filtered.map((fp: Record<string, unknown>) => {
          const prod = fp.produtos as Record<string, unknown>
          return {
            produto_id: fp.produto_id,
            nome: prod.nome || '',
            gtin: prod.gtin || null,
            codigo_fornecedor: fp.codigo_fornecedor || null,
            marca: prod.marca || null,
            unidade: prod.unidade || null,
            preco: fp.valor_de_compra || prod.preco || null,
            vinculado_empresa: true,
          }
        })

        return NextResponse.json({
          produtos,
          total: filtered.length,
          page,
          limit,
        })
      }

      return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
    }

    // 6. Formatar resposta
    const produtos = (fornProdutos || []).map((fp: Record<string, unknown>) => {
      const prod = fp.produtos as Record<string, unknown>
      return {
        produto_id: fp.produto_id,
        nome: prod.nome || '',
        gtin: prod.gtin || null,
        codigo_fornecedor: fp.codigo_fornecedor || null,
        marca: prod.marca || null,
        unidade: prod.unidade || null,
        preco: fp.valor_de_compra || prod.preco || null,
        vinculado_empresa: true,
      }
    })

    return NextResponse.json({
      produtos,
      total: count || 0,
      page,
      limit,
    })

  } catch (error) {
    console.error('Erro no catalogo-fornecedor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar catalogo' },
      { status: 500 }
    )
  }
}
