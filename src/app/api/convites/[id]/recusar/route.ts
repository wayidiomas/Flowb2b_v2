import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'lojista') {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conviteId = parseInt(id, 10)

    if (isNaN(conviteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Get convite by id, verify status = 'pendente'
    const { data: convite, error: conviteError } = await supabase
      .from('convites_fornecedor')
      .select('*')
      .eq('id', conviteId)
      .single()

    if (conviteError || !convite) {
      return NextResponse.json({ error: 'Convite nao encontrado' }, { status: 404 })
    }

    if (convite.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Este convite ja foi respondido' },
        { status: 400 }
      )
    }

    // Update: set status = 'recusado', responded_at
    const { error: updateError } = await supabase
      .from('convites_fornecedor')
      .update({
        status: 'recusado',
        responded_at: new Date().toISOString(),
      })
      .eq('id', conviteId)

    if (updateError) {
      console.error('[Recusar Convite] Erro ao atualizar convite:', updateError)
      return NextResponse.json({ error: 'Erro ao recusar convite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao recusar convite:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
