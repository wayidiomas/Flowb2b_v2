'use client'

import { useState, useEffect } from 'react'

interface TimelineEvent {
  id: number
  evento: string
  descricao?: string
  autor_tipo: 'lojista' | 'fornecedor' | 'sistema'
  autor_nome?: string
  created_at: string
}

const EVENTO_ICONS: Record<string, { icon: string; color: string }> = {
  pedido_criado: { icon: '📦', color: 'bg-blue-100 text-blue-600' },
  enviado_fornecedor: { icon: '📤', color: 'bg-blue-100 text-blue-600' },
  sugestao_enviada: { icon: '💡', color: 'bg-amber-100 text-amber-600' },
  sugestao_aceita: { icon: '✅', color: 'bg-green-100 text-green-600' },
  sugestao_rejeitada: { icon: '❌', color: 'bg-red-100 text-red-600' },
  status_alterado: { icon: '🔄', color: 'bg-gray-100 text-gray-600' },
  pedido_editado: { icon: '✏️', color: 'bg-gray-100 text-gray-600' },
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-4">
          {events.map((event, index) => {
            const config = EVENTO_ICONS[event.evento] || { icon: '📋', color: 'bg-gray-100 text-gray-600' }
            const autorColor = AUTOR_COLORS[event.autor_tipo] || 'text-gray-500'

            return (
              <div key={event.id} className="relative flex gap-3 pl-1">
                {/* Icone do evento */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.color}`}>
                  {config.icon}
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
