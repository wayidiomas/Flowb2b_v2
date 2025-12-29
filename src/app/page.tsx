'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { Card } from '@/components/ui'

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
            trend="up"
            color="blue"
          />
          <MetricCard
            label="Produtos com baixo estoque"
            value="R$ 43,00"
            trend="down"
            color="pink"
          />
          <MetricCard
            label="Valor em Estoque"
            value="R$ 400.000,00"
            trend="up"
            color="green"
          />
          <MetricCard
            label="Produtos em curva A"
            value="75 produtos"
            trend="up"
            color="purple"
          />
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Principais Fornecedores - Pie Chart */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Principais fornecedores</h3>
          <div className="flex items-center justify-center gap-8">
            <PieChart />
            <div className="space-y-2">
              <LegendItem color="#5B93D3" label="Fornecedor 1" />
              <LegendItem color="#2660A5" label="Fornecedor 2" />
              <LegendItem color="#FFBE4A" label="Fornecedor 3" />
              <LegendItem color="#4CAF50" label="Outros" />
            </div>
          </div>
        </Card>

        {/* Principais Produtos Curva A - Bar Chart */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Principais produtos curva A x Numero de Vendas</h3>
          <div className="space-y-3">
            <HorizontalBar label="Racao Golden" value={150} maxValue={150} color="#2660A5" />
            <HorizontalBar label="Racao Golden" value={120} maxValue={150} color="#336FB6" />
            <HorizontalBar label="Racao Golden" value={95} maxValue={150} color="#FFBE4A" />
            <HorizontalBar label="Racao Golden" value={60} maxValue={150} color="#5B93D3" />
            <HorizontalBar label="Racao Golden" value={25} maxValue={150} color="#8BB8E8" />
          </div>
          <div className="flex justify-between mt-3 text-xs text-gray-400">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>150</span>
          </div>
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
        <VerticalBarChart />
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

// ===== METRIC CARD =====
function MetricCard({
  label,
  sublabel,
  value,
  trend,
  color,
}: {
  label: string
  sublabel?: string
  value: string
  trend: 'up' | 'down'
  color: 'blue' | 'pink' | 'green' | 'purple'
}) {
  const colors = {
    blue: '#336FB6',
    pink: '#E91E63',
    green: '#4CAF50',
    purple: '#9C27B0',
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
        {sublabel && <p className="text-[10px] text-gray-400">{sublabel}</p>}
      </div>
      <SparkLine color={colors[color]} trend={trend} />
    </div>
  )
}

// ===== SPARKLINE =====
function SparkLine({ color, trend }: { color: string; trend: 'up' | 'down' }) {
  const path = trend === 'up'
    ? 'M0,20 Q10,18 20,15 T40,10 T60,8 T80,5'
    : 'M0,5 Q10,8 20,10 T40,15 T60,18 T80,20'

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" fill="none">
      <path d={path} stroke={color} strokeWidth="2" fill="none" />
    </svg>
  )
}

// ===== PIE CHART =====
function PieChart() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {/* Slice 1 - 27% - Light Blue */}
      <path
        d="M80,80 L80,10 A70,70 0 0,1 145,95 Z"
        fill="#5B93D3"
      />
      {/* Slice 2 - 27% - Dark Blue */}
      <path
        d="M80,80 L145,95 A70,70 0 0,1 50,140 Z"
        fill="#2660A5"
      />
      {/* Slice 3 - 27% - Yellow */}
      <path
        d="M80,80 L50,140 A70,70 0 0,1 15,65 Z"
        fill="#FFBE4A"
      />
      {/* Slice 4 - 19% - Green */}
      <path
        d="M80,80 L15,65 A70,70 0 0,1 80,10 Z"
        fill="#4CAF50"
      />
      {/* Labels */}
      <text x="110" y="35" fill="#333" fontSize="12" fontWeight="500">27%</text>
      <text x="130" y="100" fill="#333" fontSize="12" fontWeight="500">27%</text>
      <text x="35" y="130" fill="#333" fontSize="12" fontWeight="500">27%</text>
      <text x="25" y="55" fill="#333" fontSize="12" fontWeight="500">19%</text>
    </svg>
  )
}

// ===== LEGEND ITEM =====
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  )
}

// ===== HORIZONTAL BAR =====
function HorizontalBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string
  value: number
  maxValue: number
  color: string
}) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        >
          <span className="text-[10px] text-white font-medium">{value}</span>
        </div>
      </div>
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

// ===== VERTICAL BAR CHART =====
function VerticalBarChart() {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const values = [3.2, 2.8, 3.5, 2.5, 2.8, 3.8, 3.0, 2.2, 4.2, 2.5, 3.0, 5.8]
  const maxValue = 6

  return (
    <div className="h-48">
      <div className="flex items-end justify-between h-40 gap-2">
        {values.map((value, index) => (
          <div key={months[index]} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-[#336FB6] rounded-t-sm"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {months.map((month) => (
          <span key={month} className="text-[10px] text-gray-400 flex-1 text-center">
            {month}
          </span>
        ))}
      </div>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-40 flex flex-col justify-between text-xs text-gray-400">
        <span>6M</span>
        <span>5M</span>
        <span>4M</span>
        <span>3M</span>
        <span>$0</span>
        <span>$1k</span>
      </div>
    </div>
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
