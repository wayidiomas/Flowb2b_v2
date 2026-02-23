import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, email, telefone, codigo_acesso, password } = body

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
    const { error: updateError } = await supabase
      .from('representantes')
      .update({
        user_representante_id: newUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', representante.id)

    if (updateError) {
      console.error('Erro ao vincular representante:', updateError)
      // Rollback - deletar usuario criado
      await supabase.from('users_representante').delete().eq('id', newUser.id)
      return NextResponse.json(
        { success: false, error: 'Erro ao vincular conta' },
        { status: 500 }
      )
    }

    // Auto-vincular TODOS os outros representantes orfaos com mesmo telefone
    let autoLinkedCount = 0
    try {
      const phoneNorm = normalizePhone(newUser.telefone)
      if (phoneNorm) {
        const { data: orfaos } = await supabase
          .from('representantes')
          .select('id, telefone')
          .is('user_representante_id', null)
          .eq('ativo', true)
          .neq('id', representante.id)

        if (orfaos && orfaos.length > 0) {
          const matchIds = orfaos
            .filter(r => {
              const rPhone = normalizePhone(r.telefone)
              return rPhone === phoneNorm
            })
            .map(r => r.id)

          if (matchIds.length > 0) {
            await supabase
              .from('representantes')
              .update({
                user_representante_id: newUser.id,
                updated_at: new Date().toISOString(),
              })
              .in('id', matchIds)

            autoLinkedCount = matchIds.length
          }
        }
      }
    } catch (autoLinkError) {
      // Auto-link e best-effort, nao deve bloquear o registro
      console.error('Erro ao auto-vincular representantes:', autoLinkError)
    }

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
      auto_linked: autoLinkedCount,
      message: autoLinkedCount > 0
        ? `Conta criada com sucesso. ${autoLinkedCount} vinculo(s) adicional(is) encontrado(s) automaticamente.`
        : 'Conta criada com sucesso',
    })
  } catch (error) {
    console.error('Representante registro error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
