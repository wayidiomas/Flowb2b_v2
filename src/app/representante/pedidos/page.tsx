'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRepresentanteAuth } from '@/contexts/RepresentanteAuthContext'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

function ExternalLinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
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
  empresa_nome: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  enviado_ao_fornecedor: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700' },
  sugestao_enviada: { label: 'Sugestao Enviada', color: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700' },
  contra_proposta: { label: 'Contra-proposta', color: 'bg-purple-100 text-purple-700' },
}

function PedidosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, fornecedoresVinculados, logout, loading: authLoading } = useRepresentanteAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [fornecedorFilter, setFornecedorFilter] = useState(searchParams.get('fornecedor_id') || '')
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

  const filteredPedidos = pedidos.filter(p =>
    p.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.empresa_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(total / limit)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Image
                src="/assets/branding/logo.png"
                alt="FlowB2B"
                width={120}
                height={32}
                className="object-contain"
              />
              <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded">
                Representante
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/representante/dashboard"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HomeIcon />
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogoutIcon />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie pedidos de todos os fornecedores vinculados
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por numero, fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
            >
              <option value="">Todos os status</option>
              <option value="enviado_ao_fornecedor">Aguardando</option>
              <option value="sugestao_enviada">Sugestao Enviada</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={fornecedorFilter}
              onChange={(e) => {
                setFornecedorFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
            >
              <option value="">Todos os fornecedores</option>
              {fornecedoresVinculados.map((f) => (
                <option key={f.fornecedor_id} value={f.fornecedor_id}>
                  {f.fornecedor_nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lojista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                      </div>
                    </td>
                  </tr>
                ) : filteredPedidos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Nenhum pedido encontrado
                    </td>
                  </tr>
                ) : (
                  filteredPedidos.map((pedido) => (
                    <tr
                      key={pedido.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/representante/pedidos/${pedido.id}`)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          #{pedido.numero || pedido.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{pedido.fornecedor_nome}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{pedido.empresa_nome}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{formatDate(pedido.data || pedido.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(pedido.total || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          STATUS_LABELS[pedido.status]?.color || 'bg-gray-100 text-gray-700'
                        }`}>
                          {STATUS_LABELS[pedido.status]?.label || pedido.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/representante/pedidos/${pedido.id}`}
                          className="text-gray-400 hover:text-violet-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLinkIcon />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > limit && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proximo
                <ChevronRightIcon />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
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
