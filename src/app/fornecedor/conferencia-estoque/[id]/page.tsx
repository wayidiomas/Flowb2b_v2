'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import type { ConferenciaEstoque, ItemConferenciaEstoque, ConferenciaStatus } from '@/types/conferencia-estoque'

const statusColors: Record<ConferenciaStatus, string> = {
  em_andamento: 'bg-blue-100 text-blue-700',
  enviada: 'bg-amber-100 text-amber-700',
  aceita: 'bg-emerald-100 text-emerald-700',
  rejeitada: 'bg-red-100 text-red-700',
  parcialmente_aceita: 'bg-orange-100 text-orange-700',
}

const statusLabels: Record<ConferenciaStatus, string> = {
  em_andamento: 'Em andamento',
  enviada: 'Enviada ao lojista',
  aceita: 'Aceita pelo lojista',
  rejeitada: 'Rejeitada pelo lojista',
  parcialmente_aceita: 'Parcialmente aceita',
}

export default function ConferenciaEstoqueDetalhePage() {
  const { loading: authLoading } = useFornecedorAuth()
  const router = useRouter()
  const params = useParams()
  const conferenciaId = params.id as string

  const [conferencia, setConferencia] = useState<ConferenciaEstoque | null>(null)
  const [itens, setItens] = useState<ItemConferenciaEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Scanning state (only for em_andamento)
  const [eanInput, setEanInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [showEnviarModal, setShowEnviarModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [showDuplicadoModal, setShowDuplicadoModal] = useState(false)
  const [duplicadoInfo, setDuplicadoInfo] = useState<{ item: ItemConferenciaEstoque; gtin: string } | null>(null)
  const [qtdInput, setQtdInput] = useState('1')

  const eanRef = useRef<HTMLInputElement>(null)

  const fetchConferencia = useCallback(async () => {
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}`)
      if (res.ok) {
        const data = await res.json()
        setConferencia(data.conferencia || data)
        setItens(data.itens || [])
      } else {
        setError('Conferencia nao encontrada')
      }
    } catch {
      setError('Erro ao carregar conferencia')
    } finally {
      setLoading(false)
    }
  }, [conferenciaId])

  useEffect(() => {
    if (!authLoading) fetchConferencia()
  }, [fetchConferencia, authLoading])

  const isEmAndamento = conferencia?.status === 'em_andamento'

  const refocusEan = useCallback(() => {
    setTimeout(() => {
      if (eanRef.current) eanRef.current.focus()
    }, 100)
  }, [])

  const handleBipar = async (ean: string, quantidade: number, modo?: 'somar' | 'substituir') => {
    if (!conferenciaId || !ean.trim()) return
    setScanning(true)
    setScanError('')

    try {
      const body: Record<string, unknown> = { gtin: ean.trim(), quantidade }
      if (modo) body.modo = modo

      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      // Verificar duplicado (API retorna 200 com duplicado=true)
      if (data.duplicado && data.item_existente) {
        setDuplicadoInfo({ item: data.item_existente, gtin: ean.trim() })
        setQtdInput(String(quantidade))
        setShowDuplicadoModal(true)
        return
      }

      if (!res.ok) {
        setScanError(data.error || 'Produto nao encontrado')
        refocusEan()
        return
      }

      await fetchConferencia()
      setEanInput('')
      refocusEan()
    } catch {
      setScanError('Erro ao bipar produto')
      refocusEan()
    } finally {
      setScanning(false)
    }
  }

  const handleEanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBipar(eanInput, 1)
    }
  }

  const handleRemoverItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/itens?item_id=${itemId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setItens((prev) => prev.filter((i) => i.id !== itemId))
      }
    } catch { /* ignorar */ }
    refocusEan()
  }

  const handleEnviar = async () => {
    setEnviando(true)
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/enviar`, {
        method: 'POST',
      })
      if (res.ok) {
        await fetchConferencia()
        setShowEnviarModal(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setScanError(data.error || 'Erro ao enviar')
      }
    } catch {
      setScanError('Erro ao enviar conferencia')
    } finally {
      setEnviando(false)
      setShowEnviarModal(false)
    }
  }

  const totalItens = itens.length
  const comDivergencia = itens.filter(
    (i) => i.estoque_sistema != null && i.estoque_conferido !== i.estoque_sistema
  ).length
  const semDivergencia = totalItens - comDivergencia

  if (authLoading || loading) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      </FornecedorLayout>
    )
  }

  if (error || !conferencia) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Conferencia nao encontrada'}</p>
          <Button variant="outline" onClick={() => router.push('/fornecedor/conferencia-estoque')}>
            Voltar
          </Button>
        </div>
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">Conferencia #{conferencia.id}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[conferencia.status]}`}>
                {statusLabels[conferencia.status]}
              </span>
            </div>
            {conferencia.empresa_nome && (
              <p className="text-xs text-gray-500 mt-0.5">Lojista: {conferencia.empresa_nome}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/fornecedor/conferencia-estoque')}
          >
            Voltar
          </Button>
        </div>

        {/* Input de EAN - apenas se em_andamento */}
        {isEmAndamento && (
          <div className="bg-white rounded-2xl border-2 border-[#336FB6] p-4 shadow-sm">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Codigo de Barras / EAN / Codigo do Produto
            </label>
            <div className="flex gap-2">
              <input
                ref={eanRef}
                type="text"
                inputMode="numeric"
                placeholder="Bipe ou digite o codigo..."
                value={eanInput}
                onChange={(e) => {
                  setEanInput(e.target.value)
                  setScanError('')
                }}
                onKeyDown={handleEanKeyDown}
                autoFocus
                className="flex-1 px-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-colors font-mono"
              />
              <Button
                onClick={() => handleBipar(eanInput, 1)}
                loading={scanning}
                disabled={!eanInput.trim() || scanning}
                className="bg-[#336FB6] hover:bg-[#2660a5] text-white px-6"
                size="lg"
              >
                Bipar
              </Button>
            </div>
            {scanError && (
              <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {scanError}
              </p>
            )}
          </div>
        )}

        {/* Info sobre resposta do lojista */}
        {conferencia.status !== 'em_andamento' && conferencia.observacao_lojista && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Observacao do lojista:</p>
            <p className="text-sm text-blue-700">{conferencia.observacao_lojista}</p>
          </div>
        )}

        {/* Resumo */}
        {totalItens > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalItens}</p>
              <p className="text-xs text-gray-500">Total itens</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{comDivergencia}</p>
              <p className="text-xs text-gray-500">Divergencias</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{semDivergencia}</p>
              <p className="text-xs text-gray-500">Sem divergencia</p>
            </div>
          </div>
        )}

        {/* Lista de itens */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {itens.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {itens.map((item) => {
                const diff = item.estoque_sistema != null
                  ? item.estoque_conferido - item.estoque_sistema
                  : null
                const diffColor = diff === null || diff === 0
                  ? 'text-gray-400'
                  : diff > 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
                const diffBg = diff === null || diff === 0
                  ? ''
                  : diff > 0
                  ? 'bg-emerald-50'
                  : 'bg-red-50'

                return (
                  <div key={item.id} className={`px-4 py-3 ${diffBg}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                          {/* Aceite status */}
                          {item.aceito === true && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                              Aceito
                            </span>
                          )}
                          {item.aceito === false && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              Rejeitado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{item.codigo || item.gtin || '-'}</p>
                      </div>
                      {isEmAndamento && (
                        <button
                          onClick={() => handleRemoverItem(item.id)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          title="Remover item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-400">Conferido: </span>
                        <span className="font-semibold text-gray-900">{item.estoque_conferido}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Sistema: </span>
                        <span className="font-semibold text-gray-600">{item.estoque_sistema ?? '-'}</span>
                      </div>
                      {diff !== null && (
                        <div className={`font-semibold ${diffColor}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">Nenhum produto bipado.</p>
            </div>
          )}
        </div>

        {/* Botao de enviar - apenas se em_andamento */}
        {isEmAndamento && itens.length > 0 && (
          <Button
            onClick={() => setShowEnviarModal(true)}
            fullWidth
            size="xl"
            className="bg-[#FFAA11] hover:bg-[#e99a00] text-white text-base font-bold py-4 rounded-2xl shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Sugerir Atualizacao ao Lojista
          </Button>
        )}
      </div>

      {/* Modal de envio */}
      <Modal isOpen={showEnviarModal} onClose={() => setShowEnviarModal(false)} size="sm">
        <ModalHeader onClose={() => setShowEnviarModal(false)}>
          <ModalTitle>Enviar Conferencia</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Voce esta prestes a enviar a sugestao de atualizacao de estoque para o lojista.
          </p>
          <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total de itens:</span>
              <span className="font-semibold">{totalItens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Com divergencia:</span>
              <span className="font-semibold text-amber-600">{comDivergencia}</span>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEnviarModal(false)}>Cancelar</Button>
          <Button
            onClick={handleEnviar}
            loading={enviando}
            className="bg-[#FFAA11] hover:bg-[#e99a00] text-white"
          >
            Confirmar Envio
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal duplicado */}
      <Modal isOpen={showDuplicadoModal} onClose={() => { setShowDuplicadoModal(false); refocusEan() }} size="sm">
        <ModalHeader onClose={() => { setShowDuplicadoModal(false); refocusEan() }}>
          <ModalTitle>Produto ja bipado</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {duplicadoInfo && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium text-gray-900">{duplicadoInfo.item.nome}</span> ja foi bipado com quantidade{' '}
                <span className="font-semibold">{duplicadoInfo.item.estoque_conferido}</span>.
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nova quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={qtdInput}
                  onChange={(e) => setQtdInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                />
              </div>
              <p className="text-xs text-gray-400">
                Deseja <strong>somar</strong> ou <strong>substituir</strong>?
              </p>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => { setShowDuplicadoModal(false); refocusEan() }}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
            onClick={() => {
              if (duplicadoInfo) {
                setShowDuplicadoModal(false)
                handleBipar(duplicadoInfo.gtin, Number(qtdInput), 'somar')
                setDuplicadoInfo(null)
              }
            }}
          >
            Somar
          </Button>
          <Button
            size="sm"
            className="bg-[#FFAA11] hover:bg-[#e99a00] text-white"
            onClick={() => {
              if (duplicadoInfo) {
                setShowDuplicadoModal(false)
                handleBipar(duplicadoInfo.gtin, Number(qtdInput), 'substituir')
                setDuplicadoInfo(null)
              }
            }}
          >
            Substituir
          </Button>
        </ModalFooter>
      </Modal>
    </FornecedorLayout>
  )
}
