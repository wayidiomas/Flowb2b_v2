'use client'

import { useEffect, useState, useCallback } from 'react'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DetalheLojista {
  empresa_id: number
  empresa_nome: string
  status: 'sincronizado' | 'pendente'
  ultima_visualizacao_at: string | null
}

interface Publicacao {
  publicacao_at: string
  total_mudancas: number
  tipos: { novo: number; preco: number; dados: number; removido: number }
  lojistas: { total: number; sincronizados: number; visualizados: number; pendentes: number }
  detalhes: DetalheLojista[]
}

interface Resp {
  catalogo: { id: number; nome: string }
  publicacoes: Publicacao[]
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Hoje, ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  return d.toLocaleDateString('pt-BR')
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function PercentBar({ sincronizados, total }: { sincronizados: number; total: number }) {
  const pct = total > 0 ? Math.round((sincronizados / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 min-w-[3rem] text-right">
        {sincronizados}/{total}
      </span>
    </div>
  )
}

function PublicacaoCard({ pub }: { pub: Publicacao }) {
  const [expanded, setExpanded] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'sincronizados'>('todos')

  const detalhesFiltrados = pub.detalhes.filter(d => {
    if (filtro === 'todos') return true
    if (filtro === 'pendentes') return d.status === 'pendente'
    return d.status === 'sincronizado'
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 bg-[#336FB6]/10 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 8l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{formatRelativeDate(pub.publicacao_at)}</p>
            <span className="text-xs text-gray-500">{formatDateTime(pub.publicacao_at)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-sm text-gray-600">
              <strong className="font-semibold text-gray-900">{pub.total_mudancas}</strong>{' '}
              mudança{pub.total_mudancas !== 1 ? 's' : ''}
            </span>
            {pub.tipos.novo > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{pub.tipos.novo} novo{pub.tipos.novo !== 1 ? 's' : ''}</span>}
            {pub.tipos.preco > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{pub.tipos.preco} preço{pub.tipos.preco !== 1 ? 's' : ''}</span>}
            {pub.tipos.dados > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{pub.tipos.dados} dados</span>}
            {pub.tipos.removido > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{pub.tipos.removido} removido{pub.tipos.removido !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex-shrink-0 w-48">
          <PercentBar sincronizados={pub.lojistas.sincronizados} total={pub.lojistas.total} />
          <p className="text-xs text-gray-500 text-right mt-1">{pub.lojistas.pendentes} pendente{pub.lojistas.pendentes !== 1 ? 's' : ''}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalhes */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Filtros */}
          <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Filtrar:</span>
            {[
              { v: 'todos' as const, label: `Todos (${pub.detalhes.length})` },
              { v: 'pendentes' as const, label: `Pendentes (${pub.lojistas.pendentes})` },
              { v: 'sincronizados' as const, label: `Sincronizados (${pub.lojistas.sincronizados})` }
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => setFiltro(opt.v)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  filtro === opt.v
                    ? 'bg-[#336FB6] text-white border-[#336FB6]'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Lista de lojistas */}
          {detalhesFiltrados.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Nenhum lojista neste filtro.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {detalhesFiltrados.map(d => (
                <li key={d.empresa_id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'sincronizado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <p className="flex-1 text-sm text-gray-900 truncate">{d.empresa_nome}</p>
                  {d.status === 'sincronizado' ? (
                    <span className="text-xs text-emerald-700 font-medium">Sincronizado</span>
                  ) : d.ultima_visualizacao_at ? (
                    <span className="text-xs text-amber-700">Visualizou em {formatDateTime(d.ultima_visualizacao_at)}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Não visualizou</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FornecedorAtualizacoesPage() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/fornecedor/catalogo/atualizacoes', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <FornecedorLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Atualizações publicadas</h1>
        <p className="text-sm text-gray-600 mt-1">
          Acompanhe quais lojistas já sincronizaram suas mudanças do catálogo.
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
          Carregando...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Erro ao carregar: {error}
        </div>
      )}

      {data && data.publicacoes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <p className="font-medium text-gray-900 mb-1">Nenhuma atualização publicada</p>
          <p className="text-sm text-gray-500">Quando você atualizar o catálogo, as estatísticas aparecem aqui.</p>
        </div>
      )}

      {data && data.publicacoes.length > 0 && (
        <div className="space-y-3">
          {data.publicacoes.map(p => (
            <PublicacaoCard key={p.publicacao_at} pub={p} />
          ))}
        </div>
      )}
    </FornecedorLayout>
  )
}
