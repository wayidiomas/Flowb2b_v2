'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface EmpresaDetail {
  id: number
  nome_fantasia: string
  razao_social: string
  cnpj: string
  conectadabling: boolean
  sync_status: string | null
}

interface TokenDetail {
  token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'
  masked_access_token: string | null
  masked_refresh_token: string | null
  expires_at: string | null
  is_revoke: boolean | null
  updated_at: string | null
}

interface SyncHistoryItem {
  id: number
  status: string
  step: string | null
  created_at: string
  updated_at: string
  result: Record<string, unknown> | null
  error_count: number
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const TOKEN_STATUS_CONFIG = {
  valid: { label: 'Valido', className: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  expiring: { label: 'Expirando', className: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  expired: { label: 'Expirado', className: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  revoked: { label: 'Revogado', className: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  no_token: { label: 'Sem token', className: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' },
} as const

export default function AdminBlingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const empresaId = params.empresaId as string

  const [empresa, setEmpresa] = useState<EmpresaDetail | null>(null)
  const [token, setToken] = useState<TokenDetail | null>(null)
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [revokeModal, setRevokeModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<'revoke' | 'sync' | null>(null)

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/bling/${empresaId}`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || `Erro HTTP ${response.status}`)
      }

      const body = await response.json()
      setEmpresa(body.empresa)
      setToken(body.token)
      setSyncHistory(body.sync_history || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleRevogar = async () => {
    setRevokeModal(false)
    setActionLoading('revoke')

    try {
      const response = await fetch(`/api/admin/bling/${empresaId}/revogar`, {
        method: 'POST',
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Erro ao revogar token')
      }

      addToast('success', body.message || 'Token revogado com sucesso')
      fetchDetail()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao revogar token'
      addToast('error', msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleForcarSync = async () => {
    setActionLoading('sync')
    addToast('info', 'Iniciando sincronizacao de estoque...')

    try {
      const response = await fetch(`/api/admin/bling/${empresaId}/sync`, {
        method: 'POST',
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Erro ao sincronizar')
      }

      const r = body.resultado
      addToast(
        'success',
        `Sync concluido: ${r.atualizados} atualizados, ${r.sem_alteracao} sem alteracao, ${r.erros} erros (${body.duracao_legivel})`
      )
      fetchDetail()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar'
      addToast('error', msg)
    } finally {
      setActionLoading(null)
    }
  }

  const formatCnpj = (cnpj: string | null) => {
    if (!cnpj) return '-'
    const clean = cnpj.replace(/\D/g, '')
    if (clean.length !== 14) return cnpj
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatTimeRemaining = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const expires = new Date(dateStr)
      const now = new Date()
      const diffMs = expires.getTime() - now.getTime()

      if (diffMs < 0) return 'Expirado'

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24)
        return `${days} dias e ${diffHours % 24}h`
      }

      return `${diffHours}h ${diffMinutes}min`
    } catch {
      return dateStr
    }
  }

  const canRevoke = token && token.token_status !== 'no_token' && token.token_status !== 'revoked'
  const canSync = token && (token.token_status === 'valid' || token.token_status === 'expiring')

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/bling" className="hover:text-gray-700 transition-colors">
            Bling
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-gray-900 font-medium">
            {empresa?.nome_fantasia || `Empresa #${empresaId}`}
          </span>
        </nav>
        <button
          onClick={() => router.push('/admin/bling')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Voltar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchDetail}
            className="mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : empresa && token ? (
        <div className="space-y-6">
          {/* Empresa Info + Token Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Empresa card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacoes da Empresa</h2>
              <dl className="space-y-3">
                <DetailRow label="ID" value={String(empresa.id)} />
                <DetailRow label="Nome Fantasia" value={empresa.nome_fantasia || '-'} />
                <DetailRow label="Razao Social" value={empresa.razao_social || '-'} />
                <DetailRow label="CNPJ" value={formatCnpj(empresa.cnpj)} mono />
                <DetailRow
                  label="Conectado ao Bling"
                  value={
                    empresa.conectadabling ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Sim
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Nao
                      </span>
                    )
                  }
                />
                <DetailRow label="Sync Status" value={empresa.sync_status || '-'} />
              </dl>
            </div>

            {/* Token card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Token Bling</h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${TOKEN_STATUS_CONFIG[token.token_status].className}`}>
                  <span className={`w-2 h-2 rounded-full ${TOKEN_STATUS_CONFIG[token.token_status].dot}`} />
                  {TOKEN_STATUS_CONFIG[token.token_status].label}
                </span>
              </div>
              <dl className="space-y-3">
                <DetailRow
                  label="Access Token"
                  value={token.masked_access_token || '-'}
                  mono
                />
                <DetailRow
                  label="Refresh Token"
                  value={token.masked_refresh_token || '-'}
                  mono
                />
                <DetailRow
                  label="Expira em"
                  value={
                    token.expires_at
                      ? `${formatDateTime(token.expires_at)} (${formatTimeRemaining(token.expires_at)})`
                      : '-'
                  }
                />
                <DetailRow
                  label="Revogado"
                  value={
                    token.is_revoke === true ? (
                      <span className="text-red-600 font-medium">Sim</span>
                    ) : token.is_revoke === false ? (
                      <span className="text-emerald-600">Nao</span>
                    ) : (
                      '-'
                    )
                  }
                />
                <DetailRow
                  label="Ultima atualizacao"
                  value={formatDateTime(token.updated_at)}
                />
              </dl>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acoes</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setRevokeModal(true)}
                disabled={!canRevoke || actionLoading !== null}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'revoke' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Revogando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Revogar Token
                  </>
                )}
              </button>

              <button
                onClick={handleForcarSync}
                disabled={!canSync || actionLoading !== null}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-900 bg-secondary-500 rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'sync' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                    </svg>
                    Forcar Sync Estoque
                  </>
                )}
              </button>
            </div>

            {!canRevoke && token.token_status === 'revoked' && (
              <p className="mt-3 text-sm text-amber-600">
                Token ja esta revogado. Aguardando o usuario reautorizar.
              </p>
            )}
            {!canRevoke && token.token_status === 'no_token' && (
              <p className="mt-3 text-sm text-gray-500">
                Nenhum token Bling disponivel para esta empresa.
              </p>
            )}
            {!canSync && token.token_status === 'expired' && (
              <p className="mt-3 text-sm text-amber-600">
                Token expirado. Nao e possivel sincronizar ate o usuario reautorizar.
              </p>
            )}
          </div>

          {/* Sync History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historico de Sincronizacao</h2>

            {syncHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500">Nenhum historico de sincronizacao encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">ID</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Etapa</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Criado em</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Atualizado em</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-600">Erros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncHistory.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{item.id}</td>
                        <td className="px-4 py-2.5">
                          <SyncStatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{item.step || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{formatDateTime(item.created_at)}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{formatDateTime(item.updated_at)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {item.error_count > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {item.error_count}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Revoke Confirmation Modal */}
      {revokeModal && empresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRevokeModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Revogar Token Bling</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Tem certeza que deseja revogar o token de{' '}
                  <strong>{empresa.nome_fantasia}</strong>?
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    O usuario sera forcado a reautenticar no Bling. Isso vai bloquear o acesso ate ele reautorizar.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setRevokeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevogar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sim, revogar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-primary-50 border border-primary-200 text-primary-800'
            }`}
          >
            {toast.type === 'success' && (
              <svg className="w-5 h-5 flex-shrink-0 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 flex-shrink-0 text-primary-500 mt-0.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <p className="flex-1">{toast.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-sm text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-sm text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function SyncStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string }> = {
    pending: { className: 'bg-gray-100 text-gray-800' },
    processing: { className: 'bg-primary-100 text-primary-800' },
    completed: { className: 'bg-emerald-100 text-emerald-800' },
    error: { className: 'bg-red-100 text-red-800' },
  }

  const c = config[status] || { className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {status}
    </span>
  )
}
