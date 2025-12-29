'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { NotaFiscalListItem } from '@/types/notaFiscal'
import { SITUACAO_NOTA } from '@/types/notaFiscal'

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

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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

export default function NotasEntradaPage() {
  const { user, empresa } = useAuth()
  const [notas, setNotas] = useState<NotaFiscalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [fornecedorFilter, setFornecedorFilter] = useState('')
  const [dataInicioFilter, setDataInicioFilter] = useState('')
  const [dataFimFilter, setDataFimFilter] = useState('')
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 10

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

  const fetchNotas = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const empresaId = empresa?.id || user?.empresa_id

      if (!empresaId) {
        setLoading(false)
        return
      }

      // Buscar notas fiscais de entrada (tipo = '0')
      const { data: notasData, error: notasError } = await supabase
        .from('notas_fiscais')
        .select(`
          id,
          numero,
          serie,
          tipo,
          situacao,
          data_emissao,
          data_operacao,
          contato_nome,
          contato_numero_documento,
          chave_acesso,
          xml_url,
          link_danfe,
          link_pdf,
          fornecedor_id,
          fornecedores (
            nome,
            cnpj
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('tipo', '0') // Apenas notas de entrada
        .order('data_emissao', { ascending: false })

      if (notasError) {
        console.error('Erro ao buscar notas:', notasError)
        setLoading(false)
        return
      }

      if (notasData) {
        const notasFormatadas: NotaFiscalListItem[] = notasData.map((nota: any) => ({
          ...nota,
          fornecedor_nome: nota.fornecedores?.nome || nota.contato_nome,
          fornecedor_cnpj: nota.fornecedores?.cnpj || nota.contato_numero_documento,
        }))
        setNotas(notasFormatadas)
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotas()
  }, [user?.id, user?.empresa_id, empresa?.id])

  // Filtrar notas
  const filteredNotas = notas.filter((nota) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      nota.numero?.toLowerCase().includes(searchLower) ||
      nota.fornecedor_nome?.toLowerCase().includes(searchLower) ||
      nota.contato_nome?.toLowerCase().includes(searchLower) ||
      nota.chave_acesso?.includes(searchTerm)

    // Filtro por fornecedor
    const matchesFornecedor = !fornecedorFilter ||
      nota.fornecedor_nome?.toLowerCase().includes(fornecedorFilter.toLowerCase())

    // Filtro por data
    const dataEmissao = nota.data_emissao ? new Date(nota.data_emissao) : null
    const matchesDataInicio = !dataInicioFilter || (dataEmissao && dataEmissao >= new Date(dataInicioFilter))
    const matchesDataFim = !dataFimFilter || (dataEmissao && dataEmissao <= new Date(dataFimFilter + 'T23:59:59'))

    return matchesSearch && matchesFornecedor && matchesDataInicio && matchesDataFim
  })

  // Verificar se ha filtros ativos
  const hasActiveFilters = fornecedorFilter !== '' || dataInicioFilter !== '' || dataFimFilter !== ''
  const activeFiltersCount = [fornecedorFilter, dataInicioFilter, dataFimFilter].filter(f => f !== '').length

  // Limpar filtros
  const clearFilters = () => {
    setFornecedorFilter('')
    setDataInicioFilter('')
    setDataFimFilter('')
    setShowFilterDropdown(false)
    setCurrentPage(1)
  }

  // Paginacao
  const totalPages = Math.ceil(filteredNotas.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedNotas = filteredNotas.slice(startIndex, startIndex + itemsPerPage)

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

  // Formatar data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  // Formatar CNPJ
  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return '-'
    const cleaned = cnpj.replace(/\D/g, '')
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return cnpj
  }

  // Obter status da nota
  const getStatusBadge = (situacao: number) => {
    const status = SITUACAO_NOTA[situacao] || { label: 'Desconhecido', color: 'gray' }
    const colorClasses: Record<string, string> = {
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700',
      gray: 'bg-gray-100 text-gray-700',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[status.color]}`}>
        {status.label}
      </span>
    )
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Notas de Entrada"
        subtitle={`${filteredNotas.length} notas fiscais`}
      />

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
          <div className="flex items-end justify-between gap-2 mb-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-medium text-[#344054]">Notas Fiscais de Entrada</h2>
              <p className="text-xs text-[#838383]">
                Visualize todas as notas fiscais de entrada recebidas dos fornecedores
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
                  {hasActiveFilters && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#336FB6] text-xs text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
                        <input
                          type="text"
                          placeholder="Nome do fornecedor..."
                          value={fornecedorFilter}
                          onChange={(e) => {
                            setFornecedorFilter(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Filtro por Data Inicio */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Inicio
                        </label>
                        <input
                          type="date"
                          value={dataInicioFilter}
                          onChange={(e) => {
                            setDataInicioFilter(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Filtro por Data Fim */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Fim
                        </label>
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
              placeholder="Pesquisar por numero, fornecedor, chave..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EFEFEF]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Numero
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  CNPJ/CPF
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Emissao
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Entrada
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-[#336FB6] mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Carregando notas fiscais...
                    </div>
                  </td>
                </tr>
              ) : paginatedNotas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || hasActiveFilters ? (
                      <div>
                        <DocumentIcon />
                        <p className="mt-2">Nenhuma nota fiscal encontrada para os filtros aplicados.</p>
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
                        <DocumentIcon />
                        <p className="mt-2">Nenhuma nota fiscal de entrada encontrada.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedNotas.map((nota, index) => (
                  <tr
                    key={nota.id}
                    className={`border-b border-[#EFEFEF] hover:bg-gray-50 ${
                      index % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#344054]">
                          {nota.numero || '-'}
                        </span>
                        {nota.serie !== null && (
                          <span className="text-[11px] text-gray-500">
                            Serie: {nota.serie}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {nota.fornecedor_nome || nota.contato_nome || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {formatCNPJ(nota.fornecedor_cnpj || nota.contato_numero_documento)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {formatDate(nota.data_emissao)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {formatDate(nota.data_operacao)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(nota.situacao)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {nota.link_danfe && (
                          <a
                            href={nota.link_danfe}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-[#336FB6] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver DANFE"
                          >
                            <DocumentIcon />
                          </a>
                        )}
                        {nota.chave_acesso && (
                          <a
                            href={`https://www.bling.com.br/relatorios/nfe.xml.php?chaveAcesso=${nota.chave_acesso}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-[#336FB6] hover:bg-blue-50 rounded transition-colors"
                            title="Baixar XML"
                          >
                            XML
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredNotas.length > 0 && (
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
  )
}
