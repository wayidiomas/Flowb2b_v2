import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

const TABLE_MAP: Record<string, string> = {
  lojistas: 'users',
  fornecedores: 'users_fornecedor',
  representantes: 'users_representante',
}

export async function POST(
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

    const supabase = createServerSupabaseClient()

    // First, get current ativo status
    const { data: current, error: fetchError } = await supabase
      .from(table)
      .select('id, ativo, nome, email')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado.' },
        { status: 404 }
      )
    }

    // Toggle the status
    const newAtivo = !current.ativo

    const { error: updateError } = await supabase
      .from(table)
      .update({ ativo: newAtivo, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('Error toggling ativo:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar status do usuario.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: current.id,
        nome: current.nome,
        email: current.email,
        ativo: newAtivo,
      },
      message: newAtivo ? 'Usuario ativado com sucesso.' : 'Usuario desativado com sucesso.',
    })
  } catch (error) {
    console.error('Unexpected error in toggle-ativo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
