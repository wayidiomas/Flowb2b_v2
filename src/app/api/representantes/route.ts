import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'
import type { CriarRepresentanteRequest } from '@/types/representante'

// Funcao para gerar codigo de acesso unico
function gerarCodigoAcesso(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sem I, O, 0, 1 para evitar confusao
  let codigo = 'REP-'
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

// GET - Listar representantes da empresa
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes com contagem de fornecedores
    const { data: representantes, error } = await supabase
      .from('representantes')
      .select(`
        id,
        user_representante_id,
        empresa_id,
        codigo_acesso,
        nome,
        telefone,
        ativo,
        created_at,
        updated_at
      `)
      .eq('empresa_id', user.empresaId)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar representantes:', error)
      throw error
    }

    // Buscar contagem de fornecedores para cada representante
    const representantesIds = representantes?.map(r => r.id) || []

    let fornecedoresCount: Record<number, number> = {}
    if (representantesIds.length > 0) {
      const { data: countData } = await supabase
        .from('representante_fornecedores')
        .select('representante_id')
        .in('representante_id', representantesIds)

      if (countData) {
        fornecedoresCount = countData.reduce((acc, item) => {
          acc[item.representante_id] = (acc[item.representante_id] || 0) + 1
          return acc
        }, {} as Record<number, number>)
      }
    }

    // Buscar emails dos usuarios representantes cadastrados
    const userIds = representantes?.filter(r => r.user_representante_id).map(r => r.user_representante_id) || []
    let usersMap: Record<number, string> = {}

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users_representante')
        .select('id, email')
        .in('id', userIds)

      if (usersData) {
        usersMap = usersData.reduce((acc, item) => {
          acc[item.id] = item.email
          return acc
        }, {} as Record<number, string>)
      }
    }

    // Montar resposta com detalhes
    const resultado = representantes?.map(rep => ({
      ...rep,
      cadastrado: !!rep.user_representante_id,
      email: rep.user_representante_id ? usersMap[rep.user_representante_id] : undefined,
      fornecedores_count: fornecedoresCount[rep.id] || 0,
    })) || []

    return NextResponse.json({
      success: true,
      representantes: resultado,
    })

  } catch (error) {
    console.error('Erro ao listar representantes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar representantes' },
      { status: 500 }
    )
  }
}

// POST - Criar novo representante
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: CriarRepresentanteRequest = await request.json()

    if (!body.nome || typeof body.nome !== 'string' || body.nome.trim().length < 2) {
      return NextResponse.json({ error: 'Nome do representante deve ter pelo menos 2 caracteres' }, { status: 400 })
    }

    if (!Array.isArray(body.fornecedor_ids) || body.fornecedor_ids.length === 0 || !body.fornecedor_ids.every((id: unknown) => typeof id === 'number')) {
      return NextResponse.json({ error: 'Selecione pelo menos um fornecedor' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Verificar duplicidade por telefone na mesma empresa
    if (body.telefone) {
      const telefoneNormalizado = normalizePhone(body.telefone)
      const { data: existentes } = await supabase
        .from('representantes')
        .select('id, nome, telefone')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)

      const duplicado = existentes?.find(r => normalizePhone(r.telefone) === telefoneNormalizado)
      if (duplicado) {
        return NextResponse.json(
          { error: `Ja existe um representante com esse telefone: ${duplicado.nome}` },
          { status: 409 }
        )
      }
    }

    // Verificar se os fornecedores existem e pertencem a empresa
    const { data: fornecedores, error: fornError } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('empresa_id', empresaId)
      .in('id', body.fornecedor_ids)

    if (fornError) throw fornError

    if (!fornecedores || fornecedores.length !== body.fornecedor_ids.length) {
      return NextResponse.json(
        { error: 'Um ou mais fornecedores nao encontrados' },
        { status: 400 }
      )
    }

    // Gerar codigo de acesso unico
    let codigoAcesso = gerarCodigoAcesso()
    let tentativas = 0
    const maxTentativas = 10

    while (tentativas < maxTentativas) {
      const { data: existente } = await supabase
        .from('representantes')
        .select('id')
        .eq('codigo_acesso', codigoAcesso)
        .single()

      if (!existente) break

      codigoAcesso = gerarCodigoAcesso()
      tentativas++
    }

    if (tentativas >= maxTentativas) {
      return NextResponse.json(
        { error: 'Erro ao gerar codigo de acesso. Tente novamente.' },
        { status: 500 }
      )
    }

    // Criar representante
    const { data: representante, error: repError } = await supabase
      .from('representantes')
      .insert({
        empresa_id: empresaId,
        codigo_acesso: codigoAcesso,
        nome: body.nome.trim(),
        telefone: body.telefone || null,
        ativo: true,
      })
      .select('id')
      .single()

    if (repError) {
      console.error('Erro ao criar representante:', repError)
      throw repError
    }

    // Vincular fornecedores
    const vinculos = body.fornecedor_ids.map(fornecedorId => ({
      representante_id: representante.id,
      fornecedor_id: fornecedorId,
    }))

    const { error: vincError } = await supabase
      .from('representante_fornecedores')
      .insert(vinculos)

    if (vincError) {
      console.error('Erro ao vincular fornecedores:', vincError)
      // Rollback - deletar representante criado
      await supabase.from('representantes').delete().eq('id', representante.id)
      throw vincError
    }

    return NextResponse.json({
      success: true,
      representante_id: representante.id,
      codigo_acesso: codigoAcesso,
      message: 'Representante criado com sucesso',
    })

  } catch (error) {
    console.error('Erro ao criar representante:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar representante' },
      { status: 500 }
    )
  }
}
