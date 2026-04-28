'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { OnboardingStatus } from '@/types/onboarding'

const ADIAR_KEY = 'flowb2b_onboarding_perfil_adiado'

function isAdiadoHoje(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(ADIAR_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!ts) return false
    // valido por 24h
    return Date.now() - ts < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function useOnboardingPendente() {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [adiadoLocal, setAdiadoLocal] = useState(false)

  useEffect(() => {
    setAdiadoLocal(isAdiadoHoje())
  }, [])

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/lojista/onboarding')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Erro ao carregar onboarding:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading && user?.id) {
      load()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [authLoading, user?.id, load])

  const marcarAdiadoHoje = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ADIAR_KEY, String(Date.now()))
      } catch { /* silent */ }
    }
    setAdiadoLocal(true)
  }, [])

  const limparAdiado = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(ADIAR_KEY)
      } catch { /* silent */ }
    }
    setAdiadoLocal(false)
  }, [])

  // Decisao final: precisa abrir modal?
  // - obrigatorio (senha provisoria OU dados incompletos) => abre sempre
  // - opcional (so perfil) => respeita 'adiado hoje'
  const obrigatorio =
    !!status?.precisa_trocar_senha || !!status?.precisa_completar_dados
  const opcional = !!status?.precisa_responder_perfil
  const deveAbrir = obrigatorio || (opcional && !adiadoLocal)

  return {
    status,
    loading: loading || authLoading,
    obrigatorio,
    deveAbrir,
    refresh: load,
    marcarAdiadoHoje,
    limparAdiado,
  }
}
