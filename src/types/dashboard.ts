// Tipos para as RPCs do Dashboard

export interface DashboardMetrics {
  compras_totais: number
  produtos_baixo_estoque: number
  valor_estoque: number
  produtos_curva_a: number
}

export interface Fornecedor {
  fornecedor_nome: string
  total_compras: number
  percentual: number
  [key: string]: string | number
}

export interface ProdutoCurvaA {
  produto_id: number
  produto_nome: string
  numero_vendas: number
  [key: string]: string | number
}

export interface PedidoPeriodo {
  periodo: string
  total_pedidos: number
  [key: string]: string | number
}

export interface ProdutoCurva {
  produto_id: number
  produto_nome: string
  ticket_medio: number
  quantidade_em_estoque: number
  numero_vendas: number
  numero_vendas_este_mes: number
  curva: 'A' | 'B' | 'C'
  empresa_id: number
  fornecedores_ids_vinculados: string | null
  condicao_de_ruptura: boolean
}

export interface AtividadeRecente {
  tipo: 'pedido_venda' | 'pedido_compra' | 'nota_fiscal' | 'fornecedor' | 'sync' | 'estoque'
  titulo: string
  descricao: string
  data: string
  status: 'success' | 'warning' | 'error' | 'info'
}

export type IntervaloGrafico = '7_dias' | '30_dias' | '12_meses'

// Top produtos vendidos
export interface TopProdutoVendido {
  produto_id: number
  produto_nome: string
  produto_codigo: string
  quantidade_vendida: number
  valor_total: number
  numero_pedidos: number
}

// Produtos de alta rotatividade
export interface ProdutoAltaRotatividade {
  produto_id: number
  produto_nome: string
  produto_codigo: string
  quantidade_vendida: number
  quantidade_comprada: number
  estoque_atual: number
  vendas_por_dia: number
  compras_por_dia: number
  indice_rotatividade: number
  dias_estoque: number | null
}

// Variação do valor em estoque
export interface VariacaoEstoque {
  data: string
  valor_total: number
  quantidade_total: number
  variacao_valor: number | null
  variacao_percentual: number | null
}

// Cores para os gráficos
export const CHART_COLORS = {
  primary: '#336FB6',
  secondary: '#5B93D3',
  tertiary: '#8BB8E8',
  accent: '#FFBE4A',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#E91E63',
  purple: '#9C27B0',
} as const

// Cores para o gráfico de pizza (fornecedores)
export const PIE_COLORS = ['#5B93D3', '#2660A5', '#FFBE4A', '#4CAF50']

// Cores para o gráfico de barras (produtos curva A)
export const BAR_COLORS = ['#2660A5', '#336FB6', '#FFBE4A', '#5B93D3', '#8BB8E8']
