import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'
import { blingFetch } from '@/lib/bling-fetch'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

/** Delay helper for spacing Bling API calls between empresas */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Obtém access_token válido do Bling para uma empresa, renovando se necessário */
async function getBlingAccessToken(
  empresaId: number,
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<string> {
  const { data: tokens, error } = await supabase
    .from('bling_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('empresa_id', empresaId)
    .single()

  if (error || !tokens) {
    throw new Error('Bling nao conectado para esta empresa.')
  }

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()

  // Se o token expirou ou vai expirar em 5 minutos, renovar
  if (expiresAt < new Date(now.getTime() + 5 * 60 * 1000)) {
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

    return newTokens.access_token
  }

  return tokens.access_token
}

interface SyncResult {
  empresa_id: number
  empresa_nome: string
  supabase: boolean
  bling: boolean
  bling_error?: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth: validar tipo fornecedor e CNPJ
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const itemId = Number(id)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const body = await request.json()

    // Se preco_base está presente, executar fluxo de sync de preço
    const hasPriceUpdate = body.preco_base !== undefined
    const syncBling = body.sync_bling === true && hasPriceUpdate

    // Buscar catalogo_id via CNPJ
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // 2. Buscar item do catálogo com produto_id e empresa_id
    const { data: catalogoItem } = await supabase
      .from('catalogo_itens')
      .select('id, produto_id, empresa_id, preco_base')
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!catalogoItem) {
      return NextResponse.json({ error: 'Item nao encontrado no seu catalogo' }, { status: 404 })
    }

    // 3. Atualizar catalogo_itens (campos permitidos)
    const updateFields: Record<string, unknown> = {}
    if (body.preco_base !== undefined) updateFields.preco_base = body.preco_base
    if (body.ativo !== undefined) updateFields.ativo = body.ativo
    if (body.ordem !== undefined) updateFields.ordem = body.ordem
    if (body.nome !== undefined) updateFields.nome = body.nome
    if (body.codigo !== undefined) updateFields.codigo = body.codigo || null
    if (body.ean !== undefined) updateFields.ean = body.ean || null
    if (body.marca !== undefined) updateFields.marca = body.marca || null
    if (body.ncm !== undefined) updateFields.ncm = body.ncm || null
    if (body.unidade !== undefined) updateFields.unidade = body.unidade || null
    if (body.itens_por_caixa !== undefined) updateFields.itens_por_caixa = body.itens_por_caixa
    if (body.bonificacao !== undefined) updateFields.bonificacao = body.bonificacao
    if (body.categoria !== undefined) updateFields.categoria = body.categoria || null
    if (body.descricao_produto !== undefined) updateFields.descricao_produto = body.descricao_produto || null
    if (body.destaque !== undefined) updateFields.destaque = body.destaque

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('catalogo_itens')
      .update(updateFields)
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar item do catalogo:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
    }

    // Se não houve atualização de preço, retornar simples (comportamento original)
    if (!hasPriceUpdate) {
      return NextResponse.json({ success: true, item: updated })
    }

    // ========== Sync de preço cross-empresa ==========

    const novoPreco = body.preco_base as number

    // 4. Buscar o gtin do produto de referência para encontrar o mesmo produto em outras empresas
    const { data: produtoRef } = await supabase
      .from('produtos')
      .select('id, gtin, nome')
      .eq('id', catalogoItem.produto_id)
      .single()

    if (!produtoRef || !produtoRef.gtin) {
      // Sem gtin, não é possível fazer cross-empresa sync
      // Apenas atualizar o fornecedores_produtos da empresa de origem
      const syncResults = await syncSingleEmpresa(
        supabase, cnpjLimpo, catalogoItem.empresa_id,
        catalogoItem.produto_id, novoPreco, syncBling
      )
      return NextResponse.json({
        success: true,
        preco_atualizado: novoPreco,
        item: updated,
        sync_results: syncResults ? [syncResults] : [],
        warning: !produtoRef?.gtin ? 'Produto sem GTIN, sync limitado a empresa de origem' : undefined,
      })
    }

    // 5. Buscar TODOS os fornecedores com o mesmo CNPJ (multi-empresa)
    const { data: fornecedoresMultiEmpresa } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, nome, nome_fantasia, id_bling')
      .or(`cnpj.eq.${cnpjLimpo},cnpj.eq.${formatCnpj(cnpjLimpo)}`)

    if (!fornecedoresMultiEmpresa || fornecedoresMultiEmpresa.length === 0) {
      return NextResponse.json({
        success: true,
        preco_atualizado: novoPreco,
        item: updated,
        sync_results: [],
        warning: 'Nenhum fornecedor encontrado com este CNPJ',
      })
    }

    // Buscar nomes das empresas para resposta
    const empresaIds = [...new Set(fornecedoresMultiEmpresa.map(f => f.empresa_id))]
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social')
      .in('id', empresaIds)

    const empresaMap = new Map(
      (empresas || []).map(e => [e.id, e.nome_fantasia || e.razao_social || `Empresa ${e.id}`])
    )

    // 6. Para cada empresa, atualizar fornecedores_produtos e opcionalmente Bling
    const syncResults: SyncResult[] = []

    for (let i = 0; i < fornecedoresMultiEmpresa.length; i++) {
      const fornecedor = fornecedoresMultiEmpresa[i]
      const empresaNome = empresaMap.get(fornecedor.empresa_id) || `Empresa ${fornecedor.empresa_id}`

      const result: SyncResult = {
        empresa_id: fornecedor.empresa_id,
        empresa_nome: empresaNome,
        supabase: false,
        bling: false,
      }

      try {
        // 6a. Buscar produto com mesmo gtin nesta empresa
        const { data: produtoEmpresa } = await supabase
          .from('produtos')
          .select('id, id_produto_bling')
          .eq('gtin', produtoRef.gtin)
          .eq('empresa_id', fornecedor.empresa_id)
          .limit(1)
          .single()

        if (!produtoEmpresa) {
          result.bling_error = 'Produto nao encontrado nesta empresa (gtin sem match)'
          syncResults.push(result)
          continue
        }

        // 6b. Atualizar fornecedores_produtos.valor_de_compra no Supabase
        const { error: fpError } = await supabase
          .from('fornecedores_produtos')
          .update({ valor_de_compra: novoPreco })
          .eq('fornecedor_id', fornecedor.id)
          .eq('produto_id', produtoEmpresa.id)
          .eq('empresa_id', fornecedor.empresa_id)

        if (fpError) {
          console.error(
            `Erro ao atualizar fornecedores_produtos (empresa ${fornecedor.empresa_id}):`,
            fpError
          )
          result.bling_error = `Erro Supabase: ${fpError.message}`
          syncResults.push(result)
          continue
        }

        result.supabase = true

        // 6c. Sync Bling se solicitado
        if (syncBling) {
          try {
            if (!produtoEmpresa.id_produto_bling) {
              result.bling_error = 'Produto sem id_produto_bling'
              syncResults.push(result)
              continue
            }

            if (!fornecedor.id_bling) {
              result.bling_error = 'Fornecedor sem id_bling'
              syncResults.push(result)
              continue
            }

            const accessToken = await getBlingAccessToken(fornecedor.empresa_id, supabase)

            // Buscar o vínculo produto-fornecedor existente no Bling para obter o ID
            const { response: listResponse } = await blingFetch(
              `${BLING_CONFIG.apiUrl}/produtos/fornecedores?idProduto=${produtoEmpresa.id_produto_bling}&idFornecedor=${fornecedor.id_bling}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              },
              { maxRetries: 3, context: `listar vinculo produto-fornecedor (empresa ${fornecedor.empresa_id})` }
            )

            if (listResponse.ok) {
              const listData = await listResponse.json()
              const vinculos = listData?.data || []

              if (vinculos.length > 0) {
                // Tentar PUT para atualizar preço do vínculo existente
                const vinculoId = vinculos[0].id
                const { response: putResponse } = await blingFetch(
                  `${BLING_CONFIG.apiUrl}/produtos/fornecedores/${vinculoId}`,
                  {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      precoCompra: novoPreco,
                    }),
                  },
                  { maxRetries: 3, context: `atualizar preco vinculo Bling (empresa ${fornecedor.empresa_id})` }
                )

                if (putResponse.ok) {
                  result.bling = true
                } else {
                  const errorText = await putResponse.text()
                  console.error(
                    `Bling PUT falhou (empresa ${fornecedor.empresa_id}):`,
                    putResponse.status, errorText
                  )
                  result.bling_error = `Bling PUT ${putResponse.status}: ${errorText.substring(0, 200)}`
                }
              } else {
                // Vínculo não existe no Bling, criar novo
                const { response: postResponse } = await blingFetch(
                  `${BLING_CONFIG.apiUrl}/produtos/fornecedores`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      produto: { id: produtoEmpresa.id_produto_bling },
                      fornecedor: { id: fornecedor.id_bling },
                      precoCompra: novoPreco,
                    }),
                  },
                  { maxRetries: 3, context: `criar vinculo Bling com preco (empresa ${fornecedor.empresa_id})` }
                )

                if (postResponse.ok) {
                  result.bling = true
                } else {
                  const errorText = await postResponse.text()
                  console.error(
                    `Bling POST falhou (empresa ${fornecedor.empresa_id}):`,
                    postResponse.status, errorText
                  )
                  result.bling_error = `Bling POST ${postResponse.status}: ${errorText.substring(0, 200)}`
                }
              }
            } else {
              const errorText = await listResponse.text()
              console.error(
                `Bling GET vinculos falhou (empresa ${fornecedor.empresa_id}):`,
                listResponse.status, errorText
              )
              result.bling_error = `Bling GET ${listResponse.status}: ${errorText.substring(0, 200)}`
            }

            // Delay entre chamadas Bling de empresas diferentes para evitar 429
            if (i < fornecedoresMultiEmpresa.length - 1) {
              await delay(400)
            }
          } catch (blingError) {
            console.error(
              `Erro Bling sync (empresa ${fornecedor.empresa_id}):`,
              blingError
            )
            result.bling_error = blingError instanceof Error
              ? blingError.message
              : 'Erro desconhecido ao sincronizar com Bling'
          }
        }
      } catch (empresaError) {
        console.error(
          `Erro ao processar empresa ${fornecedor.empresa_id}:`,
          empresaError
        )
        result.bling_error = empresaError instanceof Error
          ? empresaError.message
          : 'Erro desconhecido'
      }

      syncResults.push(result)
    }

    return NextResponse.json({
      success: true,
      preco_atualizado: novoPreco,
      item: updated,
      sync_results: syncResults,
    })
  } catch (error) {
    console.error('Erro ao atualizar item do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const itemId = Number(id)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)

    // Verificar ownership via catalogo_fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Deletar apenas se pertence a esse catalogo (todas as linhas com mesmo codigo OU mesmo nome,
    // pra pegar os clones antigos que foram criados com empresa_id de lojistas)
    const { data: alvo } = await supabase
      .from('catalogo_itens')
      .select('id, codigo, nome, catalogo_id')
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!alvo) {
      return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
    }

    let query = supabase
      .from('catalogo_itens')
      .delete({ count: 'exact' })
      .eq('catalogo_id', catalogo.id)

    if (alvo.codigo) {
      query = query.eq('codigo', alvo.codigo)
    } else {
      query = query.eq('nome', alvo.nome)
    }

    const { error: deleteError, count } = await query

    if (deleteError) {
      console.error('Erro ao deletar item:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: count || 0 })
  } catch (error) {
    console.error('Erro no DELETE item:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * Sync de preço para uma única empresa (fallback quando produto não tem gtin).
 * Atualiza fornecedores_produtos e opcionalmente Bling.
 */
async function syncSingleEmpresa(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  cnpjLimpo: string,
  empresaId: number,
  produtoId: number,
  novoPreco: number,
  syncBling: boolean
): Promise<SyncResult | null> {
  // Buscar fornecedor desta empresa com o CNPJ
  const { data: fornecedor } = await supabase
    .from('fornecedores')
    .select('id, empresa_id, nome, id_bling')
    .or(`cnpj.eq.${cnpjLimpo},cnpj.eq.${formatCnpj(cnpjLimpo)}`)
    .eq('empresa_id', empresaId)
    .limit(1)
    .single()

  if (!fornecedor) return null

  // Buscar nome da empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, razao_social')
    .eq('id', empresaId)
    .single()

  const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || `Empresa ${empresaId}`

  const result: SyncResult = {
    empresa_id: empresaId,
    empresa_nome: empresaNome,
    supabase: false,
    bling: false,
  }

  // Atualizar fornecedores_produtos
  const { error: fpError } = await supabase
    .from('fornecedores_produtos')
    .update({ valor_de_compra: novoPreco })
    .eq('fornecedor_id', fornecedor.id)
    .eq('produto_id', produtoId)
    .eq('empresa_id', empresaId)

  if (fpError) {
    result.bling_error = `Erro Supabase: ${fpError.message}`
    return result
  }

  result.supabase = true

  // Sync Bling
  if (syncBling && fornecedor.id_bling) {
    try {
      const { data: produto } = await supabase
        .from('produtos')
        .select('id_produto_bling')
        .eq('id', produtoId)
        .eq('empresa_id', empresaId)
        .single()

      if (!produto?.id_produto_bling) {
        result.bling_error = 'Produto sem id_produto_bling'
        return result
      }

      const accessToken = await getBlingAccessToken(empresaId, supabase)

      const { response: listResponse } = await blingFetch(
        `${BLING_CONFIG.apiUrl}/produtos/fornecedores?idProduto=${produto.id_produto_bling}&idFornecedor=${fornecedor.id_bling}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        },
        { maxRetries: 3, context: `listar vinculo (single empresa ${empresaId})` }
      )

      if (listResponse.ok) {
        const listData = await listResponse.json()
        const vinculos = listData?.data || []

        if (vinculos.length > 0) {
          const { response: putResponse } = await blingFetch(
            `${BLING_CONFIG.apiUrl}/produtos/fornecedores/${vinculos[0].id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ precoCompra: novoPreco }),
            },
            { maxRetries: 3, context: `atualizar preco vinculo Bling (single empresa ${empresaId})` }
          )
          result.bling = putResponse.ok
          if (!putResponse.ok) {
            const errText = await putResponse.text()
            result.bling_error = `Bling PUT ${putResponse.status}: ${errText.substring(0, 200)}`
          }
        } else {
          // Criar vínculo no Bling
          const { response: postResponse } = await blingFetch(
            `${BLING_CONFIG.apiUrl}/produtos/fornecedores`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                produto: { id: produto.id_produto_bling },
                fornecedor: { id: fornecedor.id_bling },
                precoCompra: novoPreco,
              }),
            },
            { maxRetries: 3, context: `criar vinculo Bling com preco (single empresa ${empresaId})` }
          )
          result.bling = postResponse.ok
          if (!postResponse.ok) {
            const errText = await postResponse.text()
            result.bling_error = `Bling POST ${postResponse.status}: ${errText.substring(0, 200)}`
          }
        }
      } else {
        const errText = await listResponse.text()
        result.bling_error = `Bling GET ${listResponse.status}: ${errText.substring(0, 200)}`
      }
    } catch (blingError) {
      result.bling_error = blingError instanceof Error
        ? blingError.message
        : 'Erro desconhecido ao sincronizar com Bling'
    }
  }

  return result
}
