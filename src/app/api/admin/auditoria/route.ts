import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/auditoria
 *
 * Lista paginada de eventos do audit_log com filtros opcionais.
 * Query params:
 *  - severity: 'info' | 'warn' | 'error' | 'critical'
 *  - evento: substring do evento
 *  - empresa_id
 *  - resolvido: 'true' | 'false'
 *  - page, per_page
 */
export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const severity = searchParams.get('severity')
    const evento = searchParams.get('evento')
    const empresaId = searchParams.get('empresa_id')
    const resolvido = searchParams.get('resolvido')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = Math.min(100, parseInt(searchParams.get('per_page') || '20', 10))
    const offset = (page - 1) * perPage

    let query = supabase
      .from('audit_log')
      .select(`
        id, severity, evento, empresa_id, user_id, contexto,
        resolvido, resolvido_em, resolvido_por, resolvido_nota, created_at,
        empresa:empresas(id, nome_fantasia, razao_social)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (severity) query = query.eq('severity', severity)
    if (evento) query = query.ilike('evento', `%${evento}%`)
    if (empresaId) query = query.eq('empresa_id', Number(empresaId))
    if (resolvido === 'true') query = query.eq('resolvido', true)
    else if (resolvido === 'false') query = query.eq('resolvido', false)

    const { data, count, error } = await query
    if (error) {
      console.error('Erro audit_log:', error)
      return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 })
    }

    return NextResponse.json({
      page,
      per_page: perPage,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / perPage),
      eventos: data || []
    })
  } catch (err) {
    console.error('Erro em /api/admin/auditoria:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
