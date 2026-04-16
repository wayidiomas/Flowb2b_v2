'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Skeleton, TableSkeleton } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/Modal'
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

function GridIcon() {
  return (
    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function ImagePlaceholderIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
    </svg>
  )
}

function PriceTagBadge() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FornecedorCatalogo {
  fornecedor_id: number | null
  cnpj: string
  nome: string
  catalogo_id: number
  catalogo_nome: string
  tem_tabela_ativa: boolean
  tabelas_ativas_count: number
  vinculado: boolean
}

interface TabelaDisponivel {
  id: number
  nome: string
  created_at: string
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
  imagem_url: string | null
  preco_tabela: number | null
  desconto_tabela: number | null
  produto_id: number | null
  ja_trabalho?: boolean
}

interface CartItem {
  catalogo_item_id: number
  produto_id: number | null
  codigo: string
  nome: string
  marca: string | null
  unidade: string
  itens_por_caixa: number | null
  preco: number
  quantidade: number
  imagem_url: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return currencyFormatter.format(value)
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

  // Price table selection
  const [tabelasDisponiveis, setTabelasDisponiveis] = useState<TabelaDisponivel[]>([])
  const [tabelaSelecionadaId, setTabelaSelecionadaId] = useState<string>('') // '' = default (most recent), '0' = no table

  // View mode
  const [viewMode, setViewMode] = useState<'vitrine' | 'tabela'>('vitrine')

  // Filtro: meus produtos / novos
  const [filtro, setFiltro] = useState<'todos' | 'meus' | 'novos'>('todos')

