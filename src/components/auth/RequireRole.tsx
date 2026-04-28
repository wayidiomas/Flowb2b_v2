'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { isLojistaLp } from '@/lib/role-guards'

interface RequireRoleProps {
  children: ReactNode
  /** Roles permitidos (whitelist). Se vazio, qualquer role autenticado e permitido. */
  allowedRoles?: ('admin' | 'user' | 'viewer' | 'lojista_lp')[]
  /** Roles explicitamente bloqueados (deny list). Aplicado depois do allowedRoles. */
  blockedRoles?: ('admin' | 'user' | 'viewer' | 'lojista_lp')[]
  /** Path pra redirecionar se acesso negado. Default: /dashboard */
  redirectTo?: string
  /** Conteudo a renderizar enquanto checa role. Default: null. */
  fallback?: ReactNode
}

/**
 * Wrapper pra restringir acesso por role.
 * Usado em paginas internas que devem bloquear lojista_lp.
 */
export function RequireRole({
  children,
  allowedRoles,
  blockedRoles,
  redirectTo = '/dashboard',
  fallback = null,
}: RequireRoleProps) {
  const { role, loading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const hasAllowed = !allowedRoles || allowedRoles.includes(role as never)
    const hasBlocked = blockedRoles?.includes(role as never)

    if (!hasAllowed || hasBlocked) {
      router.replace(redirectTo)
    }
  }, [loading, role, allowedRoles, blockedRoles, redirectTo, router])

  if (loading) return <>{fallback}</>

  const hasAllowed = !allowedRoles || allowedRoles.includes(role as never)
  const hasBlocked = blockedRoles?.includes(role as never)
  if (!hasAllowed || hasBlocked) return <>{fallback}</>

  return <>{children}</>
}

/**
 * Wrapper pra esconder UI quando role e lojista_lp.
 * Atalho semantico em volta de RequireRole.
 */
export function HideForLojistaLp({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { role, loading } = usePermissions()
  if (loading) return <>{fallback}</>
  if (isLojistaLp(role)) return <>{fallback}</>
  return <>{children}</>
}
