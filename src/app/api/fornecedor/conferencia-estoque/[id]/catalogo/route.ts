import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface CatalogoItem {
  produto_id: number
  codigo: string | null
  gtin: string | null
  nome: string
  estoque_sistema: number | null
  curva: string | null
  // Data da ultima compra desse produto junto ao fornecedor (pra ordenacao)
  ultima_compra: string | null
  // Status de conferencia (se ja foi conferido nessa sessao)
  conferido_item_id: number | null
  estoque_conferido: number | null
}

// GET /api/fornecedor/conferencia-estoque/[id]/catalogo
// Retorna o catalogo que DEVE ser conferido: produtos da empresa visitada que estao
// vinculados ao fornecedor logado. Cada item trai tambem se ja foi conferido.
export async function GET(
  _request: NextRequest,
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

    // Buscar instancias do fornecedor (mesmo CNPJ em varias empresas)
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Validar ownership da conferencia
    const { data: conferencia } = await supabase
      .from('conferencias_estoque')
      .select('id, empresa_id, fornecedor_id, status')
      .eq('id', conferenciaId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (!conferencia) {
      return NextResponse.json({ error: 'Conferencia nao encontrada' }, { status: 404 })
    }

    // 1. Buscar produto_ids vinculados a esse fornecedor
    const { data: vinculos } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id')
      .eq('fornecedor_id', conferencia.fornecedor_id)

    const produtoIds = (vinculos || []).map(v => v.produto_id).filter(Boolean)

    if (produtoIds.length === 0) {
      return NextResponse.json({ itens: [], total_catalogo: 0 })
    }

    // 2. Buscar dados dos produtos na empresa visitada
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, codigo, nome, gtin, gtin_embalagem, estoque_atual, curva')
      .eq('empresa_id', conferencia.empresa_id)
      .in('id', produtoIds)

    // 3. Itens ja conferidos nesta conferencia
    const { data: conferidos } = await supabase
      .from('itens_conferencia_estoque')
      .select('id, produto_id, estoque_conferido')
      .eq('conferencia_id', conferenciaId)

    const conferidosMap = new Map<number, { id: number; estoque_conferido: number }>()
    for (const c of conferidos || []) {
      if (c.produto_id) conferidosMap.set(c.produto_id, { id: c.id, estoque_conferido: c.estoque_conferido })
    }

    // 4. Data da ultima compra de cada produto junto a esse fornecedor (para ordenacao)
    // Pega pedidos de compra da empresa do lojista, filtrado pelo fornecedor da conferencia,
    // e cruza com itens_pedido_compra pra obter MAX(data) por produto.
    const ultimaCompraMap = new Map<number, string>()
    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id, data')
      .eq('empresa_id', conferencia.empresa_id)
      .eq('fornecedor_id', conferencia.fornecedor_id)
      .not('data', 'is', null)

    const pedidoIds = (pedidos || []).map(p => p.id)
    if (pedidoIds.length > 0) {
      const pedidoDataById = new Map<number, string>()
      for (const p of pedidos || []) {
        if (p.id && p.data) pedidoDataById.set(p.id, p.data)
      }

      // Batch: buscar itens_pedido_compra apenas dos produtos do catalogo
      const { data: itensCompra } = await supabase
        .from('itens_pedido_compra')
        .select('produto_id, pedido_compra_id')
        .in('pedido_compra_id', pedidoIds)
        .in('produto_id', produtoIds)

      for (const ic of itensCompra || []) {
        if (!ic.produto_id || !ic.pedido_compra_id) continue
        const dataPedido = pedidoDataById.get(ic.pedido_compra_id)
        if (!dataPedido) continue
        const atual = ultimaCompraMap.get(ic.produto_id)
        if (!atual || dataPedido > atual) {
          ultimaCompraMap.set(ic.produto_id, dataPedido)
        }
      }
    }

    const itens: CatalogoItem[] = (produtos || []).map(p => {
      const conf = conferidosMap.get(p.id)
      return {
        produto_id: p.id,
        codigo: p.codigo,
        gtin: p.gtin || p.gtin_embalagem,
        nome: p.nome,
        estoque_sistema: p.estoque_atual,
        curva: p.curva,
        ultima_compra: ultimaCompraMap.get(p.id) || null,
        conferido_item_id: conf?.id ?? null,
        estoque_conferido: conf?.estoque_conferido ?? null,
      }
    })

    // Ordenar: comprados recentemente primeiro (DESC), depois nunca-comprados por nome
    itens.sort((a, b) => {
      if (a.ultima_compra && b.ultima_compra) {
        return b.ultima_compra.localeCompare(a.ultima_compra)
      }
      if (a.ultima_compra) return -1
      if (b.ultima_compra) return 1
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })

    return NextResponse.json({
      itens,
      total_catalogo: itens.length,
    })
  } catch (error) {
    console.error('Erro ao buscar catalogo da conferencia:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
