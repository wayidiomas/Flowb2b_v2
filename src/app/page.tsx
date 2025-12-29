'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardData, useProdutosCurva } from '@/hooks'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { Card } from '@/components/ui'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PIE_COLORS, BAR_COLORS, type IntervaloGrafico } from '@/types/dashboard'

// Formatar valor em reais
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formatar valor compacto (ex: 64K, 1.2M)
function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

// Formatar tempo relativo
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Agora'
  if (diffHours < 24) return `Ha ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `Ha ${diffDays} dias`
  return date.toLocaleDateString('pt-BR')
}

type CurvaType = 'A' | 'B' | 'C' | undefined

export default function Home() {
  const { loading: authLoading } = useAuth()
  const [curvaSelecionada, setCurvaSelecionada] = useState<CurvaType>('A')
  const {
    metrics,
    fornecedores,
    produtosCurvaA,
    pedidosPeriodo,
    atividadeRecente,
    loading,
    intervalo,
    setIntervalo,
  } = useDashboardData()

  const { data: produtosCurva, loading: loadingCurva } = useProdutosCurva(curvaSelecionada)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-sm text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  // Dados para sparklines das metricas
  const comprasSparkData = [
    { value: 30 }, { value: 25 }, { value: 35 }, { value: 28 },
    { value: 40 }, { value: 35 }, { value: 50 }, { value: metrics?.compras_totais ? 55 : 45 },
  ]
  const estoqueSparkData = [
    { value: 20 }, { value: 25 }, { value: 30 }, { value: 35 },
    { value: 32 }, { value: 40 }, { value: 45 }, { value: 50 },
  ]
  const baixoEstoqueSparkData = [
    { value: 50 }, { value: 45 }, { value: 40 }, { value: 35 },
    { value: 30 }, { value: 35 }, { value: 25 }, { value: 20 },
  ]
  const curvaASparkData = [
    { value: 35 }, { value: 40 }, { value: 38 }, { value: 45 },
    { value: 42 }, { value: 50 }, { value: 48 }, { value: 55 },
  ]

  return (
    <DashboardLayout>
      <PageHeader title="Dashboard" />

      {/* Principais Metricas */}
      <Card className="mb-6" padding="md">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Principais Metricas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Compras totais"
            sublabel="Pedidos emitidos"
            value={formatCurrency(metrics?.compras_totais || 0)}
            data={comprasSparkData}
            color="#336FB6"
          />
          <MetricCard
            label="Produtos com baixo estoque"
            value={`${metrics?.produtos_baixo_estoque || 0} produtos`}
            data={baixoEstoqueSparkData}
            color="#E91E63"
          />
          <MetricCard
            label="Valor em Estoque"
            value={formatCurrency(metrics?.valor_estoque || 0)}
            data={estoqueSparkData}
            color="#4CAF50"
          />
          <MetricCard
            label="Produtos em curva A"
            value={`${metrics?.produtos_curva_a || 0} produtos`}
            data={curvaASparkData}
            color="#9C27B0"
          />
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Principais Fornecedores - Pie Chart */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Principais fornecedores</h3>
          {fornecedores.length > 0 ? (
            <SuppliersPieChart data={fornecedores} />
          ) : (
            <EmptyState message="Nenhum dado de fornecedor" />
          )}
        </Card>

        {/* Principais Produtos Curva A - Bar Chart */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Principais produtos curva A x Numero de Vendas
          </h3>
          {produtosCurvaA.length > 0 ? (
            <ProductsBarChart data={produtosCurvaA} />
          ) : (
            <EmptyState message="Nenhum produto curva A" />
          )}
        </Card>
      </div>

      {/* Pedido de Compras por Periodo */}
      <Card className="mb-6" padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Pedido de compras por periodo</h3>
          <div className="flex gap-2">
            <PeriodButton
              label="7 dias"
              active={intervalo === '7_dias'}
              onClick={() => setIntervalo('7_dias')}
            />
            <PeriodButton
              label="30 dias"
              active={intervalo === '30_dias'}
              onClick={() => setIntervalo('30_dias')}
            />
            <PeriodButton
              label="12 meses"
              active={intervalo === '12_meses'}
              onClick={() => setIntervalo('12_meses')}
            />
          </div>
        </div>
        {pedidosPeriodo.length > 0 ? (
          <PurchasesBarChart data={pedidosPeriodo} intervalo={intervalo} />
        ) : (
          <EmptyState message="Nenhum pedido no periodo" />
        )}
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acoes Rapidas */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Acoes Rapidas</h3>
          <div className="space-y-3">
            <QuickAction
              label="Nova Sugestao de Compra"
              href="/compras/sugestao/nova"
              icon={<PlusIcon />}
            />
            <QuickAction
              label="Sincronizar Produtos"
              href="/configuracoes/sync"
              icon={<SyncIcon />}
            />
            <QuickAction
              label="Ver Produtos com Estoque Baixo"
              href="/estoque/produtos?filter=estoque_baixo"
              icon={<AlertIcon />}
            />
            <QuickAction
              label="Consultar Notas Fiscais"
              href="/fiscal/notas"
              icon={<DocumentIcon />}
            />
          </div>
        </Card>

        {/* Atividade Recente */}
        <Card padding="md" className="lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Atividade Recente</h3>
          {atividadeRecente.length > 0 ? (
            <div className="space-y-4">
              {atividadeRecente.map((atividade, index) => (
                <ActivityItem
                  key={index}
                  title={atividade.titulo}
                  description={atividade.descricao}
                  time={formatRelativeTime(atividade.data)}
                  activityType={atividade.tipo}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma atividade recente" />
          )}
        </Card>
      </div>

      {/* Tabela de Produtos por Curva */}
      <Card className="mt-6" padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Produtos por Curva</h3>
          <div className="flex gap-2">
            <CurvaButton
              label="Curva A"
              active={curvaSelecionada === 'A'}
              onClick={() => setCurvaSelecionada('A')}
              color="bg-green-500"
            />
            <CurvaButton
              label="Curva B"
              active={curvaSelecionada === 'B'}
              onClick={() => setCurvaSelecionada('B')}
              color="bg-yellow-500"
            />
            <CurvaButton
              label="Curva C"
              active={curvaSelecionada === 'C'}
              onClick={() => setCurvaSelecionada('C')}
              color="bg-red-500"
            />
            <CurvaButton
              label="Todas"
              active={curvaSelecionada === undefined}
              onClick={() => setCurvaSelecionada(undefined)}
              color="bg-gray-500"
            />
          </div>
        </div>

        {loadingCurva ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : produtosCurva.length > 0 ? (
          <ProdutosCurvaTable data={produtosCurva} />
        ) : (
          <EmptyState message="Nenhum produto encontrado" />
        )}
      </Card>
    </DashboardLayout>
  )
}

// ===== EMPTY STATE =====
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{message}</div>
  )
}

// ===== METRIC CARD WITH SPARKLINE =====
function MetricCard({
  label,
  sublabel,
  value,
  data,
  color,
}: {
  label: string
  sublabel?: string
  value: string
  data: { value: number }[]
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
        {sublabel && <p className="text-[10px] text-gray-400">{sublabel}</p>}
      </div>
      <div className="w-20 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ===== SUPPLIERS PIE CHART =====
function SuppliersPieChart({ data }: { data: { fornecedor_nome: string; percentual: number }[] }) {
  return (
    <div className="flex items-center justify-center gap-8">
      <div className="w-44 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={75}
              dataKey="percentual"
              nameKey="fornecedor_nome"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Participacao']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.fornecedor_nome} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
            />
            <div className="flex flex-col">
              <span
                className="text-sm text-gray-700 font-medium max-w-[160px] truncate"
                title={item.fornecedor_nome}
              >
                {item.fornecedor_nome}
              </span>
              <span className="text-xs text-gray-500">{Number(item.percentual).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== PRODUCTS HORIZONTAL BAR CHART =====
function ProductsBarChart({ data }: { data: { produto_nome: string; numero_vendas: number }[] }) {
  const chartData = data.map((p) => ({
    name: p.produto_nome.length > 20 ? p.produto_nome.substring(0, 20) + '...' : p.produto_nome,
    vendas: Number(p.numero_vendas),
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="vendas" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ===== PURCHASES VERTICAL BAR CHART =====
function PurchasesBarChart({
  data,
  intervalo,
}: {
  data: { periodo: string; total_pedidos: number }[]
  intervalo: IntervaloGrafico
}) {
  const chartData = data.map((p) => ({
    periodo: formatPeriodo(p.periodo, intervalo),
    valor: Number(p.total_pedidos),
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), 'Total']}
            labelFormatter={(label) => `Periodo: ${label}`}
          />
          <Bar dataKey="valor" fill="#336FB6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Formatar periodo para exibicao
function formatPeriodo(periodo: string, intervalo: IntervaloGrafico): string {
  if (intervalo === '12_meses') {
    // "2025 Dec" -> "Dec" ou "Dec'24" se for ano diferente
    const parts = periodo.split(' ')
    const year = parts[0]
    const month = parts[1] || periodo
    const currentYear = new Date().getFullYear().toString()
    if (year !== currentYear) {
      return `${month}'${year.slice(2)}`
    }
    return month
  }
  // "2025-12-28" -> "28"
  const parts = periodo.split('-')
  return parts[2] || periodo
}

