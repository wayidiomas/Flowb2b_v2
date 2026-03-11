'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface BlingEmpresa {
  empresa_id: number
  nome_fantasia: string
  razao_social: string
  cnpj: string
  conectadabling: boolean
  sync_status: string | null
  token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'
  expires_at: string | null
  updated_at: string | null
  is_revoke: boolean | null
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const TOKEN_STATUS_CONFIG = {
  valid: { label: 'Valido', className: 'bg-emerald-100 text-emerald-800' },
  expiring: { label: 'Expirando', className: 'bg-yellow-100 text-yellow-800' },
  expired: { label: 'Expirado', className: 'bg-red-100 text-red-800' },
  revoked: { label: 'Revogado', className: 'bg-red-100 text-red-800' },
  no_token: { label: 'Sem token', className: 'bg-gray-100 text-gray-800' },
} as const

export default function AdminBlingPage() {
  const [empresas, setEmpresas] = useState<BlingEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [revokeModal, setRevokeModal] = useState<{ open: boolean; empresa: BlingEmpresa | null }>({
    open: false,
    empresa: null,
  })
  const [actionLoading, setActionLoading] = useState<{
    type: 'revoke' | 'sync' | null
    empresaId: number | null
  }>({ type: null, empresaId: null })

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const fetchEmpresas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/bling')
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || `Erro HTTP ${response.status}`)
      }

      const body = await response.json()
      setEmpresas(body.data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmpresas()
  }, [fetchEmpresas])

  const handleRevogar = async (empresa: BlingEmpresa) => {
    setRevokeModal({ open: false, empresa: null })
    setActionLoading({ type: 'revoke', empresaId: empresa.empresa_id })

    try {
      const response = await fetch(`/api/admin/bling/${empresa.empresa_id}/revogar`, {
        method: 'POST',
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Erro ao revogar token')
      }

      addToast('success', body.message || 'Token revogado com sucesso')
      fetchEmpresas()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao revogar token'
      addToast('error', msg)
    } finally {
      setActionLoading({ type: null, empresaId: null })
    }
  }

  const handleForcarSync = async (empresa: BlingEmpresa) => {
    setActionLoading({ type: 'sync', empresaId: empresa.empresa_id })
    addToast('info', `Iniciando sincronizacao de estoque para ${empresa.nome_fantasia}...`)

    try {
      const response = await fetch(`/api/admin/bling/${empresa.empresa_id}/sync`, {
        method: 'POST',
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Erro ao sincronizar')
      }

      const r = body.resultado
      addToast(
        'success',
        `Sync concluido para ${empresa.nome_fantasia}: ${r.atualizados} atualizados, ${r.sem_alteracao} sem alteracao, ${r.erros} erros (${body.duracao_legivel})`
      )
      fetchEmpresas()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar'
      addToast('error', msg)
    } finally {
      setActionLoading({ type: null, empresaId: null })
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
        return `${days}d ${diffHours % 24}h`
      }

      return `${diffHours}h ${diffMinutes}m`
    } catch {
      return dateStr
    }
  }

  const isActionDisabled = (empresaId: number) => {
    return actionLoading.empresaId === empresaId
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento Bling</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie as integracoes Bling de todas as empresas
        </p>
      </div>

      {/* Summary cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <SummaryCard
            label="Total"
            value={empresas.length}
            className="bg-white"
          />
          <SummaryCard
            label="Conectadas"
            value={empresas.filter(e => e.token_status === 'valid').length}
            className="bg-white"
            dotColor="bg-emerald-500"
          />
          <SummaryCard
            label="Expirando"
            value={empresas.filter(e => e.token_status === 'expiring').length}
            className="bg-white"
            dotColor="bg-yellow-500"
          />
          <SummaryCard
            label="Expiradas"
            value={empresas.filter(e => e.token_status === 'expired').length}
            className="bg-white"
            dotColor="bg-red-500"
          />
          <SummaryCard
            label="Revogadas"
            value={empresas.filter(e => e.token_status === 'revoked').length}
            className="bg-white"
            dotColor="bg-red-500"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchEmpresas}
              className="mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : empresas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <p className="text-gray-500">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">CNPJ</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Conectado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Token Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Expira em</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Ultimo Sync</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Sync Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empresas.map(empresa => {
                  const statusConfig = TOKEN_STATUS_CONFIG[empresa.token_status]
                  const isBusy = isActionDisabled(empresa.empresa_id)

                  return (
                    <tr key={empresa.empresa_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/bling/${empresa.empresa_id}`}
                          className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.empresa_id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {formatCnpj(empresa.cnpj)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {empresa.conectadabling ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            Nao
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 text-xs">
                        {empresa.token_status === 'no_token'
                          ? '-'
                          : empresa.token_status === 'revoked'
                            ? '-'
                            : formatTimeRemaining(empresa.expires_at)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 text-xs">
                        {formatDateTime(empresa.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {empresa.sync_status ? (
                          <span className="text-xs text-gray-600">{empresa.sync_status}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {empresa.token_status !== 'no_token' && empresa.token_status !== 'revoked' && (
                            <button
                              onClick={() => setRevokeModal({ open: true, empresa })}
                              disabled={isBusy}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Revogar Token
                            </button>
                          )}
                          {empresa.token_status === 'valid' || empresa.token_status === 'expiring' ? (
                            <button
                              onClick={() => handleForcarSync(empresa)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-900 bg-secondary-500 rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading.type === 'sync' && actionLoading.empresaId === empresa.empresa_id ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Sincronizando...
                                </>
                              ) : (
                                'Forcar Sync'
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Modal */}
      {revokeModal.open && revokeModal.empresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRevokeModal({ open: false, empresa: null })} />
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
                  <strong>{revokeModal.empresa.nome_fantasia}</strong>?
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
                onClick={() => setRevokeModal({ open: false, empresa: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRevogar(revokeModal.empresa!)}
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
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm transition-all animate-in slide-in-from-right ${
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

function SummaryCard({
  label,
  value,
  className,
  dotColor,
}: {
  label: string
  value: number
  className?: string
  dotColor?: string
}) {
  return (
    <div className={`rounded-xl border border-gray-200 p-4 shadow-sm ${className || ''}`}>
      <div className="flex items-center gap-2">
        {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
