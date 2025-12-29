// Tipos para o módulo de fornecedores

export type TipoPessoa = 'F' | 'J' // F = Física, J = Jurídica
export type Contribuinte = '1' | '2' | '9' // 1 = Contribuinte ICMS, 2 = Contribuinte isento, 9 = Não contribuinte

export type RelacaoVenda = 'fabricante' | 'distribuidor' | 'atacadista' | 'representante' | 'varejista'

export interface EnderecoFornecedor {
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  pais?: string
}

export interface ContatoFornecedor {
  telefone?: string
  celular?: string
  email?: string
  contato_nome?: string
}

export interface PoliticaCompra {
  id?: number
  fornecedor_id: number
  empresa_id: number
  forma_pagamento_dias: number[] // Ex: [21, 28, 35] para 21/28/35 dias
  prazo_entrega: number // dias
  prazo_estoque: number // dias
  valor_minimo: number
  peso?: number
  desconto?: number // percentual
  bonificacao?: number // percentual
  observacao?: string
  estoque_eficiente: boolean
  status?: boolean
}

export interface ProdutoFornecedor {
  id: number
  produto_id: number
  fornecedor_id: number
  codigo?: string
  nome: string
  item_por_caixa?: number
  data_ultima_compra?: string
  qtd_ultima_compra?: number
  data_ultima_venda?: string
  dias_estoque?: number
  estoque_atual?: number
  periodo_ultima_venda?: number
  valor_de_compra?: number
  precocusto?: number
}

export interface Fornecedor {
  id: number
  id_bling?: number
  id_contato_bling?: number
  empresa_id: number

  // Dados principais
  nome: string
  nome_fantasia?: string
  razao_social?: string
  codigo?: string

  // Documentos
  tipo_pessoa: TipoPessoa
  cnpj?: string
  cpf?: string
  rg?: string
  inscricao_estadual?: string
  ie_isento?: boolean
  contribuinte?: Contribuinte

  // Classificação tributária
  codigo_regime_tributario?: string
  orgao_emissor?: string

  // Relação comercial
  relacao_venda?: RelacaoVenda[]
  cliente_desde?: string

  // Contato
  telefone?: string
  celular?: string
  email?: string

  // Endereço (JSON na tabela)
  endereco?: EnderecoFornecedor

  // Metadados
  created_at?: string
  updated_at?: string

  // Campos calculados/relacionados (não persistidos diretamente)
  produtos_vinculados?: number
}

// Interface para listagem (campos reduzidos)
export interface FornecedorListItem {
  id: number
  nome: string
  nome_fantasia?: string
  cnpj?: string
  cpf?: string
  telefone?: string
  celular?: string
  produtos_vinculados?: number
}

// Interface para formulário
export interface FornecedorFormData {
  // Dados principais
  nome: string
  nome_fantasia?: string
  codigo?: string

  // Documentos
  tipo_pessoa: TipoPessoa
  cnpj?: string
  cpf?: string
  rg?: string
  inscricao_estadual?: string
  ie_isento?: boolean
  contribuinte?: Contribuinte

  // Classificação tributária
  codigo_regime_tributario?: string
  orgao_emissor?: string

  // Relação comercial
  relacao_venda?: RelacaoVenda[]
  cliente_desde?: string

  // Contato
  telefone?: string
  celular?: string
  email?: string

  // Endereço
  endereco?: EnderecoFornecedor
}

// Interface para criar/atualizar política de compra
export interface PoliticaCompraFormData {
  forma_pagamento_dias: number[]
  prazo_entrega: number
  prazo_estoque: number
  valor_minimo: number
  peso?: number
  desconto?: number
  bonificacao?: number
  observacao?: string
  estoque_eficiente: boolean
}
