import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'lojista' || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'estoque')
    if (!permCheck.allowed) return permCheck.response

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar conferência filtrando por empresa_id e status enviada
    const { data: conferencia, error: confError } = await supabase
      .from('conferencias_estoque')
      .select('id, status')
      .eq('id', conferenciaId)
      .eq('empresa_id', user.empresaId)
      .eq('status', 'enviada')
      .single()

    if (confError || !conferencia) {
      return NextResponse.json({ error: 'Sugestao nao encontrada ou ja processada' }, { status: 404 })
    }

    // Ler observação do body
    let observacao = null
    try {
      const body = await request.json()
      observacao = body.observacao || null
    } catch {
      // Body vazio é ok
    }

    // Marcar todos os itens como rejeitados
    await supabase
      .from('itens_conferencia_estoque')
      .update({ aceito: false })
      .eq('conferencia_id', conferenciaId)

    // Atualizar conferência para rejeitada
    await supabase
      .from('conferencias_estoque')
      .update({
        status: 'rejeitada',
        data_resposta: new Date().toISOString(),
        observacao_lojista: observacao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conferenciaId)

    return NextResponse.json({ success: true, status: 'rejeitada' })
  } catch (error) {
    console.error('Erro ao rejeitar sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
