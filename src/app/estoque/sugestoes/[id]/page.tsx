'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { Button, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { ConferenciaEstoque, ConferenciaStatus, ItemConferenciaEstoque } from '@/types/conferencia-estoque'

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// Status badge config
const statusConfig: Record<ConferenciaStatus, { label: string; bg: string; text: string }> = {
  em_andamento: { label: 'Em Andamento', bg: 'bg-gray-100', text: 'text-gray-700' },
  enviada: { label: 'Pendente de Revisao', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  aceita: { label: 'Aceita', bg: 'bg-green-100', text: 'text-green-800' },
  rejeitada: { label: 'Rejeitada', bg: 'bg-red-100', text: 'text-red-800' },
  parcialmente_aceita: { label: 'Parcialmente Aceita', bg: 'bg-orange-100', text: 'text-orange-800' },
}

interface SugestaoDetalhe extends ConferenciaEstoque {
  fornecedor_nome?: string
}

export default function SugestaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { empresa } = useAuth()
  const sugestaoId = params.id as string

  const [sugestao, setSugestao] = useState<SugestaoDetalhe | null>(null)
  const [itens, setItens] = useState<ItemConferenciaEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [observacao, setObservacao] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resultadoAceite, setResultadoAceite] = useState<{ aceitos: number; rejeitados: number } | null>(null)

  const isPendente = sugestao?.status === 'enviada'

  useEffect(() => {
    if (!empresa?.id || !sugestaoId) return
    fetchSugestao()
  }, [empresa?.id, sugestaoId])

  const fetchSugestao = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/estoque/sugestoes/${sugestaoId}`)
      const data = await res.json()
      setSugestao(data.sugestao)
      const fetchedItens = data.itens || []
      setItens(fetchedItens)
      // Pre-select all divergent items
      const divergentes = fetchedItens.filter(
        (item: ItemConferenciaEstoque) => item.estoque_conferido !== item.estoque_sistema
      )
      setSelectedIds(new Set(divergentes.map((item: ItemConferenciaEstoque) => item.id)))
    } catch (error) {
      console.error('Erro ao buscar sugestao:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (itemId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(itens.map((item) => item.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleAceitar = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/estoque/sugestoes/${sugestaoId}/aceitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens_aceitos: Array.from(selectedIds),
          observacao: observacao || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResultadoAceite({
          aceitos: data.itens_aceitos ?? selectedIds.size,
          rejeitados: data.itens_rejeitados ?? itens.length - selectedIds.size,
        })
        setShowConfirmModal(false)
        await fetchSugestao()
      }
    } catch (error) {
      console.error('Erro ao aceitar sugestao:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejeitar = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/estoque/sugestoes/${sugestaoId}/rejeitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observacao: observacao || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowRejectModal(false)
        await fetchSugestao()
      }
    } catch (error) {
      console.error('Erro ao rejeitar sugestao:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const resumo = useMemo(() => {
    const divergentes = itens.filter((item) => item.estoque_conferido !== item.estoque_sistema)
    const semDivergencia = itens.filter((item) => item.estoque_conferido === item.estoque_sistema)
    return { total: itens.length, divergentes: divergentes.length, semDivergencia: semDivergencia.length }
  }, [itens])

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Sugestao de Estoque" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-64 bg-gray-200 rounded mt-6" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!sugestao) {
    return (
      <DashboardLayout>
        <PageHeader title="Sugestao de Estoque" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500">Sugestao nao encontrada</p>
          <button
            onClick={() => router.push('/estoque/sugestoes')}
            className="mt-4 text-[#336FB6] hover:underline text-sm"
          >
            Voltar para lista
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const config = statusConfig[sugestao.status]
  const fornecedorNome = sugestao.fornecedor_nome || 'Fornecedor'

  return (
    <DashboardLayout>
      <PageHeader title="Sugestao de Estoque" />

      {/* Back + Status */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/estoque/sugestoes')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon />
          Voltar para sugestoes
        </button>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Result banner */}
      {resultadoAceite && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircleIcon />
            <div>
              <p className="text-sm font-medium text-green-800">Sugestao processada com sucesso</p>
              <p className="text-xs text-green-700 mt-0.5">
                {resultadoAceite.aceitos} {resultadoAceite.aceitos === 1 ? 'item aceito' : 'itens aceitos'}
                {resultadoAceite.rejeitados > 0 && `, ${resultadoAceite.rejeitados} ${resultadoAceite.rejeitados === 1 ? 'rejeitado' : 'rejeitados'}`}
                . O estoque dos itens aceitos foi atualizado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Fornecedor</p>
            <p className="text-sm font-medium text-gray-900">{fornecedorNome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Data da Conferencia</p>
            <p className="text-sm text-gray-900">
              {sugestao.data_envio
                ? new Date(sugestao.data_envio).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Itens Conferidos</p>
            <p className="text-sm text-gray-900">{resumo.total}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Divergencias</p>
            <p className={`text-sm font-medium ${resumo.divergentes > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {resumo.divergentes}
            </p>
          </div>
        </div>
        {sugestao.observacao_fornecedor && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Observacao do Fornecedor</p>
            <p className="text-sm text-gray-700">{sugestao.observacao_fornecedor}</p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        {/* Select all / deselect */}
        {isPendente && itens.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={selectAll}
              className="text-xs text-[#336FB6] hover:underline font-medium"
            >
              Selecionar todos ({itens.length})
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              className="text-xs text-gray-500 hover:underline"
            >
              Desmarcar todos
            </button>
            <span className="ml-auto text-xs text-gray-500">
              {selectedIds.size} de {itens.length} selecionados
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {isPendente && (
                  <th className="w-10 px-4 py-3 bg-gray-50/50" />
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Codigo</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Conferido</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Sistema</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Diferenca</th>
                {!isPendente && (
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Resultado</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={isPendente ? 6 : 7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum item nesta conferencia
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const diff = item.estoque_conferido - (item.estoque_sistema ?? 0)
                  const hasDiff = diff !== 0
                  const isSelected = selectedIds.has(item.id)

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isPendente && isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {isPendente && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 text-[#336FB6] border-gray-300 rounded cursor-pointer focus:ring-[#336FB6]"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{item.nome || '-'}</p>
                        {item.gtin && (
                          <p className="text-xs text-gray-400 mt-0.5">EAN: {item.gtin}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.codigo || '-'}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-900">{item.estoque_conferido}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.estoque_sistema ?? '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {hasDiff ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              diff > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">0</span>
                        )}
                      </td>
                      {!isPendente && (
                        <td className="px-4 py-3 text-center">
                          {item.aceito === true && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <CheckCircleIcon />
                              Aceito
                            </span>
                          )}
                          {item.aceito === false && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <XCircleIcon />
                              Rejeitado
                            </span>
                          )}
                          {item.aceito === null && (
                            <span className="text-xs text-gray-400">Pendente</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observation + Actions (only for pending) */}
      {isPendente && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observacao (opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observacao para o fornecedor..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowRejectModal(true)}
              className="!border-red-300 !text-red-600 hover:!bg-red-50"
            >
              Rejeitar Tudo
            </Button>

            <Button
              variant="success"
              size="md"
              onClick={() => setShowConfirmModal(true)}
              disabled={selectedIds.size === 0}
            >
              Aceitar Selecionados ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Observation display for already processed */}
      {!isPendente && sugestao.observacao_lojista && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-xs text-gray-500 mb-1">Sua Observacao</p>
          <p className="text-sm text-gray-700">{sugestao.observacao_lojista}</p>
          {sugestao.data_resposta && (
            <p className="text-xs text-gray-400 mt-2">
              Respondido em{' '}
              {new Date(sugestao.data_resposta).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Confirm accept modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} size="md">
        <ModalHeader onClose={() => setShowConfirmModal(false)}>
          <ModalTitle>Confirmar Aceite</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Voce esta prestes a aceitar <strong>{selectedIds.size}</strong> de{' '}
            <strong>{itens.length}</strong> itens desta conferencia.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            O estoque dos itens aceitos sera atualizado para os valores conferidos pelo fornecedor.
            {itens.length - selectedIds.size > 0 && (
              <> Os {itens.length - selectedIds.size} itens nao selecionados serao rejeitados.</>
            )}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" size="sm" onClick={handleAceitar} loading={submitting}>
            Confirmar Aceite
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm reject modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} size="md">
        <ModalHeader onClose={() => setShowRejectModal(false)}>
          <ModalTitle>Rejeitar Conferencia</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Voce esta prestes a rejeitar <strong>todos os {itens.length} itens</strong> desta conferencia.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Nenhum estoque sera alterado. O fornecedor sera notificado da rejeicao.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={handleRejeitar} loading={submitting}>
            Confirmar Rejeicao
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}
