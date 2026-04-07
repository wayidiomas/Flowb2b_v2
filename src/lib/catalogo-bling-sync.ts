/**
 * Bling Sync Engine para Catalogo de Atualizacoes
 *
 * Processa atualizacoes aceitas do catalogo (novo, preco, removido, dados)
 * e sincroniza com a API do Bling v3, atualizando tambem o Supabase.
 *
 * Usa blingFetch() com retry inteligente e rate limiting.
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import { getBlingToken } from '@/lib/bling-estoque'
import { blingFetch } from '@/lib/bling-fetch'

const BLING_API_URL = process.env.BLING_API_URL || 'https://api.bling.com.br/Api/v3'
const DELAY_MS = 350

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncLogEntry {
  atualizacao_id: number
  acao: string
  resultado: 'sucesso' | 'erro' | 'ignorado'
  detalhes?: string
}

interface SyncResult {
  success: boolean
  synced: number
  errors: number
  ignored: number
  log: SyncLogEntry[]
}

interface CatalogoAtualizacao {
  id: number
  tipo: string
  catalogo_id: number
  catalogo_item_id: number | null
  dados_antigos: Record<string, any> | null
  dados_novos: Record<string, any> | null
  empresa_id: number
}

interface CatalogoItem {
  id: number
  ean: string | null
  nome: string | null
  codigo: string | null
  preco_base: number | null
  marca: string | null
  unidade: string | null
  produto_id: number | null
  empresa_id: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Obtém o fornecedor no Supabase para um catalogo (via CNPJ) + empresa_id.
 * Retorna o fornecedor com id_bling para integracao com Bling.
 */
