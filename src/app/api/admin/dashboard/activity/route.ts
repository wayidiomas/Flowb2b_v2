import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      recentLoginsResult,
      recentActionsResult,
      recentTimelineResult,
      activeUsers24hResult,
      activeUsers7dResult,
      activeUsers30dResult,
      lastLoginsPerUserResult,
      newUsersResult,
      newFornecedoresResult,
      newRepresentantesResult,
    ] = await Promise.all([
      // 1. Recent logins (last 20)
      supabase
        .from('user_activity_log')
        .select('user_nome, user_email, user_type, created_at, metadata')
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(20),

      // 2. Recent non-login actions (last 30)
      supabase
        .from('user_activity_log')
        .select('user_nome, user_email, user_type, action, metadata, created_at')
        .neq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(30),

      // 3. Recent pedido_timeline events (last 20)
      supabase
        .from('pedido_timeline')
        .select('id, evento, descricao, autor_tipo, autor_nome, created_at, pedido_compra_id, pedidos_compra(numero, empresa_id, empresas:empresa_id(nome_fantasia))')
        .order('created_at', { ascending: false })
        .limit(20),

      // 4a. Active users last 24h
      supabase
        .from('user_activity_log')
        .select('user_id, user_type')
        .eq('action', 'login')
        .gte('created_at', last24h)
        .limit(10000),

      // 4b. Active users last 7d
      supabase
        .from('user_activity_log')
        .select('user_id, user_type')
        .eq('action', 'login')
        .gte('created_at', last7d)
        .limit(10000),

      // 4c. Active users last 30d
      supabase
        .from('user_activity_log')
        .select('user_id, user_type')
        .eq('action', 'login')
        .gte('created_at', last30d)
        .limit(10000),

      // 5. Last login per user (get all logins, dedupe client-side)
      supabase
        .from('user_activity_log')
        .select('user_id, user_nome, user_email, user_type, created_at, metadata')
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(500),

      // 6a. New lojistas (users) in last 30 days
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last30d),

      // 6b. New fornecedores in last 30 days
      supabase
        .from('users_fornecedor')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last30d),

      // 6c. New representantes in last 30 days
      supabase
        .from('users_representante')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last30d),
    ])

    // Process recent_timeline: flatten joined data
    const recentTimeline = (recentTimelineResult.data || []).map((item) => {
      const pedido = item.pedidos_compra as unknown as Record<string, unknown> | null
      const empresa = pedido?.empresas as unknown as Record<string, unknown> | null
      return {
        id: item.id,
        evento: item.evento,
        descricao: item.descricao,
        autor_tipo: item.autor_tipo,
        autor_nome: item.autor_nome,
        created_at: item.created_at,
        pedido_numero: pedido?.numero ?? null,
        empresa_nome: empresa?.nome_fantasia ?? null,
      }
    })

    // Process active_users: dedupe by user_id and group by user_type
    function computeActiveUsers(rows: Array<{ user_id: unknown; user_type: unknown }> | null) {
      const seen = new Map<string, string>()
      for (const row of rows || []) {
        const uid = String(row.user_id)
        if (!seen.has(uid)) {
          seen.set(uid, String(row.user_type || 'unknown'))
        }
      }
      const byType: Record<string, number> = {}
      for (const type of seen.values()) {
        byType[type] = (byType[type] || 0) + 1
      }
      return { total: seen.size, by_type: byType }
    }

    const activeUsers = {
      last_24h: computeActiveUsers(activeUsers24hResult.data),
      last_7d: computeActiveUsers(activeUsers7dResult.data),
      last_30d: computeActiveUsers(activeUsers30dResult.data),
    }

    // Process last_logins_per_user: dedupe by user_id, keep first (most recent)
    const seenUsers = new Set<string>()
    const lastLoginsPerUser: Array<{
      user_id: unknown
      user_nome: unknown
      user_email: unknown
      user_type: unknown
      last_login: unknown
      metadata: unknown
    }> = []
    for (const row of lastLoginsPerUserResult.data || []) {
      const uid = String(row.user_id)
      if (!seenUsers.has(uid)) {
        seenUsers.add(uid)
        lastLoginsPerUser.push({
          user_id: row.user_id,
          user_nome: row.user_nome,
          user_email: row.user_email,
          user_type: row.user_type,
          last_login: row.created_at,
          metadata: row.metadata,
        })
        if (lastLoginsPerUser.length >= 50) break
      }
    }

    // Process registrations_recent
    const lojistas = newUsersResult.count || 0
    const fornecedores = newFornecedoresResult.count || 0
    const representantes = newRepresentantesResult.count || 0

    return NextResponse.json({
      recent_logins: recentLoginsResult.data || [],
      recent_actions: recentActionsResult.data || [],
      recent_timeline: recentTimeline,
      active_users: activeUsers,
      last_logins_per_user: lastLoginsPerUser,
      registrations_recent: {
        lojistas,
        fornecedores,
        representantes,
        total: lojistas + fornecedores + representantes,
      },
    })
  } catch (error) {
    console.error('[Admin Dashboard Activity] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao carregar dados de atividade' },
      { status: 500 }
    )
  }
}