// ===== PERIOD BUTTON =====
function PeriodButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1.5 rounded-full text-sm font-medium transition-colors
        ${active ? 'bg-[#2660A5] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
      `}
    >
      {label}
    </button>
  )
}

// ===== ICONS =====
function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function SyncIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}

// ===== QUICK ACTION =====
function QuickAction({
  label,
  href,
  icon,
}: {
  label: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  )
}

// ===== ACTIVITY ITEM =====
function ActivityItem({
  title,
  description,
  time,
  activityType,
}: {
  title: string
  description: string
  time: string
  activityType: string
}) {
  const config: Record<string, { icon: React.ReactNode; bgColor: string; textColor: string; label: string }> = {
    pedido_venda: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      label: 'Venda',
    },
    pedido_compra: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      label: 'Compra',
    },
    nota_fiscal: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      label: 'NF',
    },
    fornecedor: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      label: 'Fornecedor',
    },
  }

  const { icon, bgColor, textColor, label } = config[activityType] || config.pedido_venda

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${bgColor} ${textColor} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${bgColor} ${textColor}`}>
            {label}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  )
}

// ===== CURVA BUTTON =====
function CurvaButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
        ${active ? 'bg-[#2660A5] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
      `}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-white' : color}`} />
      {label}
    </button>
  )
}

