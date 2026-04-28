/**
 * Types da Landing Page do Fornecedor.
 */

export type LpModo = 'todos' | 'comprados' | 'selecao'

export interface LandingPage {
  id: number
  fornecedor_id: number
  empresa_id_fornecedor: number
  empresa_id_lojista: number | null
  slug: string
  nome: string
  modo: LpModo
  cor_marca: string | null // legacy, nao usado no render
  logo_url: string | null
  banner_url: string | null
  hero_titulo: string | null
  hero_subtitulo: string | null
  descricao: string | null
  whatsapp_contato: string | null
  instagram_url: string | null
  site_url: string | null
  endereco_resumido: string | null
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
  /** Opcional. Se ausente, LP e generica (publica do fornecedor). */
  empresa_id_lojista?: number | null
  nome: string
  modo: LpModo
  produtos_ids?: number[]
  logo_url?: string
  banner_url?: string
  hero_titulo?: string
  hero_subtitulo?: string
  descricao?: string
  whatsapp_contato?: string
  instagram_url?: string
  site_url?: string
  endereco_resumido?: string
  slug?: string
}

export interface UpdateLpRequest extends Partial<Omit<CreateLpRequest, 'empresa_id_lojista'>> {
  ativa?: boolean
  cor_marca?: string | null // legacy
}

export interface LpListItem extends LandingPage {
  /** Quando LP e generica, esses campos vem null. */
  lojista_razao_social: string | null
  lojista_nome_fantasia: string | null
  lojista_cnpj: string | null
  produtos_count: number
}
