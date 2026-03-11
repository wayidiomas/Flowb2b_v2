'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------- Types ----------

interface NegociacaoEvento {
  evento: string
  descricao: string | null
  autor_tipo: string | null
  autor_nome: string | null
  created_at: string
}

interface NegociacaoRow {
  id: number
  numero: string | null
  data: string | null
  data_prevista: string | null
  total: number | null
  status_interno: string | null
  situacao: number | null
  origem: string | null
  updated_at: string | null
  empresa_nome: string
  fornecedor_nome: string
  representante_nome: string | null
  ultimo_evento: NegociacaoEvento | null
  sugestoes_count: number
  ultima_sugestao_status: string | null
}

interface EmpresaOption {
  id: number
  nome_fantasia: string | null
}

// ---------- Constants ----------

const PIPELINE_COLUMNS = [
  {
    key: 'enviado_fornecedor',
    label: 'Enviado ao Fornecedor',
    headerBg: 'bg-blue-50',
    headerBorder: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'sugestao_pendente',
    label: 'Sugestao Pendente',
    headerBg: 'bg-amber-50',
    headerBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    key: 'contra_proposta_pendente',
    label: 'Contra-Proposta',
    headerBg: 'bg-orange-50',
    headerBorder: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  {
    key: 'aceito',
    label: 'Aceito',
    headerBg: 'bg-emerald-50',
    headerBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    key: 'finalizado',
    label: 'Finalizado',
    headerBg: 'bg-purple-50',
    headerBorder: 'border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    key: 'rejeitado_cancelado',
    label: 'Rejeitado / Cancelado',
    headerBg: 'bg-gray-50',
    headerBorder: 'border-gray-200',
    dotColor: 'bg-gray-400',
    statuses: ['rejeitado', 'cancelado'],
  },
] as const

const SUMMARY_CARDS = [
  { key: 'enviado_fornecedor', label: 'Enviado', dotColor: 'bg-blue-500' },
  { key: 'sugestao_pendente', label: 'Sugestao Pendente', dotColor: 'bg-amber-500' },
  { key: 'contra_proposta_pendente', label: 'Contra-Proposta', dotColor: 'bg-orange-500' },
  { key: 'aceito', label: 'Aceito', dotColor: 'bg-emerald-500' },
  { key: 'rejeitado', label: 'Rejeitado', dotColor: 'bg-red-500' },
  { key: 'finalizado', label: 'Finalizado', dotColor: 'bg-purple-500' },
  { key: 'cancelado', label: 'Cancelado', dotColor: 'bg-gray-400' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'enviado_fornecedor', label: 'Enviado ao Fornecedor' },
  { value: 'sugestao_pendente', label: 'Sugestao Pendente' },
  { value: 'contra_proposta_pendente', label: 'Contra-Proposta Pendente' },
  { value: 'aceito', label: 'Aceito' },
  { value: 'rejeitado', label: 'Rejeitado' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
]

// ---------- Helpers ----------

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'agora mesmo'
  if (diffMinutes < 60) return `ha ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  if (diffHours < 24) return `ha ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  if (diffDays < 30) return `ha ${diffDays} dia${diffDays > 1 ? 's' : ''}`
  const diffMonths = Math.floor(diffDays / 30)
  return `ha ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function eventoLabel(evento: string): string {
  const labels: Record<string, string> = {
    enviado_fornecedor: 'Enviado ao fornecedor',
    sugestao_enviada: 'Sugestao enviada',
    sugestao_aceita: 'Sugestao aceita',
    sugestao_rejeitada: 'Sugestao rejeitada',
    contra_proposta_enviada: 'Contra-proposta enviada',
    contra_proposta_aceita: 'Contra-proposta aceita',
    contra_proposta_rejeitada: 'Contra-proposta rejeitada',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    erro_sync_bling: 'Erro na sincronizacao',
  }
  return labels[evento] || evento
}

// ---------- SVG Icons ----------

function EventIcon({ evento }: { evento: string }) {
  const iconClass = 'w-4 h-4 flex-shrink-0'

  switch (evento) {
    case 'enviado_fornecedor':
      return (
        <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      )
    case 'sugestao_enviada':
      return (
        <svg className={`${iconClass} text-amber-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    case 'sugestao_aceita':
    case 'contra_proposta_aceita':
      return (
        <svg className={`${iconClass} text-emerald-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'sugestao_rejeitada':
    case 'contra_proposta_rejeitada':
      return (
        <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'contra_proposta_enviada':
      return (
        <svg className={`${iconClass} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
        </svg>
      )
    case 'finalizado':
      return (
        <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      )
    case 'cancelado':
      return (
        <svg className={`${iconClass} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    case 'erro_sync_bling':
      return (
        <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )
    default:
      return (
        <svg className={`${iconClass} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

// ---------- Component ----------

export default function AdminNegociacoesPage() {
  const router = useRouter()

  // Data
  const [negociacoes, setNegociacoes] = useState<NegociacaoRow[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])

  // Filters
  const [empresaId, setEmpresaId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch empresas for dropdown
  useEffect(() => {
    async function loadEmpresas() {
      try {
        const res = await fetch('/api/admin/empresas')
        if (res.ok) {
          const json = await res.json()
          const list = json.data || []
          setEmpresas(
            Array.isArray(list)
              ? list.map((e: Record<string, unknown>) => ({
                  id: e.id as number,
                  nome_fantasia: (e.nome_fantasia || e.razao_social || `Empresa #${e.id}`) as string,
                }))
              : []
          )
        }
      } catch {
        // Empresas endpoint may not be available
      }
    }
    loadEmpresas()
  }, [])

  // Fetch negociacoes
  const fetchNegociacoes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (empresaId) params.set('empresa_id', empresaId)
      if (statusFilter) params.set('status', statusFilter)

      const qs = params.toString()
      const res = await fetch(`/api/admin/negociacoes${qs ? `?${qs}` : ''}`)
      if (res.ok) {
        const json = await res.json()
        setNegociacoes(json.data || [])
        setSummary(json.summary || {})
      } else {
        console.error('Failed to fetch negociacoes:', res.status)
        setNegociacoes([])
        setSummary({})
      }
    } catch (err) {
      console.error('Error fetching negociacoes:', err)
      setNegociacoes([])
      setSummary({})
    } finally {
      setLoading(false)
    }
  }, [empresaId, statusFilter])

  useEffect(() => {
    fetchNegociacoes()
  }, [fetchNegociacoes])

  // Group negociacoes into pipeline columns
  function getColumnItems(column: typeof PIPELINE_COLUMNS[number]): NegociacaoRow[] {
    if ('statuses' in column && column.statuses) {
      return negociacoes.filter((n) => column.statuses.includes(n.status_interno as 'rejeitado' | 'cancelado'))
    }
    return negociacoes.filter((n) => n.status_interno === column.key)
  }

  const totalActive = negociacoes.length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negociacoes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe todas as negociacoes de pedidos de compra em tempo real
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {SUMMARY_CARDS.map((card) => (
            <div
              key={card.key}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${card.dotColor} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{summary[card.key] ?? 0}</p>
                <p className="text-xs text-gray-500 truncate">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Empresa dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Todas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.nome_fantasia}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-3">
              {(empresaId || statusFilter) && (
                <button
                  onClick={() => {
                    setEmpresaId('')
                    setStatusFilter('')
                  }}
                  className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Limpar filtros
                </button>
              )}
              <div className="ml-auto text-sm text-gray-500 py-2">
                {totalActive} negociacao{totalActive !== 1 ? 'es' : ''} ativa{totalActive !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline View */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : totalActive === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-gray-500 text-sm">
              Nenhuma negociacao ativa no momento. Pedidos em rascunho nao aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {PIPELINE_COLUMNS.map((column) => {
                const items = getColumnItems(column)
                return (
                  <div
                    key={column.key}
                    className="w-72 md:w-auto flex-shrink-0 md:flex-shrink flex flex-col"
                  >
                    {/* Column header */}
                    <div
                      className={`${column.headerBg} border ${column.headerBorder} rounded-t-lg px-3 py-2.5 flex items-center gap-2`}
                    >
                      <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
                      <span className="text-sm font-semibold text-gray-700">{column.label}</span>
                      <span className="ml-auto text-xs font-medium text-gray-500">({items.length})</span>
                    </div>

                    {/* Column body */}
                    <div className="bg-gray-50 border-x border-b border-gray-200 rounded-b-lg p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-420px)] overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400">
                          Nenhum pedido
                        </div>
                      ) : (
                        items.map((neg) => (
                          <div
                            key={neg.id}
                            onClick={() => router.push(`/admin/negociacoes/${neg.id}`)}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
                          >
                            {/* Card header */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900">
                                #{neg.numero || neg.id}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-50 text-primary-700 flex-shrink-0">
                                {neg.empresa_nome}
                              </span>
                            </div>

                            {/* Fornecedor */}
                            <p className="text-xs text-gray-500 mb-1">
                              Fornecedor: <span className="text-gray-700">{neg.fornecedor_nome}</span>
                            </p>

                            {/* Total */}
                            <p className="text-sm font-medium text-gray-900 mb-3">
                              Total: {formatCurrency(neg.total)}
                            </p>

                            {/* Ultimo evento */}
                            {neg.ultimo_evento && (
                              <div className="bg-gray-50 rounded-md border border-gray-100 p-2.5 mb-3">
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                                  Ultimo evento
                                </p>
                                <div className="flex items-start gap-1.5">
                                  <EventIcon evento={neg.ultimo_evento.evento} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-700 leading-tight">
                                      {eventoLabel(neg.ultimo_evento.evento)}
                                    </p>
                                    {neg.ultimo_evento.autor_nome && (
                                      <p className="text-[11px] text-gray-400 truncate">
                                        por {neg.ultimo_evento.autor_nome}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-gray-400">
                                      {timeAgo(neg.ultimo_evento.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Sugestoes + Origem */}
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
                              {neg.sugestoes_count > 0 && (
                                <span>
                                  {neg.sugestoes_count} sugestao{neg.sugestoes_count > 1 ? 'es' : ''}
                                </span>
                              )}
                              {neg.sugestoes_count > 0 && neg.origem && (
                                <span className="text-gray-300">|</span>
                              )}
                              {neg.origem && <span>{neg.origem}</span>}
                            </div>

                            {/* Divider + link */}
                            <div className="border-t border-gray-100 pt-2">
                              <span className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                Ver detalhes
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
