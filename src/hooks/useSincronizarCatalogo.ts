'use client'

import { useState, useCallback } from 'react'

export interface SincronizarResult {
  success: boolean
  total_pendentes: number
  aplicados: { precos: number; novos: number; dados: number; removidos: number }
  atualizar_bling: boolean
  bling_enfileirados: number
  erros: Array<{ atualizacao_id: number; tipo: string; erro: string }>
}

export interface SincronizarOpts {
  /** Se false, atualiza apenas localmente (Supabase) sem replicar no Bling do lojista. Default true. */
  atualizarBling?: boolean
}

/**
 * Hook que dispara o sincronizar de um catálogo de fornecedor para o lojista.
 * Chamado pelo modal gate obrigatório e pelo botão "Sincronizar" da página de revisão.
 */
export function useSincronizarCatalogo() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SincronizarResult | null>(null)

  const sincronizar = useCallback(async (catalogoId: number, opts: SincronizarOpts = {}) => {
    const atualizarBling = opts.atualizarBling !== false // default true
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch(`/api/compras/catalogo-fornecedor/${catalogoId}/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atualizar_bling: atualizarBling })
      })
      const json = await r.json()
      if (!r.ok) {
        throw new Error(json.error || `HTTP ${r.status}`)
      }
      setResult(json as SincronizarResult)
      return json as SincronizarResult
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { sincronizar, loading, error, result, reset }
}
