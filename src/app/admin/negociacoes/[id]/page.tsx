'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import Link from 'next/link'

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
  autor_tipo: 'lojista' | 'fornecedor' | 'representante' | 'sistema'
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
  sugestao_pendente: { bg: 'bg-amber-100', text: 'text-amber-700' },
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

const AUTOR_TIPO_CONFIG: Record<string, { color: string; bg: string; bgIcon: string; label: string }> = {
  lojista: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', bgIcon: 'bg-blue-100 text-blue-600', label: 'Lojista' },
  fornecedor: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', bgIcon: 'bg-orange-100 text-orange-600', label: 'Fornecedor' },
  representante: { color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', bgIcon: 'bg-purple-100 text-purple-600', label: 'Representante' },
  sistema: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', bgIcon: 'bg-gray-100 text-gray-500', label: 'Sistema' },
}

const SUGESTAO_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pendente: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' },
  aceita: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aceita' },
  rejeitada: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeitada' },
}

// Negotiation flow steps
const NEGOTIATION_STEPS = [
  { key: 'envio', label: 'Envio', color: 'blue', statuses: ['enviado_fornecedor'] },
  { key: 'sugestao', label: 'Sugestao', color: 'amber', statuses: ['sugestao_pendente'] },
  { key: 'contra_proposta', label: 'Contra-Proposta', color: 'orange', statuses: ['contra_proposta_pendente'] },
  { key: 'resultado', label: 'Resultado', color: 'green', statuses: ['aceito', 'finalizado', 'rejeitado', 'cancelado'] },
]

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

function getStepIndex(status: string | null): number {
  if (!status) return -1
  for (let i = NEGOTIATION_STEPS.length - 1; i >= 0; i--) {
    if (NEGOTIATION_STEPS[i].statuses.includes(status)) return i
  }
  return -1
}

function getStepColor(step: typeof NEGOTIATION_STEPS[number], stepIdx: number, currentIdx: number, status: string | null): {
  bg: string; border: string; text: string; line: string;
} {
  const isCompleted = stepIdx < currentIdx
  const isCurrent = stepIdx === currentIdx

  if (isCurrent) {
    // For the result step, color depends on outcome
    if (step.key === 'resultado') {
      if (status === 'aceito' || status === 'finalizado') {
        return { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-white', line: 'bg-emerald-500' }
      }
      if (status === 'rejeitado' || status === 'cancelado') {
        return { bg: 'bg-red-500', border: 'border-red-500', text: 'text-white', line: 'bg-red-500' }
      }
    }
    const colorMap: Record<string, { bg: string; border: string; text: string; line: string }> = {
      blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-white', line: 'bg-blue-500' },
      amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-white', line: 'bg-amber-500' },
      orange: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-white', line: 'bg-orange-500' },
      green: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-white', line: 'bg-emerald-500' },
    }
    return colorMap[step.color] || colorMap.blue
  }

  if (isCompleted) {
    return { bg: 'bg-primary-500', border: 'border-primary-500', text: 'text-white', line: 'bg-primary-500' }
  }

  return { bg: 'bg-gray-200', border: 'border-gray-300', text: 'text-gray-400', line: 'bg-gray-200' }
}

// ---------- SVG Icons ----------

function AuthorIcon({ autorTipo }: { autorTipo: string }) {
  if (autorTipo === 'lojista') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
      </svg>
    )
  }
  if (autorTipo === 'fornecedor') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    )
  }
  if (autorTipo === 'representante') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    )
  }
  // sistema
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
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

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

// ---------- Progress Bar ----------