// ===== PRODUTOS CURVA TABLE =====
interface ProdutoCurvaData {
  produto_id: number
  produto_nome: string
  numero_vendas: number
  curva?: string
  quantidade_em_estoque?: number
  condicao_de_ruptura?: boolean
}

function ProdutosCurvaTable({ data }: { data: ProdutoCurvaData[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(data.length / itemsPerPage)

  const curvaColors: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-yellow-100 text-yellow-700',
    C: 'bg-red-100 text-red-700',
  }

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Produto
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Curva
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Vendas
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Estoque
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((produto) => (
              <tr
                key={produto.produto_id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-900 font-medium" title={produto.produto_nome}>
                    {produto.produto_nome.length > 40
                      ? produto.produto_nome.substring(0, 40) + '...'
                      : produto.produto_nome}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      curvaColors[produto.curva || 'C'] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {produto.curva || '-'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-gray-700">
                    {Number(produto.numero_vendas).toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`text-sm font-medium ${
                      (produto.quantidade_em_estoque || 0) <= 0
                        ? 'text-red-600'
                        : (produto.quantidade_em_estoque || 0) < 10
                          ? 'text-yellow-600'
                          : 'text-gray-700'
                    }`}
                  >
                    {(produto.quantidade_em_estoque || 0).toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {produto.condicao_de_ruptura ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      Ruptura
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginacao */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, data.length)} de{' '}
            {data.length} produtos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 5) return true
                  if (page === 1 || page === totalPages) return true
                  if (Math.abs(page - currentPage) <= 1) return true
                  return false
                })
                .map((page, index, arr) => (
                  <span key={page}>
                    {index > 0 && arr[index - 1] !== page - 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
