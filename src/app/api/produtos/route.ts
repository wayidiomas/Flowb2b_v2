import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'

// Interface para o corpo da requisicao
interface ProdutoRequest {
  id?: number // Para update
  nome: string
  codigo?: string
  formato?: string
  situacao?: string
  tipo?: string
  preco?: number
  unidade?: string
  condicao?: string
  marca?: string
  producao?: string
  data_validade?: string
  peso_liquido?: number
  peso_bruto?: number
  volumes?: number
  itens_por_caixa?: number
  unidade_medida?: string
  gtin?: string
  gtin_embalagem?: string
}

// Interface para resposta do Bling
interface BlingProdutoResponse {
  data: {
    id: number
  }
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

// Funcao para montar o body do Bling (apenas campos com valor)
function buildBlingPayload(data: ProdutoRequest) {
  const payload: Record<string, unknown> = {}

  // Campos obrigatorios
  if (data.nome) payload.nome = data.nome

  // Campos opcionais - so adiciona se tiver valor
  if (data.codigo) payload.codigo = data.codigo
  if (data.preco !== undefined && data.preco > 0) payload.preco = data.preco
  if (data.tipo) payload.tipo = data.tipo // P = Produto, S = Servico
  if (data.situacao) payload.situacao = data.situacao // A = Ativo, I = Inativo
  if (data.formato) payload.formato = data.formato // S = Simples, V = Variacao, E = Composicao
  if (data.unidade) payload.unidade = data.unidade
  if (data.condicao && data.condicao !== '0') payload.condicao = Number(data.condicao)

  // GTIN/EAN
  if (data.gtin && data.gtin !== 'SEM GTIN') payload.gtin = data.gtin
  if (data.gtin_embalagem && data.gtin_embalagem !== 'SEM GTIN') payload.gtinEmbalagem = data.gtin_embalagem

  // Caracteristicas fisicas
  if (data.marca) payload.marca = data.marca
  if (data.peso_liquido && data.peso_liquido > 0) payload.pesoLiquido = data.peso_liquido
  if (data.peso_bruto && data.peso_bruto > 0) payload.pesoBruto = data.peso_bruto
  if (data.volumes && data.volumes > 0) payload.volumes = data.volumes
  if (data.itens_por_caixa && data.itens_por_caixa > 0) payload.itensPorCaixa = data.itens_por_caixa

  return payload
}

// POST - Criar novo produto
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: ProdutoRequest = await request.json()

    if (!body.nome) {
      return NextResponse.json({ error: 'Nome do produto e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // 1. Obter token do Bling
    let accessToken: string
    try {
      accessToken = await getBlingAccessToken(empresaId, supabase)
    } catch (err) {
      // Se nao conseguir token do Bling, salva apenas no Supabase
      console.warn('Bling nao disponivel, salvando apenas no Supabase:', err)

      const insertData = buildSupabaseData(body, empresaId, null)
      const { data, error } = await supabase
        .from('produtos')
        .insert(insertData)
        .select('id')
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        id: data.id,
        id_produto_bling: null,
        message: 'Produto criado apenas localmente (Bling nao conectado)',
      })
    }

    // 2. Criar produto no Bling
    const blingPayload = buildBlingPayload(body)

    const blingResponse = await fetch(`${BLING_CONFIG.apiUrl}/produtos`, {
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

      // Se falhar no Bling, salva apenas no Supabase
      const insertData = buildSupabaseData(body, empresaId, null)
      const { data, error } = await supabase
        .from('produtos')
        .insert(insertData)
        .select('id')
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        id: data.id,
        id_produto_bling: null,
        warning: `Erro ao criar no Bling: ${errorText}. Salvo apenas localmente.`,
      })
    }

    const blingData: BlingProdutoResponse = await blingResponse.json()
    const idBling = blingData.data.id

    // 3. Salvar no Supabase com id_produto_bling
    const insertData = buildSupabaseData(body, empresaId, idBling)
    const { data, error } = await supabase
      .from('produtos')
      .insert(insertData)
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      id: data.id,
      id_produto_bling: idBling,
      message: 'Produto criado com sucesso no Bling e Supabase',
    })

  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar produto' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar produto existente (apenas Supabase - Bling nao atualiza)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: ProdutoRequest = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'ID do produto e obrigatorio' }, { status: 400 })
    }

    if (!body.nome) {
      return NextResponse.json({ error: 'Nome do produto e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Verificar se produto existe
    const { data: existing, error: fetchError } = await supabase
      .from('produtos')
      .select('id, id_produto_bling')
      .eq('id', body.id)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })
    }

    // Atualizar apenas no Supabase
    const updateData = buildSupabaseData(body, empresaId, existing.id_produto_bling, true)
    const { error } = await supabase
      .from('produtos')
      .update(updateData)
      .eq('id', body.id)
      .eq('empresa_id', empresaId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      id: body.id,
      id_produto_bling: existing.id_produto_bling,
      message: 'Produto atualizado com sucesso',
    })

  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar produto' },
      { status: 500 }
    )
  }
}

// Funcao para montar dados do Supabase (apenas campos com valor)
function buildSupabaseData(
  data: ProdutoRequest,
  empresaId: number,
  idBling: number | null,
  isUpdate = false
) {
  const result: Record<string, unknown> = {}

  // Campos obrigatorios
  if (!isUpdate) {
    result.empresa_id = empresaId
  }

  if (data.nome !== undefined) result.nome = data.nome

  // So adiciona campos se tiverem valor definido (nao undefined)
  if (data.codigo !== undefined && data.codigo !== '') {
    result.codigo = data.codigo
  }
  if (data.formato !== undefined && data.formato !== '') {
    result.formato = data.formato
  }
  if (data.situacao !== undefined && data.situacao !== '') {
    result.situacao = data.situacao
  }
  if (data.tipo !== undefined && data.tipo !== '') {
    result.tipo = data.tipo
  }
  if (data.preco !== undefined) {
    result.preco = data.preco
  }
  if (data.unidade !== undefined && data.unidade !== '') {
    result.unidade = data.unidade
  }
  if (data.condicao !== undefined && data.condicao !== '') {
    result.condicao = data.condicao
  }
  if (data.marca !== undefined && data.marca !== '') {
    result.marca = data.marca
  }
  if (data.producao !== undefined && data.producao !== '') {
    result.producao = data.producao
  }
  if (data.data_validade !== undefined && data.data_validade !== '') {
    result.data_validade = data.data_validade
  }
  if (data.peso_liquido !== undefined) {
    result.peso_liquido = data.peso_liquido
  }
  if (data.peso_bruto !== undefined) {
    result.peso_bruto = data.peso_bruto
  }
  if (data.volumes !== undefined) {
    result.volumes = data.volumes
  }
  if (data.itens_por_caixa !== undefined) {
    result.itens_por_caixa = data.itens_por_caixa
  }
  if (data.unidade_medida !== undefined && data.unidade_medida !== '') {
    result.unidade_medida = data.unidade_medida
  }
  if (data.gtin !== undefined && data.gtin !== '') {
    result.gtin = data.gtin
  }
  if (data.gtin_embalagem !== undefined && data.gtin_embalagem !== '') {
    result.gtin_embalagem = data.gtin_embalagem
  }

  // id_produto_bling so na criacao
  if (!isUpdate && idBling !== null) {
    result.id_produto_bling = String(idBling)
  }

  return result
}
