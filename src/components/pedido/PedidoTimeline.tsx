'use client'

import React, { useState, useEffect } from 'react'

interface TimelineEvent {
  id: number
  evento: string
  descricao?: string
  autor_tipo: 'lojista' | 'fornecedor' | 'sistema'
  autor_nome?: string
  created_at: string
}

// Icones SVG para a timeline
function PackageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  )
}

// Mapeamento de eventos para icones
const EVENTO_ICONS: Record<string, { icon: () => React.ReactElement; variant: 'default' | 'success' | 'error' }> = {
  pedido_criado: { icon: PackageIcon, variant: 'default' },
  enviado_fornecedor: { icon: SendIcon, variant: 'default' },
  sugestao_enviada: { icon: LightbulbIcon, variant: 'default' },
  sugestao_aceita: { icon: CheckIcon, variant: 'success' },
  sugestao_rejeitada: { icon: XCircleIcon, variant: 'error' },
  status_alterado: { icon: RefreshIcon, variant: 'default' },
  pedido_editado: { icon: PencilIcon, variant: 'default' },
}

const AUTOR_COLORS: Record<string, string> = {
  lojista: 'text-blue-600',
  fornecedor: 'text-green-600',
  sistema: 'text-gray-500',
}

interface PedidoTimelineProps {
  pedidoCompraId: number
  className?: string
}

export function PedidoTimeline({ pedidoCompraId, className = '' }: PedidoTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/pedidos-compra/${pedidoCompraId}/timeline`)
        if (res.ok) {
          const data = await res.json()
          setEvents(data.timeline || [])
        }
      } catch (err) {
        console.error('Erro ao buscar timeline:', err)
      } finally {
        setLoading(false)
      }
    }

    if (pedidoCompraId) {
      fetchTimeline()
    }
  }, [pedidoCompraId])

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
          Timeline
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return null
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
        Timeline
      </h3>
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-amber-200" />

        <div className="space-y-4">
          {events.map((event) => {
            const config = EVENTO_ICONS[event.evento] || { icon: ClipboardIcon, variant: 'default' as const }
            const autorColor = AUTOR_COLORS[event.autor_tipo] || 'text-gray-500'
            const IconComponent = config.icon

            // Cores baseadas no variant
            const iconColors = {
              default: 'bg-amber-100 text-amber-600',
              success: 'bg-green-100 text-green-600',
              error: 'bg-red-100 text-red-600',
            }

            return (
              <div key={event.id} className="relative flex gap-3 pl-1">
                {/* Icone do evento */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${iconColors[config.variant]}`}>
                  <IconComponent />
                </div>

                {/* Conteudo */}
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-sm text-gray-900">
                    {event.descricao || event.evento}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {event.autor_nome && (
                      <span className={`text-xs font-medium ${autorColor}`}>
                        {event.autor_nome}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(event.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