function NegotiationProgressBar({ status }: { status: string | null }) {
  const currentIdx = getStepIndex(status)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle>Fluxo da Negociacao</SectionTitle>

      <div className="mt-5">
        {/* Desktop: horizontal */}
        <div className="hidden sm:flex items-center">
          {NEGOTIATION_STEPS.map((step, idx) => {
            const colors = getStepColor(step, idx, currentIdx, status)
            const isCompleted = idx < currentIdx
            const isCurrent = idx === currentIdx
            const isLast = idx === NEGOTIATION_STEPS.length - 1

            // Result step label
            let label = step.label
            if (step.key === 'resultado' && isCurrent) {
              if (status === 'aceito' || status === 'finalizado') label = 'Aceito'
              if (status === 'rejeitado') label = 'Rejeitado'
              if (status === 'cancelado') label = 'Cancelado'
            }

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${colors.border} ${colors.bg} ${colors.text} transition-all ${isCurrent ? 'ring-4 ring-opacity-20 ring-current scale-110' : ''}`}
                  >
                    {isCompleted ? (
                      <CheckIcon />
                    ) : (
                      <span className="text-sm font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-primary-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${idx < currentIdx ? 'bg-primary-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: vertical */}
        <div className="sm:hidden space-y-3">
          {NEGOTIATION_STEPS.map((step, idx) => {
            const colors = getStepColor(step, idx, currentIdx, status)
            const isCompleted = idx < currentIdx
            const isCurrent = idx === currentIdx

            let label = step.label
            if (step.key === 'resultado' && isCurrent) {
              if (status === 'aceito' || status === 'finalizado') label = 'Aceito'
              if (status === 'rejeitado') label = 'Rejeitado'
              if (status === 'cancelado') label = 'Cancelado'
            }

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${colors.border} ${colors.bg} ${colors.text} ${isCurrent ? 'ring-4 ring-opacity-20 ring-current' : ''}`}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-primary-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------- Timeline Card ----------

function TimelineCard({
  event,
  relatedSugestao,
  itens,
}: {
  event: TimelineEvent
  relatedSugestao: Sugestao | null
  itens: ItemPedido[]
}) {
  const autorConfig = AUTOR_TIPO_CONFIG[event.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
  const isSugestaoRelated = !!relatedSugestao
  const tipo = relatedSugestao
    ? relatedSugestao.autor_tipo === 'lojista'
      ? 'Contra-Proposta'
      : 'Sugestao'
    : null

  if (!isSugestaoRelated) {
    // Simple event card
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {event.descricao || event.evento.replace(/_/g, ' ')}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
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
          <div className="text-xs text-gray-400 flex-shrink-0 text-right">
            {formatDateTime(event.created_at)}
          </div>
        </div>
      </div>
    )
  }

  // Rich sugestao card
  const statusCfg = SUGESTAO_STATUS_CONFIG[relatedSugestao.status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: relatedSugestao.status,
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${autorConfig.bg}`}>
      {/* Card header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${autorConfig.bgIcon}`}>
              <AuthorIcon autorTipo={event.autor_tipo} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {event.autor_nome && (
                  <span className={`text-sm font-semibold ${autorConfig.color}`}>
                    {event.autor_nome}
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${autorConfig.bgIcon}`}>
                  {autorConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-gray-600">{tipo}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 flex-shrink-0 text-right">
            {formatDateTime(event.created_at)}
          </div>
        </div>
      </div>

      {/* Commercial conditions */}
      <div className="p-4 bg-white/60">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Condicoes Comerciais</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border border-gray-100 p-2.5">
            <div className="text-[10px] text-gray-400 uppercase">Desconto Geral</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {relatedSugestao.desconto_geral != null ? (
                <span className="text-green-600">{formatPercent(relatedSugestao.desconto_geral)}</span>
              ) : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-2.5">
            <div className="text-[10px] text-gray-400 uppercase">Bonificacao Geral</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {relatedSugestao.bonificacao_quantidade_geral != null && relatedSugestao.bonificacao_quantidade_geral > 0 ? (
                <span className="text-blue-600">{relatedSugestao.bonificacao_quantidade_geral} un.</span>
              ) : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-2.5">
            <div className="text-[10px] text-gray-400 uppercase">Prazo Entrega</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {relatedSugestao.prazo_entrega_dias != null ? `${relatedSugestao.prazo_entrega_dias} dias` : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-2.5">
            <div className="text-[10px] text-gray-400 uppercase">Valor Minimo</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {relatedSugestao.valor_minimo_pedido != null ? formatCurrency(relatedSugestao.valor_minimo_pedido) : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-2.5">
            <div className="text-[10px] text-gray-400 uppercase">Validade</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatDate(relatedSugestao.validade_proposta)}
            </div>
          </div>
        </div>

        {/* Item changes */}
        {relatedSugestao.sugestoes_fornecedor_itens && relatedSugestao.sugestoes_fornecedor_itens.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alteracoes nos Itens</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Item</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Qtd Original</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-600"></th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Qtd Sugerida</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Delta</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Desconto</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Bonif.</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Valor Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedSugestao.sugestoes_fornecedor_itens.map((si) => {
                    const originalItem = itens.find((it) => it.id === si.item_pedido_compra_id)
                    const originalQty = originalItem?.quantidade ?? 0
                    const originalValor = originalItem?.valor ?? 0
                    const delta = si.quantidade_sugerida - originalQty
                    const estimatedValue = originalValor * (1 - (si.desconto_percentual || 0) / 100) * si.quantidade_sugerida

                    return (
                      <tr key={si.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-2 px-2 text-gray-800 max-w-[200px] truncate">
                          {originalItem?.descricao || originalItem?.codigo_fornecedor || `Item #${si.item_pedido_compra_id}`}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-500 font-mono">
                          {originalQty}
                        </td>
                        <td className="py-2 px-2 text-center text-gray-300">
                          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold font-mono">
                          {si.quantidade_sugerida}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {delta !== 0 ? (
                            <span className={`font-semibold ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                          ) : (
                            <span className="text-gray-400">=</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {si.desconto_percentual > 0 ? (
                            <span className="text-green-600 font-semibold">{formatPercent(si.desconto_percentual)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {si.bonificacao_quantidade > 0 ? (
                            <span className="text-blue-600 font-semibold">+{si.bonificacao_quantidade}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-gray-800">
                          {formatCurrency(estimatedValue)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Observations */}
        {(relatedSugestao.observacao_fornecedor || relatedSugestao.observacao_lojista) && (
          <div className="mt-4 space-y-2">
            {relatedSugestao.observacao_fornecedor && (
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1">Observacao do Fornecedor</div>
                <p className="text-sm text-gray-700">{relatedSugestao.observacao_fornecedor}</p>
              </div>
            )}
            {relatedSugestao.observacao_lojista && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Observacao do Lojista</div>
                <p className="text-sm text-gray-700">{relatedSugestao.observacao_lojista}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Main Component ----------

export default function AdminNegociacaoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<PedidoDetail | null>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
            setError('Erro ao carregar dados da negociacao')
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
        setError('Erro ao carregar dados da negociacao')
      } finally {
        setLoading(false)
      }
    }

    if (pedidoId) {
      fetchPedido()
    }
  }, [pedidoId])

  // Match timeline events to sugestoes
  const enrichedTimeline = useMemo(() => {
    return timeline.map((event) => {
      const isSugestaoEvent =
        event.evento === 'sugestao_enviada' ||
        event.evento === 'sugestao_aceita' ||
        event.evento === 'sugestao_rejeitada' ||
        event.evento === 'contra_proposta_enviada'

      const relatedSugestao = isSugestaoEvent
        ? sugestoes.find((s) => {
            const eventTime = new Date(event.created_at).getTime()
            const sugestaoTime = new Date(s.created_at).getTime()
            return Math.abs(eventTime - sugestaoTime) < 60000
          }) ?? null
        : null

      return { event, relatedSugestao }
    })
  }, [timeline, sugestoes])

  // Sorted sugestoes by created_at for comparison table
  const sortedSugestoes = useMemo(() => {
    return [...sugestoes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [sugestoes])

  // Compute current total based on latest accepted sugestao
  const currentTotal = useMemo(() => {
    if (!pedido) return null
    const acceptedSugestao = sortedSugestoes.find((s) => s.status === 'aceita')
    if (!acceptedSugestao) return pedido.total

    let total = 0
    for (const item of itens) {
      const si = acceptedSugestao.sugestoes_fornecedor_itens?.find(
        (s) => s.item_pedido_compra_id === item.id
      )
      if (si) {
        const qty = si.quantidade_sugerida
        const discount = si.desconto_percentual || 0
        total += item.valor * (1 - discount / 100) * qty
      } else {
        total += item.valor * item.quantidade
      }
    }

    const generalDiscount = acceptedSugestao.desconto_geral || 0
    total = total * (1 - generalDiscount / 100)
    return total
  }, [pedido, itens, sortedSugestoes])

  // ---------- Loading state ----------

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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ---------- Error state ----------

  if (error || !pedido) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <button
            onClick={() => router.push('/admin/negociacoes')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar as negociacoes
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
  const originalTotal = pedido.total
  const totalDifference = currentTotal != null && originalTotal != null ? currentTotal - originalTotal : null

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ============================================================= */}
        {/* BACK LINK + QUICK NAV                                         */}
        {/* ============================================================= */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/negociacoes')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar as negociacoes
          </button>
          <Link
            href={`/admin/pedidos/${pedido.id}`}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
          >
            Ver pedido completo
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* ============================================================= */}
        {/* SECTION 1: HEADER                                             */}
        {/* ============================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Negociacao - Pedido {pedido.numero ? `#${pedido.numero}` : `ID ${pedido.id}`}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Atualizado em {formatDateTime(pedido.updated_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pedido.status_interno && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  {STATUS_INTERNO_LABELS[pedido.status_interno] || pedido.status_interno}
                </span>
              )}
              {pedido.origem && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600">
                  {pedido.origem}
                </span>
              )}
            </div>
          </div>

          {/* Key info */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
          </dl>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Original</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(originalTotal)}</div>
              </div>
              <div className={`rounded-lg p-3 ${totalDifference && totalDifference !== 0 ? 'bg-primary-50' : 'bg-gray-50'}`}>
                <div className={`text-xs ${totalDifference && totalDifference !== 0 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                  Total Atual
                </div>
                <div className={`text-lg font-bold ${totalDifference && totalDifference !== 0 ? 'text-primary-700' : 'text-gray-900'}`}>
                  {formatCurrency(currentTotal)}
                </div>
              </div>
              {totalDifference != null && totalDifference !== 0 && (
                <div className={`rounded-lg p-3 ${totalDifference < 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-xs font-medium ${totalDifference < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Diferenca
                  </div>
                  <div className={`text-lg font-bold ${totalDifference < 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* SECTION 2: NEGOTIATION PROGRESS BAR                           */}
        {/* ============================================================= */}
        <NegotiationProgressBar status={pedido.status_interno} />

        {/* ============================================================= */}
        {/* SECTION 3: VISUAL TIMELINE                                    */}
        {/* ============================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionTitle>Timeline da Negociacao ({timeline.length} eventos)</SectionTitle>

          {timeline.length === 0 && sugestoes.length === 0 ? (
            <div className="mt-6 text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Nenhuma negociacao registrada para este pedido.</p>
              <p className="text-gray-400 text-xs mt-1">Eventos aparecerao aqui conforme a negociacao avance.</p>
            </div>
          ) : (
            <div className="mt-6 relative">
              {/* Vertical line */}
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-200 via-orange-200 to-purple-200" />

              <div className="space-y-6">
                {enrichedTimeline.map(({ event, relatedSugestao }) => {
                  const autorConfig = AUTOR_TIPO_CONFIG[event.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
                  const isAutorFornecedor = event.autor_tipo === 'fornecedor' || event.autor_tipo === 'representante'

                  return (
                    <div key={event.id} className={`relative flex gap-4 ${isAutorFornecedor ? 'pl-2' : ''}`}>
                      {/* Timeline node */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 border-white ${autorConfig.bgIcon}`}>
                          <AuthorIcon autorTipo={event.autor_tipo} />
                        </div>
                      </div>

                      {/* Event content */}
                      <div className="flex-1 min-w-0">
                        <TimelineCard
                          event={event}
                          relatedSugestao={relatedSugestao}
                          itens={itens}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* SECTION 4: SIDE-BY-SIDE COMPARISON TABLE                      */}
        {/* ============================================================= */}
        {sortedSugestoes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SectionTitle>Comparativo por Item ({sortedSugestoes.length} rodada{sortedSugestoes.length > 1 ? 's' : ''})</SectionTitle>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 sticky left-0 bg-white z-10 min-w-[180px]">Item</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600 min-w-[100px]">
                      <div>Original</div>
                      <div className="text-[10px] font-normal text-gray-400">Pedido inicial</div>
                    </th>
                    {sortedSugestoes.map((s, idx) => {
                      const autorCfg = AUTOR_TIPO_CONFIG[s.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
                      const statusCfg = SUGESTAO_STATUS_CONFIG[s.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: s.status }
                      return (
                        <th key={s.id} className="text-center py-2 px-3 font-semibold text-gray-600 min-w-[140px]">
                          <div className="flex items-center justify-center gap-1.5 mb-0.5">
                            <span>Rodada {idx + 1}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${autorCfg.bgIcon}`}>{autorCfg.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2 px-3 text-gray-800 sticky left-0 bg-white z-10">
                        <div className="font-medium truncate max-w-[180px]">{item.descricao || '-'}</div>
                        {item.codigo_fornecedor && (
                          <div className="text-[10px] text-gray-400 font-mono">{item.codigo_fornecedor}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="font-semibold">{item.quantidade}</div>
                        <div className="text-[10px] text-gray-400">{formatCurrency(item.valor)}/un</div>
                      </td>
                      {sortedSugestoes.map((s) => {
                        const si = s.sugestoes_fornecedor_itens?.find(
                          (sfi) => sfi.item_pedido_compra_id === item.id
                        )
                        if (!si) {
                          return (
                            <td key={s.id} className="py-2 px-3 text-center text-gray-300">
                              -
                            </td>
                          )
                        }
                        const delta = si.quantidade_sugerida - item.quantidade
                        return (
                          <td key={s.id} className="py-2 px-3 text-center">
                            <div className="font-semibold">
                              {si.quantidade_sugerida}
                              {delta !== 0 && (
                                <span className={`ml-1 text-[10px] ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {delta > 0 ? '+' : ''}{delta}
                                </span>
                              )}
                            </div>
                            {si.desconto_percentual > 0 && (
                              <div className="text-[10px] text-green-600 font-medium">-{formatPercent(si.desconto_percentual)}</div>
                            )}
                            {si.bonificacao_quantidade > 0 && (
                              <div className="text-[10px] text-blue-600 font-medium">+{si.bonificacao_quantidade} bonif.</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                {/* Summary row */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="py-2 px-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                      Total Estimado
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-gray-900">
                      {formatCurrency(itens.reduce((sum, item) => sum + item.quantidade * item.valor, 0))}
                    </td>
                    {sortedSugestoes.map((s) => {
                      let roundTotal = 0
                      for (const item of itens) {
                        const si = s.sugestoes_fornecedor_itens?.find(
                          (sfi) => sfi.item_pedido_compra_id === item.id
                        )
                        if (si) {
                          roundTotal += item.valor * (1 - (si.desconto_percentual || 0) / 100) * si.quantidade_sugerida
                        } else {
                          roundTotal += item.valor * item.quantidade
                        }
                      }
                      if (s.desconto_geral) {
                        roundTotal = roundTotal * (1 - s.desconto_geral / 100)
                      }
                      const originalTotal = itens.reduce((sum, item) => sum + item.quantidade * item.valor, 0)
                      const diff = roundTotal - originalTotal

                      return (
                        <td key={s.id} className="py-2 px-3 text-center">
                          <div className="font-bold text-gray-900">{formatCurrency(roundTotal)}</div>
                          {diff !== 0 && (
                            <div className={`text-[10px] font-semibold ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SECTION 5: COMMERCIAL CONDITIONS COMPARISON                   */}
        {/* ============================================================= */}
        {sortedSugestoes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SectionTitle>Comparativo de Condicoes Comerciais</SectionTitle>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 sticky left-0 bg-white z-10 min-w-[160px]">Condicao</th>
                    {sortedSugestoes.map((s, idx) => {
                      const autorCfg = AUTOR_TIPO_CONFIG[s.autor_tipo] || AUTOR_TIPO_CONFIG.sistema
                      return (
                        <th key={s.id} className="text-center py-2 px-3 font-semibold text-gray-600 min-w-[120px]">
                          <div>Rodada {idx + 1}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${autorCfg.bgIcon}`}>{autorCfg.label}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Desconto Geral */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-medium text-gray-700 sticky left-0 bg-white z-10">Desconto Geral</td>
                    {sortedSugestoes.map((s, idx) => {
                      const prev = idx > 0 ? sortedSugestoes[idx - 1].desconto_geral : null
                      const changed = idx > 0 && s.desconto_geral !== prev
                      return (
                        <td key={s.id} className="py-2.5 px-3 text-center">
                          {s.desconto_geral != null ? (
                            <span className={`font-semibold ${changed ? 'text-green-600' : 'text-gray-900'}`}>
                              {formatPercent(s.desconto_geral)}
                              {changed && (
                                <svg className="w-3 h-3 inline-block ml-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
                                </svg>
                              )}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Bonificacao Geral */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-medium text-gray-700 sticky left-0 bg-white z-10">Bonificacao Geral</td>
                    {sortedSugestoes.map((s, idx) => {
                      const prev = idx > 0 ? sortedSugestoes[idx - 1].bonificacao_quantidade_geral : null
                      const changed = idx > 0 && s.bonificacao_quantidade_geral !== prev
                      return (
                        <td key={s.id} className="py-2.5 px-3 text-center">
                          {s.bonificacao_quantidade_geral != null && s.bonificacao_quantidade_geral > 0 ? (
                            <span className={`font-semibold ${changed ? 'text-blue-600' : 'text-gray-900'}`}>
                              {s.bonificacao_quantidade_geral} un.
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Prazo Entrega */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-medium text-gray-700 sticky left-0 bg-white z-10">Prazo Entrega</td>
                    {sortedSugestoes.map((s, idx) => {
                      const prev = idx > 0 ? sortedSugestoes[idx - 1].prazo_entrega_dias : null
                      const changed = idx > 0 && s.prazo_entrega_dias !== prev
                      return (
                        <td key={s.id} className="py-2.5 px-3 text-center">
                          {s.prazo_entrega_dias != null ? (
                            <span className={`font-semibold ${changed ? 'text-amber-600' : 'text-gray-900'}`}>
                              {s.prazo_entrega_dias} dias
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Valor Minimo */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-medium text-gray-700 sticky left-0 bg-white z-10">Valor Minimo</td>
                    {sortedSugestoes.map((s, idx) => {
                      const prev = idx > 0 ? sortedSugestoes[idx - 1].valor_minimo_pedido : null
                      const changed = idx > 0 && s.valor_minimo_pedido !== prev
                      return (
                        <td key={s.id} className="py-2.5 px-3 text-center">
                          {s.valor_minimo_pedido != null ? (
                            <span className={`font-semibold ${changed ? 'text-orange-600' : 'text-gray-900'}`}>
                              {formatCurrency(s.valor_minimo_pedido)}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Validade Proposta */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-medium text-gray-700 sticky left-0 bg-white z-10">Validade Proposta</td>
                    {sortedSugestoes.map((s, idx) => {
                      const prev = idx > 0 ? sortedSugestoes[idx - 1].validade_proposta : null
                      const changed = idx > 0 && s.validade_proposta !== prev
                      return (
                        <td key={s.id} className="py-2.5 px-3 text-center">
                          {s.validade_proposta ? (
                            <span className={`font-semibold ${changed ? 'text-purple-600' : 'text-gray-900'}`}>
                              {formatDate(s.validade_proposta)}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
