/**
 * Utilities pra validacao e formatacao de CNPJ.
 * Tambem expoe defaultPasswordFromCnpj usado no fluxo de vinculo invertido.
 */

export function stripCnpj(cnpj: string): string {
  return (cnpj || '').replace(/\D/g, '')
}

export function formatCnpj(cnpj: string): string {
  const clean = stripCnpj(cnpj)
  if (clean.length !== 14) return cnpj
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/**
 * Valida CNPJ via algoritmo modulo 11.
 * Aceita string com ou sem mascara.
 */
export function isValidCnpj(cnpj: string): boolean {
  const clean = stripCnpj(cnpj)
  if (clean.length !== 14) return false
  if (/^(\d)\1+$/.test(clean)) return false // 00000000000000, 11111111111111, etc

  const calcDigit = (slice: string, weights: number[]): number => {
    let sum = 0
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * weights[i]
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigit(clean.slice(0, 12), weights1)
  if (d1 !== parseInt(clean[12], 10)) return false

  const d2 = calcDigit(clean.slice(0, 13), weights2)
  if (d2 !== parseInt(clean[13], 10)) return false

  return true
}

/**
 * Senha provisoria padrao = 6 primeiros digitos do CNPJ.
 * Definida pela cliente no fluxo de cadastro em massa e cadastro individual.
 */
export function defaultPasswordFromCnpj(cnpj: string): string {
  const clean = stripCnpj(cnpj)
  return clean.slice(0, 6)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
}

/**
 * Valida celular brasileiro com DDD. Aceita com ou sem mascara.
 * Aceita 10 ou 11 digitos (fixo ou movel).
 */
export function isValidCelular(celular: string): boolean {
  const clean = (celular || '').replace(/\D/g, '')
  return clean.length === 10 || clean.length === 11
}

/**
 * Normaliza celular pra formato E.164 brasileiro (+55 + DDD + numero).
 */
export function toE164BR(celular: string): string {
  const clean = (celular || '').replace(/\D/g, '')
  if (clean.startsWith('55') && clean.length >= 12) return `+${clean}`
  if (clean.length === 10 || clean.length === 11) return `+55${clean}`
  return celular
}
