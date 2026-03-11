'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------- Types ----------

interface PedidoDetail {
  id: number
  bling_id: number | null
  numero: string | null
  data: string | null
  data_prevista: string | null
  total_produtos: number | null
  total: number | null
  desconto: number | null
  frete: number | null
  situacao: number | null
  status_interno: string | null
  origem: string | null
  is_excluded: boolean | null
  empresa_id: number
  fornecedor_id: number | null
  representante_id: number | null
  updated_at: string | null
  empresa_nome: string
  fornecedor_nome: string
  fornecedor_cnpj: string | null
  representante_nome: string | null
}

interface ItemPedido {
  id: number
  pedido_compra_id: number
  produto_id: number | null
  descricao: string | null
  codigo_fornecedor: string | null
  codigo_produto: string | null
  unidade: string | null
  quantidade: number
  valor: number
  valor_unitario_final: number | null
  quantidade_bonificacao: number | null
}

interface TimelineEvent {
  id: number
  pedido_compra_id: number
  evento: string
  descricao: string | null
  autor_tipo: 'lojista' | 'fornecedor' | 'representante'
  autor_nome: string | null
  created_at: string
}

interface SugestaoItem {
  id: number
  sugestao_id: number
  item_pedido_compra_id: number
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_quantidade: number
}

interface Sugestao {
  id: number
  pedido_compra_id: number
  status: 'pendente' | 'aceita' | 'rejeitada'
  autor_tipo: string
  observacao_fornecedor: string | null
  observacao_lojista: string | null
  valor_minimo_pedido: number | null
  desconto_geral: number | null
  bonificacao_quantidade_geral: number | null
  prazo_entrega_dias: number | null
  validade_proposta: string | null
  created_at: string
  sugestoes_fornecedor_itens: SugestaoItem[]
}

// ---------- Constants ----------

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-gray-100', text: 'text-gray-500' },
  enviado_fornecedor: { bg: 'bg-blue-100', text: 'text-blue-700' },
  sugestao_pendente: { bg: 'bg-orange-100', text: 'text-orange-700' },
  contra_proposta_pendente: { bg: 'bg-orange-100', text: 'text-orange-700' },
  aceito: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  finalizado: { bg: 'bg-purple-100', text: 'text-purple-700' },
  rejeitado: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelado: { bg: 'bg-gray-100', text: 'text-gray-400' },
}

const STATUS_INTERNO_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Enviado ao Fornecedor',
  sugestao_pendente: 'Sugestao Pendente',
  contra_proposta_pendente: 'Contra-Proposta Pendente',
  aceito: 'Aceito',
  finalizado: 'Finalizado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
}

const SITUACAO_BLING: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: 'Em Aberto', bg: 'bg-blue-50', text: 'text-blue-600' },
  1: { label: 'Atendido', bg: 'bg-green-50', text: 'text-green-600' },
  2: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-600' },
  3: { label: 'Em Andamento', bg: 'bg-yellow-50', text: 'text-yellow-600' },
}

const AUTOR_TIPO_CONFIG: Record<string, { color: string; bgIcon: string; label: string }> = {
  lojista: { color: 'text-blue-600', bgIcon: 'bg-blue-100 text-blue-600', label: 'Lojista' },
  fornecedor: { color: 'text-orange-600', bgIcon: 'bg-orange-100 text-orange-600', label: 'Fornecedor' },
  representante: { color: 'text-purple-600', bgIcon: 'bg-purple-100 text-purple-600', label: 'Representante' },
  sistema: { color: 'text-gray-500', bgIcon: 'bg-gray-100 text-gray-500', label: 'Sistema' },
}

const SUGESTAO_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pendente: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' },
  aceita: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aceita' },
  rejeitada: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeitada' },
}

// ---------- Helpers ----------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value}%`
}

// ---------- Sub-components ----------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
      <span className="w-1 h-4 bg-primary-500 rounded-full" />
      {children}
    </h3>
  )
}

