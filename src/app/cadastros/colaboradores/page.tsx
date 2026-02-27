'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { TableSkeleton } from '@/components/ui'
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

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

interface ColaboradorListItem {
  id: string
  nome: string | null
  email: string
  telefone?: string | null
  role: string | null
  ativo: boolean | null
  created_at: string
}

export default function ColaboradoresPage() {
  const { user, empresa } = useAuth()
  const [colaboradores, setColaboradores] = useState<ColaboradorListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [cargoFilter, setCargoFilter] = useState<'todos' | 'admin' | 'user' | 'viewer'>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')
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

  const fetchColaboradores = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const empresaId = empresa?.id || user?.empresa_id

      if (empresaId) {
        // Buscar usuarios vinculados a empresa atraves de users_empresas
        const { data: usersEmpresas, error: ueError } = await supabase
          .from('users_empresas')
          .select('user_id, role, ativo')
          .eq('empresa_id', empresaId)

        if (ueError) {
          console.error('Erro ao buscar users_empresas:', ueError)
        }

        if (usersEmpresas && usersEmpresas.length > 0) {
          const userIds = usersEmpresas.map(ue => ue.user_id)

          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, nome, email, role, ativo, created_at')
            .in('id', userIds)

          if (usersError) {
            console.error('Erro ao buscar users:', usersError)
          } else if (users) {
            // Combinar dados de users com users_empresas
            const colaboradoresData = users.map(u => {
              const ue = usersEmpresas.find(ue => ue.user_id === u.id)
              return {
                ...u,
                role: ue?.role || u.role,
                ativo: ue?.ativo ?? u.ativo
              }
            })
            setColaboradores(colaboradoresData)
          }
        } else {
          // Fallback: buscar usuarios diretamente vinculados a empresa
          const { data, error } = await supabase
            .from('users')
            .select('id, nome, email, role, ativo, created_at')
            .eq('empresa', empresaId)
            .order('nome')

          if (error) {
            console.error('Erro ao buscar colaboradores:', error)
          } else if (data) {
            setColaboradores(data)
          }
        }
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchColaboradores()
  }, [user?.id, user?.empresa_id, empresa?.id])

  // Filtrar colaboradores
  const filteredColaboradores = colaboradores.filter((col) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      col.nome?.toLowerCase().includes(searchLower) ||
      col.email?.toLowerCase().includes(searchLower)

    // Filtro por cargo
    const matchesCargo = cargoFilter === 'todos' || col.role === cargoFilter

    // Filtro por status
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'ativo' && col.ativo !== false) ||
      (statusFilter === 'inativo' && col.ativo === false)

    return matchesSearch && matchesCargo && matchesStatus
  })

  // Verificar se ha filtros ativos
  const hasActiveFilters = cargoFilter !== 'todos' || statusFilter !== 'todos'

  // Limpar filtros
  const clearFilters = () => {
    setCargoFilter('todos')
    setStatusFilter('todos')
    setShowFilterDropdown(false)
    setCurrentPage(1)
  }

  // Paginacao
  const totalPages = Math.ceil(filteredColaboradores.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedColaboradores = filteredColaboradores.slice(startIndex, startIndex + itemsPerPage)

  // Selecao
  const handleSelectAll = () => {
    if (selectedColaboradores.length === paginatedColaboradores.length) {
      setSelectedColaboradores([])
    } else {
      setSelectedColaboradores(paginatedColaboradores.map((c) => c.id))
    }
  }

  const handleSelectColaborador = (id: string) => {
    setSelectedColaboradores((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    )
  }

  // Acoes em massa
  const handleAtivar = async () => {
    if (selectedColaboradores.length === 0) return
    setActionLoading(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Atualizar em users_empresas
      const { error } = await supabase
        .from('users_empresas')
        .update({ ativo: true })
        .eq('empresa_id', empresaId)
        .in('user_id', selectedColaboradores)

      if (error) throw error
      await fetchColaboradores()
      setSelectedColaboradores([])
    } catch (err) {
      console.error('Erro ao ativar colaboradores:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDesativar = async () => {
    if (selectedColaboradores.length === 0) return
    setActionLoading(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      const { error } = await supabase
        .from('users_empresas')
        .update({ ativo: false })
        .eq('empresa_id', empresaId)
        .in('user_id', selectedColaboradores)

      if (error) throw error
      await fetchColaboradores()
      setSelectedColaboradores([])
    } catch (err) {
      console.error('Erro ao desativar colaboradores:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExcluir = async () => {
    if (selectedColaboradores.length === 0) return
    if (!confirm(`Deseja realmente remover ${selectedColaboradores.length} colaborador(es) desta empresa?`)) return

    setActionLoading(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Remover vinculo em users_empresas
      const { error } = await supabase
        .from('users_empresas')
        .delete()
        .eq('empresa_id', empresaId)
        .in('user_id', selectedColaboradores)

      if (error) throw error
      await fetchColaboradores()
      setSelectedColaboradores([])
    } catch (err) {
      console.error('Erro ao remover colaboradores:', err)
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

  // Formatar cargo
  const formatCargo = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'user':
        return 'Usuario'
      case 'viewer':
        return 'Visualizador'
      default:
        return role || 'Usuario'
    }
  }



  return (
    <RequirePermission permission="cadastros">
    <DashboardLayout>
      {/* Page Header com seletor de empresa */}
      <PageHeader
        title="Colaboradores"
        subtitle={`${filteredColaboradores.length} colaboradores`}
      />

      {/* Card Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Lista de Colaboradores</h2>
              <p className="text-sm text-gray-500">
                Gerencie os colaboradores vinculados a sua empresa
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Botao de Filtros com Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-[#FFBE4A] hover:bg-[#E5AB42] rounded-lg transition-colors"
                >
                  <FilterIcon />
                  Filtros
                  {hasActiveFilters && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#336FB6] text-xs text-white">
                      {(cargoFilter !== 'todos' ? 1 : 0) + (statusFilter !== 'todos' ? 1 : 0)}
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

                      {/* Filtro por Cargo */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cargo
                        </label>
                        <select
                          value={cargoFilter}
                          onChange={(e) => {
                            setCargoFilter(e.target.value as 'todos' | 'admin' | 'user' | 'viewer')
                            setCurrentPage(1)
                          }}
                          className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="todos">Todos</option>
                          <option value="admin">Administrador</option>
                          <option value="user">Usuario</option>
                          <option value="viewer">Visualizador</option>
                        </select>
                      </div>

                      {/* Filtro por Status */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value as 'todos' | 'ativo' | 'inativo')
                            setCurrentPage(1)
                          }}
                          className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="todos">Todos</option>
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                        </select>
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
                href="/cadastros/colaboradores/nova"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
              >
                <PlusIcon />
                Novo colaborador
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
            {selectedColaboradores.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedColaboradores.length} item(ns) selecionado(s)
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
                  Remover
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
                    checked={paginatedColaboradores.length > 0 && selectedColaboradores.length === paginatedColaboradores.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome do colaborador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
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
                <TableSkeleton columns={5} rows={5} showCheckbox showActions />
              ) : paginatedColaboradores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || hasActiveFilters ? (
                      <div>
                        <p>Nenhum colaborador encontrado para os filtros aplicados.</p>
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
                        <p>Nenhum colaborador cadastrado.</p>
                        <Link
                          href="/cadastros/colaboradores/nova"
                          className="mt-2 inline-block text-sm text-[#336FB6] hover:underline"
                        >
                          Adicionar primeiro colaborador
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedColaboradores.map((col) => (
                  <tr key={col.id} className={`hover:bg-gray-50 ${selectedColaboradores.includes(col.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedColaboradores.includes(col.id)}
                        onChange={() => handleSelectColaborador(col.id)}
                        className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {col.nome || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {col.email || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {col.telefone || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatCargo(col.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        col.ativo === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {col.ativo === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/cadastros/colaboradores/${col.id}/editar`}
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
        {!loading && filteredColaboradores.length > 0 && (
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
    </RequirePermission>
  )
}
