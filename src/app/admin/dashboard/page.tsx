'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { Skeleton } from '@/components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  empresas: {
    total: number
    conectadasBling: number
  }
  usuarios: {
    lojistas: number
    colaboradores: number
    fornecedores: number
    representantes: number
    superadmins: number
    sem_empresa: number
    total: number
  }
  pedidos: {
    ultimos30dias: number
    porStatus: Record<string, number>
  }
  alertas: {
    tokensComProblema: number
    tokensRevogados: number
    tokensExpirados: number
    syncComErro: number
    empresasSyncError: { id: number; nome: string }[]
  }
}

interface ActiveUsersData {
  total: number
  by_type: Record<string, number>
}

interface RecentLogin {
  user_nome: string
  user_email: string
  user_type: string
  created_at: string
  metadata: { ip?: string; user_agent?: string } | null
}

interface TimelineEvent {
  id: number
  evento: string
  descricao: string | null
  pedido_numero: string | null
  autor_nome: string
  autor_tipo: string
  empresa_nome: string | null
  created_at: string
  source: 'timeline'
}

interface ActionEvent {
  action: string
  user_nome: string
  user_email: string
  user_type: string
  metadata: Record<string, unknown> | null
  created_at: string
  source: 'action'
}

type FeedItem = TimelineEvent | ActionEvent

interface ActivityData {
  active_users: {
    last_24h: ActiveUsersData
    last_7d: ActiveUsersData
    last_30d: ActiveUsersData
  }
  recent_logins: RecentLogin[]
  recent_timeline: TimelineEvent[]
  recent_actions: ActionEvent[]
  registrations_recent: {
    lojistas: number
    fornecedores: number
    representantes: number
    total: number
  }
}

// ─── Status labels and colors ─────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Enviado ao Fornecedor',
  sugestao_pendente: 'Sugestao Pendente',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  sem_status: 'Sem Status',
}

const statusBarColors: Record<string, string> = {
  rascunho: 'bg-gray-400',
  enviado_fornecedor: 'bg-amber-500',
  sugestao_pendente: 'bg-orange-500',
  aceito: 'bg-emerald-500',
  rejeitado: 'bg-red-500',
  finalizado: 'bg-purple-500',
  cancelado: 'bg-gray-300',
  sem_status: 'bg-gray-300',
}

// ─── Activity helpers ────────────────────────────────────────────────────────

const actionLabels: Record<string, string> = {
  login: 'fez login',
  registro: 'se registrou',
  pedido_criado: 'criou um pedido',
  sugestao_enviada: 'enviou uma sugestao',
  contra_proposta_enviada: 'enviou contra-proposta',
  sugestao_aceita: 'aceitou sugestao',
  sugestao_rejeitada: 'rejeitou sugestao',
}

