'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface AuditoriaContagem {
  audit_nao_resolvidos: number
  bling_erros_terminais: number
  total: number
}

const POLL_INTERVAL_MS = 60_000
const VAZIO: AuditoriaContagem = {
  audit_nao_resolvidos: 0,
  bling_erros_terminais: 0,
  total: 0
}

/**
 * Hook que retorna contagem de eventos não resolvidos críticos + jobs Bling
 * em erro terminal. Usado pelo badge do menu admin.
 */
export function useAdminAuditoriaContagem() {
  const [data, setData] = useState<AuditoriaContagem>(VAZIO)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchContagem = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/auditoria/contagem', {
        cache: 'no-store',
        credentials: 'same-origin'
      })
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          setData(VAZIO)
          return
        }
        return
      }
      const json = await r.json()
      setData({
        audit_nao_resolvidos: json.audit_nao_resolvidos ?? 0,
        bling_erros_terminais: json.bling_erros_terminais ?? 0,
        total: json.total ?? 0
      })
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => {
    fetchContagem()
    intervalRef.current = setInterval(fetchContagem, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchContagem])

  return { data, refetch: fetchContagem }
}
