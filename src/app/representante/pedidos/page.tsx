'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRepresentanteAuth } from '@/contexts/RepresentanteAuthContext'
import { RepresentanteLayout } from '@/components/layout/RepresentanteLayout'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

interface Pedido {
  id: number
  numero: string
  data: string
  status: string
  total: number
  fornecedor_id: number
  fornecedor_nome: string
  empresa_id: number
  empresa_nome: string
  created_at: string
}

interface GrupoFornecedor {
  fornecedor_id: number
  fornecedor_nome: string
  pedidos: Pedido[]
  totalValor: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  enviado_ao_fornecedor: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700' },
  sugestao_enviada: { label: 'Sugestao Enviada', color: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500' },
  contra_proposta: { label: 'Contra-proposta', color: 'bg-purple-100 text-purple-700' },
}

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'enviado_ao_fornecedor', label: 'Aguardando' },
  { value: 'sugestao_enviada', label: 'Sugestao Enviada' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'recusado', label: 'Recusados' },
  { value: 'cancelado', label: 'Cancelados' },
]

function PedidosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, fornecedoresVinculados, loading: authLoading } = useRepresentanteAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [fornecedorFilter, setFornecedorFilter] = useState(searchParams.get('fornecedor_id') || '')
  const [lojistaFilter, setLojistaFilter] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const params = new URLSearchParams()
        params.set('page', String(currentPage))
        params.set('limit', String(limit))
        if (statusFilter) params.set('status', statusFilter)
        if (fornecedorFilter) params.set('fornecedor_id', fornecedorFilter)

        const response = await fetch(`/api/representante/pedidos?${params.toString()}`)
        const data = await response.json()
        if (data.success) {
          setPedidos(data.pedidos)
          setTotal(data.total)
        }
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) {
      fetchPedidos()
    }
  }, [authLoading, user, currentPage, statusFilter, fornecedorFilter])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Lojistas unicos extraidos dos vinculos do representante
  const lojistas = useMemo(() => {
    const map = new Map<number, string>()
    fornecedoresVinculados.forEach((f) => {
      if (!map.has(f.empresa_id)) {
        map.set(f.empresa_id, f.empresa_nome)
      }
    })
    return Array.from(map, ([id, nome]) => ({ empresa_id: id, empresa_nome: nome }))
  }, [fornecedoresVinculados])

  // Filtrar pedidos por busca textual e lojista
  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.empresa_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchLojista = !lojistaFilter || p.empresa_id === Number(lojistaFilter)
      return matchSearch && matchLojista
    })
  }, [pedidos, searchTerm, lojistaFilter])

  // Agrupar pedidos filtrados por fornecedor
  const gruposFornecedor = useMemo(() => {
    const map = new Map<number, GrupoFornecedor>()
    filteredPedidos.forEach((p) => {
      let grupo = map.get(p.fornecedor_id)
      if (!grupo) {
        grupo = {
          fornecedor_id: p.fornecedor_id,
          fornecedor_nome: p.fornecedor_nome,
          pedidos: [],
          totalValor: 0,
        }
        map.set(p.fornecedor_id, grupo)
      }
      grupo.pedidos.push(p)
      grupo.totalValor += p.total || 0
    })
    return Array.from(map.values()).sort((a, b) =>
      a.fornecedor_nome.localeCompare(b.fornecedor_nome)
    )
  }, [filteredPedidos])

  const toggleGroup = (fornecedorId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(fornecedorId)) {
        next.delete(fornecedorId)
      } else {
        next.add(fornecedorId)
      }
      return next
    })
  }

  const totalPages = Math.ceil(total / limit)

  if (authLoading) {
    return (
      <RepresentanteLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#336FB6]" />
        </div>
      </RepresentanteLayout>
    )
  }

  return (
    <RepresentanteLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie pedidos de todos os fornecedores vinculados
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por numero, fornecedor, lojista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
            />
          </div>
        </div>

        {/* Status Filters - pill buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value)
                setCurrentPage(1)
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? 'bg-[#336FB6] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-[#336FB6]/10 hover:text-[#336FB6] border border-gray-200 hover:border-[#336FB6]/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={fornecedorFilter}
            onChange={(e) => {
              setFornecedorFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
          >
            <option value="">Todos os fornecedores</option>
            {fornecedoresVinculados.map((f) => (
              <option key={f.fornecedor_id} value={f.fornecedor_id}>
                {f.fornecedor_nome}
              </option>
            ))}
          </select>

          <select
            value={lojistaFilter}
            onChange={(e) => {
              setLojistaFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
          >
            <option value="">Todos os lojistas</option>
            {lojistas.map((l) => (
              <option key={l.empresa_id} value={l.empresa_id}>
                {l.empresa_nome}
              </option>
            ))}
          </select>
        </div>

        {/* Grouped by Fornecedor */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-1">Tente buscar com outros termos</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {gruposFornecedor.map((grupo) => {
              const isCollapsed = collapsedGroups.has(grupo.fornecedor_id)
              const qtd = grupo.pedidos.length
              return (
                <div
                  key={grupo.fornecedor_id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(grupo.fornecedor_id)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#336FB6]/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`transition-transform duration-200 text-[#336FB6] ${
                          isCollapsed ? '-rotate-90' : ''
                        }`}
                      >
                        <ChevronDownIcon className="w-5 h-5" />
                      </span>
                      <span className="font-semibold text-gray-900">
                        {grupo.fornecedor_nome}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#336FB6]/10 text-[#336FB6]">
                        {qtd} {qtd === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(grupo.totalValor)}
                    </span>
                  </button>

                  {/* Accordion Body */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-100">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                              <th className="px-6 py-3">Pedido</th>
                              <th className="px-6 py-3">Lojista</th>
                              <th className="px-6 py-3">Data</th>
                              <th className="px-6 py-3">Valor</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {grupo.pedidos.map((pedido) => (
                              <tr
                                key={pedido.id}
                                className="hover:bg-[#336FB6]/5 transition-colors cursor-pointer"
                                onClick={() =>
                                  router.push(`/representante/pedidos/${pedido.id}`)
                                }
                              >
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  #{pedido.numero || pedido.id}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                  {pedido.empresa_nome}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {formatDate(pedido.data || pedido.created_at)}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  {formatCurrency(pedido.total || 0)}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                      STATUS_LABELS[pedido.status]?.color ||
                                      'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {STATUS_LABELS[pedido.status]?.label || pedido.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <Link
                                    href={`/representante/pedidos/${pedido.id}`}
                                    className="text-gray-400 hover:text-[#336FB6] transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLinkIcon />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > limit && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6]/30 rounded-xl hover:bg-[#336FB6]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon />
              Anterior
            </button>

            <span className="text-sm text-gray-500">
              Pagina {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6]/30 rounded-xl hover:bg-[#336FB6]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Proximo
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
    </RepresentanteLayout>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#336FB6]" />
    </div>
  )
}

export default function RepresentantePedidosPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PedidosContent />
    </Suspense>
  )
}
