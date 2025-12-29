import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BLING_CONFIG, refreshBlingTokens } from '@/lib/bling'

// Interface para o corpo da requisicao
interface FornecedorRequest {
  id?: number // Para update
  nome: string
  nome_fantasia?: string
  codigo?: string
  tipo_pessoa: 'J' | 'F'
  cnpj?: string
  cpf?: string
  rg?: string
  inscricao_estadual?: string
  ie_isento?: boolean
  contribuinte?: string
  codigo_regime_tributario?: string
  orgao_emissor?: string
  relacao_venda?: string[]
  cliente_desde?: string
  telefone?: string
  celular?: string
  email?: string
  endereco?: {
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
    pais?: string
  }
}

// Interface para resposta do Bling
interface BlingContatoResponse {
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
function buildBlingPayload(data: FornecedorRequest) {
  const payload: Record<string, unknown> = {}

  // Campos obrigatorios
  if (data.nome) payload.nome = data.nome

  // Campos opcionais - so adiciona se tiver valor
  if (data.codigo) payload.codigo = data.codigo
  if (data.nome_fantasia) payload.fantasia = data.nome_fantasia
  if (data.tipo_pessoa) payload.tipo = data.tipo_pessoa

  // Numero do documento (CNPJ ou CPF)
  if (data.tipo_pessoa === 'J' && data.cnpj) {
    payload.numeroDocumento = data.cnpj.replace(/\D/g, '')
  } else if (data.tipo_pessoa === 'F' && data.cpf) {
    payload.numeroDocumento = data.cpf.replace(/\D/g, '')
  }

  // Inscricao Estadual e indicador
  if (data.inscricao_estadual) {
    payload.ie = data.inscricao_estadual
  }
  if (data.contribuinte) {
    payload.indicadorIe = data.contribuinte
  }

  // Contato
  if (data.telefone) payload.telefone = data.telefone
  if (data.celular) payload.celular = data.celular
  if (data.email) payload.email = data.email

  // Documentos pessoais
  if (data.rg) payload.rg = data.rg
  if (data.orgao_emissor) payload.orgaoEmissor = data.orgao_emissor

  // Endereco - so adiciona se tiver algum campo preenchido
  if (data.endereco) {
    const enderecoGeral: Record<string, string> = {}

    if (data.endereco.logradouro) enderecoGeral.endereco = data.endereco.logradouro
    if (data.endereco.cep) enderecoGeral.cep = data.endereco.cep.replace(/\D/g, '')
    if (data.endereco.bairro) enderecoGeral.bairro = data.endereco.bairro
    if (data.endereco.cidade) enderecoGeral.municipio = data.endereco.cidade
    if (data.endereco.uf) enderecoGeral.uf = data.endereco.uf
    if (data.endereco.numero) enderecoGeral.numero = data.endereco.numero
    if (data.endereco.complemento) enderecoGeral.complemento = data.endereco.complemento

    if (Object.keys(enderecoGeral).length > 0) {
      payload.endereco = { geral: enderecoGeral }
    }
  }

  // Tipo de contato - Fornecedor
  payload.tiposContato = [{ descricao: 'Fornecedor' }]

  return payload
}

// POST - Criar novo fornecedor
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: FornecedorRequest = await request.json()

