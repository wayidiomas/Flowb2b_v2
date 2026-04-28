/**
 * Helpers compartilhados das Landing Pages do Fornecedor.
 */

import type { LpModo } from '@/types/landing-page'

/**
 * Gera slug URL-safe a partir de string.
 * "Catalogo MEDICALVET" → "catalogo-medicalvet"
 */
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacriticos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

/**
 * Gera slug unico tentando: base, base-2, base-3 ate base-N.
 * Se ainda colidir, anexa random suffix curto.
 */
export function generateUniqueSlug(base: string, existingSlugs: string[]): string {
  const root = slugify(base) || 'lp'
  if (!existingSlugs.includes(root)) return root
  for (let i = 2; i <= 99; i++) {
    const candidate = `${root}-${i}`
    if (!existingSlugs.includes(candidate)) return candidate
  }
  // Fallback: random 4 chars
  const rand = Math.random().toString(36).slice(2, 6)
  return `${root}-${rand}`
}

export const LP_MODO_LABELS: Record<LpModo, string> = {
  todos: 'Todos os produtos do catalogo',
  comprados: 'So produtos ja comprados pelo lojista',
  selecao: 'Selecao especifica de produtos',
}

export const LP_MODO_DESCRIPTIONS: Record<LpModo, string> = {
  todos: 'Mostra todo o catalogo do fornecedor. Util pra lojistas novos sem historico.',
  comprados: 'So apresenta produtos que esse lojista ja comprou de voce. Recompra rapida.',
  selecao: 'Voce escolhe manualmente quais produtos aparecem. Curadoria total.',
}
