'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { DEFAULT_PERMISSOES, ROLE_PERMISSOES } from '@/types/permissions'
import type { Permissoes } from '@/types/permissions'

export type { Permissoes }

export function usePermissions() {
  const { user, empresa } = useAuth()
  const [permissoes, setPermissoes] = useState<Permissoes>(DEFAULT_PERMISSOES)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('user')

  useEffect(() => {
    async function fetchPermissoes() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      const empresaId = empresa?.id || user?.empresa_id

      if (!empresaId) {
        setLoading(false)
        return
      }

      try {
        // Buscar permissoes do usuario na empresa
        const { data, error } = await supabase
          .from('users_empresas')
          .select('role, permissoes')
          .eq('user_id', user.id)
          .eq('empresa_id', empresaId)
          .single()

        if (error) {
          // Se nao encontrou em users_empresas, usar role do user
          const userRole = user.role || 'user'
          setRole(userRole)
          setPermissoes(ROLE_PERMISSOES[userRole] || DEFAULT_PERMISSOES)
        } else if (data) {
          setRole(data.role || 'user')

          // Se tem permissoes customizadas, usar elas
          if (data.permissoes) {
            setPermissoes({
              ...DEFAULT_PERMISSOES,
              ...data.permissoes,
            })
          } else {
            // Senao, usar permissoes baseadas no role
            setPermissoes(ROLE_PERMISSOES[data.role] || DEFAULT_PERMISSOES)
          }
        }
      } catch (err) {
        console.error('Erro ao buscar permissoes:', err)
        setPermissoes(DEFAULT_PERMISSOES)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissoes()
  }, [user?.id, user?.role, user?.empresa_id, empresa?.id])

  // Funcao para verificar se tem permissao
  const hasPermission = useCallback((permissao: keyof Permissoes): boolean => {
    // Admin sempre tem todas as permissoes
    if (role === 'admin') return true
    return permissoes[permissao] === true
  }, [permissoes, role])

  // Funcao para verificar multiplas permissoes (todas devem ser true)
  const hasAllPermissions = useCallback((perms: (keyof Permissoes)[]): boolean => {
    if (role === 'admin') return true
    return perms.every(p => permissoes[p] === true)
  }, [permissoes, role])

  // Funcao para verificar se tem pelo menos uma permissao
  const hasAnyPermission = useCallback((perms: (keyof Permissoes)[]): boolean => {
    if (role === 'admin') return true
    return perms.some(p => permissoes[p] === true)
  }, [permissoes, role])

  // Verifica se eh admin
  const isAdmin = role === 'admin'

  return {
    permissoes,
    loading,
    role,
    isAdmin,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
  }
}

// Componente para proteger conteudo baseado em permissao
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: keyof Permissoes | (keyof Permissoes)[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { hasPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) {
    return null
  }

  const hasAccess = Array.isArray(permission)
    ? hasAllPermissions(permission)
    : hasPermission(permission)

  if (!hasAccess) {
    return React.createElement(React.Fragment, null, fallback)
  }

  return React.createElement(React.Fragment, null, children)
}
