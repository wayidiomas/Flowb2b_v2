import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/admin/auditoria/bling-jobs/[id]/reprocessar
 *
 * Reseta um job da bling_sync_queue: status='pendente', tentativas=0,
 * proximo_em=NOW(), limpa último erro. O worker pega no próximo tick.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'id invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('bling_sync_queue')
      .update({
        status: 'pendente',
        tentativas: 0,
        proximo_em: new Date().toISOString(),
        ultimo_erro: null,
        ultimo_erro_codigo: null,
        locked_by: null,
        locked_em: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Erro ao reprocessar:', error)
      return NextResponse.json({ error: 'Erro ao reprocessar' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, job: data })
  } catch (err) {
    console.error('Erro em /reprocessar:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
