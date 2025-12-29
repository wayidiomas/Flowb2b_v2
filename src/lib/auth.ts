import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { JWTPayload, SessionUser } from '@/types/auth'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
)

const COOKIE_NAME = 'flowb2b-auth-token'
const TOKEN_EXPIRATION = '7d'

// Hash de senha
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Gerar JWT
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET)
}

// Verificar JWT
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// Definir cookie de autenticação
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })
}

// Remover cookie de autenticação
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// Obter token do cookie
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

// Obter usuário da sessão atual
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getAuthToken()
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    userId: payload.userId,
    empresaId: payload.empresaId,
    email: payload.email,
    nome: '', // Precisa buscar do banco se necessário
    role: payload.role,
  }
}

// Obter empresa_id do usuário atual (usar em todas as queries!)
export async function getCurrentEmpresaId(): Promise<number | null> {
  const user = await getCurrentUser()
  return user?.empresaId ?? null
}
