'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function BanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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

interface EmpresaListItem {
  id: number
  razao_social: string
  nome_fantasia: string | null
  endereco_resumido: string | null
  numero_colaboradores: number | null
  ativo: boolean | null
  unidade: string | null
}

export default function MinhasEmpresasPage() {
  const router = useRouter()
  const { user, empresa } = useAuth()
  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmpresas, setSelectedEmpresas] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState(false)
  const itemsPerPage = 10

  const fetchEmpresas = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // O usuario tem empresa_id diretamente na tabela users
      // Buscar a empresa vinculada ao usuario
      const empresaId = empresa?.id || user?.empresa_id

      if (empresaId) {
        // Buscar a empresa do usuario
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razao_social, nome_fantasia, endereco_resumido, numero_colaboradores, ativo, unidade')
          .eq('id', empresaId)

        if (error) {
          console.error('Erro ao buscar empresa:', error)
        } else if (data) {
          setEmpresas(data)
        }
      } else {
        // Fallback: buscar todas as empresas disponiveis
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razao_social, nome_fantasia, endereco_resumido, numero_colaboradores, ativo, unidade')
          .order('razao_social')

        if (error) {
          console.error('Erro ao buscar empresas:', error)
        } else if (data) {
          setEmpresas(data)
        }
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [user?.id, user?.empresa_id, empresa?.id])

  // Filtrar empresas por termo de busca
  const filteredEmpresas = empresas.filter((emp) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.razao_social?.toLowerCase().includes(searchLower) ||
      emp.nome_fantasia?.toLowerCase().includes(searchLower) ||
      emp.endereco_resumido?.toLowerCase().includes(searchLower)
    )
  })

  // Paginacao
  const totalPages = Math.ceil(filteredEmpresas.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEmpresas = filteredEmpresas.slice(startIndex, startIndex + itemsPerPage)

  // Selecao
  const handleSelectAll = () => {
    if (selectedEmpresas.length === paginatedEmpresas.length) {
      setSelectedEmpresas([])
    } else {
      setSelectedEmpresas(paginatedEmpresas.map((e) => e.id))
    }
  }

  const handleSelectEmpresa = (id: number) => {
    setSelectedEmpresas((prev) =>
      prev.includes(id) ? prev.filter((eId) => eId !== id) : [...prev, id]
    )
  }

  // Acoes em massa
  const handleAtivar = async () => {
    if (selectedEmpresas.length === 0) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo: true })
        .in('id', selectedEmpresas)

      if (error) throw error
      await fetchEmpresas()
      setSelectedEmpresas([])
    } catch (err) {
      console.error('Erro ao ativar empresas:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDesativar = async () => {
    if (selectedEmpresas.length === 0) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo: false })
        .in('id', selectedEmpresas)

      if (error) throw error
      await fetchEmpresas()
      setSelectedEmpresas([])
    } catch (err) {
      console.error('Erro ao desativar empresas:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExcluir = async () => {
    if (selectedEmpresas.length === 0) return
    if (!confirm(`Deseja realmente excluir ${selectedEmpresas.length} empresa(s)?`)) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .in('id', selectedEmpresas)

      if (error) throw error
      await fetchEmpresas()
      setSelectedEmpresas([])
    } catch (err) {
      console.error('Erro ao excluir empresas:', err)
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

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Minhas Empresas</h1>
        <p className="text-sm text-gray-500">{filteredEmpresas.length} empresas</p>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Empresas</h2>
              <p className="text-sm text-gray-500">
                Aqui voce gerencia ua empresas e filiais para que possa gerenciar todas de forma otimizada
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-[#FFBE4A] hover:bg-[#E5AB42] rounded-lg transition-colors">
                <FilterIcon />
                Filtros
              </button>
              <Link
                href="/cadastros/empresas/nova"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
              >
                <PlusIcon />
                Nova empresa
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Action Buttons */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Pesquisar por nome, e-mail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="block w-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Selection counter and action buttons */}
            {selectedEmpresas.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedEmpresas.length} item(ns) selecionado(s)
                </span>
                <button
                  onClick={handleAtivar}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckIcon />
                  Ativar
                </button>
                <button
                  onClick={handleDesativar}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                >
                  <BanIcon />
                  Desativar
                </button>
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
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={paginatedEmpresas.length > 0 && selectedEmpresas.length === paginatedEmpresas.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome da empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome Fantasia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endereco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colaboradores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="sr-only">Acoes</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Carregando empresas...
                    </div>
                  </td>
                </tr>
              ) : paginatedEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'Nenhuma empresa encontrada para a busca.' : 'Nenhuma empresa cadastrada.'}
                  </td>
                </tr>
              ) : (
                paginatedEmpresas.map((emp) => (
                  <tr key={emp.id} className={`hover:bg-gray-50 ${selectedEmpresas.includes(emp.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEmpresas.includes(emp.id)}
                        onChange={() => handleSelectEmpresa(emp.id)}
                        className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {emp.razao_social || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {emp.nome_fantasia || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {emp.endereco_resumido || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.unidade === 'Filiais' || emp.unidade === 'Filial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {emp.unidade || 'Matriz'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {emp.numero_colaboradores ?? '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.ativo === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {emp.ativo === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/cadastros/empresas/${emp.id}/editar`}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
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
        {!loading && filteredEmpresas.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-[#336FB6] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
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
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
