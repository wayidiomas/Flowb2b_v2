import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'

/**
 * GET /api/fornecedor/landing-pages/[id]/produtos-comprados
 *
 * Retorna a lista de produto_ids que o lojista da LP ja comprou desse fornecedor
 * (alimenta modo='comprados'). Filtra por ultimos 12 meses pra controlar volume.
 */
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
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)

    // Carrega LP e valida ownership
    const { data: lp } = await supabase
      .from('landing_pages_fornecedor')
      .select(`
        id, fornecedor_id, empresa_id_lojista,
        fornecedor:fornecedor_id (cnpj)
      `)
      .eq('id', lpId)
      .is('deletada_em', null)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fornCnpj = (lp as any)?.fornecedor?.cnpj
    if (!lp || fornCnpj !== cnpjFornecedor) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    // Pedidos de compra do lojista para esse fornecedor nos ultimos 12 meses
    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - 12)

    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id')
      .eq('empresa_id', lp.empresa_id_lojista)
      .eq('fornecedor_id', lp.fornecedor_id)
      .gte('data', dataLimite.toISOString().slice(0, 10))
      .limit(500)

    const pedidoIds = (pedidos || []).map(p => p.id)
    if (pedidoIds.length === 0) {
      return NextResponse.json({ produto_ids: [], total: 0 })
    }

    const { data: itens } = await supabase
      .from('itens_pedido_compra')
      .select('produto_id')
      .in('pedido_compra_id', pedidoIds)
      .not('produto_id', 'is', null)

    const produtoIds = Array.from(new Set((itens || []).map(i => i.produto_id))).filter(Boolean)

    return NextResponse.json({ produto_ids: produtoIds, total: produtoIds.length })
  } catch (error) {
    console.error('Erro em GET produtos-comprados:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
