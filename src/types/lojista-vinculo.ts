/**
 * Types do fluxo de vinculo invertido (fornecedor cria lojista).
 */

export interface CreateLojistaRequest {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  email_admin: string
  nome_admin: string
  celular: string
  enviar_email_boas_vindas?: boolean
}

export interface CreateLojistaResponse {
  success: true
  empresa: { id: number; razao_social: string; cnpj: string }
  user: { id: string; email: string }
  vinculo: { fornecedor_id: number; empresa_id: number }
  primeiro_login: {
    senha_provisoria: string
    link_login: string
  }
  flags: {
    empresa_already_existed: boolean
    user_already_existed: boolean
    email_sent: boolean
  }
}

export interface CreateLojistaError {
  success: false
  error: string
  code?:
    | 'CNPJ_INVALIDO'
    | 'EMAIL_INVALIDO'
    | 'CELULAR_INVALIDO'
    | 'NOME_REQUIRED'
    | 'EMPRESA_JA_EXISTE_OUTRO_FORNECEDOR'
    | 'EMAIL_JA_EM_USO'
    | 'FORNECEDOR_SEM_CNPJ'
    | 'INTERNAL_ERROR'
}

export interface LojistaListItem {
  empresa_id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  celular_principal: string | null
  admin_email: string | null
  admin_nome: string | null
  criado_em: string
  last_login_at: string | null
}

export interface ListLojistasResponse {
  lojistas: LojistaListItem[]
}
