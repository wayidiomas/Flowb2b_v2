'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CatalogoInfo {
  nome: string
  slug: string
  logo_url: string | null
  banner_url: string | null
  cor_primaria: string
  descricao: string | null
  whatsapp: string | null
}

interface CatalogoItem {
  id: number
  codigo: string | null
  nome: string
  marca: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_base: number | null
  imagem_url: string | null
  categoria: string | null
  descricao_produto: string | null
  destaque: boolean
}

interface CatalogoResponse {
  catalogo: CatalogoInfo
  itens: CatalogoItem[]
  categorias: string[]
  total: number
  page: number
  limit: number
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function CatalogoPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>('')
  const [catalogo, setCatalogo] = useState<CatalogoInfo | null>(null)
  const [itens, setItens] = useState<CatalogoItem[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [categoriaAtiva, setCategoriaAtiva] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<CatalogoItem | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Resolve params
  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  const fetchCatalogo = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      if (categoriaAtiva) queryParams.set('categoria', categoriaAtiva)
      if (search) queryParams.set('search', search)
      queryParams.set('page', String(page))

      const res = await fetch(`/api/catalogo/${slug}?${queryParams.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Catalogo nao encontrado')
        setLoading(false)
        return
      }

      const data: CatalogoResponse = await res.json()
      setCatalogo(data.catalogo)
      setItens(data.itens)
      setCategorias(data.categorias)
      setTotal(data.total)
      setLimit(data.limit)
    } catch {
      setError('Erro ao carregar catalogo')
    } finally {
      setLoading(false)
    }
  }, [slug, categoriaAtiva, search, page])

  useEffect(() => {
    fetchCatalogo()
  }, [fetchCatalogo])

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  // Update page title
  useEffect(() => {
    if (catalogo) {
      document.title = `${catalogo.nome} - Catalogo Digital | FlowB2B`
    }
  }, [catalogo])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedProduct])

  const corPrimaria = catalogo?.cor_primaria || '#336FB6'
  const totalPages = Math.ceil(total / limit)
  const destaques = itens.filter(i => i.destaque)
  const todosItens = itens

  // --- Loading state ---
  if (loading && !catalogo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <style jsx global>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        {/* Skeleton banner */}
        <div className="h-48 sm:h-64 bg-gray-200 animate-pulse" />
        {/* Skeleton header card */}
        <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Skeleton search */}
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        {/* Skeleton grid */}
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- Error state ---
  if (error && !catalogo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">{error}</h1>
          <p className="text-sm text-gray-500 mt-2">Verifique o endereco e tente novamente.</p>
          <a href="/" className="inline-block mt-6 text-sm font-medium text-blue-600 hover:underline">
            Ir para FlowB2B
          </a>
        </div>
      </div>
    )
  }

  if (!catalogo) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ========== Hero Banner ========== */}
      <div className="relative" style={{ backgroundColor: corPrimaria }}>
        {catalogo.banner_url ? (
          <div className="h-48 sm:h-64 relative">
            <img src={catalogo.banner_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-32 sm:h-48" style={{ background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd)` }}>
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="800" height="400" fill="url(#grid)" />
              </svg>
            </div>
          </div>
        )}

        {/* Supplier info card - overlapping banner */}
        <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
            {/* Logo */}
            <div
              className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border-2"
              style={{ borderColor: corPrimaria }}
            >
              {catalogo.logo_url ? (
                <img src={catalogo.logo_url} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: corPrimaria }}>
                  {catalogo.nome?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{catalogo.nome}</h1>
              {catalogo.descricao && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{catalogo.descricao}</p>
              )}
            </div>
            {catalogo.whatsapp && (
              <a
                href={`https://wa.me/${catalogo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Ola! Vi seu catalogo no FlowB2B e gostaria de mais informacoes.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 hidden sm:flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors text-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ========== Sticky Search + Categories ========== */}
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar produto por nome ou codigo..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
              style={{ ['--tw-ring-color' as string]: `${corPrimaria}40` } as React.CSSProperties}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category tabs */}
          {categorias.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
              <button
                onClick={() => { setCategoriaAtiva(''); setPage(1) }}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  !categoriaAtiva
                    ? 'text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
                style={!categoriaAtiva ? { backgroundColor: corPrimaria } : undefined}
              >
                Todos
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${!categoriaAtiva ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {total}
                </span>
              </button>
              {categorias.map(cat => {
                const isActive = categoriaAtiva === cat
                return (
                  <button
                    key={cat}
                    onClick={() => { setCategoriaAtiva(cat); setPage(1) }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                    style={isActive ? { backgroundColor: corPrimaria } : undefined}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========== Products Content ========== */}
      <div className="max-w-5xl mx-auto px-4 mt-6 pb-24">
        {loading && catalogo ? (
          /* Loading skeleton grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : todosItens.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">
              {search || categoriaAtiva ? 'Nenhum produto encontrado' : 'Catalogo vazio'}
            </h3>
            <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
              {search || categoriaAtiva
                ? 'Tente buscar com outros termos ou limpe os filtros para ver todos os produtos.'
                : 'Este catalogo ainda nao possui produtos cadastrados.'}
            </p>
            {(search || categoriaAtiva) && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setCategoriaAtiva(''); setPage(1) }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
                style={{ backgroundColor: corPrimaria }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ===== Destaques carousel (iFood style) ===== */}
            {destaques.length > 0 && !categoriaAtiva && page === 1 && !search && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-amber-500">&#9733;</span> Destaques
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {destaques.map(item => (
                    <button
                      key={`dest-${item.id}`}
                      onClick={() => setSelectedProduct(item)}
                      className="shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all text-left"
                    >
                      <div className="h-32 bg-gray-50 relative overflow-hidden">
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          &#9733;
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2">{item.nome}</p>
                        <p className="text-sm font-bold mt-1" style={{ color: corPrimaria }}>
                          {formatCurrency(item.preco_base)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ===== All products grid ===== */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {categoriaAtiva || (search ? 'Resultados' : 'Todos os produtos')}
                </h2>
                <span className="text-xs text-gray-400">
                  {total} {total === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {todosItens.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedProduct(item)}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.03] transition-all duration-200 text-left group"
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                      {item.imagem_url ? (
                        <img
                          src={item.imagem_url}
                          alt={item.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {item.destaque && (
                        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          &#9733; Destaque
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      {item.categoria && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {item.categoria}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 mt-1 group-hover:opacity-80 transition-opacity">
                        {item.nome}
                      </p>
                      {item.marca && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.marca}</p>
                      )}
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="text-lg font-bold" style={{ color: corPrimaria }}>
                          {formatCurrency(item.preco_base)}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {item.unidade || 'UN'}
                          {item.itens_por_caixa && item.itens_por_caixa > 1 ? ` · Cx ${item.itens_por_caixa}` : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ===== Pagination ===== */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  &#8592; Anterior
                </button>
                <span className="text-sm text-gray-500">
                  Pagina {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo &#8594;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== Product Detail Modal ========== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 transition-opacity"
            onClick={() => setSelectedProduct(null)}
          />
          {/* Modal content */}
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
            {/* Large image */}
            <div className="aspect-square bg-gray-50 relative">
              {selectedProduct.imagem_url ? (
                <img
                  src={selectedProduct.imagem_url}
                  alt={selectedProduct.nome}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {/* Close button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Destaque badge */}
              {selectedProduct.destaque && (
                <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  &#9733; Destaque
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-5">
              {selectedProduct.categoria && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {selectedProduct.categoria}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mt-2">{selectedProduct.nome}</h3>
              {selectedProduct.marca && (
                <p className="text-sm text-gray-500 mt-1">{selectedProduct.marca}</p>
              )}
              {selectedProduct.descricao_produto && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{selectedProduct.descricao_produto}</p>
              )}

              {/* Price */}
              <div className="mt-4">
                <p className="text-3xl font-bold" style={{ color: corPrimaria }}>
                  {formatCurrency(selectedProduct.preco_base)}
                </p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Codigo</p>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{selectedProduct.codigo || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Unidade</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedProduct.unidade || 'UN'}</p>
                </div>
                {selectedProduct.itens_por_caixa && selectedProduct.itens_por_caixa > 1 && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Embalagem</p>
                    <p className="text-sm font-semibold text-gray-900">Cx com {selectedProduct.itens_por_caixa} un</p>
                  </div>
                )}
                {selectedProduct.marca && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Marca</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedProduct.marca}</p>
                  </div>
                )}
              </div>

              {/* WhatsApp CTA */}
              {catalogo.whatsapp && (
                <a
                  href={`https://wa.me/${catalogo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Ola! Tenho interesse no produto: ${selectedProduct.nome} (${selectedProduct.codigo || 'sem codigo'})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Perguntar sobre este produto
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== WhatsApp Floating Button (mobile only) ========== */}
      {catalogo.whatsapp && !selectedProduct && (
        <a
          href={`https://wa.me/${catalogo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Ola! Vi seu catalogo no FlowB2B e gostaria de mais informacoes.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-40 sm:hidden"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}

      {/* ========== Footer ========== */}
      <footer className="border-t border-gray-200 mt-12 py-6 text-center">
        <p className="text-sm text-gray-400">
          Catalogo digital por{' '}
          <a href="/" className="text-[#336FB6] hover:underline font-medium">FlowB2B</a>
        </p>
      </footer>

      {/* ========== Modal slide-up animation ========== */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @media (min-width: 640px) {
          @keyframes slide-up {
            from {
              transform: scale(0.95);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        }
      `}</style>
    </div>
  )
}
