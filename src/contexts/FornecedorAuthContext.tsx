'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface FornecedorUser {
  id: number
  email: string
  nome: string
  cnpj: string
  telefone?: string
  tipo: 'fornecedor'
}

interface EmpresaVinculada {
  fornecedorId: number
  empresaId: number
  razaoSocial: string
  nomeFantasia: string
}

interface FornecedorAuthContextType {
  user: FornecedorUser | null
  empresasVinculadas: EmpresaVinculada[]
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const FornecedorAuthContext = createContext<FornecedorAuthContextType | null>(null)

export function FornecedorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FornecedorUser | null>(null)
  const [empresasVinculadas, setEmpresasVinculadas] = useState<EmpresaVinculada[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/fornecedor/me')
      if (!res.ok) {
        setUser(null)
        setEmpresasVinculadas([])
        return
      }
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        setUser(null)
        return
      }
      const data = await res.json()
      if (data.success && data.user) {
        setUser(data.user)
        setEmpresasVinculadas(data.empresasVinculadas || [])
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/fornecedor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshUser()
        return { success: true }
      }
      return { success: false, error: data.error || 'Erro ao fazer login' }
    } catch {
      return { success: false, error: 'Erro de conexao' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
    setEmpresasVinculadas([])
    router.push('/fornecedor/login')
  }

  return (
    <FornecedorAuthContext.Provider value={{ user, empresasVinculadas, loading, login, logout, refreshUser }}>
      {children}
    </FornecedorAuthContext.Provider>
  )
}

export function useFornecedorAuth() {
  const context = useContext(FornecedorAuthContext)
  if (!context) {
    throw new Error('useFornecedorAuth must be used within FornecedorAuthProvider')
  }
  return context
}
