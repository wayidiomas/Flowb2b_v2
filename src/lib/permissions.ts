import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { DEFAULT_PERMISSOES, ROLE_PERMISSOES } from '@/types/permissions'
import type { Permissoes, PermissaoKey } from '@/types/permissions'
import type { SessionUser } from '@/types/auth'

type PermissionCheckResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse }

/**
 * Server-side permission check for API routes.
 * Queries users_empresas to get the user's permissions, then checks the required permission.
 * Returns { allowed: true } or { allowed: false, response: NextResponse(403) }.
 *
 * Usage:
 *   const check = await requirePermission(user, 'pedidos')
 *   if (!check.allowed) return check.response
 */
export async function requirePermission(
  user: SessionUser,
  permission: PermissaoKey
): Promise<PermissionCheckResult> {
  // Admin always has full access
  if (user.role === 'admin') {
    return { allowed: true }
  }

  // Only lojista users have this permission system
  if (user.tipo !== 'lojista') {
    return { allowed: true }
  }

  if (!user.empresaId) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Empresa nao encontrada' },
        { status: 403 }
      ),
    }
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('users_empresas')
    .select('role, permissoes')
    .eq('user_id', user.userId)
    .eq('empresa_id', user.empresaId)
    .single()

  let permissoes: Permissoes

  if (error || !data) {
    // Fallback to role-based defaults
    permissoes = ROLE_PERMISSOES[user.role] || DEFAULT_PERMISSOES
  } else {
    // Admin role in users_empresas always has full access
    if (data.role === 'admin') {
      return { allowed: true }
    }

    if (data.permissoes) {
      permissoes = { ...DEFAULT_PERMISSOES, ...data.permissoes }
    } else {
      permissoes = ROLE_PERMISSOES[data.role] || DEFAULT_PERMISSOES
    }
  }

  if (permissoes[permission] === true) {
    return { allowed: true }
  }

  return {
    allowed: false,
    response: NextResponse.json(
      { error: 'Voce nao tem permissao para realizar esta acao' },
      { status: 403 }
    ),
  }
}
