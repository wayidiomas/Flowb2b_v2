'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogoUpdateModalProps {
  catalogoId: number
  catalogoNome: string
  totalPendentes: number
  onClose: () => void
  onComplete: () => void
}

type TipoAtualizacao = 'novo' | 'preco_alterado' | 'dados_alterados' | 'removido'

interface Atualizacao {
  id: number
  tipo: TipoAtualizacao
  produto_nome: string
  /** Preco atual (para novos e preco alterado) */
  preco_atual?: number
  /** Preco anterior (para preco alterado) */
  preco_anterior?: number
  /** Descricao da mudanca (para dados alterados) */
  descricao_mudanca?: string
}

interface AtualizacoesResponse {
  atualizacoes: Atualizacao[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function calcPercentChange(anterior: number, atual: number): number {
  if (anterior === 0) return 0
  return ((atual - anterior) / anterior) * 100
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `(${sign}${value.toFixed(1)}%)`
}

// ---------------------------------------------------------------------------
// Section config per type
// ---------------------------------------------------------------------------

const SECTION_CONFIG: Record<
  TipoAtualizacao,
  { label: string; color: string; bgColor: string; badgeBg: string; badgeText: string }
> = {
  novo: {
    label: 'Novos',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
  preco_alterado: {
    label: 'Preco Alterado',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
  removido: {
    label: 'Removidos',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
  },
  dados_alterados: {
    label: 'Dados Alterados',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
  },
}

const SECTION_ORDER: TipoAtualizacao[] = [
  'novo',
  'preco_alterado',
  'removido',
  'dados_alterados',
]

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckAllIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 7l-8.5 8.5L5 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 7l-8.5 8.5-1.5-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Checkbox component
// ---------------------------------------------------------------------------

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`
        flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
        transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#336FB6]
        ${
          checked
            ? 'bg-[#336FB6] border-[#336FB6]'
            : 'bg-white border-gray-300 hover:border-gray-400'
        }
      `}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function UpdateSection({
  tipo,
  items,
  selected,
  onToggle,
}: {
  tipo: TipoAtualizacao
  items: Atualizacao[]
  selected: Set<number>
  onToggle: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const config = SECTION_CONFIG[tipo]

  if (items.length === 0) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center justify-between px-4 py-3
          ${config.bgColor} hover:opacity-90 transition-opacity
        `}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}
          >
            {items.length}
          </span>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 ${config.color} transition-transform duration-200 ${
            expanded ? '' : '-rotate-90'
          }`}
        />
      </button>

      {/* Section items */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Checkbox
                checked={selected.has(item.id)}
                onChange={() => onToggle(item.id)}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate block">
                  {item.produto_nome}
                </span>
              </div>
              <div className="flex-shrink-0 text-right">
                {tipo === 'novo' && item.preco_atual != null && (
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(item.preco_atual)}
                  </span>
                )}
                {tipo === 'preco_alterado' &&
                  item.preco_anterior != null &&
                  item.preco_atual != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(item.preco_anterior)}
                      </span>
                      <span className="text-sm text-gray-400">{'→'}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(item.preco_atual)}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          calcPercentChange(item.preco_anterior, item.preco_atual) >= 0
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {formatPercent(
                          calcPercentChange(item.preco_anterior, item.preco_atual)
                        )}
                      </span>
                    </div>
                  )}
                {tipo === 'removido' && (
                  <span className="text-xs text-red-500 italic">
                    sera inativado
                  </span>
                )}
                {tipo === 'dados_alterados' && item.descricao_mudanca && (
                  <span className="text-xs text-blue-600">
                    {item.descricao_mudanca}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CatalogoUpdateModal({
  catalogoId,
  catalogoNome,
  totalPendentes,
  onClose,
  onComplete,
}: CatalogoUpdateModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [atualizacoes, setAtualizacoes] = useState<Atualizacao[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // ── Fetch updates on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchAtualizacoes() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/catalogo-atualizacoes/${catalogoId}`)
        if (!res.ok) throw new Error('Erro ao carregar atualizacoes do catalogo')
        const data: AtualizacoesResponse = await res.json()
        if (!cancelled) {
          const items = data.atualizacoes ?? []
          setAtualizacoes(items)
          // All selected by default
          setSelected(new Set(items.map((a) => a.id)))
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro ao carregar atualizacoes'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAtualizacoes()
    return () => {
      cancelled = true
    }
  }, [catalogoId])

  // ── Toggle item selection ───────────────────────────────────────────────
  const toggleItem = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // ── Select all ──────────────────────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    setSelected(new Set(atualizacoes.map((a) => a.id)))
  }, [atualizacoes])

  // ── Group by type ───────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<TipoAtualizacao, Atualizacao[]> = {
      novo: [],
      preco_alterado: [],
      dados_alterados: [],
      removido: [],
    }
    for (const item of atualizacoes) {
      if (map[item.tipo]) {
        map[item.tipo].push(item)
      }
    }
    return map
  }, [atualizacoes])

  // ── Counts ──────────────────────────────────────────────────────────────
  const selectedCount = selected.size
  const totalCount = atualizacoes.length
  const unselectedIds = useMemo(
    () => atualizacoes.filter((a) => !selected.has(a.id)).map((a) => a.id),
    [atualizacoes, selected]
  )
  const hasUnselected = unselectedIds.length > 0

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      setSaving(true)
      setError(null)

      const selectedIds = Array.from(selected)

      // Accept selected items
      if (selectedIds.length > 0) {
        const resAceitar = await fetch('/api/catalogo-atualizacoes/responder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, acao: 'aceitar' }),
        })
        if (!resAceitar.ok) {
          throw new Error('Erro ao aceitar atualizacoes selecionadas')
        }
      }

      // Reject unselected items
      if (unselectedIds.length > 0) {
        const resRejeitar = await fetch('/api/catalogo-atualizacoes/responder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unselectedIds, acao: 'rejeitar' }),
        })
        if (!resRejeitar.ok) {
          throw new Error('Erro ao rejeitar atualizacoes nao selecionadas')
        }
      }

      onComplete()
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao processar atualizacoes'
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Summary counts per type ─────────────────────────────────────────────
  const typeCounts = useMemo(() => {
    return SECTION_ORDER.map((tipo) => ({
      tipo,
      count: grouped[tipo].length,
      config: SECTION_CONFIG[tipo],
    })).filter((t) => t.count > 0)
  }, [grouped])

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        <ModalTitle>
          Atualizacao de Catalogo — {catalogoNome}
        </ModalTitle>
      </ModalHeader>

      <ModalBody>
        {loading ? (
          <LoadingSkeleton />
        ) : error && atualizacoes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-[#336FB6] hover:underline font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">
                {totalCount} {totalCount === 1 ? 'mudanca pendente' : 'mudancas pendentes'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {typeCounts.map(({ tipo, count, config }) => (
                  <span
                    key={tipo}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.badgeBg} ${config.badgeText}`}
                  >
                    {config.label}: {count}
                  </span>
                ))}
              </div>
            </div>

            {/* Accept all button */}
            {selectedCount < totalCount && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg
                  text-sm font-semibold text-gray-900
                  bg-[#FFAA11] hover:bg-[#E89A00]
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-[#FFAA11] focus:ring-offset-2
                "
              >
                <CheckAllIcon className="w-4 h-4" />
                Aceitar Tudo
              </button>
            )}

            {/* Error after partial load */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-3">
              {SECTION_ORDER.map((tipo) => (
                <UpdateSection
                  key={tipo}
                  tipo={tipo}
                  items={grouped[tipo]}
                  selected={selected}
                  onToggle={toggleItem}
                />
              ))}
            </div>
          </div>
        )}
      </ModalBody>

      {!loading && atualizacoes.length > 0 && (
        <ModalFooter>
          <div className="flex items-center gap-3 w-full justify-end">
            {hasUnselected && (
              <Button
                variant="outline"
                size="md"
                onClick={handleSubmit}
                loading={saving}
                disabled={saving}
                className="!border-red-300 !text-red-600 hover:!bg-red-50"
              >
                Rejeitar Restantes
              </Button>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={handleSubmit}
              loading={saving}
              disabled={saving || selectedCount === 0}
              className="!bg-[#336FB6] hover:!bg-[#2A5D9E] focus:!ring-[#336FB6]"
            >
              Aplicar Selecionados ({selectedCount})
            </Button>
          </div>
        </ModalFooter>
      )}
    </Modal>
  )
}
