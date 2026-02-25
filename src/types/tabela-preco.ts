export interface TabelaPreco {
  id: number
  fornecedor_id: number
  empresa_id: number
  nome: string
  vigencia_inicio: string | null
  vigencia_fim: string | null
  status: 'ativa' | 'inativa' | 'expirada'
  observacao: string | null
  created_at: string
  updated_at: string
  // Joins
  fornecedor_nome?: string
  empresa_nome?: string
  total_itens?: number
}

export interface ItemTabelaPreco {
  id: number
  tabela_preco_id: number
  produto_id: number | null
  codigo: string | null
  nome: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_original: number | null
  preco_tabela: number
  desconto_percentual: number | null
  created_at: string
}
