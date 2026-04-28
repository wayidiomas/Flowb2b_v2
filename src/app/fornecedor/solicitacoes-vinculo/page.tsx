'use client'

import { useEffect, useState } from 'react'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'

interface SolicitacaoItem {
  id: number
  lojista_nome: string | null
  lojista_email: string | null
  lojista_telefone: string | null
  empresa_id: number
  empresa_razao: string | null
  empresa_nome_fantasia: string | null
  empresa_cnpj: string | null
  status: string
  created_at: string
  responded_at: string | null
}

export default function SolicitacoesVinculoPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'pendente' | 'aceita' | 'rejeitada' | 'todas'>('pendente')
  const [actioningId, setActioningId] = useState<number | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/fornecedor/solicitacoes-vinculo')
      if (res.ok) {
        const data = await res.json()
        setSolicitacoes(data.solicitacoes || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAcao = async (id: number, acao: 'aceitar' | 'rejeitar') => {
    setActioningId(id)
    try {
      const res = await fetch(`/api/fornecedor/solicitacoes-vinculo/${id}/${acao}`, {
        method: 'POST',
      })
      if (res.ok) {
        await load()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro')
      }
    } finally {
      setActioningId(null)
    }
  }

  const filtradas = solicitacoes.filter(s => filtro === 'todas' || s.status === filtro)
  const counts = {
    pendente: solicitacoes.filter(s => s.status === 'pendente').length,
    aceita: solicitacoes.filter(s => s.status === 'aceita').length,
    rejeitada: solicitacoes.filter(s => s.status === 'rejeitada').length,
    todas: solicitacoes.length,
  }

  return (
    <FornecedorLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
            Rede de lojistas
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            Solicitacoes de vinculo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lojistas que solicitaram virar seus clientes pela landing page
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {(['pendente', 'aceita', 'rejeitada', 'todas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                filtro === f
                  ? 'border-[#336FB6] text-[#336FB6] font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-32" />
        ) : filtradas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center">
            <p className="text-sm text-gray-500">
              {filtro === 'pendente' ? 'Nenhuma solicitacao pendente' : 'Nada por aqui'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map(s => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-gray-900">
                      {s.empresa_nome_fantasia || s.empresa_razao || s.lojista_nome}
                    </h3>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      s.status === 'pendente'
                        ? 'bg-amber-50 text-amber-700'
                        : s.status === 'aceita'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  {s.empresa_cnpj && (
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{s.empresa_cnpj}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span>{s.lojista_nome}</span>
                    {s.lojista_email && <span>· {s.lojista_email}</span>}
                    {s.lojista_telefone && <span>· {s.lojista_telefone}</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Solicitado em {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {s.status === 'pendente' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAcao(s.id, 'rejeitar')}
                      disabled={actioningId === s.id}
                      className="px-4 py-2 text-sm rounded-full border border-gray-300 hover:border-gray-400 text-gray-700 transition-all disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => handleAcao(s.id, 'aceitar')}
                      disabled={actioningId === s.id}
                      className="px-4 py-2 text-sm rounded-full bg-[#336FB6] hover:bg-[#2660A5] text-white transition-all disabled:opacity-50"
                    >
                      Aceitar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
