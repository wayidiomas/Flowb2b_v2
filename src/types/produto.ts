// Interface completa do produto
export interface Produto {
  id: number
  id_produto_bling?: string | null
  empresa_id: number
  codigo: string
  nome: string
  preco: number
  tipo: string
  situacao: string
  formato: string
  unidade: string
  condicao?: string
  marca?: string
  producao?: string
  data_validade?: string
  peso_liquido?: number
  peso_bruto?: number
  volumes?: number
  itens_por_caixa?: number
  unidade_medida?: string
  gtin?: string
  gtin_embalagem?: string
  estoque_atual?: number
  estoque_minimo?: number
  estoque_maximo?: number
  ncm?: string
  cest?: string
  created_at?: string
  updated_at?: string
}

// Para listagem (campos reduzidos)
export interface ProdutoListItem {
  id: number
  codigo: string
  nome: string
  unidade: string
  preco: number
  estoque_atual: number
  situacao?: string
  tipo?: string
}

// Para formulario
export interface ProdutoFormData {
  id?: number
  nome: string
  codigo: string
  formato: string
  situacao: string
  tipo: string
  preco: number
  unidade: string
  condicao: string
  marca: string
  producao: string
  data_validade: string
  peso_liquido: number
  peso_bruto: number
  volumes: number
  itens_por_caixa: number
  unidade_medida: string
  gtin: string
  gtin_embalagem: string
}

// Fornecedor vinculado ao produto
export interface ProdutoFornecedor {
  fornecedor_id: number
  codigo?: string
  nome: string
  cnpj?: string
  telefone?: string
  valor_de_compra: number
  qtd_ultima_compra?: number
}

// Movimentacao de estoque
export interface MovimentacaoEstoqueProduto {
  id: number
  data: string
  tipo: 'Entrada' | 'Saida'
  quantidade: number
  origem?: string
  observacao?: string
  preco_venda?: number
  valor_de_compra?: number
  preco_custo?: number
}

// Opcoes para dropdowns
export const FORMATO_OPTIONS = [
  { value: 'S', label: 'Simples' },
  { value: 'V', label: 'Com variacoes' },
  { value: 'E', label: 'Com composicao' },
]

export const TIPO_OPTIONS = [
  { value: 'P', label: 'Produto' },
  { value: 'S', label: 'Servico' },
]

export const SITUACAO_OPTIONS = [
  { value: 'A', label: 'Ativo' },
  { value: 'I', label: 'Inativo' },
]

export const CONDICAO_OPTIONS = [
  { value: '0', label: 'Nao Especificado' },
  { value: '1', label: 'Novo' },
  { value: '2', label: 'Usado' },
]

export const PRODUCAO_OPTIONS = [
  { value: 'P', label: 'Propria' },
  { value: 'T', label: 'Terceiros' },
]

export const UNIDADE_MEDIDA_OPTIONS = [
  { value: 'Metros', label: 'Metros' },
  { value: 'Centimetros', label: 'Centimetros' },
  { value: 'Milimetros', label: 'Milimetros' },
]
