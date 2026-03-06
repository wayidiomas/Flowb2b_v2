'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Skeleton, TableSkeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

// ─── Icons ───────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FornecedorCatalogo {
  fornecedor_id: number
  cnpj: string
  nome: string
  catalogo_id: number
  catalogo_nome: string
}

interface ItemCatalogo {
  id: number
  codigo: string | null
  nome: string
  marca: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_base: number | null
  preco_aplicavel: number | null
  desconto_percentual: number | null
  ativo: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CatalogoPage() {
  const { empresa } = useAuth()

  // State: fornecedores list
  const [fornecedores, setFornecedores] = useState<FornecedorCatalogo[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(true)

  // State: selected fornecedor + items
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorCatalogo | null>(null)
  const [itens, setItens] = useState<ItemCatalogo[]>([])
  const [loadingItens, setLoadingItens] = useState(false)
  const [totalItens, setTotalItens] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  // Filters
  const [search, setSearch] = useState('')
  const [marcaFilter, setMarcaFilter] = useState('')
  const [marcas, setMarcas] = useState<string[]>([])

  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Fetch fornecedores ─────────────────────────────────────────────────

  useEffect(() => {
    if (!empresa?.id) return
    fetchFornecedores()
  }, [empresa?.id])

  const fetchFornecedores = async () => {
    setLoadingFornecedores(true)
    try {
      const res = await fetch('/api/compras/catalogo')
      const data = await res.json()
      setFornecedores(data.fornecedores || [])
    } catch (error) {
      console.error('Erro ao buscar fornecedores com catalogo:', error)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // ─── Fetch items ──────────────────────────────────────────────────────────

  const fetchItens = useCallback(async (fornecedorId: number, pageNum: number, searchText: string, marcaText: string) => {
    setLoadingItens(true)
    try {
      const params = new URLSearchParams({
        fornecedor_id: String(fornecedorId),
        page: String(pageNum),
        limit: String(limit),
      })
      if (searchText) params.set('search', searchText)
      if (marcaText) params.set('marca', marcaText)

      const res = await fetch(`/api/compras/catalogo?${params}`)
      const data = await res.json()
      setItens(data.itens || [])
      setTotalItens(data.total || 0)

      // Extract unique marcas for filter (from first load without marca filter)
      if (!marcaText && pageNum === 1 && !searchText) {
        const uniqueMarcas = Array.from(
          new Set(
            (data.itens || [])
              .map((i: ItemCatalogo) => i.marca)
              .filter(Boolean)
          )
        ) as string[]
        setMarcas(uniqueMarcas.sort())
      }
    } catch (error) {
      console.error('Erro ao buscar itens do catalogo:', error)
    } finally {
      setLoadingItens(false)
    }
  }, [])

  // Re-fetch when page/marca changes
  useEffect(() => {
    if (!selectedFornecedor) return
    fetchItens(selectedFornecedor.fornecedor_id, page, search, marcaFilter)
  }, [selectedFornecedor, page, marcaFilter])

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      if (selectedFornecedor) {
        fetchItens(selectedFornecedor.fornecedor_id, 1, value, marcaFilter)
      }
    }, 300)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  const selectFornecedor = (f: FornecedorCatalogo) => {
    setSelectedFornecedor(f)
    setSearch('')
    setMarcaFilter('')
    setPage(1)
    setItens([])
    fetchItens(f.fornecedor_id, 1, '', '')
  }

  const goBack = () => {
    setSelectedFornecedor(null)
    setItens([])
    setSearch('')
    setMarcaFilter('')
    setPage(1)
    setMarcas([])
  }

  // Pagination
  const totalPages = Math.ceil(totalItens / limit)

  // ─── Render: Fornecedores Grid ────────────────────────────────────────────

  const renderFornecedores = () => {
    if (loadingFornecedores) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-lg mt-3" />
            </div>
          ))}
        </div>
      )
    }

    if (fornecedores.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-4 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BuildingIcon />
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhum catalogo disponivel</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Quando seus fornecedores publicarem catalogos de produtos, eles aparecerão aqui para consulta.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {fornecedores.map((f) => (
          <button
            key={f.fornecedor_id}
            onClick={() => selectFornecedor(f)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#336FB6]/30 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-[#336FB6]/10 flex items-center justify-center text-[#336FB6] group-hover:bg-[#336FB6]/15 transition-colors">
                <BuildingIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{f.nome}</p>
                <p className="text-xs text-gray-500 truncate">{f.catalogo_nome}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end">
              <span className="text-xs font-medium text-[#336FB6] group-hover:text-[#2660A5] flex items-center gap-1">
                Ver catalogo
                <ChevronRightIcon />
              </span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  // ─── Render: Items Table (Desktop) ────────────────────────────────────────

  const renderItensTable = () => (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-t border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Codigo</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Produto</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Marca</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Unidade</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Cx.</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Preco</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Desconto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loadingItens ? (
            <TableSkeleton columns={7} rows={8} />
          ) : itens.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <TagIcon />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Nenhum produto encontrado</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {search || marcaFilter
                        ? 'Tente ajustar os filtros de busca'
                        : 'Este catalogo ainda nao possui produtos'}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            itens.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.codigo || '-'}</td>
                <td className="px-4 py-3 text-gray-900">{item.nome}</td>
                <td className="px-4 py-3 text-gray-600">{item.marca || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.unidade || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.itens_por_caixa || '-'}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatCurrency(item.preco_aplicavel)}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.desconto_percentual && item.desconto_percentual > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      -{item.desconto_percentual.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  // ─── Render: Items Cards (Mobile) ─────────────────────────────────────────

  const renderItensCards = () => (
    <div className="md:hidden space-y-3 p-4">
      {loadingItens ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))
      ) : itens.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <TagIcon />
          </div>
          <p className="text-sm font-medium text-gray-900">Nenhum produto encontrado</p>
          <p className="text-xs text-gray-500 mt-1">
            {search || marcaFilter
              ? 'Tente ajustar os filtros de busca'
              : 'Este catalogo ainda nao possui produtos'}
          </p>
        </div>
      ) : (
        itens.map((item) => (
          <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.codigo ? `${item.codigo} - ` : ''}{item.nome}
                </p>
                {item.marca && (
                  <p className="text-xs text-gray-500">{item.marca}</p>
                )}
              </div>
              {item.desconto_percentual && item.desconto_percentual > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                  -{item.desconto_percentual.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {item.unidade || '-'}
                {item.itens_por_caixa ? ` | Cx: ${item.itens_por_caixa} un` : ''}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(item.preco_aplicavel)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )

  // ─── Render: Pagination ───────────────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1 || loadingItens) return null

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {totalItens} {totalItens === 1 ? 'produto' : 'produtos'}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-sm text-gray-700 px-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <RequirePermission permission="pedidos">
    <DashboardLayout>
      <PageHeader
        title="Catalogos de Fornecedores"
        subtitle="Consulte produtos e precos dos seus fornecedores"
      />

      {/* Filters bar - only when a supplier is selected */}
      {selectedFornecedor && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="p-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
            {/* Back button */}
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-sm text-[#336FB6] hover:text-[#2660A5] font-medium transition-colors shrink-0"
            >
              <ArrowLeftIcon />
              <span className="hidden sm:inline">Voltar para fornecedores</span>
              <span className="sm:hidden">Voltar</span>
            </button>

            <div className="w-px h-6 bg-gray-200 hidden md:block" />

            <p className="text-sm font-medium text-gray-900 shrink-0">
              {selectedFornecedor.nome}
            </p>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-full md:w-auto md:min-w-[260px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
              />
            </div>

            {/* Marca filter */}
            {marcas.length > 0 && (
              <select
                value={marcaFilter}
                onChange={(e) => {
                  setMarcaFilter(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] bg-white"
              >
                <option value="">Todas as marcas</option>
                {marcas.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!selectedFornecedor ? (
        renderFornecedores()
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {renderItensTable()}
          {renderItensCards()}
          {renderPagination()}
        </div>
      )}
    </DashboardLayout>
    </RequirePermission>
  )
}
