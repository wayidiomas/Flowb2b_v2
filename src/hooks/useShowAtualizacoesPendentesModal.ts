'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAtualizacoesCatalogo, type ContagemAtualizacoes } from './useAtualizacoesCatalogo'

const LOCAL_STORAGE_TTL_KEY = 'flowb2b:atualizacoes_modal_dismissed_until'
const LOCAL_STORAGE_SNAPSHOT_KEY = 'flowb2b:atualizacoes_modal_seen_snapshot'
const REMIND_TOMORROW_MS = 24 * 60 * 60 * 1000  // 24h

/**
 * Calcula uma assinatura estavel do estado de atualizacoes pendentes.
 * Inclui catalogo_id, qtd_nao_vistas e ultima_publicacao_at de cada item,
 * ordenados pelo catalogo_id pra garantir reprodutibilidade.
 *
 * Quando o snapshot atual eh igual ao salvo, o lojista ja viu (e fechou)
 * exatamente esse estado — nao reabrir. Quando o fornecedor publica de
 * novo (ou outro catalogo entra na lista), o snapshot muda e o modal
 * volta a aparecer.
 */
function computeSnapshot(data: ContagemAtualizacoes): string {
  if (!data.por_catalogo || data.por_catalogo.length === 0) return ''
  return data.por_catalogo
    .slice()
    .sort((a, b) => a.catalogo_id - b.catalogo_id)
    .map(c => `${c.catalogo_id}:${c.qtd_nao_vistas}:${c.ultima_publicacao_at || ''}`)
    .join('|')
}

/**
 * Hook que decide se o modal global de atualizações pendentes deve aparecer
 * pós-login. Dois mecanismos de supressão:
 *
 * - "Lembrar amanhã" → TTL de 24h em localStorage (independente do conteúdo)
 * - Fechamento normal (X / overlay / "Ver todas") → persiste o snapshot atual;
 *   só reabre quando o snapshot mudar (ex.: fornecedor publicou nova mudança
 *   ou outro catálogo passou a ter pendência)
 *
 * Usar APENAS no DashboardLayout — chamado uma vez por sessão.
 */
export function useShowAtualizacoesPendentesModal() {
  const { data, loading, refetch } = useAtualizacoesCatalogo()
  const [dismissed, setDismissed] = useState(true)  // começa true para evitar flash inicial
  const [hydrated, setHydrated] = useState(false)

  const currentSnapshot = computeSnapshot(data)

  // Avaliar dismissed sempre que data muda (pos-hidratacao)
  useEffect(() => {
    if (!hydrated) return

    try {
      // 1. TTL "Lembrar amanha" tem prioridade
      const ttlRaw = localStorage.getItem(LOCAL_STORAGE_TTL_KEY)
      if (ttlRaw) {
        const dismissedUntil = parseInt(ttlRaw, 10)
        if (!isNaN(dismissedUntil) && dismissedUntil > Date.now()) {
          setDismissed(true)
          return
        }
        // expirou — limpa
        localStorage.removeItem(LOCAL_STORAGE_TTL_KEY)
      }

      // 2. Snapshot ja visto — so suprime se o conteudo nao mudou
      const seenSnapshot = localStorage.getItem(LOCAL_STORAGE_SNAPSHOT_KEY) || ''
      if (currentSnapshot && seenSnapshot && seenSnapshot === currentSnapshot) {
        setDismissed(true)
        return
      }

      // Snapshot diferente (ou primeiro acesso): pode mostrar
      setDismissed(false)
    } catch {
      setDismissed(false)
    }
  }, [hydrated, currentSnapshot])

  // Marca como hidratado no mount (depois do primeiro paint do client)
  useEffect(() => {
    setHydrated(true)
  }, [])

  const remindTomorrow = useCallback(() => {
    try {
      const until = Date.now() + REMIND_TOMORROW_MS
      localStorage.setItem(LOCAL_STORAGE_TTL_KEY, String(until))
      setDismissed(true)
    } catch {
      setDismissed(true)
    }
  }, [])

  // Mantem o nome dismissForSession para nao mexer no caller (DashboardLayout)
  // mas o comportamento agora persiste o snapshot — so reabre se algo mudar.
  const dismissForSession = useCallback(() => {
    try {
      if (currentSnapshot) {
        localStorage.setItem(LOCAL_STORAGE_SNAPSHOT_KEY, currentSnapshot)
      }
    } catch {
      // localStorage indisponivel — apenas marca em memoria
    }
    setDismissed(true)
  }, [currentSnapshot])

  const shouldShow =
    hydrated &&
    !loading &&
    !dismissed &&
    data.total_catalogos_desatualizados > 0

  return { shouldShow, data, remindTomorrow, dismissForSession, refetch }
}
