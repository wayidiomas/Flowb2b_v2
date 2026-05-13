import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogoMulti,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs } = ctx

    const supabase = createServerSupabaseClient()

    const { data: catalogos } = await supabase
      .from('catalogo_fornecedor')
      .select('id, nome, cnpj')
      .in('cnpj', cnpjs)

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({
        catalogo_id: 0,
        fornecedor_nome: '',
        total_divergencias: 0,
        lojistas_afetados: 0,
        ja_pendentes: 0,
        novas: 0
      })
    }

    const catalogoIds = catalogos.map((c) => c.id)

    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('id, produto_id, preco_base, catalogo_id')
      .in('catalogo_id', catalogoIds)
      .eq('ativo', true)
      .gt('preco_base', 0)

    if (!itens || itens.length === 0) {
      return NextResponse.json({
        catalogo_id: catalogos[0].id,
        fornecedor_nome: catalogos.map((c) => c.nome).join(', '),
        total_divergencias: 0,
        lojistas_afetados: 0,
        ja_pendentes: 0,
        novas: 0
      })
    }

    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, cnpj')
      .in('cnpj', cnpjs)

    const fornecedorIds = (fornecedores || []).map((f) => f.id)
    if (fornecedorIds.length === 0) {
      return NextResponse.json({
        catalogo_id: catalogos[0].id,
        fornecedor_nome: catalogos.map((c) => c.nome).join(', '),
        total_divergencias: 0,
        lojistas_afetados: 0,
        ja_pendentes: 0,
        novas: 0
      })
    }

    const produtoIds = itens.map((i) => i.produto_id).filter(Boolean) as number[]
    const { data: fps } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, fornecedor_id, empresa_id, valor_de_compra')
      .in('fornecedor_id', fornecedorIds)
      .in('produto_id', produtoIds)
      .gt('valor_de_compra', 0)

    const itensPorProdId = new Map<number, { id: number; preco_base: number; catalogo_id: number }>()
    for (const it of itens) {
      if (it.produto_id) {
        itensPorProdId.set(it.produto_id, { id: it.id, preco_base: Number(it.preco_base), catalogo_id: it.catalogo_id })
      }
    }

    type Divergencia = { catalogo_item_id: number; catalogo_id: number; empresa_id: number; preco_base: number; valor_de_compra: number }
    const divergencias: Divergencia[] = []
    for (const fp of fps || []) {
      const it = itensPorProdId.get(fp.produto_id)
      if (!it) continue
      const vc = Number(fp.valor_de_compra)
      if (Math.abs(vc - it.preco_base) > 0.01) {
        divergencias.push({
          catalogo_item_id: it.id,
          catalogo_id: it.catalogo_id,
          empresa_id: fp.empresa_id,
          preco_base: it.preco_base,
          valor_de_compra: vc
        })
      }
    }

    let jaPendentes = 0
    if (divergencias.length > 0) {
      const itemIds = Array.from(new Set(divergencias.map((d) => d.catalogo_item_id)))
      const empresaIds = Array.from(new Set(divergencias.map((d) => d.empresa_id)))
      const { data: pendentes } = await supabase
        .from('catalogo_atualizacoes')
        .select('catalogo_item_id, empresa_id, catalogo_id')
        .in('catalogo_id', catalogoIds)
        .eq('status', 'pendente')
        .in('catalogo_item_id', itemIds)
        .in('empresa_id', empresaIds)
      const pendKey = new Set((pendentes || []).map((p) => `${p.catalogo_item_id}-${p.empresa_id}`))
      jaPendentes = divergencias.filter((d) => pendKey.has(`${d.catalogo_item_id}-${d.empresa_id}`)).length
    }

    return NextResponse.json({
      catalogo_id: catalogos[0].id,
      fornecedor_nome: catalogos.map((c) => c.nome).join(', '),
      total_divergencias: divergencias.length,
      lojistas_afetados: new Set(divergencias.map((d) => d.empresa_id)).size,
      ja_pendentes: jaPendentes,
      novas: divergencias.length - jaPendentes
    })
  } catch (err) {
    console.error('Erro em /divergencias-preview (representante):', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
