import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

const TABLE_MAP: Record<string, string> = {
  lojistas: 'users',
  fornecedores: 'users_fornecedor',
  representantes: 'users_representante',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const { tipo, id } = await params
    const table = TABLE_MAP[tipo]

    if (!table) {
      return NextResponse.json(
        { error: 'Tipo de usuario invalido. Use: lojistas, fornecedores ou representantes.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email && !password) {
      return NextResponse.json(
        { error: 'Informe pelo menos email ou senha para atualizar.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verificar se usuario existe
    const { data: user, error: fetchError } = await supabase
      .from(table)
      .select('id, email')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado.' },
        { status: 404 }
      )
    }

    // Montar update
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    }

    if (email) {
      // Validar formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Email invalido.' },
          { status: 400 }
        )
      }

      // Verificar se email ja esta em uso por outro usuario
      if (email.toLowerCase() !== user.email) {
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('email', email.toLowerCase())
          .neq('id', id)
          .single()

        if (existing) {
          return NextResponse.json(
            { error: 'Este email ja esta em uso por outro usuario.' },
            { status: 409 }
          )
        }
      }

      updateData.email = email.toLowerCase()
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'A senha deve ter no minimo 6 caracteres.' },
          { status: 400 }
        )
      }
      updateData.password_hash = await hashPassword(password)
    }

    const { error: updateError } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar usuario.' },
        { status: 500 }
      )
    }

    const changes: string[] = []
    if (email) changes.push('email')
    if (password) changes.push('senha')

    return NextResponse.json({
      success: true,
      message: `${changes.join(' e ')} atualizado(s) com sucesso.`,
    })
  } catch (error) {
    console.error('Unexpected error in editar:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
