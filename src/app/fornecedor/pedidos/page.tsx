'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton, Input } from '@/components/ui'

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

          {/* Search */}
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

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : pedidos.length > 0 ? (
            <div className="overflow-x-auto">
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
                        #{pedido.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {pedido.empresa_nome}
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
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nenhum pedido encontrado.</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-1">
                  Tente buscar com outros termos
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </FornecedorLayout>
  )
}
