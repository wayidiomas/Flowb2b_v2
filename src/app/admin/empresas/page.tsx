'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface EmpresaItem {
  id: number
  nome_fantasia: string | null
  razao_social: string | null
  cnpj: string | null
  conectadabling: boolean | null
  sync_status: string | null
  created_date: string | null
  token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'
  counts: {
    users: number
    fornecedores: number
    pedidos: number
    produtos: number
  }
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return '-'
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

function TokenBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    valid: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
    expiring: { label: 'Expirando', className: 'bg-yellow-100 text-yellow-800' },
    expired: { label: 'Expirado', className: 'bg-red-100 text-red-800' },
    revoked: { label: 'Revogado', className: 'bg-red-100 text-red-800' },
    no_token: { label: 'Sem Token', className: 'bg-gray-100 text-gray-600' },
  }

  const { label, className } = config[status] || config.no_token

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function SyncBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>

  const config: Record<string, { label: string; className: string }> = {
    idle: { label: 'Idle', className: 'bg-gray-100 text-gray-600' },
    syncing: { label: 'Sincronizando', className: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completo', className: 'bg-green-100 text-green-800' },
    error: { label: 'Erro', className: 'bg-red-100 text-red-800' },
  }

  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-600' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

export default function EmpresasPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchEmpresas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchDebounced) params.set('search', searchDebounced)

      const res = await fetch(`/api/admin/empresas?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Erro ao buscar empresas')
      }
      const json = await res.json()
      setEmpresas(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [searchDebounced])

  useEffect(() => {
    fetchEmpresas()
  }, [fetchEmpresas])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie todas as empresas cadastradas no sistema
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {!loading && `${empresas.length} empresa${empresas.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && empresas.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 6h1.5M5.25 9h1.5M5.25 12h1.5m7.5-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma empresa encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchDebounced ? 'Tente ajustar sua busca.' : 'Nenhuma empresa cadastrada.'}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && empresas.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNPJ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuarios
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fornecedores
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produtos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bling
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sync
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {empresas.map((empresa) => (
                    <tr
                      key={empresa.id}
                      onClick={() => router.push(`/admin/empresas/${empresa.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`}
                        </div>
                        {empresa.razao_social && empresa.nome_fantasia && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                            {empresa.razao_social}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 font-mono">
                          {formatCnpj(empresa.cnpj)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900 font-medium">
                          {empresa.counts.users}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900 font-medium">
                          {empresa.counts.fornecedores}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900 font-medium">
                          {empresa.counts.produtos}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900 font-medium">
                          {empresa.counts.pedidos}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TokenBadge status={empresa.token_status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <SyncBadge status={empresa.sync_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
