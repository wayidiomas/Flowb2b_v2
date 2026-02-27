'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { DashboardLayout } from '@/components/layout'
import type { PermissaoKey } from '@/types/permissions'

interface RequirePermissionProps {
  permission: PermissaoKey
  children: React.ReactNode
  /** If set, redirect instead of showing "Acesso Negado" */
  redirectTo?: string
}

export function RequirePermission({ permission, children, redirectTo }: RequirePermissionProps) {
  const { hasPermission, loading } = usePermissions()
  const router = useRouter()

  const denied = !loading && !hasPermission(permission)

  // Redirect must happen in useEffect, not during render
  useEffect(() => {
    if (denied && redirectTo) {
      router.replace(redirectTo)
    }
  }, [denied, redirectTo, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#336FB6]" />
        </div>
      </DashboardLayout>
    )
  }

  if (denied) {
    // If redirect is pending, show nothing while navigating
    if (redirectTo) return null

    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-500 mb-4">Voce nao tem permissao para acessar esta pagina.</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
            >
              Voltar ao inicio
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return <>{children}</>
}
