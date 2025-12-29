'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'

// Types
interface Produto {
  id: number
  codigo: string
  nome: string
  gtin: string | null
  preco: number
  precocusto: number | null
  valor_de_compra: number | null
  estoque_atual: number
}

interface MovimentacaoEstoque {
  movimentacao_id: number
  produto_id: number
  produto_nome: string
  produto_codigo: string
  produto_gtin: string
  data: string
  tipo: 'Entrada' | 'Saida'
  quantidade: number
  preco_venda: number | null
  valor_de_compra: number | null
  preco_custo: number | null
  observacao: string | null
  origem: string | null
}

interface ResumoEstoque {
  totalEntradas: number
  totalSaidas: number
  valorTotalProdutos: number
}

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function ProductIcon() {
  return (
    <svg className="w-16 h-16 text-[#336FB6]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 3H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM4 19V5h16l.002 14H4z"/>
      <path d="M6 7h12v2H6zm0 4h12v2H6zm0 4h6v2H6z"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function ControleEstoquePage() {
  const { user, empresa } = useAuth()

  // States
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Produto[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false)
  const [resumo, setResumo] = useState<ResumoEstoque>({
    totalEntradas: 0,
    totalSaidas: 0,
    valorTotalProdutos: 0,
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modal
  const [showNovoLancamentoModal, setShowNovoLancamentoModal] = useState(false)
  const [modalStep, setModalStep] = useState<'search' | 'form'>('form')
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [modalSearchResults, setModalSearchResults] = useState<Produto[]>([])
  const [modalSearchLoading, setModalSearchLoading] = useState(false)
  const [modalSelectedProduct, setModalSelectedProduct] = useState<Produto | null>(null)
  const [novoLancamento, setNovoLancamento] = useState({
    tipo: 'Entrada' as 'Entrada' | 'Saida',
    quantidade: '',
    precoCompra: '',
    precoCusto: '',
    observacao: '',
  })
  const [savingLancamento, setSavingLancamento] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)

  const empresaId = empresa?.id || user?.empresa_id

  // Fechar dropdown de busca ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar resumo geral ao carregar
  const fetchResumo = useCallback(async () => {
    if (!empresaId) return

    try {
      const { data, error } = await supabase.rpc('flowb2b_get_resumo_movimentacao', {
        p_empresa_id: empresaId
      })

      if (error) {
        console.error('Erro ao buscar resumo:', error)
        return
      }

      if (data && data.length > 0) {
        setResumo({
          totalEntradas: Number(data[0].quantidade_entradas) || 0,
          totalSaidas: Number(data[0].quantidade_saidas) || 0,
          valorTotalProdutos: Number(data[0].valor_total_produtos) || 0,
        })
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }, [empresaId])

  useEffect(() => {
    fetchResumo()
  }, [fetchResumo])

  // Buscar produtos - usando RPC flowb2b_search_produto
  const searchProdutos = useCallback(async (term: string) => {
    if (!term || term.length < 2 || !empresaId) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('flowb2b_search_produto', {
        p_empresa_id: empresaId,
        p_search_term: term
      })

      if (error) {
        console.error('Erro ao buscar produtos:', error)
        setSearchResults([])
        return
      }

      // Converter formato da RPC para o formato esperado
      const produtos: Produto[] = (data || []).slice(0, 10).map((p: any) => ({
        id: p.produto_id,
        codigo: p.codigo || '',
        nome: p.nome || '',
        gtin: p.gtin || null,
        preco: p.preco || 0,
        precocusto: null,
        valor_de_compra: null,
        estoque_atual: p.estoque_atual || 0,
      }))

      setSearchResults(produtos)
      setShowSearchResults(true)
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProdutos(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, searchProdutos])

  // Buscar movimentacoes do produto selecionado usando RPC
  const fetchMovimentacoes = useCallback(async (produtoId: number) => {
    if (!empresaId) return

    setLoadingMovimentacoes(true)
    try {
      // Usar a RPC search_produto_movimentacao para buscar movimentacoes do produto
      const { data, error } = await supabase
        .from('movimentacao_estoque')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('produto_id', produtoId)
        .order('data', { ascending: false })

      if (error) {
        console.error('Erro ao buscar movimentacoes:', error)
        return
      }

      // Converter para formato esperado
      const movs: MovimentacaoEstoque[] = (data || []).map((m: any) => ({
        movimentacao_id: m.id,
        produto_id: m.produto_id,
        produto_nome: selectedProduct?.nome || '',
        produto_codigo: selectedProduct?.codigo || '',
        produto_gtin: selectedProduct?.gtin || '',
        data: m.data,
        tipo: m.tipo,
        quantidade: m.quantidade,
        preco_venda: selectedProduct?.preco || null,
        valor_de_compra: selectedProduct?.valor_de_compra || null,
        preco_custo: selectedProduct?.precocusto || null,
        observacao: m.observacao,
        origem: m.origem,
      }))

      setMovimentacoes(movs)
      setCurrentPage(1)
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoadingMovimentacoes(false)
    }
  }, [empresaId, selectedProduct])

  // Quando selecionar um produto - buscar precos de fornecedores_produtos
  const handleSelectProduct = async (produto: Produto) => {
    setSearchTerm('')
    setShowSearchResults(false)

    // Buscar precos de compra e custo de fornecedores_produtos
    const { data: precoData } = await supabase
      .from('fornecedores_produtos')
      .select('valor_de_compra, precocusto')
      .eq('produto_id', produto.id)
      .eq('empresa_id', empresaId)
      .limit(1)
      .single()

    const produtoComPrecos: Produto = {
      ...produto,
      valor_de_compra: precoData?.valor_de_compra || null,
      precocusto: precoData?.precocusto || null,
    }

    setSelectedProduct(produtoComPrecos)
  }

  // Atualizar movimentacoes quando selectedProduct mudar
  useEffect(() => {
    if (selectedProduct) {
      fetchMovimentacoes(selectedProduct.id)
    }
  }, [selectedProduct, fetchMovimentacoes])

  // Salvar novo lancamento
  const handleSaveLancamento = async () => {
    const produto = modalSelectedProduct
    if (!produto || !empresaId || !novoLancamento.quantidade) return

    setSavingLancamento(true)
    try {
      const { error } = await supabase
        .from('movimentacao_estoque')
        .insert({
          produto_id: produto.id,
          empresa_id: empresaId,
          data: new Date().toISOString(),
          tipo: novoLancamento.tipo,
          quantidade: parseFloat(novoLancamento.quantidade),
          origem: 'Manual',
          observacao: novoLancamento.observacao || null,
        })

      if (error) {
        console.error('Erro ao salvar lancamento:', error)
        alert('Erro ao salvar lancamento')
        return
      }

      // Atualizar estoque do produto
      const novoEstoque = novoLancamento.tipo === 'Entrada'
        ? produto.estoque_atual + parseFloat(novoLancamento.quantidade)
        : produto.estoque_atual - parseFloat(novoLancamento.quantidade)

      await supabase
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', produto.id)
        .eq('empresa_id', empresaId)

      // Se tinha produto selecionado na pagina principal, atualizar ele
      if (selectedProduct && selectedProduct.id === produto.id) {
        setSelectedProduct({ ...selectedProduct, estoque_atual: novoEstoque })
        fetchMovimentacoes(selectedProduct.id)
      } else {
        // Se nao tinha, selecionar o produto do modal na pagina principal
        setSelectedProduct({ ...produto, estoque_atual: novoEstoque })
      }

      // Recarregar resumo
      fetchResumo()

      // Fechar modal e limpar form
      handleCloseModal()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao salvar lancamento')
    } finally {
      setSavingLancamento(false)
    }
  }

  // Deletar movimentacao
  const handleDeleteMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    if (!confirm('Tem certeza que deseja excluir esta movimentacao?')) return
    if (!selectedProduct || !empresaId) return

    try {
      const { error } = await supabase
        .from('movimentacao_estoque')
        .delete()
        .eq('id', movimentacao.movimentacao_id)
        .eq('empresa_id', empresaId)

      if (error) {
        console.error('Erro ao deletar:', error)
        alert('Erro ao deletar movimentacao')
        return
      }

      // Reverter estoque
      const novoEstoque = movimentacao.tipo === 'Entrada'
        ? selectedProduct.estoque_atual - Number(movimentacao.quantidade)
        : selectedProduct.estoque_atual + Number(movimentacao.quantidade)

      await supabase
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', selectedProduct.id)
        .eq('empresa_id', empresaId)

      setSelectedProduct({ ...selectedProduct, estoque_atual: novoEstoque })
      fetchMovimentacoes(selectedProduct.id)
      fetchResumo()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  // Abrir modal de novo lancamento
  const handleOpenNovoLancamento = () => {
    if (selectedProduct) {
      // Se já tem produto selecionado, vai direto pro form
      setModalSelectedProduct(selectedProduct)
      setModalStep('form')
    } else {
      // Se não tem produto, mostra busca primeiro
      setModalSelectedProduct(null)
      setModalSearchTerm('')
      setModalSearchResults([])
      setModalStep('search')
    }
    setShowNovoLancamentoModal(true)
  }

  // Buscar produtos no modal
  const searchProdutosModal = useCallback(async (term: string) => {
    if (!term || term.length < 2 || !empresaId) {
      setModalSearchResults([])
      return
    }

    setModalSearchLoading(true)
    try {
      const { data, error } = await supabase.rpc('flowb2b_search_produto', {
        p_empresa_id: empresaId,
        p_search_term: term
      })

      if (error) {
        console.error('Erro ao buscar produtos:', error)
        setModalSearchResults([])
        return
      }

      const produtos: Produto[] = (data || []).slice(0, 10).map((p: any) => ({
        id: p.produto_id,
        codigo: p.codigo || '',
        nome: p.nome || '',
        gtin: p.gtin || null,
        preco: p.preco || 0,
        precocusto: null,
        valor_de_compra: null,
        estoque_atual: p.estoque_atual || 0,
      }))

      setModalSearchResults(produtos)
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setModalSearchLoading(false)
    }
  }, [empresaId])

  // Debounce modal search
  useEffect(() => {
    if (!showNovoLancamentoModal || modalStep !== 'search') return

    const timer = setTimeout(() => {
      searchProdutosModal(modalSearchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [modalSearchTerm, searchProdutosModal, showNovoLancamentoModal, modalStep])

  // Selecionar produto no modal
  const handleSelectProductModal = async (produto: Produto) => {
    // Buscar precos de compra e custo
    const { data: precoData } = await supabase
      .from('fornecedores_produtos')
      .select('valor_de_compra, precocusto')
      .eq('produto_id', produto.id)
      .eq('empresa_id', empresaId)
      .limit(1)
      .single()

    const produtoComPrecos: Produto = {
      ...produto,
      valor_de_compra: precoData?.valor_de_compra || null,
      precocusto: precoData?.precocusto || null,
    }

    setModalSelectedProduct(produtoComPrecos)
    setModalStep('form')
  }

  // Fechar modal e resetar
  const handleCloseModal = () => {
    setShowNovoLancamentoModal(false)
    setModalStep('form')
    setModalSearchTerm('')
    setModalSearchResults([])
    setModalSelectedProduct(null)
    setNovoLancamento({
      tipo: 'Entrada',
      quantidade: '',
      precoCompra: '',
      precoCusto: '',
      observacao: '',
    })
  }

  // Paginacao
  const totalPages = Math.ceil(movimentacoes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMovimentacoes = movimentacoes.slice(startIndex, startIndex + itemsPerPage)

  // Gerar paginas para navegacao
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages - 1, totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 2, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Formatar moeda
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Dados para grafico de entradas/saidas por mes
  const chartDataTemporal = useMemo(() => {
    if (!movimentacoes.length) return []

    // Agrupar por mes
    const grouped: Record<string, { entradas: number; saidas: number; mes: string }> = {}

    movimentacoes.forEach((mov) => {
      const date = new Date(mov.data)
      const mesAno = `${date.getMonth() + 1}/${date.getFullYear()}`
      const mesLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

      if (!grouped[mesAno]) {
        grouped[mesAno] = { entradas: 0, saidas: 0, mes: mesLabel }
      }

      if (mov.tipo === 'Entrada') {
        grouped[mesAno].entradas += Number(mov.quantidade)
      } else {
        grouped[mesAno].saidas += Number(mov.quantidade)
      }
    })

    // Converter para array e ordenar por data
    return Object.entries(grouped)
      .sort((a, b) => {
        const [mesA, anoA] = a[0].split('/').map(Number)
        const [mesB, anoB] = b[0].split('/').map(Number)
        return anoA !== anoB ? anoA - anoB : mesA - mesB
      })
      .map(([, data]) => data)
      .slice(-12) // Ultimos 12 meses
  }, [movimentacoes])

  // Dados para grafico de margem
  const chartDataMargem = useMemo(() => {
    if (!selectedProduct || !movimentacoes.length) return []

    const precoVenda = selectedProduct.preco || 0
    const precoCompra = selectedProduct.valor_de_compra || 0
    const precoCusto = selectedProduct.precocusto || 0

    // Calcular margem bruta e margem liquida
    const margemBruta = precoVenda > 0 && precoCompra > 0
      ? ((precoVenda - precoCompra) / precoVenda) * 100
      : 0

    const margemLiquida = precoVenda > 0 && precoCusto > 0
      ? ((precoVenda - precoCusto) / precoVenda) * 100
      : 0

    // Lucro por unidade vendida baseado nas saidas
    const totalSaidas = movimentacoes
      .filter(m => m.tipo === 'Saida')
      .reduce((acc, m) => acc + Number(m.quantidade), 0)

    const lucroBrutoTotal = totalSaidas * (precoVenda - precoCompra)
    const lucroLiquidoTotal = totalSaidas * (precoVenda - precoCusto)

    return [
      { nome: 'Margem Bruta (%)', valor: margemBruta, fill: '#336FB6' },
      { nome: 'Margem Liquida (%)', valor: margemLiquida, fill: '#22C55E' },
    ]
  }, [selectedProduct, movimentacoes])

  // Calcular valores de resumo do produto
  const resumoProduto = useMemo(() => {
    if (!selectedProduct || !movimentacoes.length) return null

    const precoVenda = selectedProduct.preco || 0
    const precoCompra = selectedProduct.valor_de_compra || 0
    const precoCusto = selectedProduct.precocusto || 0

    const totalEntradas = movimentacoes
      .filter(m => m.tipo === 'Entrada')
      .reduce((acc, m) => acc + Number(m.quantidade), 0)

    const totalSaidas = movimentacoes
      .filter(m => m.tipo === 'Saida')
      .reduce((acc, m) => acc + Number(m.quantidade), 0)

    const faturamentoBruto = totalSaidas * precoVenda
    const custoTotal = totalSaidas * (precoCusto || precoCompra)
    const lucroTotal = faturamentoBruto - custoTotal

    return {
      totalEntradas,
      totalSaidas,
      faturamentoBruto,
      custoTotal,
      lucroTotal,
      margemMedia: faturamentoBruto > 0 ? (lucroTotal / faturamentoBruto) * 100 : 0
    }
  }, [selectedProduct, movimentacoes])

  return (
    <DashboardLayout>
      <PageHeader
        title="Controle de estoque"
        subtitle="Gerencie as movimentacoes de estoque dos produtos"
      />

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-base font-medium text-[#344054]">Controle de estoque</h2>
                  <p className="text-xs text-[#838383]">
                    Para comecar, pesquise o produto que deseja consultar
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-[360px]">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
                    <SearchIcon />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Pesquisar por nome, EAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && setShowSearchResults(true)}
                    className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />

                  {/* Search Results Dropdown */}
                  {showSearchResults && (
                    <div
                      ref={searchResultsRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D0D5DD] rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto"
                    >
                      {loading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Buscando...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Nenhum produto encontrado
                        </div>
                      ) : (
                        searchResults.map((produto) => (
                          <button
                            key={produto.id}
                            onClick={() => handleSelectProduct(produto)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-[#EFEFEF] last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-[#344054]">{produto.nome}</p>
                                <p className="text-xs text-gray-500">
                                  {produto.gtin || produto.codigo} - Estoque: {produto.estoque_atual}
                                </p>
                              </div>
                              <span className="text-sm text-[#336FB6] font-medium">
                                {formatCurrency(produto.preco)}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            {!selectedProduct ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-24 px-4">
                <ProductIcon />
                <h3 className="mt-4 text-base font-medium text-[#344054]">
                  Selecione um produto para consultar o estoque
                </h3>
                <p className="mt-1 text-sm text-[#344054]">
                  Voce pode buscar um produto na barra de pesquisa por nome ou EAN
                </p>
              </div>
            ) : (
              // Product Details
              <div className="p-5">
                {/* Product Header */}
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-lg font-medium text-[#344054]">
                    {selectedProduct.gtin || selectedProduct.codigo} - {selectedProduct.nome}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedProduct(null)
                      setMovimentacoes([])
                    }}
                    className="text-red-500 hover:text-red-700"
                    title="Remover produto"
                  >
                    <TrashIcon />
                  </button>
                </div>

                {/* Graficos */}
                {movimentacoes.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Grafico de Entradas e Saidas */}
                    <div className="bg-white border border-[#EFEFEF] rounded-xl p-4">
                      <h4 className="text-sm font-medium text-[#344054] mb-4">Movimentacao Temporal</h4>
                      {chartDataTemporal.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={chartDataTemporal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EFEFEF" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#666' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', border: '1px solid #EFEFEF' }}
                              formatter={(value) => [Number(value).toLocaleString('pt-BR'), '']}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="entradas" name="Entradas" fill="#22C55E" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="saidas" name="Saidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                          Sem dados suficientes para o grafico
                        </div>
                      )}
                    </div>

                    {/* Grafico de Margem e Resumo Financeiro */}
                    <div className="bg-white border border-[#EFEFEF] rounded-xl p-4">
                      <h4 className="text-sm font-medium text-[#344054] mb-4">Analise de Margem</h4>
                      {resumoProduto && (
                        <div className="space-y-4">
                          {/* Cards de resumo */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs text-green-600 mb-1">Faturamento Bruto</p>
                              <p className="text-lg font-semibold text-green-700">
                                {formatCurrency(resumoProduto.faturamentoBruto)}
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-blue-600 mb-1">Lucro Total</p>
                              <p className={`text-lg font-semibold ${resumoProduto.lucroTotal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                {formatCurrency(resumoProduto.lucroTotal)}
                              </p>
                            </div>
                          </div>

                          {/* Barras de margem */}
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Margem Bruta</span>
                                <span className="font-medium text-[#336FB6]">
                                  {chartDataMargem[0]?.valor.toFixed(1) || 0}%
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#336FB6] rounded-full transition-all"
                                  style={{ width: `${Math.min(chartDataMargem[0]?.valor || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Margem Liquida</span>
                                <span className="font-medium text-[#22C55E]">
                                  {chartDataMargem[1]?.valor.toFixed(1) || 0}%
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#22C55E] rounded-full transition-all"
                                  style={{ width: `${Math.min(chartDataMargem[1]?.valor || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Info adicional */}
                          <div className="pt-3 border-t border-[#EFEFEF] grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-gray-400">Entradas</p>
                              <p className="text-sm font-medium text-green-600">
                                {resumoProduto.totalEntradas.toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Saidas</p>
                              <p className="text-sm font-medium text-red-600">
                                {resumoProduto.totalSaidas.toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Margem Media</p>
                              <p className="text-sm font-medium text-[#336FB6]">
                                {resumoProduto.margemMedia.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Movimentacoes Table */}
                {loadingMovimentacoes ? (
                  <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-6 w-6 text-[#336FB6] mr-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Carregando movimentacoes...
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#EFEFEF]">
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Data</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Entrada</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Preco de Venda</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Saida</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Preco de Compra</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Preco de Custo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Observacao</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Origem</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMovimentacoes.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                                Nenhuma movimentacao encontrada para este produto
                              </td>
                            </tr>
                          ) : (
                            paginatedMovimentacoes.map((mov) => (
                              <tr
                                key={mov.movimentacao_id}
                                className={`border-b border-[#EFEFEF] transition-colors ${
                                  mov.tipo === 'Entrada'
                                    ? 'bg-green-50 hover:bg-green-100'
                                    : 'bg-red-50 hover:bg-red-100'
                                }`}
                              >
                                <td className="px-4 py-3 text-[13px] text-[#344054]">
                                  {formatDate(mov.data)}
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#344054]">
                                  {mov.tipo === 'Entrada' ? Number(mov.quantidade).toLocaleString('pt-BR') : '-'}
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#344054]">
                                  {formatCurrency(mov.preco_venda)}
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#344054]">
                                  {mov.tipo === 'Saida' ? Number(mov.quantidade).toLocaleString('pt-BR') : '-'}
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#344054]">
                                  {formatCurrency(mov.valor_de_compra)}
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#344054]">
                                  {formatCurrency(mov.preco_custo)}
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#344054] max-w-[200px] truncate">
                                  {mov.observacao || '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#336FB6] text-white">
                                    P
                                  </span>
                                  <span className="ml-2 text-[13px] text-[#344054]">
                                    {mov.origem || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleDeleteMovimentacao(mov)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Excluir"
                                  >
                                    <TrashIcon />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {movimentacoes.length > 0 && (
                      <div className="px-4 py-4 flex items-center justify-between">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-2 px-[18px] py-2.5 text-[13px] font-medium text-[#336FB6] bg-white border-[1.5px] border-[#336FB6] rounded-lg shadow-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeftIcon />
                          Anterior
                        </button>

                        <div className="flex items-center gap-0.5">
                          {getPageNumbers().map((page, index) => (
                            page === '...' ? (
                              <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page as number)}
                                className={`w-10 h-10 text-xs font-medium rounded-lg transition-colors ${
                                  currentPage === page
                                    ? 'bg-[#ECECEC] text-[#1D2939]'
                                    : 'text-[#475467] hover:bg-gray-100'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          ))}
                        </div>

                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages || totalPages === 0}
                          className="inline-flex items-center gap-2 px-[18px] py-2.5 text-[13px] font-medium text-[#336FB6] bg-white border-[1.5px] border-[#336FB6] rounded-lg shadow-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Proximo
                          <ChevronRightIcon />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[286px] shrink-0">
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
            {/* Sidebar Header */}
            <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-[#344054]">Acoes rapidas</h3>
                  <p className="text-xs text-[#838383]">Explore mais acoes na plataforma</p>
                </div>
                <ChevronDownIcon />
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="px-[18px] py-4">
              {/* Novo Lancamento Button */}
              <button
                onClick={handleOpenNovoLancamento}
                className="w-full flex items-center gap-2 px-3 py-3 text-[#009E3F] font-medium text-sm border-b border-[#EFEFEF] hover:bg-gray-50 transition-colors"
              >
                <PlusIcon />
                Novo lancamento
              </button>

              {/* Resumo */}
              <div className="py-4 space-y-3">
                <h4 className="text-sm font-medium text-[#5C5C5C]">Resumo</h4>

                <div>
                  <p className="text-xs text-[#949494]">Quantidade de entradas</p>
                  <p className="text-sm font-medium text-[#336FB6]">{resumo.totalEntradas.toLocaleString('pt-BR')}</p>
                </div>

                <div>
                  <p className="text-xs text-[#949494]">Quantidade de saidas</p>
                  <p className="text-sm font-medium text-[#336FB6]">{resumo.totalSaidas.toLocaleString('pt-BR')}</p>
                </div>

                <div>
                  <p className="text-xs text-[#949494]">Valor total dos produtos</p>
                  <p className="text-sm font-medium text-[#336FB6]">{formatCurrency(resumo.valorTotalProdutos)}</p>
                </div>
              </div>

              {/* Saldo por Loja */}
              <div className="py-4 border-t border-[#EFEFEF]">
                <h4 className="text-sm font-medium text-[#5C5C5C] mb-3">Saldo por loja</h4>

                <div className="flex items-center justify-between text-xs text-[#949494] mb-2">
                  <span>Loja</span>
                  <span>Estoque total</span>
                </div>

                {selectedProduct ? (
                  <div className="flex items-center justify-between text-sm text-[#336FB6]">
                    <span>{empresa?.nome_fantasia || 'Loja Principal'}</span>
                    <span>{selectedProduct.estoque_atual.toLocaleString('pt-BR')}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Selecione um produto</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Novo Lancamento */}
      {showNovoLancamentoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] w-full max-w-[500px] mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEFEF]">
              <h3 className="text-lg font-medium text-[#344054]">
                {modalStep === 'search' ? 'Selecionar produto' : 'Novo lancamento'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon />
              </button>
            </div>

            {/* Step 1: Search Product */}
            {modalStep === 'search' && (
              <div className="px-6 py-5">
                <p className="text-sm text-gray-500 mb-4">
                  Busque e selecione um produto para registrar a movimentacao
                </p>

                {/* Search Input */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, EAN ou codigo..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    autoFocus
                    className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Search Results */}
                <div className="max-h-[300px] overflow-y-auto border border-[#EFEFEF] rounded-lg">
                  {modalSearchLoading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Buscando...
                    </div>
                  ) : modalSearchTerm.length < 2 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Digite pelo menos 2 caracteres para buscar
                    </div>
                  ) : modalSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    modalSearchResults.map((produto) => (
                      <button
                        key={produto.id}
                        onClick={() => handleSelectProductModal(produto)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-[#EFEFEF] last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#344054]">{produto.nome}</p>
                            <p className="text-xs text-gray-500">
                              {produto.gtin || produto.codigo} - Estoque: {produto.estoque_atual}
                            </p>
                          </div>
                          <span className="text-sm text-[#336FB6] font-medium">
                            {formatCurrency(produto.preco)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-[#5C5C5C] hover:bg-[#4A4A4A] rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Lancamento Form */}
            {modalStep === 'form' && modalSelectedProduct && (
              <>
                {/* Produto Selecionado */}
                <div className="px-6 pt-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[#344054]">{modalSelectedProduct.nome}</p>
                      <p className="text-xs text-gray-500">
                        {modalSelectedProduct.gtin || modalSelectedProduct.codigo} - Estoque: {modalSelectedProduct.estoque_atual}
                      </p>
                    </div>
                    {!selectedProduct && (
                      <button
                        onClick={() => setModalStep('search')}
                        className="text-xs text-[#336FB6] hover:underline"
                      >
                        Alterar
                      </button>
                    )}
                  </div>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Tipo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={novoLancamento.tipo}
                        onChange={(e) => setNovoLancamento({ ...novoLancamento, tipo: e.target.value as 'Entrada' | 'Saida' })}
                        className="block w-full px-3 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="Entrada">Entrada</option>
                        <option value="Saida">Saida</option>
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                      <input
                        type="number"
                        placeholder="0,000000"
                        value={novoLancamento.quantidade}
                        onChange={(e) => setNovoLancamento({ ...novoLancamento, quantidade: e.target.value })}
                        className="block w-full px-3 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Preco de Compra */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preco de compra</label>
                      <input
                        type="number"
                        placeholder="745,00000"
                        value={novoLancamento.precoCompra}
                        onChange={(e) => setNovoLancamento({ ...novoLancamento, precoCompra: e.target.value })}
                        className="block w-full px-3 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {/* Preco de Custo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preco de custo</label>
                      <input
                        type="number"
                        placeholder="0,000000"
                        value={novoLancamento.precoCusto}
                        onChange={(e) => setNovoLancamento({ ...novoLancamento, precoCusto: e.target.value })}
                        className="block w-full px-3 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Observacoes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                    <textarea
                      rows={4}
                      placeholder="Digite observacoes..."
                      value={novoLancamento.observacao}
                      onChange={(e) => setNovoLancamento({ ...novoLancamento, observacao: e.target.value })}
                      className="block w-full px-3 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EFEFEF]">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-[#5C5C5C] hover:bg-[#4A4A4A] rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveLancamento}
                    disabled={savingLancamento || !novoLancamento.quantidade}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingLancamento ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
