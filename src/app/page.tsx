'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout'
import { Card } from '@/components/ui'

export default function Home() {
  const { user, empresa, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Bem-vindo de volta, {user?.nome?.split(' ')[0] || 'Usuário'}
        </p>
      </div>

      {/* Company Info Card */}
      <Card className="mb-8" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {empresa?.nome_fantasia || empresa?.razao_social || 'Empresa'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              CNPJ: {empresa?.cnpj || '-'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success-500/10 text-success-600">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 mr-1.5" />
              Bling Conectado
            </span>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Produtos"
          value="3.563"
          change="+12"
          changeType="positive"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          href="/estoque/produtos"
        />
        <StatCard
          title="Pedidos de Venda"
          value="23.238"
          change="+156"
          changeType="positive"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          href="/vendas/pedidos"
        />
        <StatCard
          title="Pedidos de Compra"
          value="294"
          change="+8"
          changeType="positive"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          href="/compras/pedidos"
        />
        <StatCard
          title="Fornecedores"
          value="104"
          change="0"
          changeType="neutral"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          href="/compras/fornecedores"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card padding="md">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-2">
            <QuickAction
              label="Nova Sugestão de Compra"
              href="/compras/sugestao/nova"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            />
            <QuickAction
              label="Sincronizar Produtos"
              href="/configuracoes/sync"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            />
            <QuickAction
              label="Ver Produtos com Estoque Baixo"
              href="/estoque/produtos?filter=estoque_baixo"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <QuickAction
              label="Consultar Notas Fiscais"
              href="/fiscal/notas"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </div>
        </Card>

        {/* Recent Activity */}
        <Card padding="md" className="lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            <ActivityItem
              title="Sincronização concluída"
              description="Produtos sincronizados com Bling"
              time="Há 2 horas"
              type="success"
            />
            <ActivityItem
              title="Novo pedido de venda"
              description="Pedido #12345 - Cliente ABC Ltda"
              time="Há 3 horas"
              type="info"
            />
            <ActivityItem
              title="Estoque baixo"
              description="15 produtos abaixo do estoque mínimo"
              time="Há 5 horas"
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

function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  href,
}: {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
  href: string
}) {
  const changeColors = {
    positive: 'text-success-600 bg-success-50',
    negative: 'text-error-600 bg-error-50',
    neutral: 'text-gray-600 bg-gray-100',
  }

  return (
    <Link href={href}>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer h-full"
        padding="md"
        shadow="sm"
      >
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            {icon}
          </div>
          {change !== '0' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${changeColors[changeType]}`}>
              {changeType === 'positive' && '+'}
              {change}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
      </Card>
    </Link>
  )
}

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
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </Link>
  )
}

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
