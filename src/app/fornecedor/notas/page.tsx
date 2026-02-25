'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { LojistaSelectorDropdown } from '@/components/fornecedor/LojistaSelectorDropdown'
import { Skeleton } from '@/components/ui'

interface NotaFiscal {
  id: number
  numero: string | null
  serie: string | null
  tipo: string | null
  situacao: string | null
  data_emissao: string | null
  data_operacao: string | null
  chave_acesso: string | null
}

const tipoFilters = [
  { value: '', label: 'Todos' },
  { value: 'E', label: 'Entrada' },
  { value: 'S', label: 'Saida' },
]

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export default function FornecedorNotasPage() {
  const { loading: authLoading } = useFornecedorAuth()
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [loading, setLoading] = useState(false)
  const [tipoFilter, setTipoFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchNotas = useCallback(async () => {
    if (!empresaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/fornecedor/notas?empresa_id=${empresaId}`)
      if (res.ok) {
        const data = await res.json()
        setNotas(data.notas || [])
      }
    } catch (err) {
      console.error('Erro ao carregar notas:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    fetchNotas()
  }, [fetchNotas])

  const notasFiltradas = notas.filter((n) => {
    if (tipoFilter && n.tipo !== tipoFilter) return false
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase()
      return (
        n.numero?.includes(search) ||
        n.chave_acesso?.includes(search)
      )
    }
    return true
  })

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notas Fiscais</h1>
            <p className="text-sm text-gray-500 mt-1">
              Notas fiscais vinculadas aos seus lojistas
            </p>
          </div>
          <LojistaSelectorDropdown
            onSelect={(sel) => setEmpresaId(sel?.empresaId ?? null)}
          />
        </div>

        {empresaId && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {tipoFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setTipoFilter(filter.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      tipoFilter === filter.value
                        ? 'bg-[#336FB6] text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-[#336FB6]/10 hover:text-[#336FB6] border border-gray-200 hover:border-[#336FB6]/30'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por numero ou chave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                />
              </div>
            </div>
          </>
        )}

        {/* Table */}
        {!empresaId ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Selecione um lojista para ver as notas fiscais.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : notasFiltradas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                      <th className="px-6 py-4">Numero</th>
                      <th className="px-6 py-4">Serie</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Situacao</th>
                      <th className="px-6 py-4">Data Emissao</th>
                      <th className="px-6 py-4">Chave de Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notasFiltradas.map((nota) => (
                      <tr key={nota.id} className="hover:bg-[#336FB6]/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{nota.numero || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{nota.serie || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            nota.tipo === 'E'
                              ? 'bg-emerald-100 text-emerald-700'
                              : nota.tipo === 'S'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {nota.tipo === 'E' ? 'Entrada' : nota.tipo === 'S' ? 'Saida' : nota.tipo || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{nota.situacao || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {nota.data_emissao
                            ? new Date(nota.data_emissao).toLocaleDateString('pt-BR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 font-mono max-w-[200px] truncate" title={nota.chave_acesso || ''}>
                          {nota.chave_acesso || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Nenhuma nota fiscal encontrada.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
