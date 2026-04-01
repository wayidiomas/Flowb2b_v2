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

  const corPrimaria = catalogo?.cor_primaria || '#336FB6'
  const totalPages = Math.ceil(total / limit)
  const destaques = itens.filter(i => i.destaque)
  const todosItens = itens

  if (loading && !catalogo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Carregando catalogo...</p>
        </div>
      </div>
    )
  }

  if (error && !catalogo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">{error}</h1>
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
      {/* Banner */}
      <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden" style={{ backgroundColor: corPrimaria }}>
        {catalogo.banner_url ? (
          <img
            src={catalogo.banner_url}
            alt={`Banner ${catalogo.nome}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd)` }}>
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Header with logo and info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-gray-100 bg-white shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center">
              {catalogo.logo_url ? (
                <img
                  src={catalogo.logo_url}
                  alt={catalogo.nome}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-2xl font-bold rounded-xl"
                  style={{ backgroundColor: corPrimaria }}
                >
                  {catalogo.nome?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{catalogo.nome}</h1>
              {catalogo.descricao && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{catalogo.descricao}</p>
              )}
            </div>

            {/* WhatsApp button (header) */}
            {catalogo.whatsapp && (
              <a
                href={`https://wa.me/${catalogo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Ola! Vi seu catalogo no FlowB2B e gostaria de mais informacoes.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors shadow-sm flex-shrink-0"
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

      {/* Category tabs + Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Category tabs */}
        {categorias.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => { setCategoriaAtiva(''); setPage(1) }}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
              style={
                categoriaAtiva === ''
                  ? { backgroundColor: corPrimaria, color: '#fff' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }
              }
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategoriaAtiva(cat); setPage(1) }}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                style={
                  categoriaAtiva === cat
                    ? { backgroundColor: corPrimaria, color: '#fff' }
                    : { backgroundColor: '#f3f4f6', color: '#4b5563' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="mt-4 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar produto por nome ou codigo..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
            style={{ ['--tw-ring-color' as string]: `${corPrimaria}40` } as React.CSSProperties}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-24">
        {loading && catalogo ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: corPrimaria }} />
          </div>
        ) : todosItens.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {search || categoriaAtiva ? 'Nenhum produto encontrado para esta busca.' : 'Nenhum produto no catalogo ainda.'}
            </p>
            {(search || categoriaAtiva) && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setCategoriaAtiva(''); setPage(1) }}
                className="mt-3 text-sm font-medium hover:underline"
                style={{ color: corPrimaria }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Destaques section */}
            {destaques.length > 0 && !categoriaAtiva && !search && page === 1 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-amber-500 text-lg">&#9733;</span>
                  <h2 className="text-lg font-bold text-gray-900">Destaques</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {destaques.map(item => (
                    <ProductCard key={`dest-${item.id}`} item={item} corPrimaria={corPrimaria} />
                  ))}
                </div>
              </div>
            )}

            {/* All products */}
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
                  <ProductCard key={item.id} item={item} corPrimaria={corPrimaria} />
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  &#8592; Anterior
                </button>
                <span className="text-sm text-gray-500">
                  Pagina {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo &#8594;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* WhatsApp floating button */}
      {catalogo.whatsapp && (
        <a
          href={`https://wa.me/${catalogo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Ola! Vi seu catalogo no FlowB2B e gostaria de mais informacoes.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-50 sm:hidden"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 py-6 text-center">
        <p className="text-sm text-gray-400">
          Catalogo digital por{' '}
          <a href="/" className="text-[#336FB6] hover:underline font-medium">FlowB2B</a>
        </p>
      </footer>
    </div>
  )
}

function ProductCard({ item, corPrimaria }: { item: CatalogoItem; corPrimaria: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
      <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
        {item.imagem_url ? (
          <img
            src={item.imagem_url}
            alt={item.nome}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] mt-1">Sem imagem</span>
          </div>
        )}
        {item.destaque && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            &#9733; Destaque
          </span>
        )}
        {item.categoria && (
          <span className="absolute top-2 right-2 bg-white/90 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
            {item.categoria}
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-[11px] text-gray-400 font-mono">{item.codigo || '-'}</p>
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mt-0.5 leading-tight">{item.nome}</p>
        {item.marca && <p className="text-xs text-gray-500 mt-0.5">{item.marca}</p>}
        {item.descricao_produto && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.descricao_produto}</p>
        )}
        <p className="text-lg font-bold mt-2" style={{ color: corPrimaria }}>
          {formatCurrency(item.preco_base)}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
          <span>{item.unidade || 'UN'}</span>
          {item.itens_por_caixa && item.itens_por_caixa > 1 && (
            <>
              <span className="text-gray-300">|</span>
              <span>Cx c/ {item.itens_por_caixa}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
