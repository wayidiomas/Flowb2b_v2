import { SupabaseClient } from '@supabase/supabase-js'
import { BLING_CONFIG } from './bling'
import { blingFetch, BlingRateLimitError } from './bling-fetch'

export interface SyncEstoqueResult {
  total_produtos: number
  atualizados: number
  sem_alteracao: number
  erros: number
}

interface ProdutoParaSync {
  id: number
  id_produto_bling: string // varchar no banco
  estoque_atual: number | null
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

/**
 * Sincroniza estoque do Bling para produtos de um fornecedor.
 * Busca saldos atuais no Bling e atualiza Supabase se diferente.
 *
 * NAO insere registros em movimentacao_estoque (eh apenas correcao de saldo).
 *
 * @param supabase - Cliente Supabase
 * @param accessToken - Token de acesso do Bling
 * @param fornecedorId - ID do fornecedor
 * @param empresaId - ID da empresa
 */
export async function syncEstoqueFornecedor(
  supabase: SupabaseClient,
  accessToken: string,
  fornecedorId: number,
  empresaId: number
): Promise<SyncEstoqueResult> {
  const result: SyncEstoqueResult = {
    total_produtos: 0,
    atualizados: 0,
    sem_alteracao: 0,
    erros: 0,
  }

  // 1. Buscar produto_ids do fornecedor
  const { data: fpData } = await supabase
    .from('fornecedores_produtos')
    .select('produto_id')
    .eq('fornecedor_id', fornecedorId)

  if (!fpData || fpData.length === 0) {
    return result
  }

  const produtoIds = fpData.map(fp => fp.produto_id)

  // 2. Buscar produtos com id_produto_bling
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, id_produto_bling, estoque_atual')
    .eq('empresa_id', empresaId)
    .not('id_produto_bling', 'is', null)
    .in('id', produtoIds)

  const produtosParaSync = (produtos || []) as ProdutoParaSync[]

  if (produtosParaSync.length === 0) {
    return result
  }

  result.total_produtos = produtosParaSync.length

  // Criar mapa id_produto_bling -> produto local
  // Chave como string pois id_produto_bling eh varchar no banco
  const produtosMap = new Map<string, ProdutoParaSync>()
  produtosParaSync.forEach(p => produtosMap.set(String(p.id_produto_bling), p))

  // 3. Dividir em lotes de 100 (limite da API Bling)
  const lotes: ProdutoParaSync[][] = []
  for (let i = 0; i < produtosParaSync.length; i += 100) {
    lotes.push(produtosParaSync.slice(i, i + 100))
  }

  // 4. Para cada lote, chamar Bling API
  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i]

    // Delay entre lotes (350ms) para respeitar rate limit
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 350))
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
          context: `sync estoque pre-pedido (lote ${i + 1}/${lotes.length})`,
          maxRetries: 5,
          baseDelayMs: 2000,
        }
      )

      if (!response.ok) {
        console.warn(`[Sync Estoque] Lote ${i + 1} falhou com status ${response.status}`)
        result.erros += lote.length
        continue
      }

      const responseData = await response.json()
      const blingData: BlingEstoqueSaldo[] = responseData.data || []

      // 5. Comparar e atualizar
      for (const item of blingData) {
        // Bling v3 retorna saldoFisicoTotal direto, ou somar saldoFisico dos depositos
        const saldoTotal = item.saldoFisicoTotal ?? item.depositos
          .reduce((sum, d) => sum + (d.saldoFisico ?? 0), 0)

        // Converter para string pois id_produto_bling eh varchar no banco
        const produtoLocal = produtosMap.get(String(item.produto.id))
        if (!produtoLocal) continue

        if (produtoLocal.estoque_atual !== saldoTotal) {
          const { error: updateError } = await supabase
            .from('produtos')
            .update({ estoque_atual: saldoTotal })
            .eq('id', produtoLocal.id)
            .eq('empresa_id', empresaId)

          if (updateError) {
            console.warn(`[Sync Estoque] Erro ao atualizar produto ${produtoLocal.id}:`, updateError.message)
            result.erros++
          } else {
            result.atualizados++
          }
        } else {
          result.sem_alteracao++
        }
      }
    } catch (loteError) {
      // Se rate limit esgotou retries, abortar lotes restantes
      if (loteError instanceof BlingRateLimitError) {
        console.warn(`[Sync Estoque] Rate limit (429) no lote ${i + 1}, abortando lotes restantes`)
        const produtosRestantes = lotes.slice(i).reduce((sum, l) => sum + l.length, 0)
        result.erros += produtosRestantes
        break
      }
      console.warn(`[Sync Estoque] Erro no lote ${i + 1}:`, loteError)
      result.erros += lote.length
    }
  }

  return result
}

