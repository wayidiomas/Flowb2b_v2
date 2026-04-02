'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton, Input } from '@/components/ui'

interface Representante {
  id: number
  nome: string
}

interface Pedido {
  id: number
  numero: string
  data: string
  data_prevista: string | null
  total: number
  total_produtos: number
  status_interno: string
  empresa_id: number
  empresa_nome: string
  empresa_cnpj: string
  itens_count: number
  representante: Representante | null
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado_fornecedor: 'bg-amber-100 text-amber-700',
  sugestao_pendente: 'bg-orange-100 text-orange-700',
  aceito: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
  finalizado: 'bg-purple-100 text-purple-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Aguardando resposta',
  sugestao_pendente: 'Sugestao enviada',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'enviado_fornecedor', label: 'Aguardando resposta' },
  { value: 'sugestao_pendente', label: 'Sugestao enviada' },
  { value: 'aceito', label: 'Aceitos' },
  { value: 'rejeitado', label: 'Rejeitados' },
]

function formatCNPJ(cnpj: string) {
  if (!cnpj) return '-'
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// Icone de busca
function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export default function FornecedorPedidosPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState<'tabela' | 'kanban'>('tabela')

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchPedidos = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('origem', 'plataforma')

      const res = await fetch(`/api/fornecedor/pedidos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPedidos(data.pedidos || [])
      }
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err)
    } finally {
      setLoading(false)
    }
  }, [user, statusFilter, debouncedSearch])

  useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pedidos de compra recebidos dos lojistas
            </p>
          </div>

          {/* View toggle + Search */}
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('tabela')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'tabela'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
                </svg>
                Tabela
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                Kanban
              </button>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por lojista, nome ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
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

        {/* Lista de pedidos */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Nenhum pedido encontrado.</p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-1">Tente buscar com outros termos</p>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          /* ── KANBAN VIEW ── */
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {[
                { status: 'enviado_fornecedor', label: 'Aguardando resposta', bg: 'bg-amber-50', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' },
                { status: 'sugestao_pendente', label: 'Sugestao enviada', bg: 'bg-orange-50', dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700' },
                { status: 'aceito', label: 'Aceitos', bg: 'bg-emerald-50', dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
                { status: 'rejeitado', label: 'Rejeitados', bg: 'bg-red-50', dot: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
                { status: 'finalizado', label: 'Finalizados', bg: 'bg-purple-50', dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700' },
              ].map((col) => {
                const columnPedidos = pedidos.filter((p) => p.status_interno === col.status)
                const totalValue = columnPedidos.reduce((sum, p) => sum + p.total, 0)
                return (
                  <div key={col.status} className="w-[280px] shrink-0">
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 ${col.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                        {columnPedidos.length}
                      </span>
                    </div>

                    {/* Column total */}
                    {columnPedidos.length > 0 && (
                      <div className="text-xs text-gray-400 px-3 mb-2">
                        Total: <span className="font-semibold text-gray-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Cards */}
                    <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                      {columnPedidos.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                          <p className="text-xs text-gray-400">Nenhum pedido</p>
                        </div>
                      ) : (
                        columnPedidos.map((pedido) => (
                          <Link
                            key={pedido.id}
                            href={`/fornecedor/pedidos/${pedido.id}`}
                            className="block bg-white rounded-xl border border-gray-200 p-3.5 hover:border-[#336FB6]/30 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-900">#{pedido.numero}</span>
                                {pedido.representante && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
                                    Rep
                                  </span>
                                )}
                              </div>
                              <svg className="w-4 h-4 text-gray-300 group-hover:text-[#336FB6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-700 font-medium truncate">{pedido.empresa_nome}</p>
                            {pedido.representante && (
                              <p className="text-[11px] text-violet-600 mt-0.5">via {pedido.representante.nome}</p>
                            )}
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                              <span className="text-xs text-gray-400">
                                {new Date(pedido.data).toLocaleDateString('pt-BR')} · {pedido.itens_count} itens
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                      <th className="px-6 py-4">Numero</th>
                      <th className="px-6 py-4">Lojista</th>
                      <th className="px-6 py-4">CNPJ</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Previsao</th>
                      <th className="px-6 py-4">Itens</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pedidos.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-[#336FB6]/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            #{pedido.numero}
                            {pedido.representante && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700" title={`Via representante: ${pedido.representante.nome}`}>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Rep
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                          <div>
                            {pedido.empresa_nome}
                            {pedido.representante && (
                              <p className="text-xs text-violet-600 mt-0.5">
                                via {pedido.representante.nome}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {formatCNPJ(pedido.empresa_cnpj)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(pedido.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {pedido.data_prevista
                            ? new Date(pedido.data_prevista).toLocaleDateString('pt-BR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {pedido.itens_count}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[pedido.status_interno] || pedido.status_interno}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/fornecedor/pedidos/${pedido.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#FFAA11] text-[#FFAA11] hover:bg-[#FFAA11] hover:text-white"
                            >
                              Ver detalhes
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {pedidos.map((pedido) => (
                  <Link
                    key={pedido.id}
                    href={`/fornecedor/pedidos/${pedido.id}`}
                    className="block p-4 hover:bg-[#336FB6]/5 active:bg-[#336FB6]/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">#{pedido.numero}</span>
                          {pedido.representante && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
                              Rep
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{pedido.empresa_nome}</p>
                        {pedido.representante && (
                          <p className="text-xs text-violet-600">via {pedido.representante.nome}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[pedido.status_interno] || pedido.status_interno}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span>{new Date(pedido.data).toLocaleDateString('pt-BR')}</span>
                        <span>{pedido.itens_count} itens</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
