'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PoliticaCompra } from '@/types/fornecedor'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
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

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

interface PoliticaWithFornecedor extends PoliticaCompra {
  fornecedor_nome: string
  fornecedor_nome_fantasia?: string
}

interface FornecedorOption {
  id: number
  nome: string
  nome_fantasia?: string
}

export default function PoliticaCompraPage() {
  const { user, empresa } = useAuth()

  const [loading, setLoading] = useState(true)
  const [politicas, setPoliticas] = useState<PoliticaWithFornecedor[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('')

  // Paginacao
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  // Modal de duplicar
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [politicaToDuplicate, setPoliticaToDuplicate] = useState<PoliticaWithFornecedor | null>(null)
  const [selectedFornecedores, setSelectedFornecedores] = useState<number[]>([])
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateSearchTerm, setDuplicateSearchTerm] = useState('')

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        const empresaId = empresa?.id || user?.empresa_id

        // Buscar politicas com dados do fornecedor
        const { data: politicasData, error: politicasError } = await supabase
          .from('politica_compra')
          .select(`
            *,
            fornecedores!inner(id, nome, nome_fantasia)
          `)
          .eq('empresa_id', empresaId)
          .neq('isdeleted', true)
          .order('created_at', { ascending: false })

        if (politicasError) throw politicasError

        // Mapear dados
        const mappedPoliticas = (politicasData || []).map((p: any) => ({
          ...p,
          fornecedor_nome: p.fornecedores?.nome || '-',
          fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
        }))

        setPoliticas(mappedPoliticas)

        // Buscar fornecedores para filtro e duplicacao
        const { data: fornecedoresData } = await supabase
          .from('fornecedores')
          .select('id, nome, nome_fantasia')
          .eq('empresa_id', empresaId)
          .order('nome')

        setFornecedores(fornecedoresData || [])

      } catch (err) {
        console.error('Erro ao carregar politicas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, empresa?.id])

  // Filtrar politicas
  const filteredPoliticas = useMemo(() => {
    return politicas.filter(p => {
      // Filtro por texto (fornecedor ou observacao)
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchFornecedor = p.fornecedor_nome?.toLowerCase().includes(search) ||
                                p.fornecedor_nome_fantasia?.toLowerCase().includes(search)
        const matchObs = p.observacao?.toLowerCase().includes(search)
        if (!matchFornecedor && !matchObs) return false
      }

      // Filtro por fornecedor
      if (fornecedorFilter && p.fornecedor_id !== parseInt(fornecedorFilter)) {
        return false
      }

      return true
    })
  }, [politicas, searchTerm, fornecedorFilter])

  // Paginacao
  const totalPages = Math.ceil(filteredPoliticas.length / itemsPerPage)
  const paginatedPoliticas = filteredPoliticas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }
    return pages
  }

  // Abrir modal de duplicar
  const handleOpenDuplicate = (politica: PoliticaWithFornecedor) => {
    setPoliticaToDuplicate(politica)
    setSelectedFornecedores([])
    setDuplicateSearchTerm('')
    setShowDuplicateModal(true)
  }

  // Toggle selecao de fornecedor
  const toggleFornecedorSelection = (fornecedorId: number) => {
    setSelectedFornecedores(prev =>
      prev.includes(fornecedorId)
        ? prev.filter(id => id !== fornecedorId)
        : [...prev, fornecedorId]
    )
  }

  // Selecionar todos os fornecedores visiveis
  const selectAllVisible = () => {
    const visibleIds = filteredFornecedoresForDuplicate.map(f => f.id)
    setSelectedFornecedores(prev => {
      const newSelection = [...prev]
      visibleIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      return newSelection
    })
  }

  // Limpar selecao
  const clearSelection = () => {
    setSelectedFornecedores([])
  }

  // Filtrar fornecedores para duplicacao (excluir o fornecedor atual)
  const filteredFornecedoresForDuplicate = useMemo(() => {
    if (!politicaToDuplicate) return []

    return fornecedores.filter(f => {
      // Excluir o fornecedor que ja tem essa politica
      if (f.id === politicaToDuplicate.fornecedor_id) return false

      // Filtrar por busca
      if (duplicateSearchTerm) {
        const search = duplicateSearchTerm.toLowerCase()
        const matchNome = f.nome?.toLowerCase().includes(search)
        const matchFantasia = f.nome_fantasia?.toLowerCase().includes(search)
        if (!matchNome && !matchFantasia) return false
      }

      return true
    })
  }, [fornecedores, politicaToDuplicate, duplicateSearchTerm])

  // Duplicar politica
  const handleDuplicate = async () => {
    if (!politicaToDuplicate || selectedFornecedores.length === 0) return

    setDuplicating(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Criar uma politica para cada fornecedor selecionado
      const novasPoliticas = selectedFornecedores.map(fornecedorId => ({
        fornecedor_id: fornecedorId,
        empresa_id: empresaId,
        forma_pagamento_dias: politicaToDuplicate.forma_pagamento_dias,
        prazo_entrega: politicaToDuplicate.prazo_entrega,
        valor_minimo: politicaToDuplicate.valor_minimo,
        peso: politicaToDuplicate.peso,
        desconto: politicaToDuplicate.desconto,
        bonificacao: politicaToDuplicate.bonificacao,
        observacao: politicaToDuplicate.observacao,
        estoque_eficiente: politicaToDuplicate.estoque_eficiente,
      }))

      const { data, error } = await supabase
        .from('politica_compra')
        .insert(novasPoliticas)
        .select(`
          *,
          fornecedores!inner(id, nome, nome_fantasia)
        `)

      if (error) throw error

      // Adicionar novas politicas a lista
      if (data) {
        const mappedNovas = data.map((p: any) => ({
          ...p,
          fornecedor_nome: p.fornecedores?.nome || '-',
          fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
        }))
        setPoliticas(prev => [...mappedNovas, ...prev])
      }

      // Fechar modal e mostrar sucesso
      setShowDuplicateModal(false)
      setPoliticaToDuplicate(null)
      setSelectedFornecedores([])

      alert(`Politica duplicada para ${selectedFornecedores.length} fornecedor(es) com sucesso!`)

    } catch (err) {
      console.error('Erro ao duplicar politica:', err)
      alert('Erro ao duplicar politica. Tente novamente.')
    } finally {
      setDuplicating(false)
    }
  }

  // Formatar valor monetario
  const formatCurrency = (value?: number) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin h-8 w-8 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#336FB6]">
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Politica de Compra</span>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-t-[20px] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-[#344054]">Politicas de Compra</h2>
              <p className="text-xs text-[#838383]">
                Gerencie as politicas de compra de todos os fornecedores em um so lugar
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="px-3 py-1 bg-[#336FB6]/10 text-[#336FB6] rounded-full font-medium">
                {filteredPoliticas.length} politica{filteredPoliticas.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por fornecedor ou observacao..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </div>
            </div>

            {/* Filtro por fornecedor */}
            <select
              value={fornecedorFilter}
              onChange={(e) => {
                setFornecedorFilter(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            >
              <option value="">Todos os fornecedores</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome_fantasia || f.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Forma de pagamento</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Prazo entrega</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Prazo estoque</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor minimo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Peso (kg)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Desconto (%)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Bonificacao (%)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Observacao</th>
                <th className="px-4 py-3 w-24 text-center text-xs font-medium text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPoliticas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || fornecedorFilter
                      ? 'Nenhuma politica encontrada com os filtros aplicados.'
                      : 'Nenhuma politica de compra cadastrada.'}
                  </td>
                </tr>
              ) : (
                paginatedPoliticas.map((pol, index) => (
                  <tr key={pol.id} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {pol.fornecedor_nome_fantasia || pol.fornecedor_nome}
                        </p>
                        {pol.fornecedor_nome_fantasia && (
                          <p className="text-xs text-gray-500">{pol.fornecedor_nome}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pol.forma_pagamento_dias?.length > 0 ? (
                          pol.forma_pagamento_dias.map(dia => (
                            <span key={dia} className="px-2 py-0.5 text-xs font-medium bg-[#336FB6]/10 text-[#336FB6] rounded-full">
                              {dia}d
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.prazo_entrega ? `${pol.prazo_entrega} dias` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.prazo_estoque ? `${pol.prazo_estoque} dias` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(pol.valor_minimo)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.peso || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.desconto ? `${pol.desconto}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.bonificacao ? `${pol.bonificacao}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#336FB6] max-w-[150px] truncate" title={pol.observacao || ''}>
                      {pol.observacao || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDuplicate(pol)}
                          className="p-1.5 text-gray-400 hover:text-[#336FB6] hover:bg-[#336FB6]/10 rounded transition-colors"
                          title="Duplicar para outros fornecedores"
                        >
                          <CopyIcon />
                        </button>
                        <Link
                          href={`/cadastros/fornecedores/${pol.fornecedor_id}/editar`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Ver fornecedor"
                        >
                          <ExternalLinkIcon />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {totalPages > 1 && (
          <div className="px-4 py-4 flex items-center justify-between border-t border-gray-100">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeftIcon />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum as number)}
                    className={`w-10 h-10 text-sm font-medium rounded-lg ${
                      page === pageNum
                        ? 'bg-[#ECECEC] text-[#1D2939]'
                        : 'text-[#475467] hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Proximo
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Duplicar */}
      {showDuplicateModal && politicaToDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowDuplicateModal(false)
              setPoliticaToDuplicate(null)
              setSelectedFornecedores([])
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Duplicar Politica de Compra</h3>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setPoliticaToDuplicate(null)
                    setSelectedFornecedores([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Selecione os fornecedores que receberao esta politica
              </p>
            </div>

            {/* Resumo da politica */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Politica a ser duplicada:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fornecedor original:</span>{' '}
                  <span className="font-medium">{politicaToDuplicate.fornecedor_nome_fantasia || politicaToDuplicate.fornecedor_nome}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pagamento:</span>{' '}
                  <span className="font-medium">{politicaToDuplicate.forma_pagamento_dias?.join('/') || '-'} dias</span>
                </div>
                <div>
                  <span className="text-gray-500">Entrega:</span>{' '}
                  <span className="font-medium">{politicaToDuplicate.prazo_entrega || '-'} dias</span>
                </div>
                <div>
                  <span className="text-gray-500">Valor min:</span>{' '}
                  <span className="font-medium">{formatCurrency(politicaToDuplicate.valor_minimo)}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
              {/* Busca e acoes */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={duplicateSearchTerm}
                    onChange={(e) => setDuplicateSearchTerm(e.target.value)}
                    placeholder="Buscar fornecedor..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </div>
                </div>
                <button
                  onClick={selectAllVisible}
                  className="px-3 py-2 text-xs font-medium text-[#336FB6] hover:bg-[#336FB6]/10 rounded-lg transition-colors"
                >
                  Selecionar todos
                </button>
                {selectedFornecedores.length > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Limpar ({selectedFornecedores.length})
                  </button>
                )}
              </div>

              {/* Lista de fornecedores */}
              <div className="border border-gray-200 rounded-lg max-h-[300px] overflow-y-auto">
                {filteredFornecedoresForDuplicate.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    {duplicateSearchTerm
                      ? 'Nenhum fornecedor encontrado com essa busca.'
                      : 'Nenhum fornecedor disponivel para duplicacao.'}
                  </div>
                ) : (
                  filteredFornecedoresForDuplicate.map((f) => {
                    const isSelected = selectedFornecedores.includes(f.id)
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleFornecedorSelection(f.id)}
                        className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                          isSelected ? 'bg-[#336FB6]/5' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#336FB6] border-[#336FB6]'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckIcon />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {f.nome_fantasia || f.nome}
                          </p>
                          {f.nome_fantasia && (
                            <p className="text-xs text-gray-500">{f.nome}</p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {selectedFornecedores.length} fornecedor(es) selecionado(s)
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setPoliticaToDuplicate(null)
                    setSelectedFornecedores([])
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={selectedFornecedores.length === 0 || duplicating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                >
                  {duplicating ? 'Duplicando...' : 'Duplicar Politica'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
