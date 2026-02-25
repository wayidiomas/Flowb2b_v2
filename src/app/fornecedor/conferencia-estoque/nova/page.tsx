'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import type { ItemConferenciaEstoque } from '@/types/conferencia-estoque'

interface ProdutoEncontrado {
  id: number
  codigo: string
  nome: string
  gtin: string | null
  estoque_atual: number
}

function NovaConferenciaEstoqueContent() {
  const { loading: authLoading } = useFornecedorAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaId = searchParams.get('empresa_id')

  const [conferenciaId, setConferenciaId] = useState<number | null>(null)
  const [itens, setItens] = useState<ItemConferenciaEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [eanInput, setEanInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [showEnviarModal, setShowEnviarModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [showDuplicadoModal, setShowDuplicadoModal] = useState(false)
  const [duplicadoInfo, setDuplicadoInfo] = useState<{ item: ItemConferenciaEstoque; produto: ProdutoEncontrado } | null>(null)
  const [qtdInput, setQtdInput] = useState('1')

  const eanRef = useRef<HTMLInputElement>(null)

  // Criar conferencia ao montar
  useEffect(() => {
    if (!empresaId) return
    const criarConferencia = async () => {
      try {
        const res = await fetch('/api/fornecedor/conferencia-estoque', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresa_id: Number(empresaId) }),
        })
        if (res.ok) {
          const data = await res.json()
          setConferenciaId(data.conferencia?.id || data.id)
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'Erro ao criar conferencia')
        }
      } catch {
        setError('Erro ao criar conferencia')
      } finally {
        setLoading(false)
      }
    }
    criarConferencia()
  }, [empresaId])

  // Manter foco no input de EAN
  useEffect(() => {
    if (!loading && conferenciaId && eanRef.current) {
      eanRef.current.focus()
    }
  }, [loading, conferenciaId, itens])

  const refocusEan = useCallback(() => {
    setTimeout(() => {
      if (eanRef.current) eanRef.current.focus()
    }, 100)
  }, [])

  const handleBipar = async (ean: string, quantidade: number, modo?: 'somar' | 'substituir') => {
    if (!conferenciaId || !ean.trim()) return
    setScanning(true)
    setError('')

    try {
      const body: Record<string, unknown> = { gtin: ean.trim(), quantidade }
      if (modo) body.modo = modo

      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.duplicado && data.item_existente && data.produto) {
          setDuplicadoInfo({ item: data.item_existente, produto: data.produto })
          setQtdInput(String(quantidade))
          setShowDuplicadoModal(true)
          return
        }
        setError(data.error || 'Produto nao encontrado')
        refocusEan()
        return
      }

      // Recarregar itens
      await fetchItens()
      setEanInput('')
      refocusEan()
    } catch {
      setError('Erro ao bipar produto')
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

  const handleDuplicadoSomar = () => {
    if (duplicadoInfo) {
      setShowDuplicadoModal(false)
      handleBipar(duplicadoInfo.produto.gtin || duplicadoInfo.item.gtin || '', Number(qtdInput), 'somar')
      setDuplicadoInfo(null)
    }
  }

  const handleDuplicadoSubstituir = () => {
    if (duplicadoInfo) {
      setShowDuplicadoModal(false)
      handleBipar(duplicadoInfo.produto.gtin || duplicadoInfo.item.gtin || '', Number(qtdInput), 'substituir')
      setDuplicadoInfo(null)
    }
  }

  const fetchItens = async () => {
    if (!conferenciaId) return
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}`)
      if (res.ok) {
        const data = await res.json()
        setItens(data.itens || [])
      }
    } catch { /* ignorar */ }
  }

  const handleRemoverItem = async (itemId: number) => {
    if (!conferenciaId) return
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
    if (!conferenciaId) return
    setEnviando(true)
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/enviar`, {
        method: 'POST',
      })
      if (res.ok) {
        router.push(`/fornecedor/conferencia-estoque/${conferenciaId}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao enviar conferencia')
      }
    } catch {
      setError('Erro ao enviar conferencia')
    } finally {
      setEnviando(false)
      setShowEnviarModal(false)
    }
  }

  // Calcular resumo
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
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </div>
      </FornecedorLayout>
    )
  }

  if (!empresaId) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-500">Parametro empresa_id nao informado.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/fornecedor/conferencia-estoque')}
          >
            Voltar
          </Button>
        </div>
      </FornecedorLayout>
    )
  }

  if (error && !conferenciaId) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/fornecedor/conferencia-estoque')}
          >
            Voltar
          </Button>
        </div>
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header compacto para mobile */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Conferencia #{conferenciaId}</h1>
            <p className="text-xs text-gray-500">Bipe os produtos para registrar o estoque</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/fornecedor/conferencia-estoque')}
          >
            Voltar
          </Button>
        </div>

        {/* Input de EAN - grande e com destaque para mobile */}
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
                setError('')
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
          {error && (
            <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </p>
          )}
        </div>

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

        {/* Lista de itens bipados */}
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
                        <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.codigo || item.gtin || '-'}</p>
                      </div>
                      <button
                        onClick={() => handleRemoverItem(item.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        title="Remover item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
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
              <div className="w-12 h-12 mx-auto mb-3 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Nenhum produto bipado ainda.</p>
              <p className="text-gray-400 text-xs mt-1">Use o leitor ou digite o codigo acima.</p>
            </div>
          )}
        </div>

        {/* Botao grande de enviar */}
        {itens.length > 0 && (
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

      {/* Modal de confirmacao de envio */}
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
            <div className="flex justify-between">
              <span className="text-gray-500">Sem divergencia:</span>
              <span className="font-semibold text-emerald-600">{semDivergencia}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Apos enviar, o lojista podera aceitar ou rejeitar as sugestoes.
          </p>
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

      {/* Modal de produto duplicado */}
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
                Deseja <strong>somar</strong> a quantidade atual ou <strong>substituir</strong>?
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
            onClick={handleDuplicadoSomar}
          >
            Somar
          </Button>
          <Button
            size="sm"
            className="bg-[#FFAA11] hover:bg-[#e99a00] text-white"
            onClick={handleDuplicadoSubstituir}
          >
            Substituir
          </Button>
        </ModalFooter>
      </Modal>
    </FornecedorLayout>
  )
}

export default function NovaConferenciaEstoquePage() {
  return (
    <Suspense fallback={<FornecedorLayout><Skeleton className="h-96" /></FornecedorLayout>}>
      <NovaConferenciaEstoqueContent />
    </Suspense>
  )
}
