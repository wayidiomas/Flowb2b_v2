// Tipos para o modulo de Pedidos de Compra

export type SituacaoPedido = 1 | 2 | 3 | 4 | 5

export const SITUACAO_LABELS: Record<SituacaoPedido, string> = {
  1: 'Emitida',
  2: 'Cancelada',
  3: 'Registrada',
  4: 'Aguardando Entrega',
  5: 'Rascunho'
}

export const SITUACAO_COLORS: Record<SituacaoPedido, { bg: string; text: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-700' },
  2: { bg: 'bg-red-100', text: 'text-red-700' },
  3: { bg: 'bg-blue-100', text: 'text-blue-700' },
  4: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  5: { bg: 'bg-gray-100', text: 'text-gray-700' }
}

// Item retornado pela RPC de listagem
export interface PedidoCompraListItem {
  pedido_id: number
  numero_pedido: string
  data_pedido: string
  fornecedor_nome: string
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

// Parcela do pedido
export interface ParcelaPedido {
  id?: number
  valor: number
  data_vencimento: string
  forma_pagamento_id?: number
  forma_pagamento_nome?: string
}

// Fornecedor para select
export interface FornecedorOption {
  id: number
  nome: string
  cnpj?: string
}

// Produto do fornecedor (para modal de adicao)
export interface ProdutoFornecedor {
  produto_id: number
  codigo: string
  nome: string
  unidade: string
  valor_de_compra: number
  estoque_atual: number
  gtin?: string
}

// Opcoes de frete por conta
export const FRETE_POR_CONTA_OPTIONS = [
  { value: 'CIF', label: 'CIF - Frete por conta do remetente' },
  { value: 'FOB', label: 'FOB - Frete por conta do destinatario' },
  { value: 'Terceiros', label: 'Terceiros' },
  { value: 'Sem transporte', label: 'Sem transporte' },
]

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