const userTypeBadgeColors: Record<string, string> = {
  lojista: 'bg-primary-100 text-primary-800',
  colaborador: 'bg-cyan-100 text-cyan-800',
  fornecedor: 'bg-orange-100 text-orange-800',
  representante: 'bg-purple-100 text-purple-800',
  superadmin: 'bg-purple-100 text-purple-800',
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'agora'
  if (diffMin < 60) return `ha ${diffMin} min`
  if (diffHour < 24) return `ha ${diffHour} hora${diffHour !== 1 ? 's' : ''}`
  if (diffDay < 30) return `ha ${diffDay} dia${diffDay !== 1 ? 's' : ''}`
  const diffMonth = Math.floor(diffDay / 30)
  return `ha ${diffMonth} mes${diffMonth !== 1 ? 'es' : ''}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 6h1.5M5.25 9h1.5M5.25 12h1.5m7.5-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function SyncErrorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAdminAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchDashboard = async () => {
      try {
        setError(null)
        const res = await fetch('/api/admin/dashboard')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erro ${res.status}`)
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Erro ao carregar dashboard admin:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [user])

  useEffect(() => {
    if (!user) return

    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/admin/dashboard/activity')
        if (!res.ok) return
        const json = await res.json()
        setActivityData(json)
      } catch (err) {
        console.error('Erro ao carregar atividade:', err)
      } finally {
        setActivityLoading(false)
      }
    }

    fetchActivity()
  }, [user])

  if (authLoading) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visao geral da plataforma FlowB2B
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <div className="text-red-500 mt-0.5">
              <SyncErrorIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Erro ao carregar dashboard</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Empresas */}
          <KPICard
            title="Empresas"
            value={data?.empresas.total}
            subtitle={data ? `${data.empresas.conectadasBling} conectadas ao Bling` : undefined}
            icon={<BuildingIcon />}
            iconBg="bg-primary-50"
            iconColor="text-primary-600"
            loading={loading}
          />

          {/* Usuarios */}
          <KPICard
            title="Usuarios"
            value={data?.usuarios.total}
            subtitle={data ? `${data.usuarios.lojistas} lojista${data.usuarios.lojistas !== 1 ? 's' : ''}, ${data.usuarios.colaboradores} colaborador${data.usuarios.colaboradores !== 1 ? 'es' : ''}, ${data.usuarios.fornecedores} fornecedor${data.usuarios.fornecedores !== 1 ? 'es' : ''}, ${data.usuarios.representantes} representante${data.usuarios.representantes !== 1 ? 's' : ''}` : undefined}
            icon={<UsersIcon />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            loading={loading}
          />

          {/* Pedidos 30d */}
          <KPICard
            title="Pedidos (30d)"
            value={data?.pedidos.ultimos30dias}
            subtitle="Pedidos de compra"
            icon={<ClipboardIcon />}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            loading={loading}
          />

          {/* Bling Ativo */}
          <KPICard
            title="Bling Ativo"
            value={data?.empresas.conectadasBling}
            subtitle={data ? `de ${data.empresas.total} empresas` : undefined}
            icon={<LinkIcon />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            loading={loading}
          />
        </div>

        {/* Alerts Section */}
        {!loading && data && (data.alertas.tokensComProblema > 0 || data.alertas.syncComErro > 0) && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tokens com problema */}
              {data.alertas.tokensComProblema > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
                      <WarningIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Tokens Bling com problema
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {data.alertas.tokensComProblema} token{data.alertas.tokensComProblema !== 1 ? 's' : ''} com problema
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {data.alertas.tokensRevogados > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {data.alertas.tokensRevogados} revogado{data.alertas.tokensRevogados !== 1 ? 's' : ''}
                          </span>
                        )}
                        {data.alertas.tokensExpirados > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            {data.alertas.tokensExpirados} expirado{data.alertas.tokensExpirados !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync com erro */}
              {data.alertas.syncComErro > 0 && (
                <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600 flex-shrink-0">
                      <SyncErrorIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Sincronizacoes com erro
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {data.alertas.syncComErro} empresa{data.alertas.syncComErro !== 1 ? 's' : ''} com falha na sync
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {data.alertas.empresasSyncError.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center gap-2 text-sm text-red-700"
                          >
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                            <span className="truncate">{emp.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pedidos por Status Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Pedidos de compra por status
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Ultimos 30 dias</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            ) : data && Object.keys(data.pedidos.porStatus).length > 0 ? (
              <StatusBarChart porStatus={data.pedidos.porStatus} />
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>Nenhum pedido de compra nos ultimos 30 dias</p>
              </div>
            )}
          </div>
        </div>

        {/* Users breakdown */}
        {!loading && data && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Usuarios por tipo</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <UserTypeCard
                  label="Lojistas"
                  count={data.usuarios.lojistas}
                  color="bg-primary-500"
                  bgColor="bg-primary-50"
                  textColor="text-primary-700"
                />
                <UserTypeCard
                  label="Colaboradores"
                  count={data.usuarios.colaboradores}
                  color="bg-cyan-500"
                  bgColor="bg-cyan-50"
                  textColor="text-cyan-700"
                />
                <UserTypeCard
                  label="Fornecedores"
                  count={data.usuarios.fornecedores}
                  color="bg-amber-500"
                  bgColor="bg-amber-50"
                  textColor="text-amber-700"
                />
                <UserTypeCard
                  label="Representantes"
                  count={data.usuarios.representantes}
                  color="bg-purple-500"
                  bgColor="bg-purple-50"
                  textColor="text-purple-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Atividade Section ────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900">Atividade</h2>
            <p className="text-sm text-gray-500 mt-1">Logins, acoes recentes e novos cadastros</p>
          </div>

          {/* Section 1: Active Users Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActiveUsersCard
              title="Ultimas 24h"
              data={activityData?.active_users.last_24h}
              loading={activityLoading}
            />
            <ActiveUsersCard
              title="Ultimos 7 dias"
              data={activityData?.active_users.last_7d}
              loading={activityLoading}
            />
            <ActiveUsersCard
              title="Ultimos 30 dias"
              data={activityData?.active_users.last_30d}
              loading={activityLoading}
            />
          </div>

          {/* Section 2: Recent Logins table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Logins recentes</h2>
            </div>
            <div className="overflow-x-auto">
              {activityLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : activityData && activityData.recent_logins.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Usuario</th>
                      <th className="px-6 py-3">Tipo</th>
                      <th className="px-6 py-3">Quando</th>
                      <th className="px-6 py-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activityData.recent_logins.slice(0, 10).map((login, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{login.user_nome}</p>
                            <p className="text-xs text-gray-400">{login.user_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${userTypeBadgeColors[login.user_type] || 'bg-gray-100 text-gray-800'}`}>
                            {login.user_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {timeAgo(login.created_at)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-400 font-mono">
                          {login.metadata?.ip || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-10 text-center">
                  <div className="text-gray-300 mb-3 flex justify-center">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Nenhum login registrado ainda. Os dados aparecerao conforme usuarios fizerem login.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3 & 4: Feed + Novos Cadastros side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Section 3: Feed de Atividade Recente */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Feed de Atividade Recente</h2>
              </div>
              <div className="p-6">
                {activityLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ActivityFeed
                    timeline={activityData?.recent_timeline || []}
                    actions={activityData?.recent_actions || []}
                  />
                )}
              </div>
            </div>

            {/* Section 4: Novos Cadastros */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Novos Cadastros</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ultimos 30 dias</p>
              </div>
              <div className="p-6">
                {activityLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                ) : activityData ? (
                  <div className="space-y-3">
                    <RegistrationRow
                      label="Lojistas"
                      count={activityData.registrations_recent.lojistas}
                      dotColor="bg-primary-500"
                    />
                    <RegistrationRow
                      label="Fornecedores"
                      count={activityData.registrations_recent.fornecedores}
                      dotColor="bg-orange-500"
                    />
                    <RegistrationRow
                      label="Representantes"
                      count={activityData.registrations_recent.representantes}
                      dotColor="bg-purple-500"
                    />
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-primary-600">
                          {activityData.registrations_recent.total}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  loading,
}: {
  title: string
  value: number | undefined
  subtitle: string | undefined
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? <Skeleton className="h-9 w-16" /> : (value ?? 0)}
          </div>
          {loading ? (
            <Skeleton className="h-4 w-32 mt-2" />
          ) : subtitle ? (
            <p className="text-xs text-gray-400 mt-2 truncate">{subtitle}</p>
          ) : null}
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBarChart({ porStatus }: { porStatus: Record<string, number> }) {
  const entries = Object.entries(porStatus).sort(([, a], [, b]) => b - a)
  const maxValue = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => (
        <div key={status} className="flex items-center gap-4">
          <div className="w-40 sm:w-48 flex-shrink-0">
            <span className="text-sm font-medium text-gray-700">
              {statusLabels[status] || status}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${statusBarColors[status] || 'bg-gray-400'}`}
                style={{ width: `${Math.max((count / maxValue) * 100, 2)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-10 text-right tabular-nums">
              {count}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function UserTypeCard({
  label,
  count,
  color,
  bgColor,
  textColor,
}: {
  label: string
  count: number
  color: string
  bgColor: string
  textColor: string
}) {
  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 ${color} rounded-full`} />
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ─── Activity Sub-components ─────────────────────────────────────────────────

function ActiveUsersCard({
  title,
  data,
  loading,
}: {
  title: string
  data: ActiveUsersData | undefined
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="text-3xl font-bold text-primary-700 mt-2">
        {loading ? <Skeleton className="h-9 w-16" /> : (data?.total ?? 0)}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {loading ? (
          <Skeleton className="h-5 w-32" />
        ) : data && Object.keys(data.by_type).length > 0 ? (
          Object.entries(data.by_type).map(([type, count]) => (
            <span
              key={type}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${userTypeBadgeColors[type] || 'bg-gray-100 text-gray-700'}`}
            >
              {count} {type}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400">Nenhum login</span>
        )}
      </div>
    </div>
  )
}

function RegistrationRow({
  label,
  count,
  dotColor,
}: {
  label: string
  count: number
  dotColor: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={`w-2.5 h-2.5 ${dotColor} rounded-full flex-shrink-0`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{count}</span>
    </div>
  )
}

function getFeedUserName(item: FeedItem): string {
  if (item.source === 'timeline') {
    return (item as TimelineEvent).autor_nome || ''
  }
  return (item as ActionEvent).user_nome || ''
}

function getFeedUserType(item: FeedItem): string {
  if (item.source === 'timeline') {
    return (item as TimelineEvent).autor_tipo || ''
  }
  return (item as ActionEvent).user_type || ''
}

function getFeedKey(item: FeedItem, idx: number): string {
  if (item.source === 'timeline') {
    return `timeline-${(item as TimelineEvent).id}-${idx}`
  }
  return `action-${idx}`
}

function ActivityFeed({
  timeline,
  actions,
}: {
  timeline: TimelineEvent[]
  actions: ActionEvent[]
}) {
  const taggedTimeline: FeedItem[] = timeline.map((t) => ({ ...t, source: 'timeline' as const }))
  const taggedActions: FeedItem[] = actions.map((a) => ({ ...a, source: 'action' as const }))

  const merged = [...taggedTimeline, ...taggedActions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15)

  if (merged.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-gray-300 mb-3 flex justify-center">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Nenhuma atividade recente registrada.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {merged.map((item, idx) => (
        <div key={getFeedKey(item, idx)} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: getFeedIconBg(item) }}
          >
            <FeedIcon item={item} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">
              {getFeedDescription(item)}
            </p>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span className="text-xs font-medium text-gray-900">{getFeedUserName(item)}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${userTypeBadgeColors[getFeedUserType(item)] || 'bg-gray-100 text-gray-700'}`}>
                {getFeedUserType(item)}
              </span>
              {item.source === 'timeline' && (item as TimelineEvent).pedido_numero && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-50 text-primary-700">
                  Pedido #{(item as TimelineEvent).pedido_numero}
                </span>
              )}
              <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function getFeedDescription(item: FeedItem): string {
  if (item.source === 'timeline') {
    const t = item as TimelineEvent
    return t.descricao || t.evento
  }
  const a = item as ActionEvent
  return actionLabels[a.action] || a.action
}

function getFeedIconBg(item: FeedItem): string {
  if (item.source === 'timeline') {
    const t = item as TimelineEvent
    if (t.evento.includes('aceito') || t.evento.includes('aceita')) return '#ecfdf5'
    if (t.evento.includes('rejeitado') || t.evento.includes('rejeitada')) return '#fef2f2'
    if (t.evento.includes('enviado') || t.evento.includes('enviada')) return '#fffbeb'
    return '#eff6ff'
  }
  const a = item as ActionEvent
  if (a.action === 'login') return '#eff6ff'
  if (a.action === 'registro') return '#f0fdf4'
  if (a.action === 'pedido_criado') return '#fffbeb'
  if (a.action.includes('aceita')) return '#ecfdf5'
  if (a.action.includes('rejeitada')) return '#fef2f2'
  return '#f3f4f6'
}

function FeedIcon({ item }: { item: FeedItem }) {
  if (item.source === 'action') {
    const a = item as ActionEvent
    if (a.action === 'login') {
      return (
        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      )
    }
    if (a.action === 'registro') {
      return (
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      )
    }
    if (a.action === 'pedido_criado') {
      return (
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    }
    if (a.action.includes('sugestao') || a.action.includes('contra_proposta')) {
      return (
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      )
    }
    if (a.action.includes('aceita')) {
      return (
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (a.action.includes('rejeitada')) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  // Timeline events - default icons based on event content
  if (item.source === 'timeline') {
    const t = item as TimelineEvent
    if (t.evento.includes('aceito') || t.evento.includes('aceita')) {
      return (
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (t.evento.includes('rejeitado') || t.evento.includes('rejeitada')) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (t.evento.includes('enviado') || t.evento.includes('enviada')) {
      return (
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  // Fallback
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
