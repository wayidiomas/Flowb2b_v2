'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface UserFornecedor {
  id: number
  email: string
  nome: string | null
  ativo: boolean
}

interface UserRepresentante {
  id: number
  email: string
  nome: string | null
  ativo: boolean
}

interface Representante {
  id: number
  nome: string | null
  ativo: boolean
  codigo_acesso: string | null
  user_representante: UserRepresentante | null
}

interface FornecedorNode {
  id: number
  nome: string
  cnpj: string | null
  produtos_count: number
  pedidos_count: number
  user_fornecedor: UserFornecedor | null
  representantes: Representante[]
}

interface RelacaoData {
  empresa: {
    id: number
    nome: string
    cnpj: string | null
  }
  fornecedores: FornecedorNode[]
}

interface EmpresaOption {
  id: number
  nome_fantasia: string | null
  razao_social: string | null
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return '-'
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

function StatusDot({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        ativo ? 'bg-emerald-500' : 'bg-gray-400'
      }`}
      title={ativo ? 'Ativo' : 'Inativo'}
    />
  )
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
        ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {ativo ? 'ativo' : 'inativo'}
    </span>
  )
}

function NotRegistered() {
  return (
    <span className="text-xs text-gray-400 italic">nao cadastrado</span>
  )
}

function NoneFound() {
  return (
    <span className="text-xs text-gray-400 italic">nenhum</span>
  )
}

function FornecedorTreeNode({
  fornecedor,
  isLast,
  expanded,
  onToggle,
}: {
  fornecedor: FornecedorNode
  isLast: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const hasChildren = fornecedor.user_fornecedor !== null || fornecedor.representantes.length > 0

  // Build child items for rendering
  const childItems: Array<{
    key: string
    type: 'user' | 'representante' | 'no_user' | 'no_rep'
    data?: UserFornecedor | Representante
    isLastChild: boolean
  }> = []

  // User fornecedor node
  if (fornecedor.user_fornecedor) {
    childItems.push({
      key: `user-${fornecedor.user_fornecedor.id}`,
      type: 'user',
      data: fornecedor.user_fornecedor,
      isLastChild: false, // will be set below
    })
  } else {
    childItems.push({
      key: 'no-user',
      type: 'no_user',
      isLastChild: false,
    })
  }

  // Representantes
  if (fornecedor.representantes.length > 0) {
    for (const rep of fornecedor.representantes) {
      childItems.push({
        key: `rep-${rep.id}`,
        type: 'representante',
        data: rep,
        isLastChild: false,
      })
    }
  } else {
    childItems.push({
      key: 'no-rep',
      type: 'no_rep',
      isLastChild: false,
    })
  }

  // Mark last child
  if (childItems.length > 0) {
    childItems[childItems.length - 1].isLastChild = true
  }

  return (
    <div className="relative">
      {/* Fornecedor line */}
      <div className="flex items-start gap-0">
        {/* Connector */}
        <div className="flex-shrink-0 w-6 relative">
          <div className={`absolute top-0 left-3 w-px bg-gray-300 ${isLast ? 'h-3' : 'h-full'}`} />
          <div className="absolute top-3 left-3 w-3 h-px bg-gray-300" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 py-1.5 px-2 -ml-1 rounded hover:bg-gray-50 transition-colors w-full text-left group"
          >
            {/* Expand icon */}
            <svg
              className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>

            {/* Fornecedor icon */}
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75" />
              </svg>
            </div>

            {/* Fornecedor info */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate block">
                {fornecedor.nome}
              </span>
            </div>

            {/* CNPJ */}
            <span className="text-xs text-gray-500 font-mono flex-shrink-0 hidden sm:inline">
              {formatCnpj(fornecedor.cnpj)}
            </span>

            {/* Counts */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4" />
                </svg>
                {fornecedor.produtos_count}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08" />
                </svg>
                {fornecedor.pedidos_count}
              </span>
            </div>
          </button>

          {/* Children */}
          {expanded && (
            <div className="ml-4 mt-0.5">
              {childItems.map((child) => {
                if (child.type === 'user' && child.data) {
                  const user = child.data as UserFornecedor
                  return (
                    <div key={child.key} className="relative flex items-center gap-0 py-0.5">
                      {/* Connector */}
                      <div className="flex-shrink-0 w-6 relative">
                        <div className={`absolute top-0 left-3 w-px bg-gray-200 ${child.isLastChild ? 'h-3' : 'h-full'}`} />
                        <div className="absolute top-3 left-3 w-3 h-px bg-gray-200" />
                      </div>
                      {/* Content */}
                      <div className="flex items-center gap-2 py-1 px-2">
                        <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500">User:</span>
                        <span className="text-sm text-gray-900">{user.email}</span>
                        <StatusDot ativo={user.ativo} />
                        <StatusBadge ativo={user.ativo} />
                      </div>
                    </div>
                  )
                }

                if (child.type === 'no_user') {
                  return (
                    <div key={child.key} className="relative flex items-center gap-0 py-0.5">
                      <div className="flex-shrink-0 w-6 relative">
                        <div className={`absolute top-0 left-3 w-px bg-gray-200 ${child.isLastChild ? 'h-3' : 'h-full'}`} />
                        <div className="absolute top-3 left-3 w-3 h-px bg-gray-200" />
                      </div>
                      <div className="flex items-center gap-2 py-1 px-2">
                        <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500">User:</span>
                        <NotRegistered />
                      </div>
                    </div>
                  )
                }

                if (child.type === 'representante' && child.data) {
                  const rep = child.data as Representante
                  return (
                    <div key={child.key} className="relative">
                      <div className="flex items-center gap-0 py-0.5">
                        {/* Connector */}
                        <div className="flex-shrink-0 w-6 relative">
                          <div className={`absolute top-0 left-3 w-px bg-gray-200 ${child.isLastChild ? 'h-3' : 'h-full'}`} />
                          <div className="absolute top-3 left-3 w-3 h-px bg-gray-200" />
                        </div>
                        {/* Content */}
                        <div className="flex items-center gap-2 py-1 px-2">
                          <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-500">Representante:</span>
                          <span className="text-sm text-gray-900">{rep.nome || `#${rep.id}`}</span>
                          {rep.codigo_acesso && (
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
                              {rep.codigo_acesso}
                            </span>
                          )}
                          <StatusDot ativo={rep.ativo} />
                          <StatusBadge ativo={rep.ativo} />
                        </div>
                      </div>

                      {/* User Representante (child of representante) */}
                      <div className="ml-6 relative flex items-center gap-0 py-0.5">
                        <div className="flex-shrink-0 w-6 relative">
                          <div className="absolute top-0 left-3 w-px bg-gray-200 h-3" />
                          <div className="absolute top-3 left-3 w-3 h-px bg-gray-200" />
                        </div>
                        <div className="flex items-center gap-2 py-1 px-2">
                          {rep.user_representante ? (
                            <>
                              <div className="w-5 h-5 bg-teal-100 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                </svg>
                              </div>
                              <span className="text-xs text-gray-500">User:</span>
                              <span className="text-sm text-gray-900">
                                {rep.user_representante.email}
                              </span>
                              <StatusDot ativo={rep.user_representante.ativo} />
                              <StatusBadge ativo={rep.user_representante.ativo} />
                            </>
                          ) : (
                            <>
                              <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                </svg>
                              </div>
                              <span className="text-xs text-gray-500">User:</span>
                              <NotRegistered />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                if (child.type === 'no_rep') {
                  return (
                    <div key={child.key} className="relative flex items-center gap-0 py-0.5">
                      <div className="flex-shrink-0 w-6 relative">
                        <div className="absolute top-0 left-3 w-px bg-gray-200 h-3" />
                        <div className="absolute top-3 left-3 w-3 h-px bg-gray-200" />
                      </div>
                      <div className="flex items-center gap-2 py-1 px-2">
                        <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500">Representante:</span>
                        <NoneFound />
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RelacoesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const empresaIdFromUrl = searchParams.get('empresa_id')

  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(
    empresaIdFromUrl ? Number(empresaIdFromUrl) : null
  )
  const [relacaoData, setRelacaoData] = useState<RelacaoData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedFornecedores, setExpandedFornecedores] = useState<Set<number>>(new Set())

  // Fetch empresas for dropdown
  useEffect(() => {
    async function fetchEmpresas() {
      setLoadingEmpresas(true)
      try {
        const res = await fetch('/api/admin/empresas')
        if (!res.ok) throw new Error('Erro ao buscar empresas')
        const json = await res.json()
        const list = (json.data || []).map((e: { id: number; nome_fantasia: string | null; razao_social: string | null }) => ({
          id: e.id,
          nome_fantasia: e.nome_fantasia,
          razao_social: e.razao_social,
        }))
        setEmpresas(list)
      } catch {
        // Silently handle - the dropdown will be empty
      } finally {
        setLoadingEmpresas(false)
      }
    }
    fetchEmpresas()
  }, [])

  // Fetch relacoes when empresa is selected
  const fetchRelacoes = useCallback(async (empresaId: number) => {
    setLoading(true)
    setError(null)
    setRelacaoData(null)
    setExpandedFornecedores(new Set())
    try {
      const res = await fetch(`/api/admin/relacoes?empresa_id=${empresaId}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Erro ao buscar relacoes')
      }
      const json: RelacaoData = await res.json()
      setRelacaoData(json)
      // Auto-expand all fornecedores if there are few
      if (json.fornecedores.length <= 10) {
        setExpandedFornecedores(new Set(json.fornecedores.map(f => f.id)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEmpresaId) {
      fetchRelacoes(selectedEmpresaId)
    }
  }, [selectedEmpresaId, fetchRelacoes])

  const handleEmpresaChange = (empresaId: number | null) => {
    setSelectedEmpresaId(empresaId)
    if (empresaId) {
      router.replace(`/admin/relacoes?empresa_id=${empresaId}`, { scroll: false })
    } else {
      router.replace('/admin/relacoes', { scroll: false })
      setRelacaoData(null)
    }
  }

  const toggleFornecedor = (fornecedorId: number) => {
    setExpandedFornecedores(prev => {
      const next = new Set(prev)
      if (next.has(fornecedorId)) {
        next.delete(fornecedorId)
      } else {
        next.add(fornecedorId)
      }
      return next
    })
  }

  const expandAll = () => {
    if (relacaoData) {
      setExpandedFornecedores(new Set(relacaoData.fornecedores.map(f => f.id)))
    }
  }

  const collapseAll = () => {
    setExpandedFornecedores(new Set())
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa de Relacoes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualize a arvore de relacoes entre empresa, fornecedores, representantes e usuarios
          </p>
        </div>

        {/* Empresa selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label htmlFor="empresa-select" className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a Empresa
          </label>
          <select
            id="empresa-select"
            value={selectedEmpresaId ?? ''}
            onChange={(e) => handleEmpresaChange(e.target.value ? Number(e.target.value) : null)}
            disabled={loadingEmpresas}
            className="block w-full sm:w-96 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:bg-gray-100"
          >
            <option value="">
              {loadingEmpresas ? 'Carregando empresas...' : '-- Selecione uma empresa --'}
            </option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome_fantasia || e.razao_social || `Empresa #${e.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        )}

        {/* No selection */}
        {!selectedEmpresaId && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Selecione uma empresa</h3>
            <p className="mt-1 text-sm text-gray-500">
              Escolha uma empresa acima para visualizar o mapa de relacoes.
            </p>
          </div>
        )}

        {/* Tree View */}
        {relacaoData && !loading && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Tree header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {relacaoData.empresa.nome}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    {formatCnpj(relacaoData.empresa.cnpj)}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {relacaoData.fornecedores.length} fornecedor{relacaoData.fornecedores.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Expandir todos
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Recolher todos
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-sm" />
                </div>
                Fornecedor
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-sm" />
                </div>
                User Fornecedor
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-orange-100 rounded flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-sm" />
                </div>
                Representante
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-teal-100 rounded flex items-center justify-center">
                  <div className="w-2 h-2 bg-teal-500 rounded-sm" />
                </div>
                User Representante
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Ativo
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                Inativo
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 italic">italico</span>
                = nao cadastrado
              </div>
            </div>

            {/* Tree */}
            <div className="p-4">
              {relacaoData.fornecedores.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Nenhum fornecedor vinculado a esta empresa.
                </div>
              ) : (
                <div className="space-y-0">
                  {relacaoData.fornecedores.map((fornecedor, index) => (
                    <FornecedorTreeNode
                      key={fornecedor.id}
                      fornecedor={fornecedor}
                      isLast={index === relacaoData.fornecedores.length - 1}
                      expanded={expandedFornecedores.has(fornecedor.id)}
                      onToggle={() => toggleFornecedor(fornecedor.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default function RelacoesPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </AdminLayout>
    }>
      <RelacoesContent />
    </Suspense>
  )
}
