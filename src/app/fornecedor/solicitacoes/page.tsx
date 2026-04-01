'use client'

import { useState, useEffect } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'

interface Solicitacao {
  id: number
  empresa_id: number
  empresa_nome: string
  empresa_cnpj: string
  solicitante_nome: string
  solicitante_email: string
  mensagem: string | null
  status: 'pendente' | 'aceita' | 'rejeitada' | 'em_analise'
  created_at: string
  updated_at: string | null
}

type FilterTab = 'todas' | 'pendente' | 'aceita' | 'rejeitada'

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'aceita', label: 'Aceitas' },
  { key: 'rejeitada', label: 'Rejeitadas' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FornecedorSolicitacoesPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todas')
  const [processing, setProcessing] = useState<number | null>(null)

  const fetchSolicitacoes = async () => {
    try {
      const res = await fetch('/api/fornecedor/solicitacoes')
      if (res.ok) {
        const json = await res.json()
        setSolicitacoes(json.solicitacoes || [])
      }
    } catch (err) {
      console.error('Erro ao carregar solicitacoes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchSolicitacoes()
  }, [user])

  const handleAction = async (solId: number, action: 'aceitar' | 'rejeitar') => {
    if (action === 'rejeitar' && !confirm('Tem certeza que deseja rejeitar esta solicitacao?')) return
    setProcessing(solId)
    try {
      const res = await fetch('/api/fornecedor/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitacao_id: solId, action }),
      })
      if (res.ok) {
        fetchSolicitacoes()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao processar solicitacao')
      }
    } catch {
      alert('Erro de conexao')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = activeFilter === 'todas'
    ? solicitacoes
    : solicitacoes.filter(s => s.status === activeFilter)

  const pendingCount = solicitacoes.filter(s => s.status === 'pendente').length

  if (authLoading) {
    return (
      <FornecedorLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitacoes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie as solicitacoes de atendimento dos lojistas
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => {
            const count = tab.key === 'todas'
              ? solicitacoes.length
              : solicitacoes.filter(s => s.status === tab.key).length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-[#336FB6] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Solicitation List */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((sol) => (
              <div key={sol.id} className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{sol.empresa_nome}</p>
                      {sol.empresa_cnpj && (
                        <span className="text-xs text-gray-400 font-mono">
                          {sol.empresa_cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {sol.solicitante_nome}
                      {sol.solicitante_email && <span className="text-gray-400"> &middot; {sol.solicitante_email}</span>}
                    </p>
                    {sol.mensagem && (
                      <p className="text-sm text-gray-600 mt-2 italic bg-gray-50 rounded-lg px-3 py-2">
                        &ldquo;{sol.mensagem}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{formatDate(sol.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sol.status === 'pendente' ? (
                      <>
                        <button
                          onClick={() => handleAction(sol.id, 'aceitar')}
                          disabled={processing === sol.id}
                          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processing === sol.id ? 'Processando...' : 'Aceitar'}
                        </button>
                        <button
                          onClick={() => handleAction(sol.id, 'rejeitar')}
                          disabled={processing === sol.id}
                          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Rejeitar
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        sol.status === 'aceita'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sol.status === 'rejeitada'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sol.status === 'aceita' ? 'Aceita' : sol.status === 'rejeitada' ? 'Rejeitada' : 'Em analise'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              {activeFilter === 'todas' ? 'Nenhuma solicitacao recebida' : `Nenhuma solicitacao ${activeFilter === 'pendente' ? 'pendente' : activeFilter === 'aceita' ? 'aceita' : 'rejeitada'}`}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              As solicitacoes dos lojistas aparecerao aqui
            </p>
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
