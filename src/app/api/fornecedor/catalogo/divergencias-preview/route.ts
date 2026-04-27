import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/fornecedor/catalogo/divergencias-preview
 *
 * Conta quantos itens do catálogo têm preço diferente do que os lojistas
 * vinculados têm cadastrado em `fornecedores_produtos`. Não modifica nada —
 * apenas retorna a contagem pra UI mostrar antes do botão "Publicar".
 *
 * Resposta:
 * {
 *   catalogo_id, fornecedor_nome,
 *   total_divergencias: int (itens × lojista que divergem)
 *   lojistas_afetados: int (empresas distintas)
 *   ja_pendentes: int (já têm catalogo_atualizacoes status=pendente)
 *   novas: int (divergências SEM atualização pendente — vão virar avisos novos)
 * }
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const cnpjLimpo = user.cnpj.replace(/\D/g, '')
    const supabase = createServerSupabaseClient()

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id, nome')
      .eq('cnpj', cnpjLimpo)
      .maybeSingle()
    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Busca todos os itens ativos do catálogo
    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('id, produto_id, preco_base')
      .eq('catalogo_id', catalogo.id)
      .eq('ativo', true)
      .gt('preco_base', 0)

    if (!itens || itens.length === 0) {
      return NextResponse.json({
        catalogo_id: catalogo.id,
        fornecedor_nome: catalogo.nome,
        total_divergencias: 0,
        lojistas_afetados: 0,
        ja_pendentes: 0,
        novas: 0
      })
    }

    // Fornecedores no banco com mesmo CNPJ (1 row por empresa lojista vinculada)
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', cnpjLimpo)

    const fornecedorIds = (fornecedores || []).map(f => f.id)
    if (fornecedorIds.length === 0) {
      return NextResponse.json({
        catalogo_id: catalogo.id,
        fornecedor_nome: catalogo.nome,
        total_divergencias: 0,
        lojistas_afetados: 0,
        ja_pendentes: 0,
        novas: 0
      })
    }

    // fornecedores_produtos com valor_de_compra pra esses fornecedores+produtos
    const produtoIds = itens.map(i => i.produto_id).filter(Boolean) as number[]
    const { data: fps } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, fornecedor_id, empresa_id, valor_de_compra')
      .in('fornecedor_id', fornecedorIds)
      .in('produto_id', produtoIds)
      .gt('valor_de_compra', 0)

    // Mapa pra lookup rápido
    const itensPorProdId = new Map<number, { id: number; preco_base: number }>()
    for (const it of itens) {
      if (it.produto_id) itensPorProdId.set(it.produto_id, { id: it.id, preco_base: Number(it.preco_base) })
    }

    // Detecta divergências
    type Divergencia = { catalogo_item_id: number; empresa_id: number; preco_base: number; valor_de_compra: number }
    const divergencias: Divergencia[] = []
    for (const fp of fps || []) {
      const it = itensPorProdId.get(fp.produto_id)
      if (!it) continue
      const vc = Number(fp.valor_de_compra)
      if (Math.abs(vc - it.preco_base) > 0.01) {
        divergencias.push({
          catalogo_item_id: it.id,
          empresa_id: fp.empresa_id,
          preco_base: it.preco_base,
          valor_de_compra: vc
        })
      }
    }

    // Conta quantas já têm atualização pendente (idempotência)
    let jaPendentes = 0
    if (divergencias.length > 0) {
      const itemIds = Array.from(new Set(divergencias.map(d => d.catalogo_item_id)))
      const empresaIds = Array.from(new Set(divergencias.map(d => d.empresa_id)))
      const { data: pendentes } = await supabase
        .from('catalogo_atualizacoes')
        .select('catalogo_item_id, empresa_id')
        .eq('catalogo_id', catalogo.id)
        .eq('status', 'pendente')
        .in('catalogo_item_id', itemIds)
        .in('empresa_id', empresaIds)
      const pendKey = new Set((pendentes || []).map(p => `${p.catalogo_item_id}-${p.empresa_id}`))
      jaPendentes = divergencias.filter(d => pendKey.has(`${d.catalogo_item_id}-${d.empresa_id}`)).length
    }

    return NextResponse.json({
      catalogo_id: catalogo.id,
      fornecedor_nome: catalogo.nome,
      total_divergencias: divergencias.length,
      lojistas_afetados: new Set(divergencias.map(d => d.empresa_id)).size,
      ja_pendentes: jaPendentes,
      novas: divergencias.length - jaPendentes
    })
  } catch (err) {
    console.error('Erro em /divergencias-preview:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
