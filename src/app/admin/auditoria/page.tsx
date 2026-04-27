'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

type Aba = 'bling' | 'eventos'
type Severity = 'info' | 'warn' | 'error' | 'critical'

interface Empresa { id: number; nome_fantasia: string | null; razao_social: string | null }

interface BlingJob {
  id: number
  empresa_id: number
  operacao: string
  payload: Record<string, unknown>
  origem: string | null
  origem_ref_id: number | null
  status: string
  tentativas: number
  max_tentativas: number
  proximo_em: string
  ultimo_erro: string | null
  ultimo_erro_codigo: string | null
  locked_em: string | null
  concluido_em: string | null
  created_at: string
  updated_at: string
  empresa: Empresa | null
}

interface EventoAudit {
  id: number
  severity: Severity
  evento: string
  empresa_id: number | null
  user_id: string | number | null
  contexto: Record<string, unknown>
  resolvido: boolean
  resolvido_em: string | null
  resolvido_nota: string | null
  created_at: string
  empresa: Empresa | null
}

interface RespBling {
  page: number; per_page: number; total: number; total_pages: number; jobs: BlingJob[]
}
interface RespAudit {
  page: number; per_page: number; total: number; total_pages: number; eventos: EventoAudit[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

const SEVERITY_COLOR: Record<Severity, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-100 text-red-800 border-red-300'
}

function nomeEmpresa(e: Empresa | null) {
  if (!e) return '—'
  return e.nome_fantasia || e.razao_social || `Empresa ${e.id}`
}

// ─── Modal de detalhes ───────────────────────────────────────────────────────

function ModalDetalhes({
  titulo,
  payload,
  onClose
}: {
  titulo: string
  payload: Record<string, unknown>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{titulo}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Aba: Erros do Bling ─────────────────────────────────────────────────────

function AbaBlingErros() {
  const [data, setData] = useState<RespBling | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState<'erro_terminal' | 'pendente' | 'todos'>('erro_terminal')
  const [busy, setBusy] = useState<number | null>(null)
  const [detalhes, setDetalhes] = useState<{ titulo: string; payload: Record<string, unknown> } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/admin/auditoria/bling-erros', window.location.origin)
      url.searchParams.set('status', filtroStatus)
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', '20')
      const r = await fetch(url.toString(), { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [page, filtroStatus])

  useEffect(() => { fetchData() }, [fetchData])

  const handleReprocessar = async (id: number) => {
    if (busy === id) return
    setBusy(id)
    try {
      const r = await fetch(`/api/admin/auditoria/bling-jobs/${id}/reprocessar`, { method: 'POST' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        alert(`Erro: ${j.error || r.status}`)
      } else {
        await fetchData()
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { v: 'erro_terminal' as const, label: 'Erro terminal' },
          { v: 'pendente' as const, label: 'Pendente (com falhas)' },
          { v: 'todos' as const, label: 'Todos' }
        ].map(opt => (
          <button
            key={opt.v}
            onClick={() => { setFiltroStatus(opt.v); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filtroStatus === opt.v
                ? 'bg-[#336FB6] text-white border-[#336FB6]'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">Erro: {error}</div>}
      {loading && !data && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">Carregando...</div>}

      {data && data.jobs.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-gray-900">Nenhum erro</p>
        </div>
      )}

      {data && data.jobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Quando</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Operação</th>
                  <th className="px-4 py-3 text-center">Tentativas</th>
                  <th className="px-4 py-3 text-left">Erro</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(job.updated_at)}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">{nomeEmpresa(job.empresa)}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{job.operacao}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100">
                        {job.tentativas}/{job.max_tentativas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-700 max-w-[280px] truncate text-xs">
                      {job.ultimo_erro_codigo && <span className="font-mono mr-2">[{job.ultimo_erro_codigo}]</span>}
                      {job.ultimo_erro || '—'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setDetalhes({ titulo: `Job #${job.id}`, payload: { ...job, payload: job.payload } })}
                        className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-100"
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => handleReprocessar(job.id)}
                        disabled={busy === job.id}
                        className="text-xs px-2 py-1 bg-[#336FB6] text-white rounded hover:bg-[#2660A5] disabled:opacity-50"
                      >
                        {busy === job.id ? '...' : 'Reprocessar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">Página {data.page} de {data.total_pages} · {data.total} no total</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page === 1} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Anterior</button>
            <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={data.page === data.total_pages} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Próxima</button>
          </div>
        </div>
      )}

      {detalhes && (
        <ModalDetalhes titulo={detalhes.titulo} payload={detalhes.payload} onClose={() => setDetalhes(null)} />
      )}
    </div>
  )
}

// ─── Aba: Eventos gerais ─────────────────────────────────────────────────────

function AbaEventos() {
  const [data, setData] = useState<RespAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filtroSeverity, setFiltroSeverity] = useState<Severity | 'todos'>('todos')
  const [filtroResolvido, setFiltroResolvido] = useState<'true' | 'false' | 'todos'>('false')
  const [filtroEvento, setFiltroEvento] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [detalhes, setDetalhes] = useState<{ titulo: string; payload: Record<string, unknown> } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/admin/auditoria', window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', '20')
      if (filtroSeverity !== 'todos') url.searchParams.set('severity', filtroSeverity)
      if (filtroResolvido !== 'todos') url.searchParams.set('resolvido', filtroResolvido)
      if (filtroEvento.trim()) url.searchParams.set('evento', filtroEvento.trim())
      const r = await fetch(url.toString(), { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [page, filtroSeverity, filtroResolvido, filtroEvento])

  useEffect(() => { fetchData() }, [fetchData])

  const handleResolver = async (id: number) => {
    if (busy === id) return
    setBusy(id)
    try {
      const r = await fetch(`/api/admin/auditoria/${id}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        alert(`Erro: ${j.error || r.status}`)
      } else {
        await fetchData()
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {(['todos', 'critical', 'error', 'warn', 'info'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFiltroSeverity(s); setPage(1) }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filtroSeverity === s
                  ? 'bg-[#336FB6] text-white border-[#336FB6]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'todos' ? 'Todos' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([
            { v: 'false' as const, label: 'Não resolvidos' },
            { v: 'true' as const, label: 'Resolvidos' },
            { v: 'todos' as const, label: 'Todos' }
          ]).map(opt => (
            <button
              key={opt.v}
              onClick={() => { setFiltroResolvido(opt.v); setPage(1) }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filtroResolvido === opt.v
                  ? 'bg-[#336FB6] text-white border-[#336FB6]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={filtroEvento}
          onChange={e => { setFiltroEvento(e.target.value); setPage(1) }}
          placeholder="Filtrar por evento..."
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-56"
        />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">Erro: {error}</div>}
      {loading && !data && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">Carregando...</div>}

      {data && data.eventos.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-gray-900">Nenhum evento</p>
        </div>
      )}

      {data && data.eventos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Quando</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.eventos.map(ev => (
                  <tr key={ev.id} className={`hover:bg-gray-50 ${ev.resolvido ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(ev.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${SEVERITY_COLOR[ev.severity]}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{ev.evento}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">{nomeEmpresa(ev.empresa)}</td>
                    <td className="px-4 py-3 text-center">
                      {ev.resolvido ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Resolvido</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">Aberto</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setDetalhes({ titulo: ev.evento, payload: { ...ev, contexto: ev.contexto } })}
                        className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-100"
                      >
                        Detalhes
                      </button>
                      {!ev.resolvido && (
                        <button
                          onClick={() => handleResolver(ev.id)}
                          disabled={busy === ev.id}
                          className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busy === ev.id ? '...' : 'Resolver'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">Página {data.page} de {data.total_pages} · {data.total} no total</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page === 1} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Anterior</button>
            <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={data.page === data.total_pages} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Próxima</button>
          </div>
        </div>
      )}

      {detalhes && (
        <ModalDetalhes titulo={detalhes.titulo} payload={detalhes.payload} onClose={() => setDetalhes(null)} />
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminAuditoriaPage() {
  const [aba, setAba] = useState<Aba>('bling')

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Auditoria</h1>
          <p className="text-sm text-gray-600 mt-1">
            Falhas operacionais do sistema, jobs do Bling e eventos críticos.
          </p>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1">
            {([
              { v: 'bling' as const, label: 'Erros do Bling' },
              { v: 'eventos' as const, label: 'Eventos gerais' }
            ]).map(opt => (
              <button
                key={opt.v}
                onClick={() => setAba(opt.v)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  aba === opt.v
                    ? 'border-[#336FB6] text-[#336FB6]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </nav>
        </div>

        {aba === 'bling' && <AbaBlingErros />}
        {aba === 'eventos' && <AbaEventos />}
      </div>
    </AdminLayout>
  )
}
