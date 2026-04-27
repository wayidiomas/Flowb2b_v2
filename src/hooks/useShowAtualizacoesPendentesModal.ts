'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAtualizacoesCatalogo } from './useAtualizacoesCatalogo'

const LOCAL_STORAGE_KEY = 'flowb2b:atualizacoes_modal_dismissed_until'
const REMIND_TOMORROW_MS = 24 * 60 * 60 * 1000  // 24h

/**
 * Hook que decide se o modal global de atualizações pendentes deve aparecer
 * pós-login. Respeita "Lembrar amanhã" via localStorage com TTL de 24h.
 *
 * Usar APENAS no DashboardLayout — chamado uma vez por sessão.
 */
export function useShowAtualizacoesPendentesModal() {
  const { data, loading, refetch } = useAtualizacoesCatalogo()
  const [dismissed, setDismissed] = useState(true)  // começa true para evitar flash inicial
  const [hydrated, setHydrated] = useState(false)

  // Lê localStorage no mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (raw) {
        const dismissedUntil = parseInt(raw, 10)
        if (!isNaN(dismissedUntil) && dismissedUntil > Date.now()) {
          setDismissed(true)
        } else {
          setDismissed(false)
          // Limpa entrada expirada
          if (raw) localStorage.removeItem(LOCAL_STORAGE_KEY)
        }
      } else {
        setDismissed(false)
      }
    } catch {
      setDismissed(false)
    }
    setHydrated(true)
  }, [])

  const remindTomorrow = useCallback(() => {
    try {
      const until = Date.now() + REMIND_TOMORROW_MS
      localStorage.setItem(LOCAL_STORAGE_KEY, String(until))
      setDismissed(true)
    } catch {
      // localStorage indisponível — só fecha
      setDismissed(true)
    }
  }, [])

  const dismissForSession = useCallback(() => {
    setDismissed(true)
  }, [])

  const shouldShow =
    hydrated &&
    !loading &&
    !dismissed &&
    data.total_catalogos_desatualizados > 0

  return { shouldShow, data, remindTomorrow, dismissForSession, refetch }
}
