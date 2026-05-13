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
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()

    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    if (!representantes || representantes.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const representanteIds = representantes.map(r => r.id)

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id')
      .eq('id', id)
      .in('representante_id', representanteIds)
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
    console.error('Erro ao validar espelho (representante):', error)
    return NextResponse.json({ error: 'Erro interno ao validar espelho' }, { status: 500 })
  }
}
