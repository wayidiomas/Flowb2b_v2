'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton } from '@/components/ui'

interface PedidoItem {
  id: number
  descricao: string
  codigo_produto: string
  codigo_fornecedor: string
  unidade: string
  valor: number
  quantidade: number
  aliquota_ipi: number
  produto_id: number | null
}

interface SugestaoItem {
  item_pedido_compra_id: number
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_percentual: number
  validade: string | null
}

interface TimelineEvent {
  id: number
  evento: string
  descricao: string
  autor_tipo: string
  autor_nome: string
  created_at: string
}

interface PedidoDetail {
  pedido: {
    id: number
    numero: string
    data: string
    data_prevista: string | null
    total: number
    total_produtos: number
    desconto: number
    frete: number
    status_interno: string
    observacoes: string | null
    empresa_nome: string
  }
  itens: PedidoItem[]
  sugestoes: {
    id: number
    status: string
    observacao_fornecedor: string | null
    observacao_lojista: string | null
    created_at: string
  }[]
  sugestaoItens: SugestaoItem[] | null
  timeline: TimelineEvent[]
}

// Mapeamento para o formulario de sugestao por item
interface ItemSugestao {
  item_id: number
  produto_id: number | null
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_percentual: number
  validade: string
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado_fornecedor: 'bg-blue-100 text-blue-700',
  sugestao_pendente: 'bg-amber-100 text-amber-700',
  aceito: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
  finalizado: 'bg-purple-100 text-purple-700',
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Aguardando resposta',
  sugestao_pendente: 'Sugestao enviada',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
}

const eventoLabels: Record<string, string> = {
  pedido_criado: 'Pedido criado',
  pedido_editado: 'Pedido editado',
  status_alterado: 'Status alterado',
  enviado_fornecedor: 'Enviado ao fornecedor',
  sugestao_enviada: 'Sugestao enviada',
  sugestao_aceita: 'Sugestao aceita',
  sugestao_rejeitada: 'Sugestao rejeitada',
}

const autorColors: Record<string, string> = {
  lojista: 'bg-blue-500',
  fornecedor: 'bg-emerald-500',
  sistema: 'bg-gray-400',
}

