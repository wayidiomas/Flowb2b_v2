import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/auditoria/contagem
 *
 * Counts pra badge do menu admin:
 *  - audit_log: severity in (error, critical) AND resolvido=false
 *  - bling_sync_queue: status='erro_terminal'
 */
export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()

    const [auditCount, blingCount] = await Promise.all([
      supabase
        .from('audit_log')
        .select('id', { count: 'exact', head: true })
        .in('severity', ['error', 'critical'])
        .eq('resolvido', false),
      supabase
        .from('bling_sync_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'erro_terminal')
    ])

    const audit = auditCount.count || 0
    const bling = blingCount.count || 0

    return NextResponse.json({
      audit_nao_resolvidos: audit,
      bling_erros_terminais: bling,
      total: audit + bling
    })
  } catch (err) {
    console.error('Erro em /api/admin/auditoria/contagem:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
