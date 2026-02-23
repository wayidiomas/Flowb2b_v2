// Tipos para o sistema de Representantes

export interface UsersRepresentante {
  id: number
  nome: string
  email: string
  telefone?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Representante {
  id: number
  user_representante_id: number | null
  empresa_id: number
  codigo_acesso: string
  nome: string
  telefone?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface RepresentanteComDetalhes extends Representante {
  cadastrado: boolean // Se ja tem user_representante_id
  email?: string // Email do user_representante se cadastrado
  fornecedores_count?: number
  empresa_nome?: string
}

export interface RepresentanteFornecedor {
  id: number
  representante_id: number
  fornecedor_id: number
  created_at: string
}

export interface FornecedorVinculado {
  fornecedor_id: number
  fornecedor_nome: string
  fornecedor_cnpj?: string
  empresa_id: number
  empresa_nome: string
  vinculado_em: string
}

export interface CriarRepresentanteRequest {
  nome: string
  telefone?: string
  fornecedor_ids: number[]
}

export interface CriarRepresentanteResponse {
  success: boolean
  representante_id: number
  codigo_acesso: string
  message?: string
  error?: string
}

export interface VincularFornecedorRequest {
  fornecedor_id: number
}

export interface RepresentanteUser {
  id: number
  email: string
  nome: string
  telefone?: string
  tipo: 'representante'
}

export interface RepresentanteAuthContextType {
  user: RepresentanteUser | null
  fornecedoresVinculados: FornecedorVinculado[]
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export interface RepresentanteLoginRequest {
  email: string
  password: string
}

export interface RepresentanteRegistroRequest {
  nome: string
  email: string
  telefone?: string
  codigo_acesso: string
  password: string
}
