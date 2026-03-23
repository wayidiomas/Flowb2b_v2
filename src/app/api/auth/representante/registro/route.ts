import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

// Funcao para gerar codigo de acesso unico (mesmo padrao de /api/representantes)
function gerarCodigoAcesso(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sem I, O, 0, 1 para evitar confusao
  let codigo = 'REP-'
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

async function gerarCodigoAcessoUnico(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string> {
  let codigo = gerarCodigoAcesso()
  let tentativas = 0
  const maxTentativas = 10

  while (tentativas < maxTentativas) {
    const { data: existente } = await supabase
      .from('representantes')
      .select('id')
      .eq('codigo_acesso', codigo)
      .single()

    if (!existente) break

    codigo = gerarCodigoAcesso()
    tentativas++
  }

  return codigo
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, email, telefone, codigo_acesso, password, cnpj } = body

    // === Modo 2: Auto-cadastro via CNPJ ===
    if (!codigo_acesso && cnpj) {
      return handleAutoCadastro({ nome, email, telefone, password, cnpj })
    }

    // === Modo 1: Cadastro via codigo de acesso (fluxo existente) ===
    if (!nome || !email || !codigo_acesso || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, email, codigo de acesso e senha sao obrigatorios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verificar se o codigo de acesso existe e esta disponivel
    const { data: representante, error: repError } = await supabase
      .from('representantes')
      .select('id, empresa_id, nome, user_representante_id')
      .eq('codigo_acesso', codigo_acesso.toUpperCase())
      .single()

    if (repError || !representante) {
      return NextResponse.json(
        { success: false, error: 'Codigo de acesso invalido' },
        { status: 400 }
      )
    }

    // Verificar se ja foi vinculado a outro usuario
    if (representante.user_representante_id) {
      return NextResponse.json(
        { success: false, error: 'Este codigo de acesso ja foi utilizado' },
        { status: 400 }
      )
    }

    // Verificar se email ja esta em uso
    const { data: existingUser } = await supabase
      .from('users_representante')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email ja esta cadastrado' },
        { status: 400 }
      )
    }

    // Hash da senha
    const passwordHash = await hashPassword(password)

    // Criar usuario representante
    const { data: newUser, error: createError } = await supabase
      .from('users_representante')
      .insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        telefone: telefone?.trim() || null,
        password_hash: passwordHash,
        ativo: true,
      })
      .select('id, nome, email, telefone')
      .single()

    if (createError) {
      console.error('Erro ao criar usuario:', createError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta' },
        { status: 500 }
      )
    }

    // Vincular usuario ao representante principal (do codigo_acesso)
    // .is('user_representante_id', null) previne race condition (outro registro simultâneo)
    const { error: updateError, count: updateCount } = await supabase
      .from('representantes')
      .update({
        user_representante_id: newUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', representante.id)
      .is('user_representante_id', null)

    if (updateError || updateCount === 0) {
      console.error('Erro ao vincular representante:', updateError || 'codigo ja utilizado (race condition)')
      // Rollback - deletar usuario criado
      await supabase.from('users_representante').delete().eq('id', newUser.id)
      return NextResponse.json(
        { success: false, error: 'Este codigo de acesso ja foi utilizado' },
        { status: 400 }
      )
    }

    // Log registration activity
    void logActivity({
      userId: String(newUser.id),
      userType: 'representante',
      userEmail: newUser.email,
      userNome: newUser.nome,
      action: 'registro',
      empresaId: representante.empresa_id || null,
    }).catch(console.error)

    // Gerar token JWT com empresaId null
    const token = await generateToken({
      userId: String(newUser.id),
      empresaId: null,
      email: newUser.email,
      role: 'user',
      tipo: 'representante',
      representanteUserId: newUser.id,
    })

    // Definir cookie
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        nome: newUser.nome,
        telefone: newUser.telefone,
        tipo: 'representante',
      },
      message: 'Conta criada com sucesso',
    })
  } catch (error) {
    console.error('Representante registro error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// === Auto-cadastro via CNPJ ===
async function handleAutoCadastro({
  nome,
  email,
  telefone,
  password,
  cnpj,
}: {
  nome: string
  email: string
  telefone?: string
  password: string
  cnpj: string
}) {
  // Validacoes basicas
  if (!nome || !email || !password) {
    return NextResponse.json(
      { success: false, error: 'Nome, email e senha sao obrigatorios' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { success: false, error: 'Senha deve ter pelo menos 6 caracteres' },
      { status: 400 }
    )
  }

  const cnpjLimpo = cnpj.replace(/\D/g, '')

  if (cnpjLimpo.length !== 14) {
    return NextResponse.json(
      { success: false, error: 'CNPJ invalido' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()

  // Buscar fornecedores com este CNPJ (pode ter em varias empresas)
  const { data: fornecedores, error: fornError } = await supabase
    .from('fornecedores')
    .select('id, nome, empresa_id')
    .eq('cnpj', cnpjLimpo)

  if (fornError) {
    console.error('Erro ao buscar fornecedores por CNPJ:', fornError)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar fornecedor' },
      { status: 500 }
    )
  }

  if (!fornecedores || fornecedores.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Nenhum fornecedor encontrado com este CNPJ' },
      { status: 400 }
    )
  }

  // Verificar se email ja esta em uso
  const { data: existingUser } = await supabase
    .from('users_representante')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingUser) {
    return NextResponse.json(
      { success: false, error: 'Este email ja esta cadastrado' },
      { status: 400 }
    )
  }

  // Hash da senha
  const passwordHash = await hashPassword(password)

  // Criar usuario representante
  const { data: newUser, error: createError } = await supabase
    .from('users_representante')
    .insert({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      telefone: telefone?.trim() || null,
      password_hash: passwordHash,
      ativo: true,
    })
    .select('id, nome, email, telefone')
    .single()

  if (createError) {
    console.error('Erro ao criar usuario:', createError)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar conta' },
      { status: 500 }
    )
  }

  // Agrupar fornecedores por empresa_id
  const fornecedoresPorEmpresa = new Map<number, number[]>()
  for (const forn of fornecedores) {
    const lista = fornecedoresPorEmpresa.get(forn.empresa_id) || []
    lista.push(forn.id)
    fornecedoresPorEmpresa.set(forn.empresa_id, lista)
  }

  // Para cada empresa, criar um representante e vincular aos fornecedores
  let totalVinculos = 0
  const representantesCriados: number[] = []

  try {
    for (const [empresaId, fornecedorIds] of fornecedoresPorEmpresa) {
      // Gerar codigo de acesso unico
      const codigoAcesso = await gerarCodigoAcessoUnico(supabase)

      // Criar representante para esta empresa
      const { data: rep, error: repError } = await supabase
        .from('representantes')
        .insert({
          user_representante_id: newUser.id,
          empresa_id: empresaId,
          codigo_acesso: codigoAcesso,
          nome: nome.trim(),
          ativo: true,
        })
        .select('id')
        .single()

      if (repError || !rep) {
        console.error('Erro ao criar representante para empresa', empresaId, repError)
        continue
      }

      representantesCriados.push(rep.id)

      // Vincular fornecedores a este representante
      const vinculos = fornecedorIds.map(fornecedorId => ({
        representante_id: rep.id,
        fornecedor_id: fornecedorId,
      }))

      const { error: vincError } = await supabase
        .from('representante_fornecedores')
        .insert(vinculos)

      if (vincError) {
        console.error('Erro ao vincular fornecedores:', vincError)
        continue
      }

      totalVinculos += fornecedorIds.length
    }
  } catch (err) {
    console.error('Erro durante criacao de vinculos:', err)
    // Rollback parcial - remover representantes criados e usuario
    for (const repId of representantesCriados) {
      await supabase.from('representante_fornecedores').delete().eq('representante_id', repId)
      await supabase.from('representantes').delete().eq('id', repId)
    }
    await supabase.from('users_representante').delete().eq('id', newUser.id)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar vinculos' },
      { status: 500 }
    )
  }

  if (totalVinculos === 0) {
    // Nenhum vinculo criado com sucesso - rollback
    for (const repId of representantesCriados) {
      await supabase.from('representantes').delete().eq('id', repId)
    }
    await supabase.from('users_representante').delete().eq('id', newUser.id)
    return NextResponse.json(
      { success: false, error: 'Erro ao vincular fornecedores. Tente novamente.' },
      { status: 500 }
    )
  }

  // Log registration activity
  void logActivity({
    userId: String(newUser.id),
    userType: 'representante',
    userEmail: newUser.email,
    userNome: newUser.nome,
    action: 'registro',
    metadata: { modo: 'auto_cnpj', cnpj: cnpjLimpo, fornecedores_vinculados: totalVinculos },
  }).catch(console.error)

  // Gerar token JWT com empresaId null (representante acessa varias empresas)
  const token = await generateToken({
    userId: String(newUser.id),
    empresaId: null,
    email: newUser.email,
    role: 'user',
    tipo: 'representante',
    representanteUserId: newUser.id,
  })

  // Definir cookie
  await setAuthCookie(token)

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      nome: newUser.nome,
      telefone: newUser.telefone,
      tipo: 'representante',
    },
    message: `Conta criada com sucesso. ${totalVinculos} fornecedor(es) vinculado(s).`,
  })
}
