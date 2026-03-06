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
  id_produto_bling: number
  estoque_atual: number | null
}

interface BlingEstoqueSaldo {
  produto: { id: number }
  depositos: Array<{
    id: number
    nome: string
    saldo: number
    desconsiderar: boolean
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
  const produtosMap = new Map<number, ProdutoParaSync>()
  produtosParaSync.forEach(p => produtosMap.set(p.id_produto_bling, p))

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
        const saldoTotal = item.depositos
          .filter(d => !d.desconsiderar)
          .reduce((sum, d) => sum + d.saldo, 0)

        const produtoLocal = produtosMap.get(item.produto.id)
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
