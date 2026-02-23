export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const n1 = normalizePhone(a)
  const n2 = normalizePhone(b)
  return !!n1 && !!n2 && n1 === n2
}
