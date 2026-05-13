import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/representante/landing-pages/[id]/produtos-comprados
 *
 * Modo 'comprados' do LP do representante: agrega itens_pedido_compra
 * do lojista alvo (lp.empresa_id_lojista) em TODOS fornecedores que o
 * representante atende. Filtra ultimos 12 meses.
 *
 * Retorna { produto_ids, total } — UI usa pra exibir na curadoria.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const supabase = createServerSupabaseClient()

    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = (representantes || []).map(r => r.id)
    if (representanteIds.length === 0) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)
    const fornecedorIds = [...new Set((vinculos || []).map(v => v.fornecedor_id))] as number[]

    const { data: lp } = await supabase
      .from('landing_pages_representante')
      .select('id, representante_id, empresa_id_lojista')
      .eq('id', lpId)
      .is('deletada_em', null)
      .maybeSingle()

    if (!lp || !representanteIds.includes(lp.representante_id)) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    if (!lp.empresa_id_lojista || fornecedorIds.length === 0) {
      return NextResponse.json({ produto_ids: [], total: 0 })
    }

    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - 12)

    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id, fornecedor_id')
      .eq('empresa_id', lp.empresa_id_lojista)
      .in('fornecedor_id', fornecedorIds)
      .gte('data', dataLimite.toISOString().slice(0, 10))
      .limit(2000)

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
    console.error('Erro em GET produtos-comprados (rep):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
