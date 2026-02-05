'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton } from '@/components/ui'

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
  itens_count: number
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado_fornecedor: 'bg-blue-100 text-blue-700',
  sugestao_pendente: 'bg-amber-100 text-amber-700',
  aceito: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
  finalizado: 'bg-purple-100 text-purple-700',
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Aguardando resposta',
  sugestao_pendente: 'Sugestao enviada',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
}

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'enviado_fornecedor', label: 'Aguardando resposta' },
  { value: 'sugestao_pendente', label: 'Sugestao enviada' },
  { value: 'aceito', label: 'Aceitos' },
  { value: 'rejeitado', label: 'Rejeitados' },
]

export default function FornecedorPedidosPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (!user) return

    const fetchPedidos = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter) params.set('status', statusFilter)
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
    }

    fetchPedidos()
  }, [user, statusFilter])

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pedidos de compra recebidos dos lojistas
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    <th className="px-6 py-3">Numero</th>
                    <th className="px-6 py-3">Lojista</th>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Previsao</th>
                    <th className="px-6 py-3">Itens</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidos.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{pedido.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {pedido.empresa_nome}
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
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[pedido.status_interno] || pedido.status_interno}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/fornecedor/pedidos/${pedido.id}`}>
                          <Button variant="outline" size="sm">
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
              <p className="text-gray-500">Nenhum pedido encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </FornecedorLayout>
  )
}
