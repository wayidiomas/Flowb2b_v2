'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------- Types ----------

interface PedidoRow {
  id: number
  numero: string | null
  data: string | null
  total: number | null
  status_interno: string | null
  situacao: number | null
  origem: string | null
  is_excluded: boolean | null
  updated_at: string | null
  empresa_nome: string
  fornecedor_nome: string
  representante_nome: string | null
}

interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

interface EmpresaOption {
  id: number
  nome_fantasia: string | null
}

// ---------- Constants ----------

const STATUS_INTERNO_OPTIONS: { value: string; label: string }[] = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado_fornecedor', label: 'Enviado ao Fornecedor' },
  { value: 'sugestao_pendente', label: 'Sugestao Pendente' },
  { value: 'contra_proposta_pendente', label: 'Contra-Proposta Pendente' },
  { value: 'aceito', label: 'Aceito' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'rejeitado', label: 'Rejeitado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-gray-100', text: 'text-gray-500' },
  enviado_fornecedor: { bg: 'bg-amber-100', text: 'text-amber-700' },
  sugestao_pendente: { bg: 'bg-orange-100', text: 'text-orange-700' },
  contra_proposta_pendente: { bg: 'bg-orange-100', text: 'text-orange-700' },
  aceito: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  finalizado: { bg: 'bg-purple-100', text: 'text-purple-700' },
  rejeitado: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelado: { bg: 'bg-gray-100', text: 'text-gray-400' },
}

const STATUS_INTERNO_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Enviado',
  sugestao_pendente: 'Sugestao Pendente',
  contra_proposta_pendente: 'Contra-Proposta',
  aceito: 'Aceito',
  finalizado: 'Finalizado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
}

const SITUACAO_BLING_LABELS: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: 'Em Aberto', bg: 'bg-blue-50', text: 'text-blue-600' },
  1: { label: 'Atendido', bg: 'bg-green-50', text: 'text-green-600' },
  2: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-600' },
  3: { label: 'Em Andamento', bg: 'bg-yellow-50', text: 'text-yellow-600' },
}

// ---------- Component ----------

export default function AdminPedidosPage() {
  const router = useRouter()

  // Data
  const [pedidos, setPedidos] = useState<PedidoRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])

  // Filters
  const [empresaId, setEmpresaId] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [search, setSearch] = useState('')
  const [showExcluidos, setShowExcluidos] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

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
        // Empresas endpoint may not be available - leave dropdown empty
      }
    }

    loadEmpresas()
  }, [])

  // Fetch pedidos
  const fetchPedidos = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(pageNum))
        params.set('per_page', '20')

        if (empresaId) params.set('empresa_id', empresaId)
        if (selectedStatuses.length > 0) params.set('status_interno', selectedStatuses.join(','))
        if (dataDe) params.set('data_de', dataDe)
        if (dataAte) params.set('data_ate', dataAte)
        if (search) params.set('search', search)
        if (showExcluidos) params.set('excluidos', 'true')

        const res = await fetch(`/api/admin/pedidos?${params.toString()}`)
        if (res.ok) {
          const json = await res.json()
          setPedidos(json.data || [])
          setPagination(json.pagination || { page: 1, per_page: 20, total: 0, total_pages: 0 })
        } else {
          console.error('Failed to fetch pedidos:', res.status)
          setPedidos([])
        }
      } catch (err) {
        console.error('Error fetching pedidos:', err)
        setPedidos([])
      } finally {
        setLoading(false)
      }
    },
    [empresaId, selectedStatuses, dataDe, dataAte, search, showExcluidos]
  )

  // Load on mount and when filters change
  useEffect(() => {
    fetchPedidos(1)
  }, [fetchPedidos])

  // Status multi-select toggle
  function toggleStatus(value: string) {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  // Format helpers
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '-'
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos de Compra</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auditoria de todos os pedidos de compra do sistema
          </p>
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Search by numero */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por numero</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Numero do pedido..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

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

            {/* Status interno multi-select */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status Interno</label>
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white text-left flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedStatuses.length === 0
                    ? 'Todos'
                    : `${selectedStatuses.length} selecionado${selectedStatuses.length > 1 ? 's' : ''}`}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {statusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                    {STATUS_INTERNO_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(opt.value)}
                          onChange={() => toggleStatus(opt.value)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                    {selectedStatuses.length > 0 && (
                      <button
                        onClick={() => setSelectedStatuses([])}
                        className="w-full text-left px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 border-t border-gray-100"
                      >
                        Limpar selecao
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data de</label>
              <input
                type="date"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data ate</label>
              <input
                type="date"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Secondary filters row */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showExcluidos}
                onChange={(e) => setShowExcluidos(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Mostrar excluidos
            </label>

            {(search || empresaId || selectedStatuses.length > 0 || dataDe || dataAte || showExcluidos) && (
              <button
                onClick={() => {
                  setSearch('')
                  setEmpresaId('')
                  setSelectedStatuses([])
                  setDataDe('')
                  setDataAte('')
                  setShowExcluidos(false)
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Limpar filtros
              </button>
            )}

            <div className="ml-auto text-sm text-gray-500">
              {pagination.total} pedido{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#Numero</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Empresa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fornecedor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Representante</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Bling</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Origem</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 animate-pulse">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                      Nenhum pedido encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  pedidos.map((pedido) => {
                    const statusConfig = STATUS_BADGE_COLORS[pedido.status_interno || ''] || {
                      bg: 'bg-gray-100',
                      text: 'text-gray-600',
                    }
                    const situacaoConfig = SITUACAO_BLING_LABELS[pedido.situacao ?? -1] || null

                    return (
                      <tr
                        key={pedido.id}
                        onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          pedido.is_excluded ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {pedido.numero || `#${pedido.id}`}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{pedido.empresa_nome}</td>
                        <td className="px-4 py-3 text-gray-700">{pedido.fornecedor_nome}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {pedido.representante_nome || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(pedido.data)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(pedido.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {pedido.status_interno ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                            >
                              {STATUS_INTERNO_LABELS[pedido.status_interno] || pedido.status_interno}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {situacaoConfig ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${situacaoConfig.bg} ${situacaoConfig.text}`}
                            >
                              {situacaoConfig.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {pedido.origem ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">
                              {pedido.origem}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/pedidos/${pedido.id}`)
                            }}
                            className="text-primary-600 hover:text-primary-700 font-medium text-xs"
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Pagina {pagination.page} de {pagination.total_pages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPedidos(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum: number
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchPedidos(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                        pageNum === pagination.page
                          ? 'bg-primary-700 text-white border-primary-700'
                          : 'border-gray-300 hover:bg-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  onClick={() => fetchPedidos(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
