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

interface DivergenciasPreview {
  catalogo_id: number
  fornecedor_nome: string
  total_divergencias: number
  lojistas_afetados: number
  ja_pendentes: number
  novas: number
}

interface RepublicarResult {
  success: boolean
  criadas: number
  ja_pendentes: number
  lojistas_notificados: number
  message: string
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

  // Divergências catálogo × cadastro lojistas (republicar estado atual)
  const [preview, setPreview] = useState<DivergenciasPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [republishConfirmOpen, setRepublishConfirmOpen] = useState(false)
  const [republishing, setRepublishing] = useState(false)
  const [republishResult, setRepublishResult] = useState<RepublicarResult | null>(null)

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

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const r = await fetch('/api/fornecedor/catalogo/divergencias-preview', { cache: 'no-store' })
      if (r.ok) setPreview(await r.json())
    } catch {
      // silencioso
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const handleRepublish = async () => {
    setRepublishing(true)
    setRepublishResult(null)
    try {
      const r = await fetch('/api/fornecedor/catalogo/republicar-estado-atual', { method: 'POST' })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
      setRepublishResult(json)
      // Atualiza dados após sucesso
      await Promise.all([fetchData(), fetchPreview()])
    } catch (err) {
      setRepublishResult({
        success: false,
        criadas: 0,
        ja_pendentes: 0,
        lojistas_notificados: 0,
        message: err instanceof Error ? err.message : 'erro desconhecido'
      })
    } finally {
      setRepublishing(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchPreview()
  }, [fetchData, fetchPreview])

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

      {/* Card "Publicar catálogo atual" — aparece só quando há divergências novas */}
      {!previewLoading && preview && preview.novas > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">Lojistas com preços diferentes do seu catálogo</h3>
              <p className="text-sm text-gray-700 mb-3">
                Detectei <strong className="font-semibold">{preview.novas}</strong>{' '}
                {preview.novas === 1 ? 'item com preço divergente' : 'itens com preços divergentes'} entre o seu catálogo e o cadastro
                {preview.lojistas_afetados === 1 ? ' do lojista' : ` dos ${preview.lojistas_afetados} lojistas`} vinculado{preview.lojistas_afetados !== 1 ? 's' : ''}.
                {preview.ja_pendentes > 0 && (
                  <> ({preview.ja_pendentes} já têm aviso pendente — não serão duplicados.)</>
                )}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Se o seu catálogo está atualizado, clique em <strong>Publicar</strong> para avisar os lojistas.
                Eles verão a notificação e, ao tentarem criar um pedido, serão obrigados a sincronizar com seus preços atuais.
              </p>
              <button
                onClick={() => setRepublishConfirmOpen(true)}
                disabled={republishing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {republishing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Publicando...
                  </>
                ) : (
                  <>Publicar catálogo atual</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {republishConfirmOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !republishing && setRepublishConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirmar publicação</h2>
            <p className="text-sm text-gray-700 mb-4">
              Vamos criar <strong>{preview.novas}</strong> avisos de mudança de preço para{' '}
              <strong>{preview.lojistas_afetados}</strong> lojista{preview.lojistas_afetados !== 1 ? 's' : ''}.
              Eles serão obrigados a sincronizar antes de criar o próximo pedido.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              ⚠️ Confirme que os preços do seu catálogo estão corretos antes de publicar.
              Após sincronizar, o cadastro Bling dos lojistas será atualizado para os valores que estão em sua vitrine.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRepublishConfirmOpen(false)}
                disabled={republishing}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setRepublishConfirmOpen(false)
                  await handleRepublish()
                }}
                disabled={republishing}
                className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Sim, publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado da publicação */}
      {republishResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setRepublishResult(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${republishResult.success ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {republishResult.success ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900">
                  {republishResult.success ? 'Catálogo publicado' : 'Erro ao publicar'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{republishResult.message}</p>
                {republishResult.success && republishResult.criadas > 0 && (
                  <ul className="text-sm text-gray-700 mt-3 space-y-1">
                    <li><strong>{republishResult.criadas}</strong> avisos criados</li>
                    <li><strong>{republishResult.lojistas_notificados}</strong> lojista{republishResult.lojistas_notificados !== 1 ? 's' : ''} notificado{republishResult.lojistas_notificados !== 1 ? 's' : ''}</li>
                    {republishResult.ja_pendentes > 0 && (
                      <li className="text-gray-500">{republishResult.ja_pendentes} já tinham aviso pendente (não duplicados)</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setRepublishResult(null)}
                className="px-5 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </FornecedorLayout>
  )
}
