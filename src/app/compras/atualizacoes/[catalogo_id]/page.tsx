'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoMudanca = 'novo' | 'preco' | 'dados' | 'removido'

interface CatalogoItem {
  id: number
  nome: string | null
  codigo: string | null
  ean: string | null
  marca: string | null
  imagem_url: string | null
  ativo: boolean | null
}

interface AtualizacaoItem {
  id: number
  tipo: TipoMudanca
  catalogo_item_id: number | null
  dados_antigos: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  status: string
  respondido_em: string | null
  created_at: string
  catalogo_item: CatalogoItem | null
  inativo_para_mim: boolean
}

interface Catalogo {
  id: number
  nome: string | null
  slug: string | null
  logo_url: string | null
  cor_primaria: string | null
  cnpj: string | null
}

interface Resp {
  page: number
  per_page: number
  total: number
  total_pages: number
  catalogo: Catalogo
  status_lojista: {
    status: string
    qtd_nao_vistas: number
    ultima_publicacao_at: string | null
    ultima_visualizacao_at: string | null
  }
  itens: AtualizacaoItem[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatPreco(v: unknown): string {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TIPO_LABEL: Record<TipoMudanca, string> = {
  novo: 'Novo item',
  preco: 'Preço alterado',
  dados: 'Dados alterados',
  removido: 'Removido'
}

const TIPO_COLOR: Record<TipoMudanca, string> = {
  novo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  preco: 'bg-amber-50 text-amber-700 border-amber-200',
  dados: 'bg-blue-50 text-blue-700 border-blue-200',
  removido: 'bg-red-50 text-red-700 border-red-200'
}

const TIPOS_FILTRO: Array<{ value: TipoMudanca | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'preco', label: 'Preços' },
  { value: 'dados', label: 'Dados' },
  { value: 'removido', label: 'Removidos' }
]

// ─── Componentes ─────────────────────────────────────────────────────────────

function DiffPreco({ antigo, novo }: { antigo: unknown; novo: unknown }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400 line-through">{formatPreco(antigo)}</span>
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      <span className="font-semibold text-gray-900">{formatPreco(novo)}</span>
    </div>
  )
}

function DiffDados({ antigos, novos }: { antigos: Record<string, unknown> | null; novos: Record<string, unknown> | null }) {
  const keys = new Set([...Object.keys(antigos || {}), ...Object.keys(novos || {})])
  if (keys.size === 0) return <p className="text-sm text-gray-500">—</p>

  return (
    <div className="space-y-1 text-sm">
      {Array.from(keys).map(k => {
        const a = antigos?.[k]
        const n = novos?.[k]
        if (a === n) return null
        return (
          <div key={k} className="flex items-baseline gap-2">
            <span className="font-medium text-gray-600 capitalize">{k.replace(/_/g, ' ')}:</span>
            <span className="text-gray-400 line-through">{a == null ? '—' : String(a)}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-900">{n == null ? '—' : String(n)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ItemRow({ item, onToggleInativar }: {
  item: AtualizacaoItem
  onToggleInativar: (id: number, ativo: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [inativoLocal, setInativoLocal] = useState(item.inativo_para_mim)

  const handleClick = async () => {
    if (busy || !item.catalogo_item_id) return
    setBusy(true)
    try {
      const novoAtivo = inativoLocal // se estava inativo, ativar; senão inativar
      await onToggleInativar(item.catalogo_item_id, novoAtivo)
      setInativoLocal(!inativoLocal)
    } finally {
      setBusy(false)
    }
  }

  const dados_novos = item.dados_novos || {}
  const dados_antigos = item.dados_antigos || {}
  const itemNome = item.catalogo_item?.nome || (dados_novos.nome as string | undefined) || `Item ${item.catalogo_item_id ?? '?'}`

  return (
    <div className={`bg-white rounded-xl border ${inativoLocal ? 'border-gray-200 opacity-60' : 'border-gray-100'} p-4`}>
      <div className="flex items-start gap-4">
        {/* Imagem */}
        {item.catalogo_item?.imagem_url ? (
          <img src={item.catalogo_item.imagem_url} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${TIPO_COLOR[item.tipo]}`}>
                  {TIPO_LABEL[item.tipo]}
                </span>
                {inativoLocal && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    Inativo no meu catálogo
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {formatDateTime(item.created_at)}
                </span>
              </div>
              <p className="font-medium text-gray-900 truncate">{itemNome}</p>
              {(item.catalogo_item?.codigo || item.catalogo_item?.ean) && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.catalogo_item.codigo && <>Cód.: <span className="font-mono">{item.catalogo_item.codigo}</span></>}
                  {item.catalogo_item.codigo && item.catalogo_item.ean && <span className="mx-2">·</span>}
                  {item.catalogo_item.ean && <>EAN: <span className="font-mono">{item.catalogo_item.ean}</span></>}
                </p>
              )}
            </div>

            {item.catalogo_item_id && item.tipo !== 'removido' && (
              <button
                onClick={handleClick}
                disabled={busy}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  inativoLocal
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {busy ? '...' : inativoLocal ? 'Reativar' : 'Inativar para mim'}
              </button>
            )}
          </div>

          {/* Diff */}
          <div className="mt-2">
            {item.tipo === 'novo' && (
              <p className="text-sm text-gray-600">
                Novo no catálogo · {dados_novos.preco_base != null && <strong>{formatPreco(dados_novos.preco_base)}</strong>}
              </p>
            )}
            {item.tipo === 'preco' && (
              <DiffPreco antigo={dados_antigos.preco_base} novo={dados_novos.preco_base} />
            )}
            {item.tipo === 'dados' && (
              <DiffDados antigos={dados_antigos} novos={dados_novos} />
            )}
            {item.tipo === 'removido' && (
              <p className="text-sm text-gray-600">
                Item removido do catálogo do fornecedor.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AtualizacoesDetalhePage({
  params
}: {
  params: Promise<{ catalogo_id: string }>
}) {
  const { catalogo_id } = use(params)
  const catalogoId = Number(catalogo_id)

  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [tipoFiltro, setTipoFiltro] = useState<TipoMudanca | 'todos'>('todos')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL(`/api/compras/atualizacoes/${catalogoId}`, window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', '20')
      if (tipoFiltro !== 'todos') url.searchParams.set('tipo', tipoFiltro)

      const r = await fetch(url.toString(), { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [catalogoId, page, tipoFiltro])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleInativar = async (itemId: number, ativo: boolean) => {
    const r = await fetch(`/api/compras/catalogo-itens/${itemId}/inativar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo })
    })
    if (!r.ok) {
      const json = await r.json().catch(() => ({}))
      throw new Error(json.error || `HTTP ${r.status}`)
    }
  }

  const fornecedorNome = data?.catalogo.nome || 'Fornecedor'

  return (
    <DashboardLayout>
      <PageHeader
        title={fornecedorNome}
        subtitle={
          data
            ? `${data.total} mudança${data.total !== 1 ? 's' : ''} · atualizado em ${formatDateTime(data.status_lojista.ultima_publicacao_at)}`
            : 'Carregando...'
        }
      />

      <div className="mb-4">
        <Link
          href="/compras/atualizacoes"
          className="inline-flex items-center gap-2 text-sm text-[#336FB6] hover:text-[#2660A5] font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Voltar para todos os catálogos
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TIPOS_FILTRO.map(t => (
          <button
            key={t.value}
            onClick={() => { setTipoFiltro(t.value); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              tipoFiltro === t.value
                ? 'bg-[#336FB6] text-white border-[#336FB6]'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
          Erro ao carregar: {error}
        </div>
      )}

      {loading && !data && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
          Carregando...
        </div>
      )}

      {data && data.itens.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-gray-900 mb-1">Nenhuma mudança neste filtro</p>
          <p className="text-sm text-gray-500">Tente outro filtro ou volte mais tarde.</p>
        </div>
      )}

      {data && data.itens.length > 0 && (
        <>
          <div className="space-y-3">
            {data.itens.map(item => (
              <ItemRow key={item.id} item={item} onToggleInativar={handleToggleInativar} />
            ))}
          </div>

          {data.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <p className="text-sm text-gray-500">
                Página {data.page} de {data.total_pages} · {data.total} no total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={data.page === 1 || loading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                  disabled={data.page === data.total_pages || loading}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
