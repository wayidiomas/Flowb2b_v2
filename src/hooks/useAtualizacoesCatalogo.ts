'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface CatalogoAtualizado {
  catalogo_id: number
  fornecedor_nome: string
  slug: string | null
  logo_url: string | null
  cor_primaria: string | null
  cnpj: string | null
  qtd_nao_vistas: number
  ultima_publicacao_at: string | null
}

export interface ContagemAtualizacoes {
  total_nao_vistas: number
  total_catalogos_desatualizados: number
  por_catalogo: CatalogoAtualizado[]
}

const POLL_INTERVAL_MS = 60_000  // 60s
const VAZIO: ContagemAtualizacoes = {
  total_nao_vistas: 0,
  total_catalogos_desatualizados: 0,
  por_catalogo: []
}

/**
 * Hook para consumir o estado de atualizações pendentes dos catálogos do lojista.
 *
 * Faz polling a cada 60s. Renderiza badge/banner em todos os locais relevantes
 * (Sidebar, /compras/catalogo, etc). Usar em componentes 'use client'.
 */
export function useAtualizacoesCatalogo(opts: { paused?: boolean } = {}) {
  const [data, setData] = useState<ContagemAtualizacoes>(VAZIO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { paused = false } = opts

  const fetchContagem = useCallback(async () => {
    try {
      const r = await fetch('/api/compras/atualizacoes/contagem', {
        cache: 'no-store',
        credentials: 'same-origin'
      })
      if (!r.ok) {
        if (r.status === 401) {
          // Não logado — silencioso
          setData(VAZIO)
          return
        }
        throw new Error(`HTTP ${r.status}`)
      }
      const json = await r.json()
      setData({
        total_nao_vistas: json.total_nao_vistas ?? 0,
        total_catalogos_desatualizados: json.total_catalogos_desatualizados ?? 0,
        por_catalogo: json.por_catalogo ?? []
      })
      setError(null)
    } catch (err) {
      // Não-bloqueante — só sinaliza
      setError(err instanceof Error ? err.message : 'erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (paused) return

    fetchContagem()
    intervalRef.current = setInterval(fetchContagem, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchContagem, paused])

  return { data, loading, error, refetch: fetchContagem }
}
