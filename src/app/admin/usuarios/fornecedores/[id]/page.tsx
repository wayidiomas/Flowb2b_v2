'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FornecedorUser {
  id: number
  nome: string | null
  email: string
  cnpj: string | null
  telefone: string | null
  ativo: boolean
  created_at: string | null
  updated_at: string | null
}

interface FornecedorEntity {
  id: number
  nome: string
  empresa_id: number
  empresa_nome: string
  pedidos_count: number
}

interface Lojista {
  id: number
  nome_fantasia: string | null
  cnpj: string | null
}

interface PedidoRecente {
  id: number
  numero: string | null
  data: string | null
  total: number | null
  status_interno: string | null
  situacao: string | null
  empresa_id: number | null
  empresa_nome: string | null
}

interface FornecedorDetailData {
  user: FornecedorUser
  fornecedor_entities: FornecedorEntity[]
  lojistas: Lojista[]
  pedidos_recentes: PedidoRecente[]
  stats: {
    lojistas_vinculados: number
    pedidos_recebidos: number
    total_movimentado: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return '-'
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getStatusConfig(status: string | null): { label: string; classes: string } {
  if (!status) return { label: '-', classes: 'bg-gray-100 text-gray-600' }

  const configs: Record<string, { label: string; classes: string }> = {
    rascunho: { label: 'Rascunho', classes: 'bg-gray-100 text-gray-700' },
    pendente: { label: 'Pendente', classes: 'bg-secondary-100 text-secondary-800' },
    aprovado: { label: 'Aprovado', classes: 'bg-primary-100 text-primary-800' },
    em_andamento: { label: 'Em Andamento', classes: 'bg-cyan-100 text-cyan-800' },
    finalizado: { label: 'Finalizado', classes: 'bg-emerald-100 text-emerald-800' },
    cancelado: { label: 'Cancelado', classes: 'bg-gray-100 text-gray-600' },
    enviado: { label: 'Enviado', classes: 'bg-primary-100 text-primary-700' },
    recebido: { label: 'Recebido', classes: 'bg-emerald-100 text-emerald-800' },
  }

  const normalized = status.toLowerCase().replace(/\s+/g, '_')
  return configs[normalized] || { label: status, classes: 'bg-gray-100 text-gray-700' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FornecedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<FornecedorDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/usuarios/fornecedores/${id}`)
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Erro ao buscar fornecedor')
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          {/* Back link skeleton */}
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />

          {/* Header skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-3">
              <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="flex gap-3">
                <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-100 flex gap-4">
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar para Usuarios
          </Link>
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
            {error || 'Fornecedor nao encontrado'}
          </div>
        </div>
      </AdminLayout>
    )
  }

  const { user, lojistas, pedidos_recentes, stats } = data

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para Usuarios
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.nome || `Fornecedor #${user.id}`}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="text-sm text-gray-600 font-mono">
                  CNPJ: {formatCNPJ(user.cnpj)}
                </span>
                {user.telefone && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">
                      Tel: {user.telefone}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.ativo
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Lojistas Vinculados */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 6h1.5M5.25 9h1.5M5.25 12h1.5m7.5-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.lojistas_vinculados}</p>
                <p className="text-xs text-gray-500">Lojistas Vinculados</p>
              </div>
            </div>
          </div>

          {/* Pedidos Recebidos */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary-100 rounded-lg text-secondary-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pedidos_recebidos}</p>
                <p className="text-xs text-gray-500">Pedidos Recebidos</p>
              </div>
            </div>
          </div>

          {/* Total Movimentado */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_movimentado)}</p>
                <p className="text-xs text-gray-500">Total Movimentado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lojistas Vinculados */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Lojistas Vinculados ({lojistas.length})
            </h2>
          </div>
          {lojistas.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nenhum lojista vinculado a este fornecedor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lojistas.map((lojista) => (
                    <tr key={lojista.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm">
                        <Link
                          href={`/admin/empresas/${lojista.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          {lojista.nome_fantasia || `Empresa #${lojista.id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                        {formatCNPJ(lojista.cnpj)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pedidos Recentes */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Pedidos Recentes ({pedidos_recentes.length})
            </h2>
          </div>
          {pedidos_recentes.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nenhum pedido de compra encontrado para este fornecedor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidos_recentes.map((pedido) => {
                    const statusConfig = getStatusConfig(pedido.status_interno)
                    return (
                      <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-sm">
                          <Link
                            href={`/admin/pedidos/${pedido.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                          >
                            #{pedido.numero || pedido.id}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          {formatDate(pedido.data)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          {pedido.empresa_nome || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(pedido.total)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.classes}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
