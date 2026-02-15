import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const fornecedorId = parseInt(id, 10)

    if (isNaN(fornecedorId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: fornecedor, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('id', fornecedorId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(fornecedor)
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar fornecedor' },
      { status: 500 }
    )
  }
}
