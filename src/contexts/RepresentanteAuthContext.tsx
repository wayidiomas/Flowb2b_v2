'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface RepresentanteUser {
  id: number
  email: string
  nome: string
  telefone?: string
  tipo: 'representante'
}

interface FornecedorVinculado {
  fornecedor_id: number
  fornecedor_nome: string
  fornecedor_cnpj?: string
  empresa_id: number
  empresa_nome: string
  representante_id: number
}

interface Representante {
  id: number
  codigo_acesso: string
  nome: string
  empresa_id: number
  empresa_nome: string
}

interface RepresentanteAuthContextType {
  user: RepresentanteUser | null
  representantes: Representante[]
  fornecedoresVinculados: FornecedorVinculado[]
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const RepresentanteAuthContext = createContext<RepresentanteAuthContextType | undefined>(undefined)

export function RepresentanteAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RepresentanteUser | null>(null)
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [fornecedoresVinculados, setFornecedoresVinculados] = useState<FornecedorVinculado[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/representante/me')
      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setRepresentantes(data.representantes || [])
        setFornecedoresVinculados(data.fornecedoresVinculados || [])
      } else {
        setUser(null)
        setRepresentantes([])
        setFornecedoresVinculados([])
      }
    } catch (error) {
      console.error('Error fetching representante user:', error)
      setUser(null)
      setRepresentantes([])
      setFornecedoresVinculados([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Redirecionar se nao autenticado
  useEffect(() => {
    if (!loading && !user) {
      const publicPaths = ['/representante/login', '/representante/registro', '/representante/convite']
      if (!publicPaths.some(p => pathname.startsWith(p))) {
        router.push('/representante/login')
      }
    }
  }, [loading, user, pathname, router])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/representante/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchUser()
        return { success: true }
      }

      return { success: false, error: data.error || 'Erro ao fazer login' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erro ao fazer login' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setRepresentantes([])
      setFornecedoresVinculados([])
      router.push('/representante/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <RepresentanteAuthContext.Provider
      value={{
        user,
        representantes,
        fornecedoresVinculados,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </RepresentanteAuthContext.Provider>
  )
}

export function useRepresentanteAuth() {
  const context = useContext(RepresentanteAuthContext)
  if (context === undefined) {
    throw new Error('useRepresentanteAuth must be used within a RepresentanteAuthProvider')
  }
  return context
}
