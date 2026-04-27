import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/admin/auditoria/[id]/resolver
 *
 * Marca um evento de audit_log como resolvido.
 * Body: { nota?: string }
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

    const body = await request.json().catch(() => ({}))
    const nota = typeof body.nota === 'string' ? body.nota.slice(0, 500) : null

    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('audit_log')
      .update({
        resolvido: true,
        resolvido_em: new Date().toISOString(),
        resolvido_nota: nota
      })
      .eq('id', id)

    if (error) {
      console.error('Erro ao resolver audit_log:', error)
      return NextResponse.json({ error: 'Erro ao resolver' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('Erro em /resolver:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
