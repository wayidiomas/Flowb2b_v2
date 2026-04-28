/**
 * Types da Landing Page do Fornecedor.
 */

export type LpModo = 'todos' | 'comprados' | 'selecao'

export interface LandingPage {
  id: number
  fornecedor_id: number
  empresa_id_fornecedor: number
  empresa_id_lojista: number
  slug: string
  nome: string
  modo: LpModo
  cor_marca: string | null
  logo_url: string | null
  banner_url: string | null
  hero_titulo: string | null
  hero_subtitulo: string | null
  ativa: boolean
  deletada_em: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string | null
}

export interface LandingPageProduto {
  landing_page_id: number
  produto_id: number
  ordem: number
  preco_override: number | null
  destaque: boolean
}

export interface CreateLpRequest {
  empresa_id_lojista: number
  nome: string
  modo: LpModo
  produtos_ids?: number[]
  cor_marca?: string
  logo_url?: string
  banner_url?: string
  hero_titulo?: string
  hero_subtitulo?: string
  slug?: string
}

export interface UpdateLpRequest extends Partial<Omit<CreateLpRequest, 'empresa_id_lojista'>> {
  ativa?: boolean
}

export interface LpListItem extends LandingPage {
  lojista_razao_social: string
  lojista_nome_fantasia: string | null
  lojista_cnpj: string
  produtos_count: number
}
