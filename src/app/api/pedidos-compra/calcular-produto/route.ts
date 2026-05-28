import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

/**
 * GET /api/pedidos-compra/calcular-produto
 *
 * Calcula os metadados (estoque, media de vendas, sugestao) para UM produto/fornecedor/politica.
 * Usado pelo modal "Adicionar item extra" da tela gerar-automatico, para popular as colunas
 * estoque_atual / media_vendas_dia / sugestao_quantidade ao adicionar um item manualmente.
 *
 * Replica a logica do algoritmo Python /calcular do projeto validacao_ean
 * (calculo_pedido_auto_otimizado.py: process_product_with_monitoring + calcular_sugestao_with_monitoring)
 * usando as MESMAS RPCs do Supabase (get_max_data_saida, get_max_data_compra, get_quantidade_vendida).
 *
 * Query params:
 *  - fornecedor_id (obrigatorio)
 *  - produto_id    (obrigatorio)
 *  - politica_id   (opcional — fallback: primeira politica ativa do fornecedor)
 */
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

    const { searchParams } = new URL(request.url)
    const fornecedorId = parseInt(searchParams.get('fornecedor_id') || '')
    const produtoId = parseInt(searchParams.get('produto_id') || '')
    const politicaIdRaw = searchParams.get('politica_id')
    const politicaId = politicaIdRaw ? parseInt(politicaIdRaw) : null

    if (!Number.isFinite(fornecedorId) || !Number.isFinite(produtoId)) {
      return NextResponse.json({ error: 'fornecedor_id e produto_id sao obrigatorios' }, { status: 400 })
    }

    // 1) Politica (prazo_estoque + desconto)
    let politicaQuery = supabase
      .from('politica_compra')
      .select('id, prazo_estoque, desconto')
      .eq('fornecedor_id', fornecedorId)
      .eq('empresa_id', empresaId)
    if (politicaId) politicaQuery = politicaQuery.eq('id', politicaId)
    const { data: politicas } = await politicaQuery.limit(1)
    const politica = politicas?.[0] || null
    const prazoEstoque = (politica?.prazo_estoque as number | null) || 0
    const descontoPolitica = (politica?.desconto as number | null) || 0

    // 2) Produto + preco do fornecedor (em paralelo)
    const [produtoRes, fpRes] = await Promise.all([
      supabase
        .from('produtos')
        .select('id, nome, codigo, gtin, unidade, estoque_atual, itens_por_caixa, id_produto_bling, preco')
        .eq('id', produtoId)
        .eq('empresa_id', empresaId)
        .maybeSingle(),
      supabase
        .from('fornecedores_produtos')
        .select('valor_de_compra, codigo_fornecedor')
        .eq('fornecedor_id', fornecedorId)
        .eq('empresa_id', empresaId)
        .eq('produto_id', produtoId)
        .maybeSingle(),
    ])

    const produto = produtoRes.data
    if (!produto) {
      return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })
    }
    const fp = fpRes.data

    const estoqueAtual = Number(produto.estoque_atual ?? 0)
    const itensPorCaixa = Number(produto.itens_por_caixa ?? 1) || 1
    const unidadeProduto = String(produto.unidade ?? 'UN').toUpperCase()
    const valorUnitario = Number(fp?.valor_de_compra ?? produto.preco ?? 0)

    // 3) Datas (max saida e max compra) — RPCs do Supabase ja usadas pela API Python
    const [{ data: saidaRows }, { data: compraRows }] = await Promise.all([
      supabase.rpc('get_max_data_saida', { produto_ids: [produtoId] }),
      supabase.rpc('get_max_data_compra', { produto_ids: [produtoId] }),
    ])
    const maxSaidaStr = (saidaRows as Array<{ max_data_saida: string | null }> | null)?.[0]?.max_data_saida || null
    const maxCompraStr = (compraRows as Array<{ max_data_compra: string | null }> | null)?.[0]?.max_data_compra || null

    // 4) Aplicar regras de data (Python: process_product_with_monitoring)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const parseData = (s: string | null): Date | null => {
      if (!s) return null
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return null
      d.setHours(0, 0, 0, 0)
      return d
    }
    const ajustarDataFutura = (d: Date) => d > hoje ? hoje : d

    // REGRA 1: estoque > 0 -> data_ultima_venda = HOJE (assume venda recente)
    let dataUltVenda: Date | null
    if (estoqueAtual > 0) {
      dataUltVenda = new Date(hoje)
    } else {
      dataUltVenda = parseData(maxSaidaStr)
      if (!dataUltVenda) {
        // Sem historico de vendas e sem estoque: descartar (Python retorna None)
        return NextResponse.json({
          produto_id: produtoId,
          nome: produto.nome,
          codigo: produto.codigo,
          gtin: produto.gtin,
          unidade: produto.unidade,
          itens_por_caixa: itensPorCaixa,
          id_produto_bling: produto.id_produto_bling,
          codigo_fornecedor: fp?.codigo_fornecedor ?? null,
          estoque_atual: estoqueAtual,
          quantidade_vendida: 0,
          periodo_venda: 0,
          media_vendas_dia: 0,
          sugestao_quantidade: 0,
          valor_unitario: valorUnitario,
          prazo_estoque: prazoEstoque,
          desconto_politica: descontoPolitica,
          margem_seguranca_aplicada: false,
          motivo_descarte: 'sem_historico_de_vendas',
        })
      }
      dataUltVenda = ajustarDataFutura(dataUltVenda)
    }

    // REGRA 2: data_ultima_compra — se nula ou >= venda, ajusta para venda - prazo_estoque
    const dataCompraReal = parseData(maxCompraStr)
    let dataUltCompra: Date
    if (!dataCompraReal || dataCompraReal >= dataUltVenda) {
      const d = new Date(dataUltVenda)
      d.setDate(d.getDate() - (prazoEstoque || 30))
      dataUltCompra = d
    } else {
      dataUltCompra = dataCompraReal
    }

    // 5) Periodo + quantidade vendida (RPC)
    const periodoVenda = Math.max(
      Math.round((dataUltVenda.getTime() - dataUltCompra.getTime()) / (1000 * 60 * 60 * 24)),
      1
    )
    const toIso = (d: Date) => d.toISOString().slice(0, 10)
    const { data: qtdRows } = await supabase.rpc('get_quantidade_vendida', {
      p_produto_id: produtoId,
      data_inicio: toIso(dataUltCompra),
      data_fim: toIso(dataUltVenda),
    })
    const quantidadeVendida = Number((qtdRows as Array<{ quantidade_vendida: number | string }> | null)?.[0]?.quantidade_vendida ?? 0)
    const mediaVendasDia = quantidadeVendida / periodoVenda

    // 6) Sugestao (Python: calcular_sugestao_with_monitoring)
    let sugestaoInicial = mediaVendasDia * prazoEstoque - estoqueAtual
    let margemAplicada = false
    if (estoqueAtual === 0) {
      sugestaoInicial *= 1.25
      margemAplicada = true
    }

    let sugestaoQuantidade = 0
    if (sugestaoInicial > 0) {
      if (itensPorCaixa > 1) {
        // Round up para o proximo multiplo de itens_por_caixa
        sugestaoQuantidade = Math.ceil(sugestaoInicial / itensPorCaixa) * itensPorCaixa
      } else {
        sugestaoQuantidade = Math.round(sugestaoInicial)
      }
    }

    // REGRA 8a: estoque=0 com demanda no periodo -> garante 1 caixa minima
    if (estoqueAtual === 0 && quantidadeVendida > 0 && sugestaoQuantidade < itensPorCaixa) {
      sugestaoQuantidade = itensPorCaixa
    }

    // Produto vendido em caixa (unidade != UN/UNT) garante 1 caixa minima
    const ehProdutoCaixa = !['UN', 'UNT'].includes(unidadeProduto)
    if (ehProdutoCaixa && sugestaoQuantidade > 0) {
      sugestaoQuantidade = Math.max(sugestaoQuantidade, itensPorCaixa)
    }

    return NextResponse.json({
      produto_id: produtoId,
      nome: produto.nome,
      codigo: produto.codigo,
      gtin: produto.gtin,
      unidade: produto.unidade,
      itens_por_caixa: itensPorCaixa,
      id_produto_bling: produto.id_produto_bling,
      codigo_fornecedor: fp?.codigo_fornecedor ?? null,
      estoque_atual: estoqueAtual,
      data_ultima_venda: toIso(dataUltVenda),
      data_ultima_compra: toIso(dataUltCompra),
      quantidade_vendida: quantidadeVendida,
      periodo_venda: periodoVenda,
      media_vendas_dia: mediaVendasDia,
      sugestao_quantidade: sugestaoQuantidade,
      valor_unitario: valorUnitario,
      prazo_estoque: prazoEstoque,
      desconto_politica: descontoPolitica,
      margem_seguranca_aplicada: margemAplicada,
    })
  } catch (error) {
    console.error('Erro em /calcular-produto:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao calcular sugestao do produto' },
      { status: 500 }
    )
  }
}