export default function FornecedorPedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, loading: authLoading } = useFornecedorAuth()
  const [data, setData] = useState<PedidoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sugestoes, setSugestoes] = useState<ItemSugestao[]>([])
  const [observacao, setObservacao] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    const fetchPedido = async () => {
      try {
        const res = await fetch(`/api/fornecedor/pedidos/${id}`)
        if (res.ok) {
          const json: PedidoDetail = await res.json()
          setData(json)

          // Inicializar sugestoes com valores atuais
          const initialSugestoes: ItemSugestao[] = json.itens.map(item => {
            // Se ja tem sugestao anterior, usar esses valores
            const existingSugestao = json.sugestaoItens?.find(
              s => s.item_pedido_compra_id === item.id
            )
            return {
              item_id: item.id,
              produto_id: item.produto_id,
              quantidade_sugerida: existingSugestao?.quantidade_sugerida ?? item.quantidade,
              desconto_percentual: existingSugestao?.desconto_percentual ?? 0,
              bonificacao_percentual: existingSugestao?.bonificacao_percentual ?? 0,
              validade: existingSugestao?.validade || '',
            }
          })
          setSugestoes(initialSugestoes)
        }
      } catch (err) {
        console.error('Erro ao carregar pedido:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPedido()
  }, [user, id])

  const updateSugestao = (itemId: number, field: keyof ItemSugestao, value: number | string) => {
    setSugestoes(prev =>
      prev.map(s => (s.item_id === itemId ? { ...s, [field]: value } : s))
    )
  }

  const handleSubmitSugestao = async () => {
    if (!data) return
    setSubmitting(true)
    setToast(null)

    try {
      const payload = {
        itens: sugestoes.map(s => ({
          item_pedido_compra_id: s.item_id,
          produto_id: s.produto_id,
          quantidade_sugerida: s.quantidade_sugerida,
          desconto_percentual: s.desconto_percentual,
          bonificacao_percentual: s.bonificacao_percentual,
          validade: s.validade || null,
        })),
        observacao: observacao || undefined,
      }

      const res = await fetch(`/api/fornecedor/pedidos/${id}/sugestao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (result.success) {
        setToast({ type: 'success', msg: 'Sugestao enviada com sucesso!' })
        // Recarregar dados
        setTimeout(() => router.refresh(), 1500)
      } else {
        setToast({ type: 'error', msg: result.error || 'Erro ao enviar sugestao' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Erro de conexao' })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <FornecedorLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </FornecedorLayout>
    )
  }

  if (!data) {
    return (
      <FornecedorLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Pedido nao encontrado.</p>
        </div>
      </FornecedorLayout>
    )
  }

  const { pedido, itens, sugestoes: sugestoesExistentes, timeline } = data
  const canSuggest = ['enviado_fornecedor', 'sugestao_pendente'].includes(pedido.status_interno)
  const lastSugestao = sugestoesExistentes?.[0]

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success' ? 'bg-success-500/10 text-success-600' : 'bg-error-500/10 text-error-600'
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => router.push('/fornecedor/pedidos')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
              Pedido #{pedido.numero}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {pedido.empresa_nome} - {new Date(pedido.data).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
            {statusLabels[pedido.status_interno] || pedido.status_interno}
          </span>
        </div>

        {/* Sugestao rejeitada/aceita feedback */}
        {lastSugestao?.status === 'rejeitada' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Sua ultima sugestao foi rejeitada</p>
            {lastSugestao.observacao_lojista && (
              <p className="text-sm text-red-600 mt-1">Motivo: {lastSugestao.observacao_lojista}</p>
            )}
          </div>
        )}

        {lastSugestao?.status === 'aceita' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800">Sua sugestao foi aceita!</p>
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total produtos</p>
              <p className="text-lg font-medium text-gray-900">
                R$ {pedido.total_produtos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Desconto</p>
              <p className="text-lg font-medium text-gray-900">
                R$ {(pedido.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Frete</p>
              <p className="text-lg font-medium text-gray-900">
                R$ {(pedido.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-lg font-bold text-primary-700">
                R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          {pedido.data_prevista && (
            <p className="text-sm text-gray-500 mt-4">
              Data prevista de entrega: <strong>{new Date(pedido.data_prevista).toLocaleDateString('pt-BR')}</strong>
            </p>
          )}
          {pedido.observacoes && (
            <p className="text-sm text-gray-600 mt-2">
              Observacoes: {pedido.observacoes}
            </p>
          )}
        </div>

        {/* Itens + Formulario de sugestao */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {canSuggest ? 'Itens - Enviar sugestao' : 'Itens do pedido'}
            </h2>
            {canSuggest && (
              <p className="text-sm text-gray-500 mt-1">
                Altere quantidade, desconto, bonificacao e validade para enviar sua sugestao comercial
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Cod.</th>
                  <th className="px-4 py-3">Und</th>
                  <th className="px-4 py-3 text-right">Valor unit.</th>
                  <th className="px-4 py-3 text-right">Qtd original</th>
                  {canSuggest && (
                    <>
                      <th className="px-4 py-3 text-right bg-blue-50">Qtd sugerida</th>
                      <th className="px-4 py-3 text-right bg-blue-50">Desconto %</th>
                      <th className="px-4 py-3 text-right bg-blue-50">Bonif. %</th>
                      <th className="px-4 py-3 bg-blue-50">Validade</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itens.map((item) => {
                  const sug = sugestoes.find(s => s.item_id === item.id)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={item.descricao}>
                        {item.descricao}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.codigo_produto || item.codigo_fornecedor}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {item.quantidade}
                      </td>
                      {canSuggest && sug && (
                        <>
                          <td className="px-4 py-2 bg-blue-50/50">
                            <input
                              type="number"
                              min={0}
                              value={sug.quantidade_sugerida}
                              onChange={(e) => updateSugestao(item.id, 'quantidade_sugerida', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2 bg-blue-50/50">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={sug.desconto_percentual}
                              onChange={(e) => updateSugestao(item.id, 'desconto_percentual', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2 bg-blue-50/50">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={sug.bonificacao_percentual}
                              onChange={(e) => updateSugestao(item.id, 'bonificacao_percentual', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2 bg-blue-50/50">
                            <input
                              type="date"
                              value={sug.validade}
                              onChange={(e) => updateSugestao(item.id, 'validade', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        R$ {(item.valor * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Observacao + Submit */}
          {canSuggest && (
            <div className="px-6 py-4 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observacao para o lojista (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Justifique suas sugestoes, informe prazos, condicoes especiais..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  onClick={handleSubmitSugestao}
                >
                  Enviar sugestao
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Historico</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {timeline.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${autorColors[event.autor_tipo] || 'bg-gray-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <strong>{eventoLabels[event.evento] || event.evento}</strong>
                      </p>
                      {event.descricao && (
                        <p className="text-sm text-gray-500 mt-0.5">{event.descricao}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {event.autor_nome} - {new Date(event.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