/**
 * Sincroniza estoque do Bling para TODOS os produtos de uma empresa.
 * Diferente de syncEstoqueFornecedor, esta funcao nao filtra por fornecedor.
 * Ideal para cron jobs que precisam manter todo o estoque atualizado.
 *
 * @param supabase - Cliente Supabase
 * @param accessToken - Token de acesso do Bling
 * @param empresaId - ID da empresa
 */
export async function syncEstoqueEmpresa(
  supabase: SupabaseClient,
  accessToken: string,
  empresaId: number
): Promise<SyncEstoqueResult> {
  const result: SyncEstoqueResult = {
    total_produtos: 0,
    atualizados: 0,
    sem_alteracao: 0,
    erros: 0,
  }

  // Buscar TODOS os produtos da empresa que tem id_produto_bling
  // Supabase limita a 1000 por query, entao paginar
  const allProdutos: ProdutoParaSync[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, id_produto_bling, estoque_atual')
      .eq('empresa_id', empresaId)
      .not('id_produto_bling', 'is', null)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error(`[Sync Estoque Empresa] Erro ao buscar produtos (offset ${from}):`, error.message)
      break
    }

    if (!data || data.length === 0) break

    allProdutos.push(...(data as ProdutoParaSync[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  if (allProdutos.length === 0) {
    console.log(`[Sync Estoque Empresa] Empresa ${empresaId}: nenhum produto com id_produto_bling`)
    return result
  }

  result.total_produtos = allProdutos.length
  console.log(`[Sync Estoque Empresa] Empresa ${empresaId}: ${allProdutos.length} produtos para sincronizar`)

  // Mapa id_produto_bling -> produto local
  const produtosMap = new Map<string, ProdutoParaSync>()
  allProdutos.forEach(p => produtosMap.set(String(p.id_produto_bling), p))

  // Dividir em lotes de 100 (limite da API Bling)
  const lotes: ProdutoParaSync[][] = []
  for (let i = 0; i < allProdutos.length; i += 100) {
    lotes.push(allProdutos.slice(i, i + 100))
  }

  console.log(`[Sync Estoque Empresa] Empresa ${empresaId}: ${lotes.length} lotes`)

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i]

    // Delay entre lotes (400ms) para respeitar rate limit
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
          context: `sync estoque empresa ${empresaId} (lote ${i + 1}/${lotes.length})`,
          maxRetries: 5,
          baseDelayMs: 2000,
        }
      )

      if (!response.ok) {
        console.warn(`[Sync Estoque Empresa] Lote ${i + 1}/${lotes.length} falhou: HTTP ${response.status}`)
        result.erros += lote.length
        continue
      }

      const responseData = await response.json()
      const blingData: BlingEstoqueSaldo[] = responseData.data || []

      // Comparar e atualizar
      for (const item of blingData) {
        const saldoTotal = item.saldoFisicoTotal ?? item.depositos
          .reduce((sum, d) => sum + (d.saldoFisico ?? 0), 0)

        const produtoLocal = produtosMap.get(String(item.produto.id))
        if (!produtoLocal) continue

        if (produtoLocal.estoque_atual !== saldoTotal) {
          const { error: updateError } = await supabase
            .from('produtos')
            .update({ estoque_atual: saldoTotal })
            .eq('id', produtoLocal.id)
            .eq('empresa_id', empresaId)

          if (updateError) {
            console.warn(`[Sync Estoque Empresa] Erro update produto ${produtoLocal.id}:`, updateError.message)
            result.erros++
          } else {
            result.atualizados++
          }
        } else {
          result.sem_alteracao++
        }
      }

      // Log progresso a cada 10 lotes
      if ((i + 1) % 10 === 0 || i === lotes.length - 1) {
        console.log(
          `[Sync Estoque Empresa] Empresa ${empresaId}: lote ${i + 1}/${lotes.length} - ` +
          `${result.atualizados} atualizados, ${result.sem_alteracao} ok, ${result.erros} erros`
        )
      }
    } catch (loteError) {
      if (loteError instanceof BlingRateLimitError) {
        console.warn(`[Sync Estoque Empresa] Rate limit no lote ${i + 1}, abortando`)
        const restantes = lotes.slice(i).reduce((sum, l) => sum + l.length, 0)
        result.erros += restantes
        break
      }
      console.warn(`[Sync Estoque Empresa] Erro lote ${i + 1}:`, loteError)
      result.erros += lote.length
    }
  }

  console.log(
    `[Sync Estoque Empresa] Empresa ${empresaId} CONCLUIDO: ` +
    `${result.total_produtos} total, ${result.atualizados} atualizados, ` +
    `${result.sem_alteracao} ok, ${result.erros} erros`
  )

  return result
}
