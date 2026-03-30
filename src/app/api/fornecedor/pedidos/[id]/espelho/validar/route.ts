import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { validarEspelho } from '@/lib/espelho-validacao'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Validate fornecedor has access to this pedido
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id')
      .eq('id', id)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Delegate to shared lib
    const result = await validarEspelho(pedido.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, detalhes: result.detalhes },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao validar espelho (fornecedor):', error)
    return NextResponse.json({ error: 'Erro interno ao validar espelho' }, { status: 500 })
  }
}
