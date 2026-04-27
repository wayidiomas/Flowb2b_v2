'use client'

import { useAtualizacoesCatalogo, type CatalogoAtualizado } from './useAtualizacoesCatalogo'

/**
 * Hook que verifica se um fornecedor (por CNPJ) tem catálogo desatualizado.
 * Quando retorna `catalogoPendente !== null`, o caller deve abrir o modal de
 * sincronização ANTES de chamar a IA da sugestão (validacao_ean), pra evitar
 * cálculo com preços velhos.
 *
 * Reusa o `useAtualizacoesCatalogo` (polling 60s + refetch sob demanda).
 */
export function useCatalogoGate(fornecedorCnpj: string | null | undefined) {
  const { data, refetch } = useAtualizacoesCatalogo()
  const cnpjLimpo = (fornecedorCnpj || '').replace(/\D/g, '')

  const catalogoPendente: CatalogoAtualizado | null = cnpjLimpo
    ? data.por_catalogo.find(
        c => (c.cnpj || '').replace(/\D/g, '') === cnpjLimpo
      ) || null
    : null

  return { catalogoPendente, refetch }
}