    if (!body.nome) {
      return NextResponse.json({ error: 'Nome do fornecedor e obrigatorio' }, { status: 400 })
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
        .from('fornecedores')
        .insert(insertData)
        .select('id')
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        id: data.id,
        id_bling: null,
        message: 'Fornecedor criado apenas localmente (Bling nao conectado)',
      })
    }

    // 2. Criar contato no Bling
    const blingPayload = buildBlingPayload(body)

    const blingResponse = await fetch(`${BLING_CONFIG.apiUrl}/contatos`, {
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
        .from('fornecedores')
        .insert(insertData)
        .select('id')
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        id: data.id,
        id_bling: null,
        warning: `Erro ao criar no Bling: ${errorText}. Salvo apenas localmente.`,
      })
    }

    const blingData: BlingContatoResponse = await blingResponse.json()
    const idBling = blingData.data.id

    // 3. Salvar no Supabase com id_bling
    const insertData = buildSupabaseData(body, empresaId, idBling)
    const { data, error } = await supabase
      .from('fornecedores')
      .insert(insertData)
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      id: data.id,
      id_bling: idBling,
      message: 'Fornecedor criado com sucesso no Bling e Supabase',
    })

  } catch (error) {
    console.error('Erro ao criar fornecedor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar fornecedor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar fornecedor existente
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: FornecedorRequest = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'ID do fornecedor e obrigatorio' }, { status: 400 })
    }

    if (!body.nome) {
      return NextResponse.json({ error: 'Nome do fornecedor e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Buscar fornecedor atual para pegar id_bling
    const { data: existing, error: fetchError } = await supabase
      .from('fornecedores')
      .select('id_bling')
      .eq('id', body.id)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const idBling = existing.id_bling

    // 1. Tentar atualizar no Bling se tiver id_bling
    if (idBling) {
      try {
        const accessToken = await getBlingAccessToken(empresaId, supabase)
        const blingPayload = buildBlingPayload(body)

        const blingResponse = await fetch(`${BLING_CONFIG.apiUrl}/contatos/${idBling}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(blingPayload),
        })

        if (!blingResponse.ok) {
          const errorText = await blingResponse.text()
          console.warn('Erro ao atualizar no Bling:', blingResponse.status, errorText)
        }
      } catch (err) {
        console.warn('Nao foi possivel atualizar no Bling:', err)
      }
    }

    // 2. Atualizar no Supabase
    const updateData = buildSupabaseData(body, empresaId, idBling, true)
    const { error } = await supabase
      .from('fornecedores')
      .update(updateData)
      .eq('id', body.id)
      .eq('empresa_id', empresaId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      id: body.id,
      id_bling: idBling,
      message: 'Fornecedor atualizado com sucesso',
    })

  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar fornecedor' },
      { status: 500 }
    )
  }
}

// Funcao para montar dados do Supabase (apenas campos com valor)
function buildSupabaseData(
  data: FornecedorRequest,
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
  if (data.nome_fantasia !== undefined && data.nome_fantasia !== '') {
    result.nome_fantasia = data.nome_fantasia
  }
  if (data.codigo !== undefined && data.codigo !== '') {
    result.codigo = data.codigo
  }
  if (data.tipo_pessoa !== undefined) {
    result.tipo_pessoa = data.tipo_pessoa
  }
  if (data.cnpj !== undefined && data.cnpj !== '') {
    result.cnpj = data.cnpj
    result.numerodocumento = data.cnpj.replace(/\D/g, '')
  }
  if (data.cpf !== undefined && data.cpf !== '') {
    result.cpf = data.cpf
    result.numerodocumento = data.cpf.replace(/\D/g, '')
  }
  if (data.rg !== undefined && data.rg !== '') {
    result.rg = data.rg
  }
  if (data.inscricao_estadual !== undefined && data.inscricao_estadual !== '') {
    result.inscricao_estadual = data.inscricao_estadual
  }
  if (data.ie_isento !== undefined) {
    result.ie_isento = data.ie_isento
  }
  if (data.contribuinte !== undefined && data.contribuinte !== '') {
    result.contribuinte = data.contribuinte
  }
  if (data.codigo_regime_tributario !== undefined && data.codigo_regime_tributario !== '') {
    result.cd_regime_tributario = data.codigo_regime_tributario
  }
  if (data.orgao_emissor !== undefined && data.orgao_emissor !== '') {
    result.orgao_emissor = data.orgao_emissor
  }
  if (data.relacao_venda !== undefined && data.relacao_venda.length > 0) {
    result.relacao_venda_fornecedores = data.relacao_venda
  }
  if (data.cliente_desde !== undefined && data.cliente_desde !== '') {
    result.cliente_desde = data.cliente_desde
  }
  if (data.telefone !== undefined && data.telefone !== '') {
    result.telefone = data.telefone
  }
  if (data.celular !== undefined && data.celular !== '') {
    result.celular = data.celular
  }
  if (data.email !== undefined && data.email !== '') {
    result.email = data.email
  }
  if (data.endereco !== undefined) {
    result.endereco = JSON.stringify(data.endereco)
  }

  // id_bling so na criacao
  if (!isUpdate && idBling !== null) {
    result.id_bling = idBling
  }

  return result
}
