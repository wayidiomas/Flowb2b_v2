// Tipos para o modulo de Pedidos de Compra
// Valores de situacao do Bling para pedido de compra:
// 0: Em aberto (Registrada)
// 1: Atendido
// 2: Cancelado
// 3: Em andamento

export type SituacaoPedido = 0 | 1 | 2 | 3

export const SITUACAO_LABELS: Record<SituacaoPedido, string> = {
  0: 'Em Aberto',
  1: 'Atendido',
  2: 'Cancelado',
  3: 'Em Andamento'
}

export const SITUACAO_COLORS: Record<SituacaoPedido, { bg: string; text: string }> = {
  0: { bg: 'bg-blue-100', text: 'text-blue-700' },
  1: { bg: 'bg-green-100', text: 'text-green-700' },
  2: { bg: 'bg-red-100', text: 'text-red-700' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-700' }
}

// Item retornado pela RPC de listagem
export interface PedidoCompraListItem {
  pedido_id: number
  numero_pedido: string
  data_pedido: string
  fornecedor_nome: string
  fornecedor_id?: number
  fornecedor_telefone?: string
  observacoes_internas?: string
  valor_total: number
  status: string
  empresa_id: number
  itens_produtos: ItemPedidoResumo[]
}

export interface ItemPedidoResumo {
  id: number
  descricao: string
  quantidade: number
  valor: number
}

// Item completo do pedido (para edicao)
export interface ItemPedidoCompra {
  id?: number
  produto_id?: number
  id_produto_bling?: number  // ID do produto no Bling
  descricao: string
  codigo_produto?: string
  codigo_fornecedor?: string
  unidade: string
  quantidade: number
  valor: number
  aliquota_ipi: number
  preco_total?: number
  estoque_atual?: number
  ean?: string
}

// Dados do formulario de pedido
export interface PedidoCompraFormData {
  fornecedor_id: number
  fornecedor_nome?: string
  data: string
  data_prevista: string
  ordem_compra?: string
  observacoes?: string
  observacoes_internas?: string
  desconto: number
  frete: number
  total_icms: number
  transportador?: string
  frete_por_conta: string
  politica_id?: number
  situacao: SituacaoPedido
  itens: ItemPedidoCompra[]
}

// Politica de compra do fornecedor
export interface PoliticaCompra {
  id: number
  fornecedor_id: number
  valor_minimo?: number
  desconto?: number
  bonificacao?: number
  prazo_entrega?: number
  forma_pagamento_dias?: number[]
  observacao?: string
  status?: string
}

// Forma de pagamento
export interface FormaPagamento {
  id: number
  id_bling: number              // id_forma_de_pagamento_bling
  descricao: string
  tipo_pagamento?: number
  situacao?: number
}

// Parcela do pedido
export interface ParcelaPedido {
  id?: number
  valor: number
  data_vencimento: string
  observacao?: string
  forma_pagamento_id?: number          // ID interno (Supabase)
  forma_pagamento_id_bling?: number    // ID Bling da forma de pagamento
  forma_pagamento_nome?: string
}

// Fornecedor para select
export interface FornecedorOption {
  id: number
  nome: string
  cnpj?: string
  total_pedidos?: number
  valor_total_comprado?: number
}

// Fornecedor com ID Bling (para criacao de pedidos)
export interface FornecedorComBling {
  id: number
  id_bling: number
  nome: string
  cnpj?: string
}

// Produto do fornecedor (para modal de adicao)
export interface ProdutoFornecedor {
  produto_id: number
  id_produto_bling?: number  // ID do produto no Bling
  codigo: string
  nome: string
  unidade: string
  valor_de_compra: number
  estoque_atual: number
  gtin?: string
}

// Tipo de frete por conta (valores do Bling)
export type FretePorContaBling = 0 | 1 | 2 | 3 | 4 | 9
export type FretePorContaLabel = 'CIF' | 'FOB' | 'TERCEIROS' | 'PROPRIO_REMETENTE' | 'PROPRIO_DESTINATARIO' | 'SEM_FRETE'

// Mapeamento de labels para valores do Bling
export const FRETE_POR_CONTA_MAP: Record<FretePorContaLabel, FretePorContaBling> = {
  'CIF': 0,                    // Remetente paga (fornecedor entrega)
  'FOB': 1,                    // Destinatario paga (voce busca/paga frete)
  'TERCEIROS': 2,              // Terceiros pagam
  'PROPRIO_REMETENTE': 3,      // Transporte proprio do fornecedor
  'PROPRIO_DESTINATARIO': 4,   // Transporte proprio seu
  'SEM_FRETE': 9,              // Sem ocorrencia de transporte
}

// Opcoes de frete por conta para select
export const FRETE_POR_CONTA_OPTIONS = [
  { value: 'CIF', label: 'CIF - Fornecedor entrega (frete incluso)', blingValue: 0 },
  { value: 'FOB', label: 'FOB - Voce paga o frete', blingValue: 1 },
  { value: 'TERCEIROS', label: 'Terceiros pagam o frete', blingValue: 2 },
  { value: 'PROPRIO_REMETENTE', label: 'Transporte proprio do fornecedor', blingValue: 3 },
  { value: 'PROPRIO_DESTINATARIO', label: 'Transporte proprio seu', blingValue: 4 },
  { value: 'SEM_FRETE', label: 'Sem transporte / Retira no local', blingValue: 9 },
]

// Helper para converter label para valor Bling
export function getFreteBlingValue(label: string): FretePorContaBling {
  return FRETE_POR_CONTA_MAP[label as FretePorContaLabel] ?? 0
}

// Helper para calcular total do pedido no frontend
// Nota: No Bling o total eh calculado automaticamente
export function calcularTotalPedido(params: {
  totalProdutos: number
  frete?: number
  desconto?: number
  fretePorConta?: string
}): number {
  const { totalProdutos, frete = 0, desconto = 0, fretePorConta } = params

  // Se CIF ou SEM_FRETE, frete nao soma (ja incluso ou nao existe)
  // Se FOB, TERCEIROS, PROPRIO_*, frete soma ao total
  const freteNaoSoma = fretePorConta === 'CIF' || fretePorConta === 'SEM_FRETE'
  const freteEfetivo = freteNaoSoma ? 0 : frete

  return totalProdutos + freteEfetivo - desconto
}

// Detalhes do pedido (retornado pela RPC get_pedido_compra_detalhes)
export interface PedidoCompraDetalhes {
  id: number
  numero: string
  data: string
  data_prevista?: string
  fornecedor_id: number
  fornecedor_nome: string
  situacao: SituacaoPedido
  total_produtos: number
  total: number
  desconto: number
  frete: number
  total_icms?: number
  transportador?: string
  frete_por_conta?: string
  observacoes?: string
  observacoes_internas?: string
  politica_id?: number
  itens: ItemPedidoCompra[]
  parcelas?: ParcelaPedido[]
}