async function getFornecedorForCatalogo(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  catalogoId: number,
  empresaId: number
): Promise<{ id: number; id_bling: number | null; nome: string | null } | null> {
  // Buscar o CNPJ do catalogo
  const { data: catalogo } = await supabase
    .from('catalogo_fornecedor')
    .select('cnpj')
    .eq('id', catalogoId)
    .single()

  if (!catalogo?.cnpj) return null

  // Buscar fornecedor com esse CNPJ na empresa
  const cnpjLimpo = catalogo.cnpj.replace(/\D/g, '')

  const { data: fornecedor } = await supabase
    .from('fornecedores')
    .select('id, id_bling, nome')
    .eq('empresa_id', empresaId)
    .or(`cnpj.eq.${cnpjLimpo},cnpj.eq.${formatCnpj(cnpjLimpo)}`)
    .limit(1)
    .single()

  return fornecedor || null
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

/**
 * Busca o produto no Supabase a partir de um catalogo_item_id.
 * Retorna produto com id_produto_bling para integracao.
 */
async function getProdutoFromCatalogoItem(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  catalogoItemId: number,
  empresaId: number
): Promise<{ id: number; id_produto_bling: number | null } | null> {
  // Buscar catalogo_item para obter produto_id
  const { data: item } = await supabase
    .from('catalogo_itens')
    .select('produto_id, empresa_id')
    .eq('id', catalogoItemId)
    .single()

  if (!item?.produto_id) return null

  // Buscar produto na empresa correta
  const targetEmpresaId = item.empresa_id || empresaId

  const { data: produto } = await supabase
    .from('produtos')
    .select('id, id_produto_bling')
    .eq('id', item.produto_id)
    .eq('empresa_id', targetEmpresaId)
    .single()

  return produto || null
}

// ---------------------------------------------------------------------------
// Sync por tipo
// ---------------------------------------------------------------------------

/**
 * tipo = 'novo': Produto novo no catalogo
 * 1. Busca no Bling por GTIN (EAN)
 * 2. Se encontrado, cria/atualiza vinculo fornecedor
 * 3. Se nao encontrado, cria produto no Bling
 * 4. Atualiza fornecedores_produtos no Supabase
 */
async function syncNovo(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  atualizacao: CatalogoAtualizacao,
  item: CatalogoItem,
  fornecedor: { id: number; id_bling: number | null; nome: string | null },
  accessToken: string
): Promise<SyncLogEntry> {
  const logEntry: SyncLogEntry = {
    atualizacao_id: atualizacao.id,
    acao: 'criar_produto',
    resultado: 'erro',
  }

  if (!fornecedor.id_bling) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Fornecedor sem id_bling no Bling'
    return logEntry
  }

  const ean = item.ean || (atualizacao.dados_novos?.ean as string | undefined)
  const nome = item.nome || (atualizacao.dados_novos?.nome as string | undefined)
  const preco = item.preco_base ?? (atualizacao.dados_novos?.preco_base as number | undefined) ?? 0

  if (!nome) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Item sem nome'
    return logEntry
  }

  try {
    let idProdutoBling: number | null = null

    // 1. Tentar encontrar produto no Bling por EAN/GTIN
    if (ean) {
      const { response: searchResponse } = await blingFetch(
        `${BLING_API_URL}/produtos?pesquisa=${encodeURIComponent(ean)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        { maxRetries: 3, context: `buscar produto por EAN ${ean}` }
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const produtos = searchData?.data || []

        // Procurar match exato por gtin
        const match = produtos.find(
          (p: any) => p.gtin === ean || p.codigo === ean
        )
        if (match) {
          idProdutoBling = match.id
        }
      }

      await delay(DELAY_MS)
    }

    // 2. Se nao encontrou, criar produto no Bling
    if (!idProdutoBling) {
      const produtoPayload: Record<string, any> = {
        nome,
        tipo: 'P',
        situacao: 'A',
        formato: 'S',
      }

      if (ean) produtoPayload.gtin = ean
      if (item.codigo) produtoPayload.codigo = item.codigo
      if (item.marca) produtoPayload.marca = item.marca
      if (item.unidade) produtoPayload.unidade = item.unidade
      if (preco > 0) produtoPayload.preco = preco

      const { response: createResponse } = await blingFetch(
        `${BLING_API_URL}/produtos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(produtoPayload),
        },
        { maxRetries: 3, context: `criar produto "${nome}" no Bling` }
      )

      if (createResponse.ok) {
        const createData = await createResponse.json()
        idProdutoBling = createData?.data?.id || null
      } else {
        const errorText = await createResponse.text()
        logEntry.detalhes = `Erro ao criar produto no Bling: ${createResponse.status} - ${errorText.substring(0, 200)}`
        return logEntry
      }

      await delay(DELAY_MS)
    }

    if (!idProdutoBling) {
      logEntry.detalhes = 'Nao foi possivel obter ID do produto no Bling'
      return logEntry
    }

    // 3. Criar vinculo fornecedor no Bling
    const { response: linkResponse } = await blingFetch(
      `${BLING_API_URL}/produtos/fornecedores`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          produto: { id: idProdutoBling },
          fornecedor: { id: fornecedor.id_bling },
          precoCompra: preco,
        }),
      },
      { maxRetries: 3, context: `vincular fornecedor ao produto Bling ${idProdutoBling}` }
    )

    if (!linkResponse.ok) {
      const errorText = await linkResponse.text()
      // 400 pode significar que vinculo ja existe — nao eh fatal
      if (linkResponse.status !== 400) {
        logEntry.detalhes = `Erro ao vincular fornecedor no Bling: ${linkResponse.status} - ${errorText.substring(0, 200)}`
        return logEntry
      }
    }

    await delay(DELAY_MS)

    // 4. Atualizar fornecedores_produtos no Supabase
    if (item.produto_id) {
      const { error: upsertError } = await supabase
        .from('fornecedores_produtos')
        .upsert(
          {
            fornecedor_id: fornecedor.id,
            produto_id: item.produto_id,
            empresa_id: atualizacao.empresa_id,
            valor_de_compra: preco,
          },
          { onConflict: 'fornecedor_id,produto_id' }
        )

      if (upsertError) {
        console.error(`[CatalogoSync] Erro upsert fornecedores_produtos:`, upsertError)
        logEntry.detalhes = `Produto criado no Bling, mas erro ao salvar vinculo no Supabase: ${upsertError.message}`
        logEntry.resultado = 'erro'
        return logEntry
      }
    }

    logEntry.resultado = 'sucesso'
    logEntry.detalhes = `Produto ${idProdutoBling} vinculado ao fornecedor no Bling`
    return logEntry
  } catch (error) {
    logEntry.detalhes = error instanceof Error ? error.message : 'Erro desconhecido'
    return logEntry
  }
}

