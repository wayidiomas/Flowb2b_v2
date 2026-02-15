import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string; fid: string }>
}

// DELETE - Remove vinculo de fornecedor com representante
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const params = await context.params
    const representanteId = parseInt(params.id)
    const fornecedorId = parseInt(params.fid)

    if (isNaN(representanteId) || isNaN(fornecedorId)) {
      return NextResponse.json({ error: 'IDs invalidos' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar se representante existe e pertence a empresa
    const { data: representante } = await supabase
      .from('representantes')
      .select('id')
      .eq('id', representanteId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (!representante) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Verificar se vinculo existe
    const { data: vinculo } = await supabase
      .from('representante_fornecedores')
      .select('id')
      .eq('representante_id', representanteId)
      .eq('fornecedor_id', fornecedorId)
      .single()

    if (!vinculo) {
      return NextResponse.json({ error: 'Vinculo nao encontrado' }, { status: 404 })
    }

    // Remover vinculo
    const { error } = await supabase
      .from('representante_fornecedores')
      .delete()
      .eq('representante_id', representanteId)
      .eq('fornecedor_id', fornecedorId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Vinculo removido com sucesso',
    })

  } catch (error) {
    console.error('Erro ao remover vinculo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover vinculo' },
      { status: 500 }
    )
  }
}
