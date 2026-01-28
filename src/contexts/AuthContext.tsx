'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/auth'

// Interface para status do trial
export interface TrialStatus {
  isInTrial: boolean
  isTrialExpired: boolean
  daysRemaining: number
  trialStartDate: string
  trialEndDate: string
  hasActiveSubscription: boolean
}

// Interface para empresa vinculada ao usuario
export interface EmpresaVinculada {
  id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  role: string
}

interface AuthContextType {
  user: User | null
  empresa: {
    id: number
    razao_social: string
    nome_fantasia: string
    cnpj: string
  } | null
  empresas: EmpresaVinculada[]
  trialStatus: TrialStatus | null
  loading: boolean
  switchEmpresa: (empresaId: number) => Promise<void>
  switchingEmpresa: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [empresa, setEmpresa] = useState<AuthContextType['empresa']>(null)
  const [empresas, setEmpresas] = useState<EmpresaVinculada[]>([])
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [switchingEmpresa, setSwitchingEmpresa] = useState(false)
  const router = useRouter()

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const contentType = response.headers.get('content-type')

      // Verificar se a resposta e JSON antes de parsear
      if (response.ok && contentType?.includes('application/json')) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
          setEmpresa(data.user.empresa)
          setEmpresas(data.user.empresas || [])
          setTrialStatus(data.trialStatus || null)
        } else {
          setUser(null)
          setEmpresa(null)
          setEmpresas([])
          setTrialStatus(null)
        }
      } else {
        setUser(null)
        setEmpresa(null)
        setEmpresas([])
        setTrialStatus(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
      setEmpresa(null)
      setEmpresas([])
      setTrialStatus(null)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      await refreshUser()
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        await refreshUser()
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erro ao fazer login' }
    }
  }

  const switchEmpresa = async (empresaId: number) => {
    setSwitchingEmpresa(true)
    try {
      const response = await fetch('/api/empresas/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      })

      if (response.ok) {
        await refreshUser()
      }
    } catch (error) {
      console.error('Erro ao trocar empresa:', error)
    } finally {
      setSwitchingEmpresa(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setEmpresa(null)
      setEmpresas([])
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, empresa, empresas, trialStatus, loading, switchEmpresa, switchingEmpresa, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook para obter empresa_id (usar em queries!)
export function useEmpresaId() {
  const { empresa } = useAuth()
  return empresa?.id ?? null
}
