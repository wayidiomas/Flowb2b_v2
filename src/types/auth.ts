export interface User {
  id: string // UUID
  email: string
  nome: string
  empresa_id: number | null
  role: 'admin' | 'user'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface JWTPayload {
  userId: string // UUID
  empresaId: number | null
  email: string
  role: 'admin' | 'user'
  tipo: 'lojista' | 'fornecedor' | 'representante'
  cnpj?: string
  fornecedorUserId?: number
  representanteUserId?: number
  iat: number
  exp: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  nome: string
  email: string
  password: string
  acceptedTerms: boolean
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message?: string
  error?: string
}

export interface ResetPasswordResponse {
  success: boolean
  message?: string
  error?: string
}

export interface MagicLinkRequest {
  email: string
}

export interface MagicLinkResponse {
  success: boolean
  message?: string
  error?: string
}

export interface VerifyMagicLinkResponse {
  success: boolean
  user?: Omit<User, 'password_hash'>
  error?: string
}

export interface AuthResponse {
  success: boolean
  user?: Omit<User, 'password_hash'>
  message?: string
  error?: string
  requiresEmailConfirmation?: boolean
}

export interface SessionUser {
  userId: string // UUID
  empresaId: number | null
  email: string
  nome: string
  role: 'admin' | 'user'
  tipo: 'lojista' | 'fornecedor' | 'representante'
  cnpj?: string
  fornecedorUserId?: number
  representanteUserId?: number
}
