import type { Role } from '@/types/permissions'

/**
 * Role guards e helpers de whitelist de rotas para o role lojista_lp.
 *
 * O lojista_lp e o lojista cadastrado pelo fornecedor via vinculo invertido.
 * Ele tem acesso restrito a:
 *  - Landing pages publicas do fornecedor (/lp/[slug])
 *  - Catalogo do fornecedor (/compras/catalogo)
 *  - Seus pedidos de compra (/compras/pedidos)
 *  - Dashboard simples
 *  - Perfil + trocar senha
 *
 * Tudo o resto e bloqueado em UI (menu) e em servidor (middleware).
 */

export function isLojistaLp(role: string | null | undefined): role is 'lojista_lp' {
  return role === 'lojista_lp'
}

export function asRole(role: string | null | undefined): Role {
  if (role === 'admin' || role === 'user' || role === 'viewer' || role === 'lojista_lp') {
    return role
  }
  return 'user'
}

/**
 * Whitelist de paths permitidos para o role lojista_lp.
 * Match e por prefixo (startsWith) — qualquer subrota tambem permitida.
 */
export const LOJISTA_LP_ALLOWED_PATHS: readonly string[] = [
  '/dashboard',
  '/compras/catalogo',
  '/compras/pedidos',
  '/lp/',
  '/perfil',
  '/trocar-senha',
  '/configuracoes/perfil', // se existir
  // APIs necessarias
  '/api/auth/',
  '/api/compras/catalogo',
  '/api/pedidos-compra',
  '/api/produtos',
  '/api/fornecedores',
  '/api/lp/',
  '/api/notifications',
] as const

/**
 * Whitelist especifica de rotas de UI (lojista_lp pode visitar).
 * Util pra menu e gating de UI.
 */
export const LOJISTA_LP_UI_PATHS: readonly string[] = [
  '/dashboard',
  '/compras/catalogo',
  '/compras/pedidos',
  '/lp/',
  '/perfil',
  '/trocar-senha',
] as const

export function isPathAllowedForLojistaLp(pathname: string): boolean {
  return LOJISTA_LP_ALLOWED_PATHS.some(allowed => pathname.startsWith(allowed))
}

export function isUiPathAllowedForLojistaLp(pathname: string): boolean {
  return LOJISTA_LP_UI_PATHS.some(allowed => pathname.startsWith(allowed))
}