function InfoCard({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

// ---------- Main Component ----------

export default function AdminPedidoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<PedidoDetail | null>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSugestoes, setExpandedSugestoes] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchPedido() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/pedidos/${pedidoId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Pedido nao encontrado')
          } else {
            setError('Erro ao carregar pedido')
          }
          return
        }
        const json = await res.json()
        setPedido(json.pedido)
        setItens(json.itens || [])
        setTimeline(json.timeline || [])
        setSugestoes(json.sugestoes || [])
      } catch (err) {
        console.error('Error fetching pedido:', err)
        setError('Erro ao carregar pedido')
      } finally {
        setLoading(false)
      }
    }

    if (pedidoId) {
      fetchPedido()
    }
  }, [pedidoId])

  function toggleExpandSugestao(sugestaoId: number) {
    setExpandedSugestoes((prev) => {
      const next = new Set(prev)
      if (next.has(sugestaoId)) {
        next.delete(sugestaoId)
      } else {
        next.add(sugestaoId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !pedido) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar aos pedidos
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-gray-600">{error || 'Pedido nao encontrado'}</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const statusConfig = STATUS_BADGE_COLORS[pedido.status_interno || ''] || { bg: 'bg-gray-100', text: 'text-gray-600' }
  const situacaoConfig = SITUACAO_BLING[pedido.situacao ?? -1] || null
  const totalItens = itens.reduce((sum, item) => sum + item.quantidade * item.valor, 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/admin/pedidos')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar aos pedidos
        </button>

        {/* ============================================================= */}
        {/* SECTION 1: HEADER                                             */}
        {/* ============================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Pedido {pedido.numero ? `#${pedido.numero}` : `ID ${pedido.id}`}
                </h1>
                {pedido.is_excluded && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Excluido
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Atualizado em {formatDateTime(pedido.updated_at)}
                {pedido.bling_id ? ` | Bling ID: ${pedido.bling_id}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pedido.status_interno && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  {STATUS_INTERNO_LABELS[pedido.status_interno] || pedido.status_interno}
                </span>
              )}
              {situacaoConfig && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${situacaoConfig.bg} ${situacaoConfig.text}`}>
                  Bling: {situacaoConfig.label}
                </span>
              )}
              {pedido.origem && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600">
                  {pedido.origem}
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <InfoCard label="Empresa" value={pedido.empresa_nome} />
            <InfoCard
              label="Fornecedor"
              value={
                <div>
                  <div>{pedido.fornecedor_nome}</div>
                  {pedido.fornecedor_cnpj && (
                    <div className="text-xs text-gray-400 font-normal">{pedido.fornecedor_cnpj}</div>
                  )}
                </div>
              }
            />
            <InfoCard label="Representante" value={pedido.representante_nome || '-'} />
            <InfoCard label="Data" value={formatDate(pedido.data)} />
            <InfoCard label="Data Prevista" value={formatDate(pedido.data_prevista)} />
            <InfoCard label="Empresa ID" value={String(pedido.empresa_id)} />
          </dl>

          {/* Totals row */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Produtos</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(pedido.total_produtos)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Desconto</div>
                <div className="text-lg font-semibold text-red-600">{formatCurrency(pedido.desconto)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Frete</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(pedido.frete)}</div>
              </div>
              <div className="bg-primary-50 rounded-lg p-3">
                <div className="text-xs text-primary-600 font-medium">Total do Pedido</div>
                <div className="text-lg font-bold text-primary-700">{formatCurrency(pedido.total)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* SECTION 2: ITEMS TABLE                                        */}
        {/* ============================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle>Itens do Pedido ({itens.length})</SectionTitle>

          {itens.length === 0 ? (
            <p className="text-sm text-gray-400 mt-4">Nenhum item registrado neste pedido.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Cod. Forn.</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Descricao</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Un.</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Qtd</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Bonif.</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Valor Unit.</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs text-gray-500">{item.codigo_fornecedor || '-'}</td>
                      <td className="py-2 px-3 text-gray-900">{item.descricao || '-'}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{item.unidade || '-'}</td>
                      <td className="py-2 px-3 text-right font-medium">{item.quantidade}</td>
                      <td className="py-2 px-3 text-right text-gray-500">{item.quantidade_bonificacao ? item.quantidade_bonificacao : '-'}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.valor)}</td>
                      <td className="py-2 px-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.quantidade * item.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={6} className="py-2 px-3 text-right font-semibold text-gray-600">
                      Total dos Itens:
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(totalItens)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* SECTION 2.5: COMPARATIVO DE NEGOCIACAO                        */}
        {/* ============================================================= */}
        {sugestoes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SectionTitle>Comparativo de Negociacao</SectionTitle>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    {/* Item info columns */}
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 sticky left-0 bg-white z-10 min-w-[200px]">Item</th>
                    {/* Original columns */}
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 bg-gray-50 min-w-[80px]">Qtd Orig.</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 bg-gray-50 min-w-[100px]">Valor Orig.</th>
                    {/* Round columns */}
                    {sugestoes.map((sugestao, roundIdx) => {
                      const autorCfg = AUTOR_TIPO_CONFIG[sugestao.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
                      const statusCfg = SUGESTAO_STATUS_CONFIG[sugestao.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: sugestao.status }
                      return (
                        <th key={sugestao.id} colSpan={3} className="text-center py-1 px-2 border-l-2 border-gray-200 min-w-[240px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-gray-700">Rodada {roundIdx + 1}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${autorCfg.bgIcon}`}>
                                {autorCfg.label}
                              </span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                          </div>
                        </th>
                      )
                    })}
                    {/* Final columns */}
                    <th colSpan={3} className="text-center py-2 px-2 border-l-2 border-emerald-300 bg-emerald-50 min-w-[240px]">
                      <span className="text-xs font-bold text-emerald-700">Final (Atual)</span>
                    </th>
                  </tr>
                  {/* Sub-header row for round column labels */}
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 bg-white z-10" />
                    <th className="bg-gray-50" />
                    <th className="bg-gray-50" />
                    {sugestoes.map((sugestao) => (
                      <React.Fragment key={`sub-${sugestao.id}`}>
                        <th className="text-right py-1 px-2 text-[10px] font-medium text-gray-500 border-l-2 border-gray-200">Qtd</th>
                        <th className="text-right py-1 px-2 text-[10px] font-medium text-gray-500">Desc%</th>
                        <th className="text-right py-1 px-2 text-[10px] font-medium text-gray-500">Bonif.</th>
                      </React.Fragment>
                    ))}
                    <th className="text-right py-1 px-2 text-[10px] font-medium text-emerald-600 border-l-2 border-emerald-300 bg-emerald-50">Qtd</th>
                    <th className="text-right py-1 px-2 text-[10px] font-medium text-emerald-600 bg-emerald-50">Valor Unit.</th>
                    <th className="text-right py-1 px-2 text-[10px] font-medium text-emerald-600 bg-emerald-50">Bonif.</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const originalQtd = item.quantidade
                    const originalValor = item.valor
                    const acceptedSugestao = sugestoes.find((s) => s.status === 'aceita')
                    const finalItem = acceptedSugestao?.sugestoes_fornecedor_itens?.find(
                      (si) => si.item_pedido_compra_id === item.id
                    )
                    const finalQtd = finalItem?.quantidade_sugerida || item.quantidade
                    const finalValorUnit = item.valor_unitario_final != null ? item.valor_unitario_final : item.valor
                    const finalBonif = item.quantidade_bonificacao

                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        {/* Item description */}
                        <td className="py-2 px-3 sticky left-0 bg-white z-10">
                          <div className="text-gray-900 text-sm font-medium truncate max-w-[200px]" title={item.descricao || ''}>
                            {item.descricao || '-'}
                          </div>
                          {item.codigo_fornecedor && (
                            <div className="text-[10px] font-mono text-gray-400">{item.codigo_fornecedor}</div>
                          )}
                        </td>
                        {/* Original values */}
                        <td className="py-2 px-3 text-right font-medium text-gray-700 bg-gray-50">{originalQtd}</td>
                        <td className="py-2 px-3 text-right text-gray-600 bg-gray-50">{formatCurrency(originalValor)}</td>
                        {/* Each round */}
                        {sugestoes.map((sugestao) => {
                          const roundItem = sugestao.sugestoes_fornecedor_itens?.find(
                            (si) => si.item_pedido_compra_id === item.id
                          )

                          if (!roundItem) {
                            return (
                              <React.Fragment key={`r-${sugestao.id}-${item.id}`}>
                                <td className="py-2 px-2 text-right text-gray-300 border-l-2 border-gray-200">-</td>
                                <td className="py-2 px-2 text-right text-gray-300">-</td>
                                <td className="py-2 px-2 text-right text-gray-300">-</td>
                              </React.Fragment>
                            )
                          }

                          const qtdDelta = roundItem.quantidade_sugerida - originalQtd
                          const qtdChanged = qtdDelta !== 0

                          return (
                            <React.Fragment key={`r-${sugestao.id}-${item.id}`}>
                              {/* Qtd Sugerida */}
                              <td className="py-2 px-2 text-right border-l-2 border-gray-200">
                                <span className={`font-medium ${qtdChanged ? (qtdDelta > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-700'}`}>
                                  {roundItem.quantidade_sugerida}
                                </span>
                                {qtdChanged && (
                                  <span className={`ml-0.5 text-[10px] ${qtdDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {qtdDelta > 0 ? '\u2191' : '\u2193'}
                                  </span>
                                )}
                              </td>
                              {/* Desconto */}
                              <td className="py-2 px-2 text-right">
                                {roundItem.desconto_percentual > 0 ? (
                                  <span className="font-medium text-emerald-600">{formatPercent(roundItem.desconto_percentual)}</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              {/* Bonificacao */}
                              <td className="py-2 px-2 text-right">
                                {roundItem.bonificacao_quantidade > 0 ? (
                                  <span className="font-medium text-blue-600">+{roundItem.bonificacao_quantidade}</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            </React.Fragment>
                          )
                        })}
                        {/* Final (current) values */}
                        <td className="py-2 px-2 text-right font-medium text-emerald-700 border-l-2 border-emerald-300 bg-emerald-50/50">{finalQtd}</td>
                        <td className="py-2 px-2 text-right font-medium text-emerald-700 bg-emerald-50/50">{formatCurrency(finalValorUnit)}</td>
                        <td className="py-2 px-2 text-right bg-emerald-50/50">
                          {finalBonif && finalBonif > 0 ? (
                            <span className="font-medium text-blue-600">+{finalBonif}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Summary footer */}
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50/80">
                    <td className="py-2 px-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">Totais</td>
                    {/* Original total */}
                    <td className="py-2 px-3 text-right font-bold text-gray-700 bg-gray-100">
                      {itens.reduce((sum, item) => sum + item.quantidade, 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-700 bg-gray-100">
                      {formatCurrency(itens.reduce((sum, item) => sum + item.quantidade * item.valor, 0))}
                    </td>
                    {/* Each round total */}
                    {sugestoes.map((sugestao) => {
                      let roundEstTotal = 0
                      let roundQtdTotal = 0
                      let roundBonifTotal = 0

                      itens.forEach((item) => {
                        const roundItem = sugestao.sugestoes_fornecedor_itens?.find(
                          (si) => si.item_pedido_compra_id === item.id
                        )
                        if (roundItem) {
                          const discountMultiplier = 1 - (roundItem.desconto_percentual || 0) / 100
                          roundEstTotal += roundItem.quantidade_sugerida * item.valor * discountMultiplier
                          roundQtdTotal += roundItem.quantidade_sugerida
                          roundBonifTotal += roundItem.bonificacao_quantidade || 0
                        } else {
                          roundEstTotal += item.quantidade * item.valor
                          roundQtdTotal += item.quantidade
                        }
                      })

                      if (sugestao.desconto_geral) {
                        roundEstTotal = roundEstTotal * (1 - sugestao.desconto_geral / 100)
                      }

                      return (
                        <React.Fragment key={`total-${sugestao.id}`}>
                          <td className="py-2 px-2 text-right font-bold text-gray-700 border-l-2 border-gray-200">{roundQtdTotal}</td>
                          <td className="py-2 px-2 text-right font-bold text-gray-700" title="Estimativa com descontos">
                            {formatCurrency(roundEstTotal)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-blue-600">
                            {roundBonifTotal > 0 ? `+${roundBonifTotal}` : '-'}
                          </td>
                        </React.Fragment>
                      )
                    })}
                    {/* Final total */}
                    <td className="py-2 px-2 text-right font-bold text-emerald-700 border-l-2 border-emerald-300 bg-emerald-100/50">
                      {(() => {
                        const accepted = sugestoes.find((s) => s.status === 'aceita')
                        return itens.reduce((sum, item) => {
                          const fi = accepted?.sugestoes_fornecedor_itens?.find(
                            (si) => si.item_pedido_compra_id === item.id
                          )
                          return sum + (fi?.quantidade_sugerida || item.quantidade)
                        }, 0)
                      })()}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-700 bg-emerald-100/50">
                      {formatCurrency(
                        (() => {
                          const accepted = sugestoes.find((s) => s.status === 'aceita')
                          let total = itens.reduce((sum, item) => {
                            const fi = accepted?.sugestoes_fornecedor_itens?.find(
                              (si) => si.item_pedido_compra_id === item.id
                            )
                            const qty = fi?.quantidade_sugerida || item.quantidade
                            const unitVal = item.valor_unitario_final != null ? item.valor_unitario_final : item.valor
                            return sum + qty * unitVal
                          }, 0)
                          if (accepted?.desconto_geral) {
                            total = total * (1 - accepted.desconto_geral / 100)
                          }
                          return total
                        })()
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-blue-600 bg-emerald-100/50">
                      {(() => {
                        const totalBonif = itens.reduce((sum, item) => sum + (item.quantidade_bonificacao || 0), 0)
                        return totalBonif > 0 ? `+${totalBonif}` : '-'
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SECTION 3: TIMELINE (MOST IMPORTANT)                          */}
        {/* ============================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle>Timeline de Auditoria ({timeline.length} eventos)</SectionTitle>

          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 mt-4">Nenhum evento registrado na timeline deste pedido.</p>
          ) : (
            <div className="mt-6 relative">
              {/* Vertical line */}
              <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-200 via-orange-200 to-purple-200" />

              <div className="space-y-0">
                {timeline.map((event, index) => {
                  const autorConfig = AUTOR_TIPO_CONFIG[event.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
                  const isFirst = index === 0
                  const isLast = index === timeline.length - 1

                  // Find matching sugestao for this event if it's sugestao-related
                  const isSugestaoEvent =
                    event.evento === 'sugestao_enviada' ||
                    event.evento === 'sugestao_aceita' ||
                    event.evento === 'sugestao_rejeitada' ||
                    event.evento === 'contra_proposta_enviada'

                  // Find sugestao closest in time to this event
                  const relatedSugestao = isSugestaoEvent
                    ? sugestoes.find((s) => {
                        const eventTime = new Date(event.created_at).getTime()
                        const sugestaoTime = new Date(s.created_at).getTime()
                        return Math.abs(eventTime - sugestaoTime) < 60000 // within 1 minute
                      })
                    : null

                  const isExpanded = relatedSugestao ? expandedSugestoes.has(relatedSugestao.id) : false

                  return (
                    <div key={event.id} className={`relative flex gap-4 ${isFirst ? '' : 'pt-6'} ${isLast ? '' : ''}`}>
                      {/* Timeline node */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 border-white ${autorConfig.bgIcon}`}>
                          {event.autor_tipo === 'lojista' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                            </svg>
                          )}
                          {event.autor_tipo === 'fornecedor' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                            </svg>
                          )}
                          {event.autor_tipo === 'representante' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                          )}
                          {event.autor_tipo !== 'lojista' && event.autor_tipo !== 'fornecedor' && event.autor_tipo !== 'representante' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Event content */}
                      <div className="flex-1 min-w-0 pb-2">
                        {/* Date/time on top-right */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {event.descricao || event.evento.replace(/_/g, ' ')}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              {event.autor_nome && (
                                <span className={`text-xs font-semibold ${autorConfig.color}`}>
                                  {event.autor_nome}
                                </span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded ${autorConfig.bgIcon}`}>
                                {autorConfig.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-400">{formatDateTime(event.created_at)}</div>
                          </div>
                        </div>

                        {/* Expandable sugestao details */}
                        {relatedSugestao && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleExpandSugestao(relatedSugestao.id)}
                              className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                              Ver detalhes da {relatedSugestao.autor_tipo === 'lojista' ? 'contra-proposta' : 'sugestao'}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                                {/* Commercial conditions */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  {relatedSugestao.desconto_geral !== null && relatedSugestao.desconto_geral !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Desconto Geral:</span>
                                      <span className="ml-1 font-semibold">{formatPercent(relatedSugestao.desconto_geral)}</span>
                                    </div>
                                  )}
                                  {relatedSugestao.bonificacao_quantidade_geral !== null && relatedSugestao.bonificacao_quantidade_geral !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Bonificacao:</span>
                                      <span className="ml-1 font-semibold">{relatedSugestao.bonificacao_quantidade_geral} un.</span>
                                    </div>
                                  )}
                                  {relatedSugestao.prazo_entrega_dias !== null && relatedSugestao.prazo_entrega_dias !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Prazo:</span>
                                      <span className="ml-1 font-semibold">{relatedSugestao.prazo_entrega_dias} dias</span>
                                    </div>
                                  )}
                                  {relatedSugestao.valor_minimo_pedido !== null && relatedSugestao.valor_minimo_pedido !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Valor Minimo:</span>
                                      <span className="ml-1 font-semibold">{formatCurrency(relatedSugestao.valor_minimo_pedido)}</span>
                                    </div>
                                  )}
                                  {relatedSugestao.validade_proposta && (
                                    <div>
                                      <span className="text-gray-500">Validade:</span>
                                      <span className="ml-1 font-semibold">{formatDate(relatedSugestao.validade_proposta)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Observacoes */}
                                {relatedSugestao.observacao_fornecedor && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Obs. Fornecedor:</span>
                                    <p className="mt-0.5 text-gray-700 bg-white rounded p-2 border border-gray-100">
                                      {relatedSugestao.observacao_fornecedor}
                                    </p>
                                  </div>
                                )}
                                {relatedSugestao.observacao_lojista && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Obs. Lojista:</span>
                                    <p className="mt-0.5 text-gray-700 bg-white rounded p-2 border border-gray-100">
                                      {relatedSugestao.observacao_lojista}
                                    </p>
                                  </div>
                                )}

                                {/* Item-level details */}
                                {relatedSugestao.sugestoes_fornecedor_itens && relatedSugestao.sugestoes_fornecedor_itens.length > 0 && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 mb-2">Itens da sugestao:</div>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          <th className="text-left py-1 px-2 font-medium text-gray-500">Item</th>
                                          <th className="text-right py-1 px-2 font-medium text-gray-500">Qtd Sugerida</th>
                                          <th className="text-right py-1 px-2 font-medium text-gray-500">Desconto</th>
                                          <th className="text-right py-1 px-2 font-medium text-gray-500">Bonificacao</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {relatedSugestao.sugestoes_fornecedor_itens.map((si) => {
                                          const originalItem = itens.find((it) => it.id === si.item_pedido_compra_id)
                                          return (
                                            <tr key={si.id} className="border-b border-gray-100">
                                              <td className="py-1 px-2 text-gray-700">
                                                {originalItem?.descricao || originalItem?.codigo_fornecedor || `Item #${si.item_pedido_compra_id}`}
                                              </td>
                                              <td className="py-1 px-2 text-right font-medium">
                                                {si.quantidade_sugerida}
                                                {originalItem && si.quantidade_sugerida !== originalItem.quantidade && (
                                                  <span className="text-gray-400 ml-1">(era {originalItem.quantidade})</span>
                                                )}
                                              </td>
                                              <td className="py-1 px-2 text-right">
                                                {si.desconto_percentual > 0 ? (
                                                  <span className="text-green-600 font-medium">{formatPercent(si.desconto_percentual)}</span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                              <td className="py-1 px-2 text-right">
                                                {si.bonificacao_quantidade > 0 ? (
                                                  <span className="text-blue-600 font-medium">+{si.bonificacao_quantidade} un.</span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* SECTION 4: NEGOTIATION ROUNDS                                 */}
        {/* ============================================================= */}
        {sugestoes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SectionTitle>Rodadas de Negociacao ({sugestoes.length})</SectionTitle>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Rodada</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Autor</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Desconto Geral</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Bonificacao</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Prazo (dias)</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Valor Minimo</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Validade</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Status</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {sugestoes.map((sugestao, index) => {
                    const autorConfig = AUTOR_TIPO_CONFIG[sugestao.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
                    const statusCfg = SUGESTAO_STATUS_CONFIG[sugestao.status] || {
                      bg: 'bg-gray-100',
                      text: 'text-gray-600',
                      label: sugestao.status,
                    }
                    const tipo = sugestao.autor_tipo === 'lojista' ? 'Contra-proposta' : 'Sugestao'

                    return (
                      <tr key={sugestao.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">#{index + 1}</td>
                        <td className="py-2 px-3">
                          <span className={`text-xs font-semibold ${autorConfig.color}`}>
                            {autorConfig.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-700">{tipo}</td>
                        <td className="py-2 px-3 text-right">
                          {sugestao.desconto_geral != null ? (
                            <span className="font-medium text-green-600">{formatPercent(sugestao.desconto_geral)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {sugestao.bonificacao_quantidade_geral != null && sugestao.bonificacao_quantidade_geral > 0 ? (
                            <span className="font-medium text-blue-600">{sugestao.bonificacao_quantidade_geral} un.</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {sugestao.prazo_entrega_dias != null ? (
                            <span className="font-medium">{sugestao.prazo_entrega_dias}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {sugestao.valor_minimo_pedido != null ? (
                            <span className="font-medium">{formatCurrency(sugestao.valor_minimo_pedido)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600">
                          {formatDate(sugestao.validade_proposta)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-xs text-gray-500">
                          {formatDateTime(sugestao.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Observacoes from sugestoes */}
            {sugestoes.some((s) => s.observacao_fornecedor || s.observacao_lojista) && (
              <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observacoes das rodadas</div>
                {sugestoes.map((s, index) => (
                  <div key={s.id}>
                    {s.observacao_fornecedor && (
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-orange-600">Rodada #{index + 1} - Fornecedor</span>
                          <span className="text-xs text-gray-400">{formatDateTime(s.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{s.observacao_fornecedor}</p>
                      </div>
                    )}
                    {s.observacao_lojista && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-600">Rodada #{index + 1} - Lojista</span>
                        </div>
                        <p className="text-sm text-gray-700">{s.observacao_lojista}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
