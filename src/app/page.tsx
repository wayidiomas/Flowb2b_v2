'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
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
  Legend,
} from 'recharts'

export default function Home() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      {/* Page Header with company switcher */}
      <PageHeader title="Dashboard" />

      {/* Principais Metricas */}
      <Card className="mb-6" padding="md">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Principais Metricas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Compras totais"
            sublabel="Este mes"
            value="R$ 200.000,00"
            data={[
              { value: 30 }, { value: 25 }, { value: 35 }, { value: 28 },
              { value: 40 }, { value: 35 }, { value: 50 }, { value: 45 },
            ]}
            color="#336FB6"
          />
          <MetricCard
            label="Produtos com baixo estoque"
            value="R$ 43,00"
            data={[
              { value: 50 }, { value: 45 }, { value: 40 }, { value: 35 },
              { value: 30 }, { value: 35 }, { value: 25 }, { value: 20 },
            ]}
            color="#E91E63"
          />
          <MetricCard
            label="Valor em Estoque"
            value="R$ 400.000,00"
            data={[
              { value: 20 }, { value: 25 }, { value: 30 }, { value: 35 },
              { value: 32 }, { value: 40 }, { value: 45 }, { value: 50 },
            ]}
            color="#4CAF50"
          />
          <MetricCard
            label="Produtos em curva A"
            value="75 produtos"
            data={[
              { value: 35 }, { value: 40 }, { value: 38 }, { value: 45 },
              { value: 42 }, { value: 50 }, { value: 48 }, { value: 55 },
            ]}
            color="#9C27B0"
          />
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Principais Fornecedores - Pie Chart */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Principais fornecedores</h3>
          <SuppliersPieChart />
        </Card>

        {/* Principais Produtos Curva A - Bar Chart */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Principais produtos curva A x Numero de Vendas</h3>
          <ProductsBarChart />
        </Card>
      </div>

      {/* Pedido de Compras por Periodo */}
      <Card className="mb-6" padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Pedido de compras por periodo</h3>
          <div className="flex gap-2">
            <PeriodButton label="7 dias" active={false} />
            <PeriodButton label="30 dias" active={false} />
            <PeriodButton label="12 meses" active={true} />
          </div>
        </div>
        <PurchasesBarChart />
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
          <div className="space-y-4">
            <ActivityItem
              title="Sincronizacao concluida"
              description="Produtos sincronizados com Bling"
              time="Ha 2 horas"
              type="success"
            />
            <ActivityItem
              title="Novo pedido de venda"
              description="Pedido #12345 - Cliente ABC Ltda"
              time="Ha 3 horas"
              type="info"
            />
            <ActivityItem
              title="Estoque baixo"
              description="15 produtos abaixo do estoque minimo"
              time="Ha 5 horas"
              type="warning"
            />
            <ActivityItem
              title="Nota fiscal emitida"
              description="NF-e 000123456 - R$ 5.432,10"
              time="Ontem"
              type="info"
            />
          </div>
          <Link
            href="/atividades"
            className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Ver todas as atividades
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </Card>
      </div>
    </DashboardLayout>
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
const supplierData = [
  { name: 'Fornecedor 1', value: 27, color: '#5B93D3' },
  { name: 'Fornecedor 2', value: 27, color: '#2660A5' },
  { name: 'Fornecedor 3', value: 27, color: '#FFBE4A' },
  { name: 'Outros', value: 19, color: '#4CAF50' },
]

function SuppliersPieChart() {
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={supplierData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={70}
              dataKey="value"
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {supplierData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {supplierData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== PRODUCTS HORIZONTAL BAR CHART =====
const productsData = [
  { name: 'Racao Golden Premium', vendas: 150 },
  { name: 'Racao Golden Special', vendas: 120 },
  { name: 'Racao Golden Cat', vendas: 95 },
  { name: 'Racao Golden Filhote', vendas: 60 },
  { name: 'Racao Golden Senior', vendas: 25 },
]

function ProductsBarChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={productsData}
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" domain={[0, 150]} tickCount={6} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="vendas" radius={[0, 4, 4, 0]}>
            {productsData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={['#2660A5', '#336FB6', '#FFBE4A', '#5B93D3', '#8BB8E8'][index]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ===== PURCHASES VERTICAL BAR CHART =====
const purchasesData = [
  { month: 'JAN', valor: 3200000 },
  { month: 'FEB', valor: 2800000 },
  { month: 'MAR', valor: 3500000 },
  { month: 'APR', valor: 2500000 },
  { month: 'MAY', valor: 2800000 },
  { month: 'JUN', valor: 3800000 },
  { month: 'JUL', valor: 3000000 },
  { month: 'AUG', valor: 2200000 },
  { month: 'SEP', valor: 4200000 },
  { month: 'OCT', valor: 2500000 },
  { month: 'NOV', valor: 3000000 },
  { month: 'DEC', valor: 5800000 },
]

function PurchasesBarChart() {
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={purchasesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`R$ ${formatValue(Number(value ?? 0))}`, 'Valor']}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Bar dataKey="valor" fill="#336FB6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ===== PERIOD BUTTON =====
function PeriodButton({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      className={`
        px-4 py-1.5 rounded-full text-sm font-medium transition-colors
        ${active
          ? 'bg-[#2660A5] text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </Link>
  )
}

// ===== ACTIVITY ITEM =====
function ActivityItem({
  title,
  description,
  time,
  type,
}: {
  title: string
  description: string
  time: string
  type: 'success' | 'warning' | 'error' | 'info'
}) {
  const colors = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-primary-500',
  }

  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-2 ${colors[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  )
}
