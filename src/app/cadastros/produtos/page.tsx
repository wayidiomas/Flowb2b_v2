'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { TableSkeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ProdutoListItem } from '@/types/produto'

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

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

export default function ProdutosPage() {
  const { user, empresa } = useAuth()
  const [produtos, setProdutos] = useState<ProdutoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedProdutos, setSelectedProdutos] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [situacaoFilter, setSituacaoFilter] = useState<string>('')
  const [tipoFilter, setTipoFilter] = useState<string>('')
  const [estoqueFilter, setEstoqueFilter] = useState<string>('')
  const [precoMinFilter, setPrecoMinFilter] = useState<string>('')
  const [precoMaxFilter, setPrecoMaxFilter] = useState<string>('')
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

  const fetchProdutos = async () => {
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

      // Calcular range para paginacao server-side
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Construir query com filtros server-side
      let query = supabase
        .from('produtos')
        .select('id, codigo, nome, unidade, preco, estoque_atual, situacao, tipo', { count: 'exact' })
        .eq('empresa_id', empresaId)

      // Filtro por situacao (server-side)
      if (situacaoFilter) {
        query = query.eq('situacao', situacaoFilter)
      }

      // Filtro por tipo (server-side)
      if (tipoFilter) {
        query = query.eq('tipo', tipoFilter)
      }

      // Filtro por estoque (server-side)
      if (estoqueFilter) {
        switch (estoqueFilter) {
          case 'sem_estoque':
            query = query.eq('estoque_atual', 0)
            break
          case 'estoque_baixo':
            query = query.gt('estoque_atual', 0).lte('estoque_atual', 10)
            break
          case 'com_estoque':
            query = query.gt('estoque_atual', 10)
            break
        }
      }

      // Filtro por preco minimo (server-side)
      if (precoMinFilter) {
        const min = parseFloat(precoMinFilter)
        if (!isNaN(min)) {
          query = query.gte('preco', min)
        }
      }

      // Filtro por preco maximo (server-side)
      if (precoMaxFilter) {
        const max = parseFloat(precoMaxFilter)
        if (!isNaN(max)) {
          query = query.lte('preco', max)
        }
      }

      // Busca por nome ou codigo (server-side)
      if (debouncedSearch) {
        query = query.or(`nome.ilike.%${debouncedSearch}%,codigo.ilike.%${debouncedSearch}%`)
      }

      // Ordenar e paginar
      const { data, error, count } = await query
        .order('nome', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('Erro ao buscar produtos:', error)
        setLoading(false)
        return
      }

      // Atualizar total count para paginacao
      setTotalCount(count || 0)

      if (data) {
        const produtosFormatados: ProdutoListItem[] = data.map(p => ({
          id: p.id,
          codigo: p.codigo || '',
          nome: p.nome || '',
          unidade: p.unidade || 'UN',
          preco: p.preco || 0,
          estoque_atual: p.estoque_atual || 0,
          situacao: p.situacao,
          tipo: p.tipo
        }))

        setProdutos(produtosFormatados)
      } else {
        setProdutos([])
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Buscar quando mudar pagina, filtros ou busca
  useEffect(() => {
    fetchProdutos()
  }, [user?.id, user?.empresa_id, empresa?.id, currentPage, debouncedSearch, situacaoFilter, tipoFilter, estoqueFilter, precoMinFilter, precoMaxFilter])

  // Verificar se ha filtros ativos
  const hasActiveFilters = situacaoFilter !== '' || tipoFilter !== '' || estoqueFilter !== '' || precoMinFilter !== '' || precoMaxFilter !== ''

  // Contar filtros ativos
  const activeFiltersCount = [
    situacaoFilter !== '',
    tipoFilter !== '',
    estoqueFilter !== '',
    precoMinFilter !== '' || precoMaxFilter !== ''
  ].filter(Boolean).length

  // Limpar filtros
  const clearFilters = () => {
    setSituacaoFilter('')
    setTipoFilter('')
    setEstoqueFilter('')
    setPrecoMinFilter('')
    setPrecoMaxFilter('')
    setShowFilterDropdown(false)
    setCurrentPage(1)
  }

  // Paginacao (server-side - produtos ja vem paginados)
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Selecao
  const handleSelectAll = () => {
    if (selectedProdutos.length === produtos.length) {
      setSelectedProdutos([])
    } else {
      setSelectedProdutos(produtos.map((p) => p.id))
    }
  }

  const handleSelectProduto = (id: number) => {
    setSelectedProdutos((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  // Excluir produtos
  const handleExcluir = async () => {
    if (selectedProdutos.length === 0) return
    if (!confirm(`Deseja realmente excluir ${selectedProdutos.length} produto(s)?`)) return

    setActionLoading(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('empresa_id', empresaId)
        .in('id', selectedProdutos)

      if (error) throw error
      await fetchProdutos()
      setSelectedProdutos([])
    } catch (err) {
      console.error('Erro ao excluir produtos:', err)
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

  // Formatar preco
  const formatPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  return (
    <RequirePermission permission="cadastros">
    <DashboardLayout>
      {/* Page Header com seletor de empresa */}
      <PageHeader
        title="Produtos"
        subtitle={`${totalCount} produtos`}
      />

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
          <div className="flex items-end justify-between gap-2 mb-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-medium text-[#344054]">Produtos</h2>
              <p className="text-xs text-[#838383]">
                Gerencie seu catalogo de produtos
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                          <option value="">Todos</option>
                          <option value="A">Ativo</option>
                          <option value="I">Inativo</option>
                        </select>
                      </div>

                      {/* Filtro por Tipo */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          value={tipoFilter}
                          onChange={(e) => {
                            setTipoFilter(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Todos</option>
                          <option value="P">Produto</option>
                          <option value="S">Servico</option>
                        </select>
                      </div>

                      {/* Filtro por Estoque */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estoque
                        </label>
                        <select
                          value={estoqueFilter}
                          onChange={(e) => {
                            setEstoqueFilter(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Todos</option>
                          <option value="sem_estoque">Sem estoque</option>
                          <option value="estoque_baixo">Estoque baixo (1-10)</option>
                          <option value="com_estoque">Com estoque (&gt;10)</option>
                        </select>
                      </div>

                      {/* Filtro por Preco */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Faixa de Preco (R$)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={precoMinFilter}
                            onChange={(e) => {
                              setPrecoMinFilter(e.target.value)
                              setCurrentPage(1)
                            }}
                            min="0"
                            step="0.01"
                            className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={precoMaxFilter}
                            onChange={(e) => {
                              setPrecoMaxFilter(e.target.value)
                              setCurrentPage(1)
                            }}
                            min="0"
                            step="0.01"
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

              <Link
                href="/cadastros/produtos/novo"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg shadow-xs transition-colors"
              >
                <PlusIcon />
                Novo produto
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-[360px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por nome, codigo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Selection Actions */}
        {selectedProdutos.length > 0 && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedProdutos.length} item(ns) selecionado(s)
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
                    checked={produtos.length > 0 && selectedProdutos.length === produtos.length}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-[#336FB6] bg-white border-[#DCDCDC] rounded focus:ring-[#336FB6]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Descricao
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Codigo
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Unidade
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">
                  Preco (R$)
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">
                  Estoque
                </th>
                <th className="px-4 py-3 w-16">
                  <span className="sr-only">Acoes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={5} rows={5} showCheckbox showActions />
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || hasActiveFilters ? (
                      <div>
                        <p>Nenhum produto encontrado para os filtros aplicados.</p>
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
                        <p>Nenhum produto cadastrado.</p>
                        <Link
                          href="/cadastros/produtos/novo"
                          className="mt-2 inline-block text-sm text-[#336FB6] hover:underline"
                        >
                          Adicionar primeiro produto
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                produtos.map((prod, index) => (
                  <tr
                    key={prod.id}
                    className={`border-b border-[#EFEFEF] hover:bg-gray-50 ${
                      selectedProdutos.includes(prod.id) ? 'bg-blue-50' : index % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProdutos.includes(prod.id)}
                        onChange={() => handleSelectProduto(prod.id)}
                        className="w-5 h-5 text-[#336FB6] bg-white border-[#DCDCDC] rounded focus:ring-[#336FB6]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {prod.nome || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {prod.codigo || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {prod.unidade || 'UN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[13px] text-[#344054]">
                        {formatPreco(prod.preco)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[13px] text-[#344054]">
                        {prod.estoque_atual}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/cadastros/produtos/${prod.id}/editar`}
                        className="text-gray-400 hover:text-gray-600 transition-colors inline-block"
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
        {!loading && totalCount > 0 && (
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
    </DashboardLayout>
    </RequirePermission>
  )
}
