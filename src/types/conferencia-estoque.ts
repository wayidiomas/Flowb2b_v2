// Status da conferência
export type ConferenciaStatus =
  | 'em_andamento'
  | 'enviada'
  | 'aceita'
  | 'rejeitada'
  | 'parcialmente_aceita'

// Conferência de Estoque (cabeçalho)
export interface ConferenciaEstoque {
  id: number
  empresa_id: number
  fornecedor_id: number
  user_fornecedor_id: number | null
  status: ConferenciaStatus
  data_inicio: string
  data_envio: string | null
  data_resposta: string | null
  observacao_fornecedor: string | null
  observacao_lojista: string | null
  total_itens: number
  total_divergencias: number
  created_at: string
  updated_at: string
  // Joins
  empresa_nome?: string
  fornecedor_nome?: string
}

// Item da conferência (produto bipado)
export interface ItemConferenciaEstoque {
  id: number
  conferencia_id: number
  produto_id: number
  codigo: string | null
  gtin: string | null
  nome: string | null
  estoque_conferido: number
  estoque_sistema: number | null
  aceito: boolean | null  // null = pendente
  observacao: string | null
  created_at: string
}

// Payload para bipar produto
export interface BiparProdutoPayload {
  gtin: string  // EAN ou código do produto
  quantidade: number
}

// Payload para aceitar sugestão
export interface AceitarSugestaoPayload {
  aceitar_todos?: boolean
  itens_aceitos?: number[]  // IDs dos itens aceitos
  observacao?: string
}