  // Vinculado state
  const [isVinculado, setIsVinculado] = useState(false)
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false)

  // Cart state (persiste em localStorage pra nao perder ao fechar pagina)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('flowb2b_cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [showCartModal, setShowCartModal] = useState(false)

  // Persistir cart no localStorage
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('flowb2b_cart', JSON.stringify(cart))
      } else {
        localStorage.removeItem('flowb2b_cart')
      }
    } catch { /* ignore */ }
  }, [cart])
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [criandoPedido, setCriandoPedido] = useState(false)
  const [checkoutObs, setCheckoutObs] = useState('')
  const [checkoutDataPrevista, setCheckoutDataPrevista] = useState('')

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

  const fetchItens = useCallback(async (fornecedorIdParam: number | null, catalogoIdParam: number, pageNum: number, searchText: string, marcaText: string, tabelaId: string = '', filtroParam: string = 'todos') => {
    setLoadingItens(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
      })
      if (fornecedorIdParam) {
        params.set('fornecedor_id', String(fornecedorIdParam))
      } else {
        params.set('catalogo_id', String(catalogoIdParam))
      }
      if (searchText) params.set('search', searchText)
      if (marcaText) params.set('marca', marcaText)
      if (tabelaId) params.set('tabela_id', tabelaId)
      if (filtroParam && filtroParam !== 'todos') params.set('filtro', filtroParam)

      const res = await fetch(`/api/compras/catalogo?${params}`)
      const data = await res.json()
      setItens(data.itens || [])
      setTotalItens(data.total || 0)

      // Capture available tables from response
      if (data.tabelas_disponiveis) {
        setTabelasDisponiveis(data.tabelas_disponiveis)
      }

      // Update cart prices from new items data (e.g. when switching price tables)
      if (data.itens) {
        setCart(prev => {
          if (prev.length === 0) return prev
          return prev.map(cartItem => {
            const catalogItem = (data.itens as ItemCatalogo[]).find((i: ItemCatalogo) => i.id === cartItem.catalogo_item_id)
            if (catalogItem) {
              return {
                ...cartItem,
                preco: catalogItem.preco_tabela ?? catalogItem.preco_aplicavel ?? catalogItem.preco_base ?? cartItem.preco,
              }
            }
            return cartItem
          })
        })
      }

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

  // Re-fetch when page/marca/tabela/filtro changes
  useEffect(() => {
    if (!selectedFornecedor) return
    fetchItens(selectedFornecedor.fornecedor_id, selectedFornecedor.catalogo_id, page, search, marcaFilter, tabelaSelecionadaId, filtro)
  }, [selectedFornecedor, page, marcaFilter, tabelaSelecionadaId, filtro])

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      if (selectedFornecedor) {
        fetchItens(selectedFornecedor.fornecedor_id, selectedFornecedor.catalogo_id, 1, value, marcaFilter, tabelaSelecionadaId, filtro)
      }
    }, 300)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  const selectFornecedor = (f: FornecedorCatalogo) => {
    setSelectedFornecedor(f)
    setIsVinculado(f.vinculado)
    setSolicitacaoEnviada(false)
    setSearch('')
    setMarcaFilter('')
    setFiltro('todos')
    setPage(1)
    setItens([])
    setTabelaSelecionadaId('')
    setTabelasDisponiveis([])
    setCart([])
  }

  const goBack = () => {
    setSelectedFornecedor(null)
    setIsVinculado(false)
    setSolicitacaoEnviada(false)
    setItens([])
    setSearch('')
    setMarcaFilter('')
    setPage(1)
    setMarcas([])
    setTabelaSelecionadaId('')
    setTabelasDisponiveis([])
    setCart([])
  }

  // ─── Solicitar atendimento ─────────────────────────────────────────────────

  const handleSolicitarAtendimento = async () => {
    if (!selectedFornecedor) return
    try {
      const res = await fetch('/api/compras/catalogo/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogo_fornecedor_id: selectedFornecedor.catalogo_id,
          fornecedor_cnpj: selectedFornecedor.cnpj,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSolicitacaoEnviada(true)
      } else {
        alert(data.error || 'Erro ao solicitar')
      }
    } catch { alert('Erro ao solicitar atendimento') }
  }

  // ─── Cart helpers ──────────────────────────────────────────────────────────

  const addToCart = (item: ItemCatalogo) => {
    setCart(prev => {
      const existing = prev.find(c => c.catalogo_item_id === item.id)
      if (existing) {
        return prev.map(c => c.catalogo_item_id === item.id ? { ...c, quantidade: c.quantidade + 1 } : c)
      }
      return [...prev, {
        catalogo_item_id: item.id,
        produto_id: item.produto_id || null,
        codigo: item.codigo || '',
        nome: item.nome,
        marca: item.marca,
        unidade: item.unidade || 'UN',
        itens_por_caixa: item.itens_por_caixa,
        preco: item.preco_tabela ?? item.preco_aplicavel ?? item.preco_base ?? 0,
        quantidade: 1,
        imagem_url: item.imagem_url,
      }]
    })
  }

  const updateCartQty = (catalogoItemId: number, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.catalogo_item_id !== catalogoItemId))
    } else {
      setCart(prev => prev.map(c => c.catalogo_item_id === catalogoItemId ? { ...c, quantidade: qty } : c))
    }
  }

  const removeFromCart = (catalogoItemId: number) => {
    setCart(prev => prev.filter(c => c.catalogo_item_id !== catalogoItemId))
  }

  const cartMap = useMemo(() => new Map(cart.map(c => [c.catalogo_item_id, c])), [cart])
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantidade * item.preco, 0), [cart])
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantidade, 0), [cart])

  const handleCriarPedido = async () => {
    if (!selectedFornecedor || cart.length === 0) return
    if (!selectedFornecedor.fornecedor_id) {
      alert('Fornecedor nao vinculado. Solicite atendimento primeiro.')
      return
    }
    setCriandoPedido(true)
    try {
      const res = await fetch('/api/pedidos-compra/catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedor_id: selectedFornecedor.fornecedor_id,
          empresa_id: empresa?.id,
          itens: cart.map(item => ({
            produto_id: item.produto_id,
            codigo: item.codigo,
            descricao: item.nome,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor: item.preco,
            itens_por_caixa: item.itens_por_caixa,
          })),
          observacoes: checkoutObs || undefined,
          data_prevista: checkoutDataPrevista || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setShowCheckoutModal(false)
        setCart([])
        setCheckoutObs('')
        setCheckoutDataPrevista('')
        // Navigate to the created order
        window.location.href = `/compras/pedidos/${data.pedido_id}`
      } else {
        alert(data.error || 'Erro ao criar pedido')
      }
    } catch {
      alert('Erro ao criar pedido')
    } finally {
      setCriandoPedido(false)
    }
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
            key={`${f.catalogo_id}-${f.fornecedor_id ?? 'pub'}`}
            onClick={() => selectFornecedor(f)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#336FB6]/30 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${f.vinculado ? 'bg-[#336FB6]/10 text-[#336FB6] group-hover:bg-[#336FB6]/15' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-150'}`}>
                <BuildingIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{f.nome}</p>
                <p className="text-xs text-gray-500 truncate">{f.catalogo_nome}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {f.vinculado ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Vinculado</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Nao vinculado</span>
                )}
                {f.tem_tabela_ativa && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <PriceTagBadge />
                    Tabela ativa
                  </span>
                )}
              </div>
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

  // ─── Render: View Mode Toggle ─────────────────────────────────────────────

  const renderViewToggle = () => (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setViewMode('vitrine')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'vitrine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <GridIcon />
        Vitrine
      </button>
      <button
        onClick={() => setViewMode('tabela')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'tabela' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <ListIcon />
        Tabela
      </button>
    </div>
  )

  // ─── Render: Vitrine Grid ─────────────────────────────────────────────────

  const renderVitrineGrid = () => {
    if (loadingItens) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (itens.length === 0) {
      return (
        <div className="py-16 text-center">
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
      )
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
        {itens.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 relative">
            {/* Badge ja_trabalho / novo */}
            {isVinculado && filtro === 'todos' && item.ja_trabalho !== undefined && (
              <span className={`absolute top-2 right-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                item.ja_trabalho
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {item.ja_trabalho ? 'Meu' : 'Novo'}
              </span>
            )}
            {/* Image */}
            <div className="aspect-square bg-gray-50 flex items-center justify-center p-2">
              {item.imagem_url ? (
                <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-300 flex flex-col items-center">
                  <ImagePlaceholderIcon />
                  <span className="text-xs mt-1">Sem foto</span>
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-4">
              <p className="text-xs text-gray-400 font-mono">{item.codigo || '-'}</p>
              <p className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5" title={item.nome}>{item.nome}</p>
              {item.marca && <p className="text-xs text-gray-500 mt-0.5">{item.marca}</p>}
              <div className="mt-2">
                {item.preco_tabela != null ? (
                  <div>
                    <p className="text-lg font-bold text-[#336FB6]">{formatCurrency(item.preco_tabela)}</p>
                    {item.desconto_tabela && item.desconto_tabela > 0 && (
                      <p className="text-xs text-emerald-600">-{item.desconto_tabela.toFixed(1)}% desc.</p>
                    )}
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(item.preco_base)}</p>
                    {tabelaSelecionadaId !== '0' && (
                      <p className="text-[10px] text-[#336FB6] mt-0.5">Preco da tabela</p>
                    )}
                  </div>
                ) : item.preco_aplicavel ? (
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(item.preco_aplicavel)}</p>
                ) : (
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(item.preco_base)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{item.unidade || 'UN'}</span>
                {item.itens_por_caixa && <span>Cx c/ {item.itens_por_caixa}</span>}
              </div>
              {/* Add to cart button - only for vinculados */}
              {isVinculado && (
                (() => {
                  const inCart = cartMap.get(item.id)
                  if (!inCart) {
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border-2 border-[#336FB6] text-[#336FB6] text-xs font-semibold rounded-xl hover:bg-[#336FB6] hover:text-white transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Adicionar
                      </button>
                    )
                  }
                  return (
                    <div className="mt-2 flex items-center justify-between bg-[#336FB6] rounded-xl px-1 py-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, inCart.quantidade - 1) }}
                        className="w-8 h-8 flex items-center justify-center text-white rounded-lg hover:bg-white/20 transition-colors text-lg font-bold"
                      >
                        −
                      </button>
                      <span className="text-white font-bold text-sm">{inCart.quantidade}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, inCart.quantidade + 1) }}
                        className="w-8 h-8 flex items-center justify-center text-white rounded-lg hover:bg-white/20 transition-colors text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ─── Render: Items Table (Desktop) ────────────────────────────────────────

  const renderItensTable = () => {
    if (loadingItens) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50 w-10"></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Codigo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Marca</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Unidade</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Cx.</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Preco</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Tabela</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Desconto</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50 w-28"></th>
              </tr>
            </thead>
            <tbody>
              <TableSkeleton columns={10} rows={8} />
            </tbody>
          </table>
        </div>
      )
    }

    if (itens.length === 0) {
      return (
        <div className="py-12 text-center">
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
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50 w-10"></th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Codigo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Marca</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Unidade</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Cx.</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Preco</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Tabela</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Desconto</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itens.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center overflow-hidden">
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.codigo || '-'}</td>
                <td className="px-4 py-3 text-gray-900">{item.nome}</td>
                <td className="px-4 py-3 text-gray-600">{item.marca || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.unidade || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.itens_por_caixa || '-'}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatCurrency(item.preco_aplicavel)}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.preco_tabela != null ? (
                    <span className="font-medium text-[#336FB6]">{formatCurrency(item.preco_tabela)}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {(item.desconto_tabela && item.desconto_tabela > 0) || (item.desconto_percentual && item.desconto_percentual > 0) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      -{(item.desconto_tabela || item.desconto_percentual || 0).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {isVinculado && (
                    (() => {
                      const inCart = cartMap.get(item.id)
                      if (!inCart) {
                        return (
                          <button
                            onClick={() => addToCart(item)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border-2 border-[#336FB6] text-[#336FB6] text-xs font-semibold rounded-xl hover:bg-[#336FB6] hover:text-white transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Adicionar
                          </button>
                        )
                      }
                      return (
                        <div className="inline-flex items-center justify-between bg-[#336FB6] rounded-xl px-1 py-1">
                          <button
                            onClick={() => updateCartQty(item.id, inCart.quantidade - 1)}
                            className="w-7 h-7 flex items-center justify-center text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-bold"
                          >
                            −
                          </button>
                          <span className="text-white font-bold text-xs px-2">{inCart.quantidade}</span>
                          <button
                            onClick={() => updateCartQty(item.id, inCart.quantidade + 1)}
                            className="w-7 h-7 flex items-center justify-center text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-bold"
                          >
                            +
                          </button>
                        </div>
                      )
                    })()
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ─── Render: Items Cards (Mobile - for tabela mode) ──────────────────────

  const renderItensCardsMobile = () => (
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
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {item.imagem_url ? (
                  <img src={item.imagem_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.codigo ? `${item.codigo} - ` : ''}{item.nome}
                    </p>
                    {item.marca && (
                      <p className="text-xs text-gray-500">{item.marca}</p>
                    )}
                  </div>
                  {((item.desconto_tabela && item.desconto_tabela > 0) || (item.desconto_percentual && item.desconto_percentual > 0)) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                      -{(item.desconto_tabela || item.desconto_percentual || 0).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {item.unidade || '-'}
                    {item.itens_por_caixa ? ` | Cx: ${item.itens_por_caixa} un` : ''}
                  </p>
                  <div className="text-right">
                    {item.preco_tabela != null ? (
                      <div>
                        <p className="text-sm font-semibold text-[#336FB6]">{formatCurrency(item.preco_tabela)}</p>
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(item.preco_aplicavel)}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.preco_aplicavel)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Add to cart button - only for vinculados */}
            {isVinculado && (
              (() => {
                const inCart = cartMap.get(item.id)
                if (!inCart) {
                  return (
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border-2 border-[#336FB6] text-[#336FB6] text-xs font-semibold rounded-xl hover:bg-[#336FB6] hover:text-white transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Adicionar
                    </button>
                  )
                }
                return (
                  <div className="mt-3 flex items-center justify-between bg-[#336FB6] rounded-xl px-1 py-1">
                    <button
                      onClick={() => updateCartQty(item.id, inCart.quantidade - 1)}
                      className="w-8 h-8 flex items-center justify-center text-white rounded-lg hover:bg-white/20 transition-colors text-lg font-bold"
                    >
                      −
                    </button>
                    <span className="text-white font-bold text-sm">{inCart.quantidade}</span>
                    <button
                      onClick={() => updateCartQty(item.id, inCart.quantidade + 1)}
                      className="w-8 h-8 flex items-center justify-center text-white rounded-lg hover:bg-white/20 transition-colors text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                )
              })()
            )}
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

            {tabelasDisponiveis.length >= 1 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Tabela de precos:</label>
                <select
                  value={tabelaSelecionadaId}
                  onChange={(e) => {
                    setTabelaSelecionadaId(e.target.value)
                    setPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] bg-white"
                >
                  <option value="">Mais recente</option>
                  {tabelasDisponiveis.map(t => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nome}
                    </option>
                  ))}
                  <option value="0">Sem tabela (preco base)</option>
                </select>
              </div>
            )}

            <div className="flex-1" />

            {/* View mode toggle */}
            {renderViewToggle()}

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

            {/* Filtro: Todos / Meus / Novos */}
            {isVinculado && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {([
                  { value: 'todos', label: 'Todos' },
                  { value: 'meus', label: 'Meus Produtos' },
                  { value: 'novos', label: 'Novos' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFiltro(opt.value); setPage(1) }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                      filtro === opt.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

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

      {/* Banner for non-linked suppliers */}
      {!isVinculado && selectedFornecedor && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Voce ainda nao compra deste fornecedor</p>
              <p className="text-xs text-amber-700 mt-0.5">Envie uma solicitacao para comecar a fazer pedidos pelo catalogo</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            disabled={solicitacaoEnviada}
            onClick={handleSolicitarAtendimento}
            className="bg-amber-600 hover:bg-amber-700 shrink-0"
          >
            {solicitacaoEnviada ? 'Solicitacao enviada' : 'Solicitar atendimento'}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className={cart.length > 0 && selectedFornecedor && isVinculado ? 'pb-24' : ''}>
        {!selectedFornecedor ? (
          renderFornecedores()
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {viewMode === 'vitrine' ? (
              renderVitrineGrid()
            ) : (
              <>
                <div className="hidden md:block">
                  {renderItensTable()}
                </div>
                {renderItensCardsMobile()}
              </>
            )}
            {renderPagination()}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cart.length > 0 && selectedFornecedor && isVinculado && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0px_-4px_20px_rgba(0,0,0,0.1)] z-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 bg-[#336FB6] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-[#336FB6]/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{cart.length} produto(s)</p>
                <p className="text-base font-bold text-[#336FB6]">{formatCurrency(cartTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="md" onClick={() => setShowCartModal(true)}>
                Ver carrinho
              </Button>
              <Button variant="primary" size="md" onClick={() => setShowCheckoutModal(true)}>
                Finalizar pedido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart modal */}
      <Modal isOpen={showCartModal} onClose={() => setShowCartModal(false)} size="lg">
        <ModalHeader onClose={() => setShowCartModal(false)}>
          <ModalTitle>Carrinho ({cart.length} itens)</ModalTitle>
          <ModalDescription>{selectedFornecedor?.nome || ''}</ModalDescription>
        </ModalHeader>
        <ModalBody>
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Carrinho vazio</p>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.catalogo_item_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center shrink-0">
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt="" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                    <p className="text-xs text-gray-500">{item.codigo} · {formatCurrency(item.preco)}/{item.unidade}</p>
                  </div>
                  {/* Qty controls */}
                  <div className="flex items-center gap-0 bg-gray-100 rounded-lg">
                    <button onClick={() => updateCartQty(item.catalogo_item_id, item.quantidade - 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-500 rounded-l-lg hover:bg-gray-200 transition-colors font-bold">−</button>
                    <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantidade}</span>
                    <button onClick={() => updateCartQty(item.catalogo_item_id, item.quantidade + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#336FB6] rounded-r-lg hover:bg-gray-200 transition-colors font-bold">+</button>
                  </div>
                  {/* Subtotal */}
                  <p className="text-sm font-bold text-gray-900 w-24 text-right">{formatCurrency(item.quantidade * item.preco)}</p>
                  {/* Remove */}
                  <button onClick={() => removeFromCart(item.catalogo_item_id)} className="p-1 text-red-400 hover:text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(cartTotal)}</p>
              <p className="text-xs text-gray-500">{cartItemCount} itens</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCartModal(false)}>Continuar comprando</Button>
              <Button variant="primary" onClick={() => { setShowCartModal(false); setShowCheckoutModal(true) }} disabled={cart.length === 0}>Finalizar pedido</Button>
            </div>
          </div>
        </ModalFooter>
      </Modal>

      {/* Checkout modal */}
      <Modal isOpen={showCheckoutModal} onClose={() => !criandoPedido && setShowCheckoutModal(false)} size="xl">
        <ModalHeader onClose={() => !criandoPedido && setShowCheckoutModal(false)}>
          <ModalTitle>Finalizar Pedido</ModalTitle>
          <ModalDescription>{selectedFornecedor?.nome || ''} · {cart.length} itens · {formatCurrency(cartTotal)}</ModalDescription>
        </ModalHeader>
        <ModalBody>
          {/* Items table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4 max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-[50%]">Produto</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[15%]">Qtd</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 w-[15%]">Preco</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 w-[20%]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map(item => (
                  <tr key={item.catalogo_item_id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900 truncate">{item.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{item.codigo}</p>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">{item.quantidade} {item.unidade}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(item.preco)}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatCurrency(item.quantidade * item.preco)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Total:</td>
                  <td className="px-3 py-2 text-right font-bold text-[#336FB6] text-lg">{formatCurrency(cartTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Extra fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Previsao de entrega</label>
              <input type="date" value={checkoutDataPrevista} onChange={(e) => setCheckoutDataPrevista(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
              <textarea value={checkoutObs} onChange={(e) => setCheckoutObs(e.target.value)} rows={2} placeholder="Observacoes para o fornecedor..." className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]" />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCheckoutModal(false)} disabled={criandoPedido}>Voltar</Button>
          <Button variant="success" loading={criandoPedido} onClick={handleCriarPedido}>
            Criar Pedido ({formatCurrency(cartTotal)})
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
    </RequirePermission>
  )
}
