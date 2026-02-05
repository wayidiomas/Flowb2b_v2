import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: fornecedorId } = await params
    const body = await request.json()
    const { telefone } = body

    if (!telefone || telefone.trim() === '') {
      return NextResponse.json({ error: 'Telefone e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar se o fornecedor pertence a empresa
    const { data: fornecedor, error: fornecedorError } = await supabase
      .from('fornecedores')
      .select('id, nome')
      .eq('id', fornecedorId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (fornecedorError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Atualizar o celular do fornecedor (prioridade para WhatsApp)
    const { error: updateError } = await supabase
      .from('fornecedores')
      .update({ celular: telefone.trim() })
      .eq('id', fornecedorId)

    if (updateError) {
      console.error('Erro ao atualizar telefone:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar telefone' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Telefone atualizado com sucesso',
      telefone: telefone.trim(),
    })
  } catch (error) {
    console.error('Erro ao atualizar telefone do fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
