'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { TableSkeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import { SidebarAcoes } from '@/components/pedido-compra/SidebarAcoes'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PedidoCompraListItem, FornecedorOption, SITUACAO_LABELS, SITUACAO_COLORS } from '@/types/pedido-compra'

// Status config
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Emitida': { bg: 'bg-green-100', text: 'text-green-700', label: 'Emitida' },
  'Cancelada': { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
  'Registrada': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Registrada' },
  'Aguardando Entrega': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aguardando Entrega' },
  'Rascunho': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Rascunho' },
}

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SidebarToggleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

export default function PedidoCompraPage() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<PedidoCompraListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPedidos, setSelectedPedidos] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showFornecedorModal, setShowFornecedorModal] = useState(false)

  // Filtros
  const [fornecedorFilter, setFornecedorFilter] = useState('')
  const [dataInicioFilter, setDataInicioFilter] = useState('')
  const [dataFimFilter, setDataFimFilter] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('')

  // Fornecedores para modal e filtro
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [fornecedorSearch, setFornecedorSearch] = useState('')
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorOption | null>(null)

  // Resumo
  const [resumo, setResumo] = useState({ qtd: 0, valorTotal: 0 })

  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 10

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false)
      }
    }

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterDropdown])

  // Buscar fornecedores
  const fetchFornecedores = async () => {
    if (!user?.id) return
    setLoadingFornecedores(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome, cnpj')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true })
        .limit(100)

      if (error) throw error
      setFornecedores(data || [])
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  useEffect(() => {
    fetchFornecedores()
  }, [user?.id, user?.empresa_id, empresa?.id])

  // Buscar pedidos
  const fetchPedidos = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const empresaId = empresa?.id || user?.empresa_id

      if (!empresaId) {
        setLoading(false)
        return
      }

      const offset = (currentPage - 1) * itemsPerPage

      let data: PedidoCompraListItem[] | null = null
      let error = null

      // Se ha busca, usa RPC de search
      if (debouncedSearch) {
        const result = await supabase.rpc('flowb2b_search_pedidos_compra_detalhados_usernobling', {
          p_empresa_id: empresaId,
          p_search_term: debouncedSearch,
          p_limit: itemsPerPage,
          p_offset: offset
        })
        data = result.data
        error = result.error
      } else {
        // Senao usa RPC de filter
        const result = await supabase.rpc('flowb2b_filter_pedidos_compra_detalhados_usernobling', {
          p_empresa_id: empresaId,
          p_fornecedor_id: fornecedorFilter ? parseInt(fornecedorFilter) : null,
          p_data_inicio: dataInicioFilter || null,
          p_data_fim: dataFimFilter || null,
          p_limit: itemsPerPage,
          p_offset: offset
        })
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('Erro ao buscar pedidos:', error)
        setLoading(false)
        return
      }

      if (data) {
        // Filtrar por situacao no frontend se necessario
        let filteredData = data
        if (situacaoFilter) {
          filteredData = data.filter(p => p.status === situacaoFilter)
        }

        setPedidos(filteredData)

        // Calcular resumo
        const valorTotal = filteredData.reduce((acc, p) => acc + (p.valor_total || 0), 0)
        setResumo({ qtd: filteredData.length, valorTotal })

        // Total count (aproximado - sem paginacao na RPC)
        setTotalCount(filteredData.length)
      } else {
        setPedidos([])
        setResumo({ qtd: 0, valorTotal: 0 })
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Buscar quando mudar filtros
  useEffect(() => {
    fetchPedidos()
  }, [user?.id, user?.empresa_id, empresa?.id, currentPage, debouncedSearch, fornecedorFilter, dataInicioFilter, dataFimFilter, situacaoFilter])

  // Verificar se ha filtros ativos
  const hasActiveFilters = fornecedorFilter !== '' || dataInicioFilter !== '' || dataFimFilter !== '' || situacaoFilter !== ''

  // Contar filtros ativos
  const activeFiltersCount = [
    fornecedorFilter !== '',
    dataInicioFilter !== '' || dataFimFilter !== '',
    situacaoFilter !== ''
  ].filter(Boolean).length

  // Limpar filtros
  const clearFilters = () => {
    setFornecedorFilter('')
    setDataInicioFilter('')
    setDataFimFilter('')
    setSituacaoFilter('')
    setShowFilterDropdown(false)
    setCurrentPage(1)
  }

  // Paginacao
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Selecao
  const handleSelectAll = () => {
    if (selectedPedidos.length === pedidos.length) {
      setSelectedPedidos([])
    } else {
      setSelectedPedidos(pedidos.map((p) => p.pedido_id))
    }
  }

  const handleSelectPedido = (id: number) => {
    setSelectedPedidos((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  // Excluir pedidos
  const handleExcluir = async () => {
    if (selectedPedidos.length === 0) return
    if (!confirm(`Deseja realmente excluir ${selectedPedidos.length} pedido(s)?`)) return

    setActionLoading(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      const { error } = await supabase
        .from('pedidos_compra')
        .delete()
        .eq('empresa_id', empresaId)
        .in('id', selectedPedidos)

      if (error) throw error
      await fetchPedidos()
      setSelectedPedidos([])
    } catch (err) {
      console.error('Erro ao excluir pedidos:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Gerar paginas para navegacao
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  // Formatar valor
  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Formatar data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR')
  }

  // Abrir modal de fornecedor para novo pedido
  const handleNovoPedido = () => {
    setShowFornecedorModal(true)
    setFornecedorSearch('')
    setSelectedFornecedor(null)
  }

  // Confirmar fornecedor e ir para pagina de novo pedido
  const handleConfirmFornecedor = () => {
    if (selectedFornecedor) {
      router.push(`/suprimentos/pedido-compra/novo?fornecedor_id=${selectedFornecedor.id}`)
    }
  }

  // Filtrar fornecedores no modal
  const filteredFornecedores = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase()) ||
    (f.cnpj && f.cnpj.includes(fornecedorSearch))
  )

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Pedidos de Compra"
        subtitle={`${totalCount} pedidos`}
      />

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1">
          {/* Card Container */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
              <div className="flex items-end justify-between gap-2 mb-4">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-base font-medium text-[#344054]">Pedidos de Compra</h2>
                  <p className="text-xs text-[#838383]">
                    Gerencie seus pedidos de compra
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle Sidebar */}
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="p-2.5 text-[#667085] hover:text-[#344054] hover:bg-gray-100 rounded-lg transition-colors"
                    title={showSidebar ? 'Ocultar sidebar' : 'Mostrar sidebar'}
                  >
                    <SidebarToggleIcon />
                  </button>

                  {/* Botao de Filtros com Dropdown */}
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="inline-flex items-center gap-2 px-10 py-2.5 text-[13px] font-medium text-white bg-[#FFAA11] hover:bg-[#E59A0F] rounded-lg shadow-xs transition-colors"
                    >
                      <FilterIcon />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#336FB6] text-xs text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    {/* Dropdown */}
                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
                            <button
                              onClick={() => setShowFilterDropdown(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XIcon />
                            </button>
                          </div>

                          {/* Filtro por Fornecedor */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fornecedor
                            </label>
                            <select
                              value={fornecedorFilter}
                              onChange={(e) => {
                                setFornecedorFilter(e.target.value)
                                setCurrentPage(1)
                              }}
                              className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Todos</option>
                              {fornecedores.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filtro por Situacao */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Situacao
                            </label>
                            <select
                              value={situacaoFilter}
                              onChange={(e) => {
                                setSituacaoFilter(e.target.value)
                                setCurrentPage(1)
                              }}
                              className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Todas</option>
                              <option value="Emitida">Emitida</option>
                              <option value="Cancelada">Cancelada</option>
                              <option value="Registrada">Registrada</option>
                              <option value="Aguardando Entrega">Aguardando Entrega</option>
                              <option value="Rascunho">Rascunho</option>
                            </select>
                          </div>

                          {/* Filtro por Periodo */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Periodo
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={dataInicioFilter}
                                onChange={(e) => {
                                  setDataInicioFilter(e.target.value)
                                  setCurrentPage(1)
                                }}
                                className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                              <span className="text-gray-500">-</span>
                              <input
                                type="date"
                                value={dataFimFilter}
                                onChange={(e) => {
                                  setDataFimFilter(e.target.value)
                                  setCurrentPage(1)
                                }}
                                className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>

                          {/* Botoes de Acao */}
                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={clearFilters}
                              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => setShowFilterDropdown(false)}
                              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-[360px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar por numero, fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Selection Actions */}
            {selectedPedidos.length > 0 && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedPedidos.length} item(ns) selecionado(s)
                </span>
                <button
                  onClick={handleExcluir}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <TrashIcon />
                  Excluir
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEFEF]">
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={pedidos.length > 0 && selectedPedidos.length === pedidos.length}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-[#336FB6] bg-white border-[#DCDCDC] rounded focus:ring-[#336FB6]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[66px]">
                      Numero
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[80px]">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                      Fornecedor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[150px]">
                      Obs. internas
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054] w-[50px]">
                      Itens
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054] w-[120px]">
                      Valor (R$)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[130px]">
                      Status
                    </th>
                    <th className="px-4 py-3 w-12">
                      <span className="sr-only">Acoes</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={7} rows={5} showCheckbox showActions />
                  ) : pedidos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        {searchTerm || hasActiveFilters ? (
                          <div>
                            <p>Nenhum pedido encontrado para os filtros aplicados.</p>
                            {hasActiveFilters && (
                              <button
                                onClick={clearFilters}
                                className="mt-2 text-sm text-[#336FB6] hover:underline"
                              >
                                Limpar filtros
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p>Nenhum pedido de compra cadastrado.</p>
                            <button
                              onClick={handleNovoPedido}
                              className="mt-2 inline-block text-sm text-[#336FB6] hover:underline"
                            >
                              Criar primeiro pedido
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    pedidos.map((pedido, index) => {
                      const statusConfig = STATUS_CONFIG[pedido.status] || STATUS_CONFIG['Rascunho']
                      return (
                        <tr
                          key={pedido.pedido_id}
                          className={`border-b border-[#EFEFEF] hover:bg-gray-50 ${
                            selectedPedidos.includes(pedido.pedido_id) ? 'bg-blue-50' : index % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedPedidos.includes(pedido.pedido_id)}
                              onChange={() => handleSelectPedido(pedido.pedido_id)}
                              className="w-5 h-5 text-[#336FB6] bg-white border-[#DCDCDC] rounded focus:ring-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#344054] font-medium">
                              {pedido.numero_pedido || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#344054]">
                              {formatDate(pedido.data_pedido)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#344054]">
                              {pedido.fornecedor_nome || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#667085] truncate block max-w-[150px]" title={pedido.observacoes_internas}>
                              {pedido.observacoes_internas || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[13px] text-[#344054]">
                              {pedido.itens_produtos?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[13px] text-[#344054]">
                              {formatCurrency(pedido.valor_total || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              href={`/suprimentos/pedido-compra/${pedido.pedido_id}/editar`}
                              className="text-gray-400 hover:text-gray-600 transition-colors inline-block"
                            >
                              <ExternalLinkIcon />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalCount > itemsPerPage && (
              <div className="px-7 py-4 flex items-center justify-between bg-white">
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
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <SidebarAcoes
            resumo={resumo}
            onNovoPedido={handleNovoPedido}
          />
        )}
      </div>

      {/* Modal Selecionar Fornecedor */}
      <Modal isOpen={showFornecedorModal} onClose={() => setShowFornecedorModal(false)}>
        <ModalHeader>
          <ModalTitle>Selecionar Fornecedor</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600 mb-4">
            Selecione o fornecedor para criar o pedido de compra.
          </p>

          {/* Busca */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#898989]">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar fornecedor..."
              value={fornecedorSearch}
              onChange={(e) => setFornecedorSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Lista de fornecedores */}
          <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
            {loadingFornecedores ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : filteredFornecedores.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Nenhum fornecedor encontrado</div>
            ) : (
              filteredFornecedores.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFornecedor(f)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                    selectedFornecedor?.id === f.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-[#344054]">{f.nome}</p>
                  {f.cnpj && (
                    <p className="text-xs text-gray-500">{f.cnpj}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setShowFornecedorModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmFornecedor}
            disabled={!selectedFornecedor}
            className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}
