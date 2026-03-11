import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireSuperAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()

    // Execute all queries in parallel for performance
    const [
      empresasResult,
      empresasBlingResult,
      empresasSyncErrorResult,
      allUsersResult,
      adminRolesResult,
      allUserEmpresasResult,
      usersFornecedorResult,
      usersRepresentanteResult,
      pedidosCompra30dResult,
      pedidosPorStatusResult,
      tokensProblemaResult,
    ] = await Promise.all([
      // Total empresas
      supabase
        .from('empresas')
        .select('id', { count: 'exact', head: true }),

      // Empresas conectadas ao Bling
      supabase
        .from('empresas')
        .select('id', { count: 'exact', head: true })
        .eq('conectadabling', true),

      // Empresas com sync_status = 'error'
      supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social, sync_status')
        .eq('sync_status', 'error'),

      // All active users with their role
      supabase
        .from('users')
        .select('id, role, ativo')
        .eq('ativo', true),

      // Users with admin role in users_empresas (lojistas/owners)
      supabase
        .from('users_empresas')
        .select('user_id, role')
        .eq('ativo', true)
        .eq('role', 'admin'),

      // All active user-empresa associations
      supabase
        .from('users_empresas')
        .select('user_id')
        .eq('ativo', true),

      // Total usuarios fornecedor
      supabase
        .from('users_fornecedor')
        .select('id', { count: 'exact', head: true }),

      // Total usuarios representante
      supabase
        .from('users_representante')
        .select('id', { count: 'exact', head: true }),

      // Pedidos de compra ultimos 30 dias
      supabase
        .from('pedidos_compra')
        .select('id', { count: 'exact', head: true })
        .gte('data', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Pedidos por status_interno (group by via select all then count client-side)
      supabase
        .from('pedidos_compra')
        .select('status_interno')
        .gte('data', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Tokens Bling com problema (revogados ou expirados)
      supabase
        .from('bling_tokens')
        .select('id, empresa_id, is_revoke, expires_at'),
    ])

    // Classify users: lojista, colaborador, superadmin, sem_empresa
    const adminUserIds = new Set((adminRolesResult.data || []).map(r => r.user_id))
    const anyEmpresaUserIds = new Set((allUserEmpresasResult.data || []).map(r => r.user_id))

    let lojistasCount = 0
    let colaboradoresCount = 0
    let superadminCount = 0
    let semEmpresaCount = 0

    for (const user of (allUsersResult.data || [])) {
      if (user.role === 'superadmin') {
        superadminCount++
      } else if (adminUserIds.has(user.id)) {
        lojistasCount++
      } else if (anyEmpresaUserIds.has(user.id)) {
        colaboradoresCount++
      } else {
        semEmpresaCount++
      }
    }

    // Process pedidos por status
    const pedidosPorStatus: Record<string, number> = {}
    if (pedidosPorStatusResult.data) {
      for (const pedido of pedidosPorStatusResult.data) {
        const status = pedido.status_interno || 'sem_status'
        pedidosPorStatus[status] = (pedidosPorStatus[status] || 0) + 1
      }
    }

    // Process tokens com problema
    const now = new Date()
    const tokensComProblema = (tokensProblemaResult.data || []).filter(token => {
      if (token.is_revoke) return true
      if (token.expires_at && new Date(token.expires_at) < now) return true
      return false
    })

    const tokensRevogados = (tokensProblemaResult.data || []).filter(
      t => t.is_revoke
    ).length
    const tokensExpirados = (tokensProblemaResult.data || []).filter(
      t => !t.is_revoke && t.expires_at && new Date(t.expires_at) < now
    ).length

    // Sync errors
    const empresasSyncError = (empresasSyncErrorResult.data || []).map(e => ({
      id: e.id,
      nome: e.nome_fantasia || e.razao_social || `Empresa #${e.id}`,
    }))

    return NextResponse.json({
      empresas: {
        total: empresasResult.count || 0,
        conectadasBling: empresasBlingResult.count || 0,
      },
      usuarios: {
        lojistas: lojistasCount,
        colaboradores: colaboradoresCount,
        fornecedores: usersFornecedorResult.count || 0,
        representantes: usersRepresentanteResult.count || 0,
        superadmins: superadminCount,
        sem_empresa: semEmpresaCount,
        total:
          lojistasCount +
          colaboradoresCount +
          (usersFornecedorResult.count || 0) +
          (usersRepresentanteResult.count || 0),
      },
      pedidos: {
        ultimos30dias: pedidosCompra30dResult.count || 0,
        porStatus: pedidosPorStatus,
      },
      alertas: {
        tokensComProblema: tokensComProblema.length,
        tokensRevogados,
        tokensExpirados,
        syncComErro: empresasSyncError.length,
        empresasSyncError,
      },
    })
  } catch (error) {
    console.error('[Admin Dashboard] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao carregar dashboard' },
      { status: 500 }
    )
  }
}
