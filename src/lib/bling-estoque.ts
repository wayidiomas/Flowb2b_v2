import { SupabaseClient } from '@supabase/supabase-js'
import { BLING_CONFIG } from './bling'
import { blingFetch } from './bling-fetch'

/**
 * Busca o access_token do Bling para uma empresa, se estiver conectada.
 * Retorna null se a empresa não tem integração com Bling ou token está expirado/revogado.
 */
export async function getBlingToken(
  supabase: SupabaseClient,
  empresaId: number
): Promise<string | null> {
  const { refreshBlingTokens } = await import('./bling')

  // Verificar se empresa está conectada ao Bling
  const { data: empresa } = await supabase
    .from('empresas')
    .select('conectadabling')
    .eq('id', empresaId)
    .single()

  if (!empresa?.conectadabling) {
    console.log(`[getBlingToken] Empresa ${empresaId} nao conectada ao Bling`)
    return null
  }

  // Buscar token ativo
  const { data: tokens } = await supabase
    .from('bling_tokens')
    .select('access_token, refresh_token, expires_at, is_revoke')
    .eq('empresa_id', empresaId)
    .single()

  if (!tokens || tokens.is_revoke) {
    console.log(`[getBlingToken] Empresa ${empresaId}: token nao encontrado ou revogado`)
    return null
  }

  // Verificar se precisa renovar (expira em menos de 5 minutos)
  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()

  if (expiresAt < new Date(now.getTime() + 5 * 60 * 1000)) {
    // Token expirado ou perto de expirar — tentar renovar
    try {
      console.log(`[getBlingToken] Empresa ${empresaId}: token expirado/perto, renovando...`)
      const newTokens = await refreshBlingTokens(tokens.refresh_token)
      await supabase
        .from('bling_tokens')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('empresa_id', empresaId)

      console.log(`[getBlingToken] Empresa ${empresaId}: token renovado com sucesso`)
      return newTokens.access_token
    } catch (err) {
      console.error(`[getBlingToken] Empresa ${empresaId}: falha ao renovar token:`, err)
      return null
    }
  }

  return tokens.access_token
}

interface AtualizarEstoqueResult {
  success: boolean
  error?: string
}

/**
 * Atualiza o estoque de um produto no Bling usando operação de Balanço (B).
 * A operação "B" DEFINE o estoque para o valor absoluto especificado.
 */
export async function atualizarEstoqueBling(
  accessToken: string,
  idProdutoBling: number,
  quantidade: number,
  observacao: string
): Promise<AtualizarEstoqueResult> {
  const url = `${BLING_CONFIG.apiUrl}/estoques`

  const body = {
    produto: { id: idProdutoBling },
    deposito: { id: 0 },
    operacao: 'B',
    quantidade,
    observacoes: observacao,
  }

  const { response } = await blingFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
    {
      maxRetries: 3,
      baseDelayMs: 2000,
      context: `atualizar estoque produto ${idProdutoBling}`,
    }
  )

  if (response.ok) {
    return { success: true }
  }

  const errorText = await response.text()
  console.error(
    `[Bling Estoque] Erro ao atualizar produto ${idProdutoBling}: ${response.status} - ${errorText}`
  )
  return {
    success: false,
    error: `Status ${response.status}: ${errorText}`,
  }
}

interface ItemEstoqueBling {
  idProdutoBling: number
  quantidade: number
  observacao: string
}

interface AtualizarEstoquesBlingResult {
  sucessos: number
  erros: number
  detalhes: Array<{ id: number; success: boolean; error?: string }>
}

/**
 * Atualiza o estoque de multiplos produtos no Bling com rate limiting.
 * Delay de 350ms entre requests para respeitar o limite de 3 req/s.
 * Se um item falhar, continua com os proximos.
 */
export async function atualizarEstoquesBling(
  accessToken: string,
  itens: ItemEstoqueBling[]
): Promise<AtualizarEstoquesBlingResult> {
  const detalhes: AtualizarEstoquesBlingResult['detalhes'] = []
  let sucessos = 0
  let erros = 0

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i]

    // Delay entre requests para respeitar rate limit (350ms ~ 3 req/s)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 350))
    }

    try {
      const result = await atualizarEstoqueBling(
        accessToken,
        item.idProdutoBling,
        item.quantidade,
        item.observacao
      )

      detalhes.push({
        id: item.idProdutoBling,
        success: result.success,
        error: result.error,
      })

      if (result.success) {
        sucessos++
      } else {
        erros++
      }
    } catch (error) {
      erros++
      detalhes.push({
        id: item.idProdutoBling,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  }

  return { sucessos, erros, detalhes }
}