/**
 * tipo = 'preco': Atualizacao de preco de um item existente
 * 1. Busca produto no Supabase (via catalogo_item_id)
 * 2. Busca vinculo produto-fornecedor no Bling
 * 3. Atualiza preco do vinculo
 * 4. Atualiza fornecedores_produtos no Supabase
 */
async function syncPreco(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  atualizacao: CatalogoAtualizacao,
  fornecedor: { id: number; id_bling: number | null; nome: string | null },
  accessToken: string
): Promise<SyncLogEntry> {
  const logEntry: SyncLogEntry = {
    atualizacao_id: atualizacao.id,
    acao: 'atualizar_preco',
    resultado: 'erro',
  }

  if (!atualizacao.catalogo_item_id) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Atualizacao sem catalogo_item_id'
    return logEntry
  }

  const novoPreco = (atualizacao.dados_novos?.preco_base as number) ?? null
  if (novoPreco === null || novoPreco === undefined) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Sem novo preco nos dados_novos'
    return logEntry
  }

  try {
    // 1. Buscar produto
    const produto = await getProdutoFromCatalogoItem(
      supabase,
      atualizacao.catalogo_item_id,
      atualizacao.empresa_id
    )

    if (!produto) {
      logEntry.resultado = 'ignorado'
      logEntry.detalhes = 'Produto nao encontrado no Supabase para este item do catalogo'
      return logEntry
    }

    // 2. Atualizar fornecedores_produtos no Supabase
    const { error: fpError } = await supabase
      .from('fornecedores_produtos')
      .update({ valor_de_compra: novoPreco })
      .eq('fornecedor_id', fornecedor.id)
      .eq('produto_id', produto.id)
      .eq('empresa_id', atualizacao.empresa_id)

    if (fpError) {
      console.error(`[CatalogoSync] Erro ao atualizar fornecedores_produtos:`, fpError)
    }

    // 3. Sync com Bling (se possivel)
    if (!produto.id_produto_bling) {
      logEntry.resultado = 'sucesso'
      logEntry.detalhes = 'Preco atualizado no Supabase (produto sem id_produto_bling, Bling ignorado)'
      return logEntry
    }

    if (!fornecedor.id_bling) {
      logEntry.resultado = 'sucesso'
      logEntry.detalhes = 'Preco atualizado no Supabase (fornecedor sem id_bling, Bling ignorado)'
      return logEntry
    }

    // Buscar vinculo no Bling
    const { response: listResponse } = await blingFetch(
      `${BLING_API_URL}/produtos/fornecedores?idProduto=${produto.id_produto_bling}&idFornecedor=${fornecedor.id_bling}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      { maxRetries: 3, context: `listar vinculo produto-fornecedor Bling` }
    )

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      logEntry.resultado = 'sucesso'
      logEntry.detalhes = `Preco atualizado no Supabase, mas erro ao buscar vinculo no Bling: ${listResponse.status} - ${errorText.substring(0, 200)}`
      return logEntry
    }

    const listData = await listResponse.json()
    const vinculos = listData?.data || []

    await delay(DELAY_MS)

    if (vinculos.length > 0) {
      // Atualizar vinculo existente
      const vinculoId = vinculos[0].id
      const { response: putResponse } = await blingFetch(
        `${BLING_API_URL}/produtos/fornecedores/${vinculoId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ precoCompra: novoPreco }),
        },
        { maxRetries: 3, context: `atualizar preco vinculo Bling ${vinculoId}` }
      )

      if (putResponse.ok) {
        logEntry.resultado = 'sucesso'
        logEntry.detalhes = `Preco atualizado no Bling (vinculo ${vinculoId}) e Supabase`
      } else {
        const errorText = await putResponse.text()
        logEntry.resultado = 'sucesso'
        logEntry.detalhes = `Preco atualizado no Supabase, mas falhou no Bling: PUT ${putResponse.status} - ${errorText.substring(0, 200)}`
      }
    } else {
      // Vinculo nao existe, criar com preco
      const { response: postResponse } = await blingFetch(
        `${BLING_API_URL}/produtos/fornecedores`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            produto: { id: produto.id_produto_bling },
            fornecedor: { id: fornecedor.id_bling },
            precoCompra: novoPreco,
          }),
        },
        { maxRetries: 3, context: `criar vinculo Bling com preco` }
      )

      if (postResponse.ok) {
        logEntry.resultado = 'sucesso'
        logEntry.detalhes = 'Preco atualizado e vinculo criado no Bling'
      } else {
        const errorText = await postResponse.text()
        logEntry.resultado = 'sucesso'
        logEntry.detalhes = `Preco atualizado no Supabase, mas falhou ao criar vinculo no Bling: POST ${postResponse.status} - ${errorText.substring(0, 200)}`
      }
    }

    return logEntry
  } catch (error) {
    logEntry.detalhes = error instanceof Error ? error.message : 'Erro desconhecido'
    return logEntry
  }
}

