/**
 * Types do fluxo de onboarding pos-login.
 */

export type ErpUsado =
  | 'bling'
  | 'conta_azul'
  | 'totvs'
  | 'omie'
  | 'sankhya'
  | 'tiny'
  | 'outro'
  | 'nenhum'

export const ERP_OPTIONS: { value: ErpUsado; label: string }[] = [
  { value: 'bling', label: 'Bling' },
  { value: 'conta_azul', label: 'Conta Azul' },
  { value: 'totvs', label: 'TOTVS' },
  { value: 'omie', label: 'Omie' },
  { value: 'sankhya', label: 'Sankhya' },
  { value: 'tiny', label: 'Tiny' },
  { value: 'outro', label: 'Outro' },
  { value: 'nenhum', label: 'Nao uso ERP' },
]

export interface OnboardingStatus {
  // Steps obrigatorios
  precisa_trocar_senha: boolean
  precisa_completar_dados: boolean
  // Step opcional (pode pular com 'lembrar amanha')
  precisa_responder_perfil: boolean
  // Pre-fill (dados ja conhecidos)
  empresa: {
    id: number
    cnpj: string | null
    razao_social: string | null
    nome_fantasia: string | null
    celular_principal: string | null
    endereco_resumido: string | null
    erp_usado: ErpUsado | null
    numero_colaboradores: number | null
    num_lojas: number | null
    pedidos_medio_mes: number | null
  } | null
  user: {
    nome: string | null
    email: string
  }
}

export interface OnboardingSubmitRequest {
  // Senha (obrigatorio se precisa_trocar_senha)
  nova_senha?: string
  // Dados empresa
  razao_social?: string
  nome_fantasia?: string
  celular_principal?: string
  endereco_resumido?: string
  // Perfil (opcional)
  erp_usado?: ErpUsado
  numero_colaboradores?: number
  num_lojas?: number
  pedidos_medio_mes?: number
  // Flag pra adiar perfil
  adiar_perfil?: boolean
}

export interface OnboardingSubmitResponse {
  success: true
  onboarding_completo: boolean
}
