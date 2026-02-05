'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { CancelamentoModal } from '@/components/pedido/CancelamentoModal'
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

interface SugestaoInfo {
  id: number
  status: string
  observacao_fornecedor: string | null
  observacao_lojista: string | null
  created_at: string
  autor_tipo: 'fornecedor' | 'lojista'
  valor_minimo_pedido?: number
  desconto_geral?: number
  bonificacao_geral?: number
  prazo_entrega_dias?: number
  validade_proposta?: string
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
    frete_por_conta: string | null
    forma_pagamento: string | null
    transportador: string | null
    status_interno: string
    observacoes: string | null
    empresa_nome: string
  }
  itens: PedidoItem[]
  sugestoes: SugestaoInfo[]
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

// Condicoes comerciais gerais da sugestao
interface CondicoesComerciais {
  valor_minimo_pedido: number
  desconto_geral: number
  bonificacao_geral: number
  prazo_entrega_dias: number
  validade_proposta: string
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado_fornecedor: 'bg-amber-100 text-amber-700',
  sugestao_pendente: 'bg-orange-100 text-orange-700',
  contra_proposta_pendente: 'bg-blue-100 text-blue-700',
  aceito: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
  finalizado: 'bg-purple-100 text-purple-700',
  cancelado: 'bg-gray-200 text-gray-600',
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Aguardando resposta',
  sugestao_pendente: 'Sugestao enviada',
  contra_proposta_pendente: 'Contra-proposta recebida',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

// Estados finais que nao podem ser alterados
const ESTADOS_FINAIS = ['finalizado', 'cancelado']

const eventoLabels: Record<string, string> = {
  pedido_criado: 'Pedido criado',
  pedido_editado: 'Pedido editado',
  status_alterado: 'Status alterado',
  enviado_fornecedor: 'Enviado ao fornecedor',
  sugestao_enviada: 'Sugestao enviada',
  sugestao_aceita: 'Sugestao aceita',
  sugestao_rejeitada: 'Sugestao rejeitada',
  contra_proposta_enviada: 'Contra-proposta enviada',
  contra_proposta_aceita: 'Contra-proposta aceita',
  contra_proposta_rejeitada: 'Contra-proposta rejeitada',
  cancelado: 'Pedido cancelado',
  finalizado: 'Pedido finalizado',
}

const autorColors: Record<string, string> = {
  lojista: 'bg-blue-500',
  fornecedor: 'bg-amber-500',
  sistema: 'bg-gray-400',
}

export default function FornecedorPedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, loading: authLoading } = useFornecedorAuth()
  const [data, setData] = useState<PedidoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sugestoes, setSugestoes] = useState<ItemSugestao[]>([])
  const [observacao, setObservacao] = useState('')
  const [condicoesComerciais, setCondicoesComerciais] = useState<CondicoesComerciais>({
    valor_minimo_pedido: 0,
    desconto_geral: 0,
    bonificacao_geral: 0,
    prazo_entrega_dias: 0,
    validade_proposta: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [processandoContraProposta, setProcessandoContraProposta] = useState(false)
  const [observacaoRespostaCP, setObservacaoRespostaCP] = useState('')
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

  // Calculo em tempo real dos valores sugeridos
  const calcularTotaisSugeridos = () => {
    if (!data) return null

    // Total original
    const totalOriginal = data.itens.reduce((sum, item) => sum + item.valor * item.quantidade, 0)

    // Total sugerido (com desconto por item)
    let totalSugeridoItens = 0
    let totalDescontoItens = 0
    let totalBonificacaoUnidades = 0

    data.itens.forEach(item => {
      const sug = sugestoes.find(s => s.item_id === item.id)
      if (sug) {
        const subtotalOriginal = item.valor * sug.quantidade_sugerida
        const descontoItem = subtotalOriginal * (sug.desconto_percentual / 100)
        const subtotalComDesconto = subtotalOriginal - descontoItem

        totalSugeridoItens += subtotalComDesconto
        totalDescontoItens += descontoItem

        // Bonificacao: unidades extras gratis
        if (sug.bonificacao_percentual > 0) {
          totalBonificacaoUnidades += Math.floor(sug.quantidade_sugerida * sug.bonificacao_percentual / 100)
        }
      } else {
        totalSugeridoItens += item.valor * item.quantidade
      }
    })

    // Aplicar desconto geral se atingir valor minimo
    let descontoGeral = 0
    let bonificacaoGeralUnidades = 0
    if (condicoesComerciais.valor_minimo_pedido > 0 && totalSugeridoItens >= condicoesComerciais.valor_minimo_pedido) {
      if (condicoesComerciais.desconto_geral > 0) {
        descontoGeral = totalSugeridoItens * (condicoesComerciais.desconto_geral / 100)
      }
      if (condicoesComerciais.bonificacao_geral > 0) {
        // Bonificacao geral: % sobre total de unidades sugeridas
        const totalUnidades = sugestoes.reduce((sum, s) => sum + s.quantidade_sugerida, 0)
        bonificacaoGeralUnidades = Math.floor(totalUnidades * condicoesComerciais.bonificacao_geral / 100)
      }
    }

    const totalFinal = totalSugeridoItens - descontoGeral + (data.pedido.frete || 0)
    const descontoTotal = totalDescontoItens + descontoGeral
    const economia = totalOriginal - (totalSugeridoItens - descontoGeral)
    const economiaPercentual = totalOriginal > 0 ? (economia / totalOriginal) * 100 : 0

    return {
      totalOriginal,
      totalSugeridoItens,
      totalDescontoItens,
      descontoGeral,
      descontoTotal,
      totalFinal,
      economia,
      economiaPercentual,
      totalBonificacaoUnidades: totalBonificacaoUnidades + bonificacaoGeralUnidades,
      atingiuValorMinimo: condicoesComerciais.valor_minimo_pedido > 0 && totalSugeridoItens >= condicoesComerciais.valor_minimo_pedido,
    }
  }

  const totaisSugeridos = calcularTotaisSugeridos()

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
        condicoes_comerciais: {
          valor_minimo_pedido: condicoesComerciais.valor_minimo_pedido || undefined,
          desconto_geral: condicoesComerciais.desconto_geral || undefined,
          bonificacao_geral: condicoesComerciais.bonificacao_geral || undefined,
          prazo_entrega_dias: condicoesComerciais.prazo_entrega_dias || undefined,
          validade_proposta: condicoesComerciais.validade_proposta || undefined,
        },
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

  const handleCancelar = async (motivo: string) => {
    if (!data) return
    setCancelando(true)
    setToast(null)
    try {
      const res = await fetch(`/api/fornecedor/pedidos/${id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })

      const result = await res.json()
      if (res.ok && result.success) {
        setToast({ type: 'success', msg: 'Pedido cancelado com sucesso' })
        setShowCancelamentoModal(false)
        // Atualizar status local
        setData(prev => prev ? {
          ...prev,
          pedido: { ...prev.pedido, status_interno: 'cancelado' }
        } : null)
      } else {
        throw new Error(result.error || 'Falha ao cancelar')
      }
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao cancelar' })
      throw err
    } finally {
      setCancelando(false)
    }
  }

  const handleResponderContraProposta = async (action: 'aceitar' | 'rejeitar', sugestaoId: number) => {
    if (!data) return
    setProcessandoContraProposta(true)
    setToast(null)

    try {
      const res = await fetch(`/api/fornecedor/pedidos/${id}/responder-contra-proposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sugestao_id: sugestaoId,
          observacao: observacaoRespostaCP || undefined,
        }),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setToast({
          type: 'success',
          msg: action === 'aceitar'
            ? 'Contra-proposta aceita com sucesso!'
            : 'Contra-proposta rejeitada'
        })
        setObservacaoRespostaCP('')
        // Recarregar dados para atualizar status
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setToast({ type: 'error', msg: result.error || 'Erro ao processar resposta' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Erro de conexao' })
    } finally {
      setProcessandoContraProposta(false)
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
  const canCancel = !ESTADOS_FINAIS.includes(pedido.status_interno)

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
              className="text-sm text-gray-500 hover:text-[#336FB6] mb-2 flex items-center gap-1 transition-colors"
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
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[pedido.status_interno] || pedido.status_interno}
            </span>
            {canCancel && (
              <button
                onClick={() => setShowCancelamentoModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar Pedido
              </button>
            )}
          </div>
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

        {/* Contra-proposta do lojista */}
        {pedido.status_interno === 'contra_proposta_pendente' && lastSugestao?.autor_tipo === 'lojista' && lastSugestao?.status === 'pendente' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-blue-100 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h2 className="text-lg font-semibold text-blue-900">Contra-proposta do Lojista</h2>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                O lojista enviou uma contra-proposta. Analise e responda abaixo.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Observacao do lojista */}
              {lastSugestao.observacao_lojista && (
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <p className="text-sm font-medium text-gray-700 mb-1">Mensagem do lojista:</p>
                  <p className="text-sm text-gray-600 italic">&quot;{lastSugestao.observacao_lojista}&quot;</p>
                </div>
              )}

              {/* Itens da contra-proposta */}
              {data.sugestaoItens && data.sugestaoItens.length > 0 && (
                <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <p className="text-sm font-medium text-gray-700">Itens propostos pelo lojista:</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                          <th className="px-4 py-2">Produto</th>
                          <th className="px-4 py-2 text-right">Qtd Original</th>
                          <th className="px-4 py-2 text-right">Qtd Proposta</th>
                          <th className="px-4 py-2 text-right">Desconto</th>
                          <th className="px-4 py-2 text-right">Bonificacao</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.sugestaoItens.map((sItem) => {
                          const item = itens.find(i => i.id === sItem.item_pedido_compra_id)
                          if (!item) return null
                          const diferencaQtd = sItem.quantidade_sugerida - item.quantidade
                          return (
                            <tr key={sItem.item_pedido_compra_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">{item.descricao}</td>
                              <td className="px-4 py-2 text-right text-gray-500">{item.quantidade}</td>
                              <td className="px-4 py-2 text-right font-medium">
                                <span className={diferencaQtd !== 0 ? (diferencaQtd > 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}>
                                  {sItem.quantidade_sugerida}
                                  {diferencaQtd !== 0 && (
                                    <span className="text-xs ml-1">
                                      ({diferencaQtd > 0 ? '+' : ''}{diferencaQtd})
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                {sItem.desconto_percentual > 0 ? (
                                  <span className="text-emerald-600">{sItem.desconto_percentual}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {sItem.bonificacao_percentual > 0 ? (
                                  <span className="text-blue-600">{sItem.bonificacao_percentual}%</span>
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
                </div>
              )}

              {/* Campo de resposta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sua resposta (opcional)
                </label>
                <textarea
                  value={observacaoRespostaCP}
                  onChange={(e) => setObservacaoRespostaCP(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Adicione uma observacao sobre sua decisao..."
                />
              </div>

              {/* Botoes de acao */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="success"
                  size="lg"
                  loading={processandoContraProposta}
                  onClick={() => handleResponderContraProposta('aceitar', lastSugestao.id)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aceitar Contra-proposta
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  loading={processandoContraProposta}
                  onClick={() => handleResponderContraProposta('rejeitar', lastSugestao.id)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rejeitar
                </Button>
                <p className="text-sm text-gray-500 w-full mt-2">
                  Ao aceitar, os valores propostos pelo lojista serao aplicados ao pedido.
                  Se rejeitar, o pedido voltara para aguardando resposta e voce podera enviar uma nova sugestao.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>

          {/* Valores Originais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 2xl:gap-6">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Total produtos</p>
              <p className="text-lg font-semibold text-gray-900">
                R$ {pedido.total_produtos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Desconto</p>
              <p className="text-lg font-semibold text-gray-900">
                R$ {(pedido.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Frete</p>
              <p className="text-lg font-semibold text-gray-900">
                R$ {(pedido.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-[#FFAA11]/15 rounded-xl">
              <p className="text-sm text-[#FFAA11]">Total</p>
              <p className="text-lg font-bold text-[#FFAA11]">
                R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Preview da Sugestao - Valores em tempo real */}
          {canSuggest && totaisSugeridos && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="text-sm font-semibold text-[#336FB6]">Preview da sua sugestao</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-[#336FB6]/5 rounded-xl border border-[#336FB6]/20">
                  <p className="text-sm text-[#336FB6]/70">Total c/ sugestao</p>
                  <p className="text-lg font-semibold text-[#336FB6]">
                    R$ {totaisSugeridos.totalSugeridoItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm text-emerald-600">Desconto itens</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    - R$ {totaisSugeridos.totalDescontoItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {totaisSugeridos.descontoGeral > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-600">Desconto geral ({condicoesComerciais.desconto_geral}%)</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      - R$ {totaisSugeridos.descontoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                <div className="p-3 bg-[#336FB6]/10 rounded-xl border border-[#336FB6]/30">
                  <p className="text-sm text-[#336FB6]">Total final sugerido</p>
                  <p className="text-lg font-bold text-[#336FB6]">
                    R$ {totaisSugeridos.totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Resumo da economia e bonificacao */}
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {totaisSugeridos.descontoTotal > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>
                      Desconto total: <strong>R$ {totaisSugeridos.descontoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      {totaisSugeridos.economiaPercentual > 0 && (
                        <span className="ml-1">({totaisSugeridos.economiaPercentual.toFixed(1)}%)</span>
                      )}
                    </span>
                  </div>
                )}
                {totaisSugeridos.totalBonificacaoUnidades > 0 && (
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <span>
                      Bonificacao: <strong>+{totaisSugeridos.totalBonificacaoUnidades} unidades gratis</strong>
                    </span>
                  </div>
                )}
                {condicoesComerciais.valor_minimo_pedido > 0 && (
                  <div className={`flex items-center gap-1.5 ${totaisSugeridos.atingiuValorMinimo ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {totaisSugeridos.atingiuValorMinimo ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    <span>
                      {totaisSugeridos.atingiuValorMinimo
                        ? `Valor minimo atingido (R$ ${condicoesComerciais.valor_minimo_pedido.toLocaleString('pt-BR')})`
                        : `Faltam R$ ${(condicoesComerciais.valor_minimo_pedido - totaisSugeridos.totalSugeridoItens).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para desconto/bonif. geral`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informacoes de Frete e Pagamento */}
          {(pedido.frete_por_conta || pedido.forma_pagamento || pedido.transportador) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Condicoes do Pedido</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pedido.frete_por_conta && (
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Frete por conta</p>
                      <p className="text-sm font-medium text-gray-900">
                        {pedido.frete_por_conta === 'R' ? 'Remetente (Fornecedor)' :
                         pedido.frete_por_conta === 'D' ? 'Destinatario (Lojista)' :
                         pedido.frete_por_conta === 'T' ? 'Terceiros' :
                         pedido.frete_por_conta === 'S' ? 'Sem frete' :
                         pedido.frete_por_conta}
                      </p>
                    </div>
                  </div>
                )}
                {pedido.forma_pagamento && (
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Forma de pagamento</p>
                      <p className="text-sm font-medium text-gray-900">{pedido.forma_pagamento}</p>
                    </div>
                  </div>
                )}
                {pedido.transportador && (
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Transportador</p>
                      <p className="text-sm font-medium text-gray-900">{pedido.transportador}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

        {/* Condicoes Comerciais - so aparece quando pode sugerir */}
        {canSuggest && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Condicoes Comerciais</h2>
            <p className="text-sm text-gray-500 mb-4">
              Defina condicoes gerais para o pedido. O desconto/bonificacao geral sera aplicado se o total do pedido atingir o valor minimo.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Valor minimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compra acima de
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">R$</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={condicoesComerciais.valor_minimo_pedido || ''}
                    onChange={(e) => setCondicoesComerciais(prev => ({
                      ...prev,
                      valor_minimo_pedido: Number(e.target.value)
                    }))}
                    placeholder="0,00"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Para aplicar desc/bonif geral</p>
              </div>

              {/* Desconto geral */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto geral
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={condicoesComerciais.desconto_geral || ''}
                    onChange={(e) => setCondicoesComerciais(prev => ({
                      ...prev,
                      desconto_geral: Number(e.target.value)
                    }))}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Sobre total do pedido</p>
              </div>

              {/* Bonificacao geral */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonificacao geral
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={condicoesComerciais.bonificacao_geral || ''}
                    onChange={(e) => setCondicoesComerciais(prev => ({
                      ...prev,
                      bonificacao_geral: Number(e.target.value)
                    }))}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">% produtos extras gratis</p>
              </div>

              {/* Prazo de entrega */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prazo de entrega
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={condicoesComerciais.prazo_entrega_dias || ''}
                    onChange={(e) => setCondicoesComerciais(prev => ({
                      ...prev,
                      prazo_entrega_dias: Number(e.target.value)
                    }))}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <span className="text-sm text-gray-500">dias</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Dias uteis</p>
              </div>

              {/* Validade da proposta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validade da proposta
                </label>
                <input
                  type="date"
                  value={condicoesComerciais.validade_proposta}
                  onChange={(e) => setCondicoesComerciais(prev => ({
                    ...prev,
                    validade_proposta: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
                <p className="text-xs text-gray-400 mt-1">Data limite</p>
              </div>
            </div>
          </div>
        )}

        {/* Itens + Formulario de sugestao */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#336FB6]/5">
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
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Cod.</th>
                  <th className="px-4 py-3">Und</th>
                  <th className="px-4 py-3 text-right">Valor unit.</th>
                  <th className="px-4 py-3 text-right">Qtd original</th>
                  {canSuggest && (
                    <>
                      <th className="px-4 py-3 text-right bg-[#FFAA11]/10">Qtd sugerida</th>
                      <th className="px-4 py-3 text-right bg-[#FFAA11]/10">Desconto %</th>
                      <th className="px-4 py-3 text-right bg-[#FFAA11]/10">Bonif. %</th>
                      <th className="px-4 py-3 bg-[#FFAA11]/10">Validade</th>
                      <th className="px-4 py-3 text-right bg-[#336FB6]/10">Subtotal sugerido</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right">Subtotal original</th>
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
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={0}
                              value={sug.quantidade_sugerida}
                              onChange={(e) => updateSugestao(item.id, 'quantidade_sugerida', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={sug.desconto_percentual}
                              onChange={(e) => updateSugestao(item.id, 'desconto_percentual', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={sug.bonificacao_percentual}
                              onChange={(e) => updateSugestao(item.id, 'bonificacao_percentual', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="date"
                              value={sug.validade}
                              onChange={(e) => updateSugestao(item.id, 'validade', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                            />
                          </td>
                          {/* Subtotal sugerido calculado em tempo real */}
                          <td className="px-4 py-3 bg-[#336FB6]/5">
                            {(() => {
                              const subtotalBase = item.valor * sug.quantidade_sugerida
                              const desconto = subtotalBase * (sug.desconto_percentual / 100)
                              const subtotalComDesconto = subtotalBase - desconto
                              const bonifUnidades = sug.bonificacao_percentual > 0
                                ? Math.floor(sug.quantidade_sugerida * sug.bonificacao_percentual / 100)
                                : 0
                              const diferenca = subtotalComDesconto - (item.valor * item.quantidade)

                              return (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-[#336FB6]">
                                    R$ {subtotalComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  {diferenca !== 0 && (
                                    <p className={`text-xs ${diferenca > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {diferenca > 0 ? '+' : ''}{diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                  {bonifUnidades > 0 && (
                                    <p className="text-xs text-blue-500">+{bonifUnidades} gratis</p>
                                  )}
                                </div>
                              )
                            })()}
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

        {/* Modal de Cancelamento */}
        <CancelamentoModal
          isOpen={showCancelamentoModal}
          onClose={() => setShowCancelamentoModal(false)}
          onConfirm={handleCancelar}
          loading={cancelando}
          titulo="Cancelar Pedido"
          subtitulo="Informe o motivo do cancelamento. O lojista sera notificado."
        />
      </div>
    </FornecedorLayout>
  )
}