/**
 * tipo = 'removido': Produto removido do catalogo
 * 1. Busca produto no Supabase
 * 2. Inativa produto no Bling (PATCH situacao = "I")
 */
async function syncRemovido(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  atualizacao: CatalogoAtualizacao,
  accessToken: string
): Promise<SyncLogEntry> {
  const logEntry: SyncLogEntry = {
    atualizacao_id: atualizacao.id,
    acao: 'inativar_produto',
    resultado: 'erro',
  }

  if (!atualizacao.catalogo_item_id) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Atualizacao sem catalogo_item_id'
    return logEntry
  }

  try {
    const produto = await getProdutoFromCatalogoItem(
      supabase,
      atualizacao.catalogo_item_id,
      atualizacao.empresa_id
    )

    if (!produto) {
      logEntry.resultado = 'ignorado'
      logEntry.detalhes = 'Produto nao encontrado no Supabase'
      return logEntry
    }

    if (!produto.id_produto_bling) {
      logEntry.resultado = 'ignorado'
      logEntry.detalhes = 'Produto sem id_produto_bling, nada para inativar no Bling'
      return logEntry
    }

    // Inativar produto no Bling
    const { response: patchResponse } = await blingFetch(
      `${BLING_API_URL}/produtos/${produto.id_produto_bling}/situacoes`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ situacao: 'I' }),
      },
      { maxRetries: 3, context: `inativar produto Bling ${produto.id_produto_bling}` }
    )

    if (patchResponse.ok) {
      logEntry.resultado = 'sucesso'
      logEntry.detalhes = `Produto ${produto.id_produto_bling} inativado no Bling`
    } else {
      const errorText = await patchResponse.text()
      logEntry.detalhes = `Erro ao inativar produto no Bling: ${patchResponse.status} - ${errorText.substring(0, 200)}`
    }

    return logEntry
  } catch (error) {
    logEntry.detalhes = error instanceof Error ? error.message : 'Erro desconhecido'
    return logEntry
  }
}

/**
 * tipo = 'dados': Atualizacao de dados do produto (nome, marca, etc.)
 * 1. Busca produto no Supabase
 * 2. Atualiza campos alterados no Bling (PATCH /produtos/{id})
 */
