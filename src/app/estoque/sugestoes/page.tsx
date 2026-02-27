'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { TableSkeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { ConferenciaEstoque, ConferenciaStatus } from '@/types/conferencia-estoque'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function ClipboardCheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// Status badge config
const statusConfig: Record<ConferenciaStatus, { label: string; bg: string; text: string }> = {
  em_andamento: { label: 'Em Andamento', bg: 'bg-gray-100', text: 'text-gray-700' },
  enviada: { label: 'Pendente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  aceita: { label: 'Aceita', bg: 'bg-green-100', text: 'text-green-800' },
  rejeitada: { label: 'Rejeitada', bg: 'bg-red-100', text: 'text-red-800' },
  parcialmente_aceita: { label: 'Parcial', bg: 'bg-orange-100', text: 'text-orange-800' },
}

interface SugestaoComFornecedor extends ConferenciaEstoque {
  fornecedor_nome?: string
}

export default function SugestoesEstoquePage() {
  const router = useRouter()
  const { empresa } = useAuth()
  const [sugestoes, setSugestoes] = useState<SugestaoComFornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todas')

  useEffect(() => {
    if (!empresa?.id) return
    fetchSugestoes()
  }, [empresa?.id])

  const fetchSugestoes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/estoque/sugestoes')
      const data = await res.json()
      setSugestoes(data.sugestoes || [])
    } catch (error) {
      console.error('Erro ao buscar sugestoes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSugestoes = sugestoes.filter((s) => {
    const fornecedorNome = s.fornecedor_nome || ''
    const matchSearch = fornecedorNome.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todas' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const pendentes = sugestoes.filter((s) => s.status === 'enviada').length

  return (
    <RequirePermission permission="estoque">
    <DashboardLayout>
      <PageHeader title="Sugestoes de Estoque" subtitle="Conferencias recebidas de fornecedores" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Total de Sugestoes</p>
          <p className="text-2xl font-semibold text-gray-900">{sugestoes.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4">
          <p className="text-xs text-yellow-600 mb-1">Pendentes de Revisao</p>
          <p className="text-2xl font-semibold text-yellow-700">{pendentes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
          <p className="text-xs text-green-600 mb-1">Aceitas</p>
          <p className="text-2xl font-semibold text-green-700">
            {sugestoes.filter((s) => s.status === 'aceita' || s.status === 'parcialmente_aceita').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <p className="text-xs text-red-600 mb-1">Rejeitadas</p>
          <p className="text-2xl font-semibold text-red-700">
            {sugestoes.filter((s) => s.status === 'rejeitada').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] bg-white"
          >
            <option value="todas">Todos os status</option>
            <option value="enviada">Pendentes</option>
            <option value="aceita">Aceitas</option>
            <option value="parcialmente_aceita">Parcialmente Aceitas</option>
            <option value="rejeitada">Rejeitadas</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Fornecedor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Data Envio</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Itens</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Divergencias</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={6} rows={5} />
              ) : filteredSugestoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <ClipboardCheckIcon />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Nenhuma sugestao encontrada</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {search || statusFilter !== 'todas'
                            ? 'Tente ajustar os filtros'
                            : 'Quando fornecedores enviarem conferencias de estoque, elas aparecerao aqui'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSugestoes.map((sugestao) => {
                  const config = statusConfig[sugestao.status]
                  const isPendente = sugestao.status === 'enviada'
                  return (
                    <tr
                      key={sugestao.id}
                      className={`hover:bg-gray-50/50 transition-colors ${isPendente ? 'bg-yellow-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {sugestao.fornecedor_nome || '-'}
                          </p>
                          {sugestao.observacao_fornecedor && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                              {sugestao.observacao_fornecedor}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {sugestao.data_envio
                          ? new Date(sugestao.data_envio).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{sugestao.total_itens}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={sugestao.total_divergencias > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {sugestao.total_divergencias}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => router.push(`/estoque/sugestoes/${sugestao.id}`)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isPendente
                              ? 'bg-[#336FB6] text-white hover:bg-[#2660a5]'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <EyeIcon />
                          {isPendente ? 'Revisar' : 'Ver Detalhes'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
    </RequirePermission>
  )
}
