import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { BLING_CONFIG } from '@/lib/bling'
import { blingFetch, BlingRateLimitError } from '@/lib/bling-fetch'

interface ProdutoLocal {
  id: number
  codigo: string
  nome: string
  id_produto_bling: string
  estoque_atual: number | null
  fornecedor_id: number | null
}

interface BlingEstoqueSaldo {
  produto: { id: number }
  saldoFisicoTotal: number
  saldoVirtualTotal: number
  depositos: Array<{
    id: number
    saldoFisico: number
    saldoVirtual: number
  }>
}

interface Divergencia {
  produto_id: number
  codigo: string
  nome: string
  id_bling: string
  estoque_supabase: number | null
  estoque_bling: number
  diferenca: number
  fornecedor_id: number | null
}

/**
 * GET /api/diagnostico/estoque?empresa_id=6
 *
 * Chama o Bling, busca o estoque real, compara com Supabase e retorna divergências.
 * Aceita &limite=50 para limitar qtd de produtos (debug).
 * Aceita &fornecedor_id=X para filtrar por fornecedor.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const empresaIdParam = searchParams.get('empresa_id')
  const limiteParam = searchParams.get('limite')
  const fornecedorIdParam = searchParams.get('fornecedor_id')

  if (!empresaIdParam) {
    return NextResponse.json(
      { error: 'empresa_id é obrigatório' },
      { status: 400 }
    )
  }

  const empresaId = Number(empresaIdParam)
  const limite = limiteParam ? Number(limiteParam) : null
  const fornecedorIdFilter = fornecedorIdParam ? Number(fornecedorIdParam) : null

  const supabase = createServerSupabaseClient()
  const startTime = Date.now()

  // 1. Buscar token Bling válido
  const { data: tokenData } = await supabase
    .from('bling_tokens')
    .select('access_token, expires_at, is_revoke')
    .eq('empresa_id', empresaId)
    .single()

  if (!tokenData || tokenData.is_revoke) {
    return NextResponse.json(
      { error: 'Token Bling não encontrado ou revogado para esta empresa' },
      { status: 404 }
    )
  }

  const expiresAt = new Date(tokenData.expires_at)
  if (expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Token Bling expirado', expires_at: tokenData.expires_at },
      { status: 401 }
    )
  }

  const accessToken = tokenData.access_token

  // 2. Buscar produtos do Supabase (paginado para pegar todos)
  const allProdutos: ProdutoLocal[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    let query = supabase
      .from('produtos')
      .select('id, codigo, nome, id_produto_bling, estoque_atual, fornecedor_id')
      .eq('empresa_id', empresaId)
      .not('id_produto_bling', 'is', null)
      .range(from, from + pageSize - 1)

    if (fornecedorIdFilter) {
      query = query.eq('fornecedor_id', fornecedorIdFilter)
    }

    const { data, error: prodError } = await query

    if (prodError) {
      return NextResponse.json(
        { error: 'Erro ao buscar produtos', details: prodError.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) break
    allProdutos.push(...(data as ProdutoLocal[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  let produtosParaCheck = allProdutos

  if (limite && limite > 0) {
    produtosParaCheck = produtosParaCheck.slice(0, limite)
  }

  if (produtosParaCheck.length === 0) {
    return NextResponse.json({
      message: 'Nenhum produto encontrado para esta empresa',
      empresa_id: empresaId,
    })
  }

  // Mapa id_produto_bling -> produto local
  const produtosMap = new Map<string, ProdutoLocal>()
  produtosParaCheck.forEach(p => produtosMap.set(String(p.id_produto_bling), p))

  // 3. Dividir em lotes de 100 e chamar Bling
  const lotes: ProdutoLocal[][] = []
  for (let i = 0; i < produtosParaCheck.length; i += 100) {
    lotes.push(produtosParaCheck.slice(i, i + 100))
  }

  const divergencias: Divergencia[] = []
  const errosLotes: string[] = []
  let produtosChecados = 0
  let produtosOk = 0
  let produtosNaoRetornados = 0

  const idsChecadosPeloBling = new Set<string>()

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i]

    // Delay entre lotes para respeitar rate limit
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 400))
    }

    try {
      const params = new URLSearchParams()
      lote.forEach(p => params.append('idsProdutos[]', p.id_produto_bling.toString()))

      const url = `${BLING_CONFIG.apiUrl}/estoques/saldos?${params.toString()}`

      const { response } = await blingFetch(
        url,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        {
          context: `diagnostico estoque lote ${i + 1}/${lotes.length}`,
          maxRetries: 3,
          baseDelayMs: 2000,
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        errosLotes.push(`Lote ${i + 1}: HTTP ${response.status} - ${errText.substring(0, 200)}`)
        continue
      }

      const responseData = await response.json()
      const blingData: BlingEstoqueSaldo[] = responseData.data || []

      // Comparar cada item
      for (const item of blingData) {
        const blingId = String(item.produto.id)
        idsChecadosPeloBling.add(blingId)

        const saldoBling = item.saldoFisicoTotal ?? item.depositos
          .reduce((sum, d) => sum + (d.saldoFisico ?? 0), 0)

        const produtoLocal = produtosMap.get(blingId)
        if (!produtoLocal) continue

        produtosChecados++

        const estoqueLocal = produtoLocal.estoque_atual ?? 0

        if (estoqueLocal !== saldoBling) {
          divergencias.push({
            produto_id: produtoLocal.id,
            codigo: produtoLocal.codigo,
            nome: produtoLocal.nome,
            id_bling: blingId,
            estoque_supabase: produtoLocal.estoque_atual,
            estoque_bling: saldoBling,
            diferenca: saldoBling - estoqueLocal,
            fornecedor_id: produtoLocal.fornecedor_id,
          })
        } else {
          produtosOk++
        }
      }
    } catch (err) {
      if (err instanceof BlingRateLimitError) {
        errosLotes.push(`Lote ${i + 1}: Rate limit atingido, abortando lotes restantes`)
        break
      }
      errosLotes.push(`Lote ${i + 1}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  // Produtos que mandamos para o Bling mas ele não retornou (pode significar produto excluído no Bling)
  produtosMap.forEach((_, blingId) => {
    if (!idsChecadosPeloBling.has(blingId)) {
      produtosNaoRetornados++
    }
  })

  // Ordenar divergências por diferença absoluta (maiores primeiro)
  divergencias.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))

  const duration = Date.now() - startTime

  // Estatísticas
  const stats = {
    empresa_id: empresaId,
    fornecedor_filtro: fornecedorIdFilter,
    total_produtos_consultados: produtosParaCheck.length,
    total_lotes_enviados: lotes.length,
    produtos_checados_bling: produtosChecados,
    produtos_ok: produtosOk,
    produtos_com_divergencia: divergencias.length,
    produtos_nao_retornados_bling: produtosNaoRetornados,
    taxa_divergencia: produtosChecados > 0
      ? `${((divergencias.length / produtosChecados) * 100).toFixed(1)}%`
      : 'N/A',
    soma_divergencia_positiva: divergencias
      .filter(d => d.diferenca > 0)
      .reduce((sum, d) => sum + d.diferenca, 0),
    soma_divergencia_negativa: divergencias
      .filter(d => d.diferenca < 0)
      .reduce((sum, d) => sum + d.diferenca, 0),
    erros_lotes: errosLotes.length,
    duracao_ms: duration,
    duracao_legivel: `${(duration / 1000).toFixed(1)}s`,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json({
    stats,
    divergencias,
    erros: errosLotes.length > 0 ? errosLotes : undefined,
  })
}
