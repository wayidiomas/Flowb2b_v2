import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/fornecedor/catalogo/republicar-estado-atual
 *
 * "Republica" o estado atual do catálogo: detecta divergências entre
 * `catalogo_itens.preco_base` (vitrine do fornecedor) e
 * `fornecedores_produtos.valor_de_compra` (cadastro Bling de cada lojista
 * vinculado), e cria `catalogo_atualizacoes` pendentes pra cada uma.
 *
 * Idempotente: pula divergências que já têm atualização pendente.
 *
 * Trigger SQL bumpa `catalogo_status_lojista` automaticamente, lojistas
 * passam a ver badge/banner/modal-gate, etc.
 */
export async function POST(_req: NextRequest) {
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

    // 1. Itens ativos do catálogo
    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('id, produto_id, preco_base, nome, codigo, ean')
      .eq('catalogo_id', catalogo.id)
      .eq('ativo', true)
      .gt('preco_base', 0)

    if (!itens || itens.length === 0) {
      return NextResponse.json({
        success: true,
        criadas: 0,
        ja_pendentes: 0,
        lojistas_notificados: 0,
        message: 'Catálogo sem itens ativos com preço.'
      })
    }

    // 2. Fornecedores no banco com mesmo CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', cnpjLimpo)

    const fornecedorIds = (fornecedores || []).map(f => f.id)
    if (fornecedorIds.length === 0) {
      return NextResponse.json({
        success: true,
        criadas: 0,
        ja_pendentes: 0,
        lojistas_notificados: 0,
        message: 'Nenhum lojista vinculado a este catálogo.'
      })
    }

    // 3. fornecedores_produtos com valor_de_compra
    const produtoIds = itens.map(i => i.produto_id).filter(Boolean) as number[]
    const { data: fps } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, fornecedor_id, empresa_id, valor_de_compra')
      .in('fornecedor_id', fornecedorIds)
      .in('produto_id', produtoIds)
      .gt('valor_de_compra', 0)

    type ItemMeta = { id: number; preco_base: number; nome: string | null; codigo: string | null; ean: string | null }
    const itensPorProdId = new Map<number, ItemMeta>()
    for (const it of itens) {
      if (it.produto_id) {
        itensPorProdId.set(it.produto_id, {
          id: it.id,
          preco_base: Number(it.preco_base),
          nome: it.nome,
          codigo: it.codigo,
          ean: it.ean
        })
      }
    }

    // 4. Detecta divergências
    type Divergencia = {
      catalogo_item_id: number
      empresa_id: number
      preco_antigo: number
      preco_novo: number
      meta: ItemMeta
    }
    const divergencias: Divergencia[] = []
    for (const fp of fps || []) {
      const it = itensPorProdId.get(fp.produto_id)
      if (!it) continue
      const vc = Number(fp.valor_de_compra)
      if (Math.abs(vc - it.preco_base) > 0.01) {
        divergencias.push({
          catalogo_item_id: it.id,
          empresa_id: fp.empresa_id,
          preco_antigo: vc,
          preco_novo: it.preco_base,
          meta: it
        })
      }
    }

    if (divergencias.length === 0) {
      return NextResponse.json({
        success: true,
        criadas: 0,
        ja_pendentes: 0,
        lojistas_notificados: 0,
        message: 'Nenhuma divergência detectada — tudo está sincronizado.'
      })
    }

    // 5. Filtra as que já têm pendência (idempotência)
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

    const novasDivergencias = divergencias.filter(d => !pendKey.has(`${d.catalogo_item_id}-${d.empresa_id}`))
    const jaPendentes = divergencias.length - novasDivergencias.length

    if (novasDivergencias.length === 0) {
      return NextResponse.json({
        success: true,
        criadas: 0,
        ja_pendentes: jaPendentes,
        lojistas_notificados: 0,
        message: 'Todas as divergências já tinham avisos pendentes.'
      })
    }

    // 6. Insert em batches (trigger fn_bump_catalogo_status_lojista atualiza o status)
    const linhas = novasDivergencias.map(d => ({
      catalogo_id: catalogo.id,
      empresa_id: d.empresa_id,
      tipo: 'preco',
      catalogo_item_id: d.catalogo_item_id,
      dados_antigos: { preco_base: d.preco_antigo },
      dados_novos: {
        preco_base: d.preco_novo,
        nome: d.meta.nome,
        codigo: d.meta.codigo,
        ean: d.meta.ean
      },
      status: 'pendente'
    }))

    let criadas = 0
    for (let i = 0; i < linhas.length; i += 500) {
      const batch = linhas.slice(i, i + 500)
      const { error } = await supabase.from('catalogo_atualizacoes').insert(batch)
      if (error) {
        console.error(`Erro inserindo batch ${i}/${linhas.length}:`, error)
      } else {
        criadas += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      criadas,
      ja_pendentes: jaPendentes,
      lojistas_notificados: new Set(novasDivergencias.map(d => d.empresa_id)).size,
      message: criadas === novasDivergencias.length
        ? `${criadas} avisos criados. Os lojistas afetados verão a notificação no próximo polling.`
        : `${criadas} avisos criados (${novasDivergencias.length - criadas} falharam — verifique os logs).`
    })
  } catch (err) {
    console.error('Erro em /republicar-estado-atual:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
