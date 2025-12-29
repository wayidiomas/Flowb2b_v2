import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'

// Interface para o corpo da requisicao
interface VincularProdutoRequest {
  produto_id: number        // ID do produto no Supabase
  fornecedor_id: number     // ID do fornecedor no Supabase
  preco_compra?: number
  preco_custo?: number
  codigo?: string           // SKU do fornecedor
  descricao?: string
}

// Funcao para obter e validar o token do Bling
async function getBlingAccessToken(empresaId: number, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: tokens, error } = await supabase
    .from('bling_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('empresa_id', empresaId)
    .single()

  if (error || !tokens) {
    throw new Error('Bling nao conectado. Conecte sua conta Bling primeiro.')
  }

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()

  // Se o token expirou ou vai expirar em 5 minutos, renovar
  if (expiresAt < new Date(now.getTime() + 5 * 60 * 1000)) {
    try {
      const newTokens = await refreshBlingTokens(tokens.refresh_token)

      // Atualizar tokens no banco
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
    } catch (err) {
      console.error('Erro ao renovar token Bling:', err)
      throw new Error('Erro ao renovar token do Bling. Reconecte sua conta.')
    }
  }

  return tokens.access_token
}

// POST - Vincular produto ao fornecedor
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: VincularProdutoRequest = await request.json()

    if (!body.produto_id || !body.fornecedor_id) {
      return NextResponse.json(
        { error: 'produto_id e fornecedor_id sao obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // 1. Buscar dados do produto (precisa ter id_produto_bling)
    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('id, id_produto_bling, codigo, nome')
      .eq('id', body.produto_id)
      .eq('empresa_id', empresaId)
      .single()

    if (produtoError || !produto) {
      return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })
    }

    if (!produto.id_produto_bling) {
      return NextResponse.json(
        { error: 'Produto nao possui ID do Bling. Sincronize o produto primeiro.' },
        { status: 400 }
      )
    }

    // 2. Buscar dados do fornecedor (precisa ter id_bling)
    const { data: fornecedor, error: fornecedorError } = await supabase
      .from('fornecedores')
      .select('id, id_bling, nome')
      .eq('id', body.fornecedor_id)
      .eq('empresa_id', empresaId)
      .single()

    if (fornecedorError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    if (!fornecedor.id_bling) {
      return NextResponse.json(
        { error: 'Fornecedor nao possui ID do Bling. Sincronize o fornecedor primeiro.' },
        { status: 400 }
      )
    }

    // 3. Verificar se ja existe vinculo no Supabase
    const { data: existingLink } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id')
      .eq('produto_id', body.produto_id)
      .eq('fornecedor_id', body.fornecedor_id)
      .single()

    if (existingLink) {
      return NextResponse.json(
        { error: 'Este produto ja esta vinculado a este fornecedor' },
        { status: 400 }
      )
    }

    // 4. Obter token do Bling
    let accessToken: string
    try {
      accessToken = await getBlingAccessToken(empresaId, supabase)
    } catch (err) {
      console.warn('Bling nao disponivel:', err)
      return NextResponse.json(
        { error: 'Bling nao conectado. Conecte sua conta primeiro.' },
        { status: 400 }
      )
    }

    // 5. Montar payload do Bling (apenas campos com valor)
    const blingPayload: Record<string, unknown> = {
      produto: {
        id: produto.id_produto_bling
      },
      fornecedor: {
        id: fornecedor.id_bling
      }
    }

    // Campos opcionais
    if (body.descricao) {
      blingPayload.descricao = body.descricao
    }
    if (body.codigo) {
      blingPayload.codigo = body.codigo
    }
    if (body.preco_custo !== undefined && body.preco_custo > 0) {
      blingPayload.precoCusto = body.preco_custo
    }
    if (body.preco_compra !== undefined && body.preco_compra > 0) {
      blingPayload.precoCompra = body.preco_compra
    }

    // 6. Chamar API do Bling para vincular
    const blingResponse = await fetch(`${BLING_CONFIG.apiUrl}/produtos/fornecedores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(blingPayload),
    })

    if (!blingResponse.ok) {
      const errorText = await blingResponse.text()
      console.error('Erro Bling API:', blingResponse.status, errorText)

      // Tenta parsear erro do Bling
      try {
        const errorJson = JSON.parse(errorText)
        const errorMessage = errorJson.error?.description || errorJson.error?.message || 'Erro ao vincular no Bling'
        return NextResponse.json({ error: errorMessage }, { status: 400 })
      } catch {
        return NextResponse.json(
          { error: `Erro ao vincular no Bling: ${blingResponse.status}` },
          { status: 400 }
        )
      }
    }

    // 7. Salvar vinculo no Supabase
    const { error: insertError } = await supabase
      .from('fornecedores_produtos')
      .insert({
        produto_id: body.produto_id,
        fornecedor_id: body.fornecedor_id,
        empresa_id: empresaId,
        valor_de_compra: body.preco_compra || null,
        precocusto: body.preco_custo || null,
      })

    if (insertError) {
      console.error('Erro ao salvar vinculo no Supabase:', insertError)
      // Vinculo foi criado no Bling mas falhou no Supabase
      return NextResponse.json({
        success: true,
        warning: 'Vinculado no Bling, mas houve erro ao salvar localmente. Sincronize os dados.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Produto vinculado ao fornecedor com sucesso',
    })

  } catch (error) {
    console.error('Erro ao vincular produto:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao vincular produto' },
      { status: 500 }
    )
  }
}