async function syncDados(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  atualizacao: CatalogoAtualizacao,
  accessToken: string
): Promise<SyncLogEntry> {
  const logEntry: SyncLogEntry = {
    atualizacao_id: atualizacao.id,
    acao: 'atualizar_dados',
    resultado: 'erro',
  }

  if (!atualizacao.catalogo_item_id) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Atualizacao sem catalogo_item_id'
    return logEntry
  }

  if (!atualizacao.dados_novos || Object.keys(atualizacao.dados_novos).length === 0) {
    logEntry.resultado = 'ignorado'
    logEntry.detalhes = 'Sem dados_novos para atualizar'
    return logEntry
  }

  try {
    const produto = await getProdutoFromCatalogoItem(
      supabase,
      atualizacao.catalogo_item_id,
      atualizacao.empresa_id
    )

    if (!produto) {
      logEntry.resultado = 'ignorado'
      logEntry.detalhes = 'Produto nao encontrado no Supabase'
      return logEntry
    }

    if (!produto.id_produto_bling) {
      logEntry.resultado = 'ignorado'
      logEntry.detalhes = 'Produto sem id_produto_bling, nada para atualizar no Bling'
      return logEntry
    }

    // Mapear campos do catalogo para campos da API do Bling
    const dadosNovos = atualizacao.dados_novos
    const blingPayload: Record<string, any> = {}

    if (dadosNovos.nome !== undefined) blingPayload.nome = dadosNovos.nome
    if (dadosNovos.marca !== undefined) blingPayload.marca = dadosNovos.marca
    if (dadosNovos.unidade !== undefined) blingPayload.unidade = dadosNovos.unidade
    if (dadosNovos.ean !== undefined) blingPayload.gtin = dadosNovos.ean
    if (dadosNovos.codigo !== undefined) blingPayload.codigo = dadosNovos.codigo
    if (dadosNovos.ncm !== undefined) blingPayload.ncm = dadosNovos.ncm

    if (Object.keys(blingPayload).length === 0) {
      logEntry.resultado = 'ignorado'
      logEntry.detalhes = 'Nenhum campo mapeavel para o Bling nos dados_novos'
      return logEntry
    }

    const { response: patchResponse } = await blingFetch(
      `${BLING_API_URL}/produtos/${produto.id_produto_bling}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(blingPayload),
      },
      { maxRetries: 3, context: `atualizar dados produto Bling ${produto.id_produto_bling}` }
    )

    if (patchResponse.ok) {
      logEntry.resultado = 'sucesso'
      logEntry.detalhes = `Produto ${produto.id_produto_bling} atualizado no Bling: ${Object.keys(blingPayload).join(', ')}`
    } else {
      const errorText = await patchResponse.text()
      logEntry.detalhes = `Erro ao atualizar produto no Bling: ${patchResponse.status} - ${errorText.substring(0, 200)}`
    }

    return logEntry
  } catch (error) {
    logEntry.detalhes = error instanceof Error ? error.message : 'Erro desconhecido'
    return logEntry
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Sincroniza atualizacoes aceitas do catalogo com o Bling.
 *
 * @param empresaId  ID da empresa (multi-tenant)
 * @param catalogoId ID do catalogo_fornecedor
 * @param atualizacaoIds IDs das atualizacoes a processar (devem estar com status 'aceito')
 * @returns Resultado da sincronizacao com log detalhado
 */
export async function syncCatalogoAtualizacoes(
  empresaId: number,
  catalogoId: number,
  atualizacaoIds: number[]
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    synced: 0,
    errors: 0,
    ignored: 0,
    log: [],
  }

  if (!atualizacaoIds || atualizacaoIds.length === 0) {
    result.success = true
    return result
  }

  const supabase = createServerSupabaseClient()

  // 1. Obter token do Bling
  const accessToken = await getBlingToken(supabase, empresaId)

  if (!accessToken) {
    result.log.push({
      atualizacao_id: 0,
      acao: 'autenticacao',
      resultado: 'erro',
      detalhes: 'Bling nao conectado ou token indisponivel para esta empresa',
    })
    result.errors = atualizacaoIds.length
    return result
  }

  // 2. Buscar atualizacoes aceitas
  const { data: atualizacoes, error: fetchError } = await supabase
    .from('catalogo_atualizacoes')
    .select('id, tipo, catalogo_id, catalogo_item_id, dados_antigos, dados_novos, empresa_id')
    .in('id', atualizacaoIds)
    .eq('empresa_id', empresaId)
    .eq('status', 'aceito')

  if (fetchError || !atualizacoes || atualizacoes.length === 0) {
    result.log.push({
      atualizacao_id: 0,
      acao: 'buscar_atualizacoes',
      resultado: 'erro',
      detalhes: fetchError
        ? `Erro ao buscar atualizacoes: ${fetchError.message}`
        : 'Nenhuma atualizacao aceita encontrada para os IDs informados',
    })
    result.errors = 1
    return result
  }

  // 3. Buscar fornecedor para este catalogo + empresa
  const fornecedor = await getFornecedorForCatalogo(supabase, catalogoId, empresaId)

  if (!fornecedor) {
    result.log.push({
      atualizacao_id: 0,
      acao: 'buscar_fornecedor',
      resultado: 'erro',
      detalhes: `Fornecedor nao encontrado para o catalogo ${catalogoId} na empresa ${empresaId}`,
    })
    result.errors = atualizacoes.length
    return result
  }

  // 4. Buscar dados dos catalogo_itens referenciados
  const itemIds = atualizacoes
    .map(a => a.catalogo_item_id)
    .filter((id): id is number => id !== null)
  const uniqueItemIds = [...new Set(itemIds)]

  const itemMap = new Map<number, CatalogoItem>()
  if (uniqueItemIds.length > 0) {
    for (let i = 0; i < uniqueItemIds.length; i += 500) {
      const batch = uniqueItemIds.slice(i, i + 500)
      const { data: itens } = await supabase
        .from('catalogo_itens')
        .select('id, ean, nome, codigo, preco_base, marca, unidade, produto_id, empresa_id')
        .in('id', batch)

      for (const item of itens || []) {
        itemMap.set(item.id, item as CatalogoItem)
      }
    }
  }

  // 5. Processar cada atualizacao
  for (let i = 0; i < atualizacoes.length; i++) {
    const atualizacao = atualizacoes[i] as CatalogoAtualizacao

    // Delay entre operacoes (exceto a primeira)
    if (i > 0) {
      await delay(DELAY_MS)
    }

    let logEntry: SyncLogEntry

    try {
      switch (atualizacao.tipo) {
        case 'novo': {
          const item = atualizacao.catalogo_item_id
            ? itemMap.get(atualizacao.catalogo_item_id)
            : null

          // Para tipo 'novo', construir item a partir de dados_novos se nao encontrou
          const itemData: CatalogoItem = item || {
            id: atualizacao.catalogo_item_id || 0,
            ean: (atualizacao.dados_novos?.ean as string) || null,
            nome: (atualizacao.dados_novos?.nome as string) || null,
            codigo: (atualizacao.dados_novos?.codigo as string) || null,
            preco_base: (atualizacao.dados_novos?.preco_base as number) || null,
            marca: (atualizacao.dados_novos?.marca as string) || null,
            unidade: (atualizacao.dados_novos?.unidade as string) || null,
            produto_id: null,
            empresa_id: atualizacao.empresa_id,
          }

          logEntry = await syncNovo(supabase, atualizacao, itemData, fornecedor, accessToken)
          break
        }

        case 'preco': {
          logEntry = await syncPreco(supabase, atualizacao, fornecedor, accessToken)
          break
        }

        case 'removido': {
          logEntry = await syncRemovido(supabase, atualizacao, accessToken)
          break
        }

        case 'dados': {
          logEntry = await syncDados(supabase, atualizacao, accessToken)
          break
        }

        default: {
          logEntry = {
            atualizacao_id: atualizacao.id,
            acao: 'desconhecido',
            resultado: 'ignorado',
            detalhes: `Tipo de atualizacao desconhecido: ${atualizacao.tipo}`,
          }
        }
      }
    } catch (error) {
      logEntry = {
        atualizacao_id: atualizacao.id,
        acao: atualizacao.tipo,
        resultado: 'erro',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido ao processar atualizacao',
      }
    }

    result.log.push(logEntry)

    switch (logEntry.resultado) {
      case 'sucesso':
        result.synced++
        break
      case 'erro':
        result.errors++
        break
      case 'ignorado':
        result.ignored++
        break
    }

    // Marcar a atualizacao como sincronizada no Supabase
    if (logEntry.resultado === 'sucesso') {
      await supabase
        .from('catalogo_atualizacoes')
        .update({
          status: 'sincronizado',
          sincronizado_em: new Date().toISOString(),
        })
        .eq('id', atualizacao.id)
        .eq('empresa_id', empresaId)
    }
  }

  result.success = result.errors === 0
  return result
}
