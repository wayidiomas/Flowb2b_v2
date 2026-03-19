'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface CatalogoProduto {
  nome: string
  gtin: string | null
  codigo_fornecedor: string | null
  marca: string | null
  unidade: string | null
  preco: number | null
  vinculado_empresa: boolean
}

interface ProductSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (produto: CatalogoProduto) => void
  pedidoId: number | string
  mode: 'substituir' | 'adicionar'
  itemOriginalNome?: string
  apiBasePath?: string  // default: '/api/fornecedor/pedidos'
  apiEndpoint?: string  // URL completa, ex: "/api/pedidos-compra/123/catalogo-fornecedor"
}

export function ProductSearchModal({
  isOpen,
  onClose,
  onSelect,
  pedidoId,
  mode,
  itemOriginalNome,
  apiBasePath = '/api/fornecedor/pedidos',
  apiEndpoint,
}: ProductSearchModalProps) {
  const [search, setSearch] = useState('')
  const [produtos, setProdutos] = useState<CatalogoProduto[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const limit = 30

  const fetchProdutos = useCallback(async (searchTerm: string, pageNum: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
      })
      if (searchTerm) params.set('search', searchTerm)

      const url = apiEndpoint
        ? `${apiEndpoint}?${params}`
        : `${apiBasePath}/${pedidoId}/catalogo-produtos?${params}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setProdutos(data.produtos)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [pedidoId, apiBasePath, apiEndpoint])

  // Load on open
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setPage(1)
      setProdutos([])
      setTotal(0)
      fetchProdutos('', 1)
      // Autofocus after render
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, fetchProdutos])

  // Debounced search
  useEffect(() => {
    if (!isOpen) return

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setPage(1)
      fetchProdutos(search, 1)
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [search, isOpen, fetchProdutos])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modal = modalRef.current
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelectors)
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  const handleSelect = (produto: CatalogoProduto) => {
    onSelect(produto)
    onClose()
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchProdutos(search, newPage)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (!isOpen) return null

  const totalPages = Math.ceil(total / limit)
  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)
  const isSubstituir = mode === 'substituir'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={isSubstituir ? 'Substituir Produto' : 'Adicionar Produto ao Pedido'}
          className="relative w-full max-w-2xl transform rounded-2xl bg-white shadow-2xl transition-all"
        >
          {/* Header */}
          <div className={`relative overflow-hidden rounded-t-2xl px-6 py-5 ${
            isSubstituir
              ? 'bg-gradient-to-r from-secondary-500 to-secondary-600'
              : 'bg-gradient-to-r from-primary-600 to-primary-700'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 bg-white/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {isSubstituir ? 'Substituir Produto' : 'Adicionar Produto ao Pedido'}
                </h2>
                {isSubstituir && itemOriginalNome && (
                  <p className="mt-1 text-sm text-white/80 truncate">
                    Substituindo: &quot;{itemOriginalNome}&quot;
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Fechar modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, EAN ou codigo..."
                aria-label="Buscar produto por nome, EAN ou codigo"
                className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none bg-gray-50/50 transition-all placeholder:text-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Limpar busca"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[400px] px-4 py-3">
            {loading ? (
              /* Loading skeletons */
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : produtos.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">Nenhum produto encontrado</p>
                <p className="text-xs text-gray-400 mt-1">Tente buscar com outros termos</p>
              </div>
            ) : (
              /* Product list */
              <div className="space-y-2">
                {produtos.map((produto, index) => (
                  <button
                    key={`${produto.gtin || produto.codigo_fornecedor || produto.nome}-${index}`}
                    onClick={() => handleSelect(produto)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md group ${
                      produto.vinculado_empresa
                        ? 'border-gray-200 hover:border-primary-300 bg-white'
                        : 'border-secondary-200/60 hover:border-secondary-300 bg-secondary-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        produto.vinculado_empresa
                          ? 'bg-green-100 text-green-600'
                          : 'bg-secondary-100 text-secondary-600'
                      }`}>
                        {produto.vinculado_empresa ? (
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                            {produto.nome}
                          </span>
                        </div>

                        {/* Details row */}
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                          {produto.gtin && (
                            <span className="text-xs text-gray-400 font-mono">
                              EAN: {produto.gtin}
                            </span>
                          )}
                          {produto.gtin && produto.codigo_fornecedor && (
                            <span className="text-xs text-gray-300">&middot;</span>
                          )}
                          {produto.codigo_fornecedor && (
                            <span className="text-xs text-gray-400 font-mono">
                              SKU: {produto.codigo_fornecedor}
                            </span>
                          )}
                          {(produto.gtin || produto.codigo_fornecedor) && produto.marca && (
                            <span className="text-xs text-gray-300">&middot;</span>
                          )}
                          {produto.marca && (
                            <span className="text-xs text-gray-500">{produto.marca}</span>
                          )}
                        </div>

                        {/* Price and unit */}
                        <div className="flex items-center gap-2 mt-1.5">
                          {produto.unidade && (
                            <span className="text-xs text-gray-500 font-medium">{produto.unidade}</span>
                          )}
                          {produto.unidade && produto.preco != null && (
                            <span className="text-xs text-gray-300">&middot;</span>
                          )}
                          {produto.preco != null && (
                            <span className="text-sm font-semibold text-gray-700 tabular-nums">
                              {formatCurrency(produto.preco)}
                            </span>
                          )}
                        </div>

                        {/* "Novo para este cliente" badge */}
                        {!produto.vinculado_empresa && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-secondary-100 text-secondary-700 border border-secondary-300 rounded-md">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                              Novo para este cliente
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Arrow indicator */}
                      <div className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > 0 && !loading && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Mostrando {startItem}-{endItem} de {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Anterior
                  </button>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {page}/{totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Proximo
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
