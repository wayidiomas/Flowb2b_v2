'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'

interface CatalogoItem {
  produto_id: number
  codigo: string | null
  gtin: string | null
  nome: string
  estoque_sistema: number | null
  curva: string | null
  ultima_compra: string | null
  conferido_item_id: number | null
  estoque_conferido: number | null
}

function formatUltimaCompra(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const dias = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 1) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 30) return `${dias}d atras`
  if (dias < 365) return `${Math.floor(dias / 30)}m atras`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

type FiltroStatus = 'todos' | 'pendentes' | 'conferidos' | 'divergencia'

function NovaConferenciaEstoqueContent() {
  const { loading: authLoading } = useFornecedorAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaId = searchParams.get('empresa_id')

  const [conferenciaId, setConferenciaId] = useState<number | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [eanInput, setEanInput] = useState('')
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const [busca, setBusca] = useState('')
  const [itemEditando, setItemEditando] = useState<CatalogoItem | null>(null)
  const [qtdInput, setQtdInput] = useState('')
  const [savingItem, setSavingItem] = useState(false)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const [showEnviarModal, setShowEnviarModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [showAtalhoOkModal, setShowAtalhoOkModal] = useState(false)
  const [aplicandoAtalho, setAplicandoAtalho] = useState(false)

  const eanRef = useRef<HTMLInputElement>(null)
  const qtdRef = useRef<HTMLInputElement>(null)

  // 1. Criar conferencia ao montar
  useEffect(() => {
    if (!empresaId) return
    const criar = async () => {
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
          setLoading(false)
        }
      } catch {
        setError('Erro ao criar conferencia')
        setLoading(false)
      }
    }
    criar()
  }, [empresaId])

  // 2. Buscar catalogo quando a conferencia e criada
  const fetchCatalogo = useCallback(async () => {
    if (!conferenciaId) return
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/catalogo`)
      if (res.ok) {
        const data = await res.json()
        setCatalogo(data.itens || [])
      }
    } catch {
      /* ignorar */
    }
  }, [conferenciaId])

  useEffect(() => {
    if (conferenciaId) {
      fetchCatalogo().finally(() => setLoading(false))
    }
  }, [conferenciaId, fetchCatalogo])

  // Manter foco no scan
  const refocusEan = useCallback(() => {
    setTimeout(() => { if (eanRef.current) eanRef.current.focus() }, 100)
  }, [])

  // Auto-foco no qtd quando abre editor
  useEffect(() => {
    if (itemEditando && qtdRef.current) {
      qtdRef.current.focus()
      qtdRef.current.select()
    }
  }, [itemEditando])

  // Derivados: resumo de progresso
  const resumo = useMemo(() => {
    const total = catalogo.length
    const conferidos = catalogo.filter(i => i.conferido_item_id !== null)
    const divergencia = conferidos.filter(i => i.estoque_conferido !== i.estoque_sistema)
    return {
      total,
      conferidos: conferidos.length,
      pendentes: total - conferidos.length,
      divergencia: divergencia.length,
      percentual: total === 0 ? 0 : Math.round((conferidos.length / total) * 100),
    }
  }, [catalogo])

  // Lista filtrada
  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return catalogo.filter(item => {
      // Filtro por status
      const conferido = item.conferido_item_id !== null
      const temDivergencia = conferido && item.estoque_conferido !== item.estoque_sistema
      if (filtro === 'pendentes' && conferido) return false
      if (filtro === 'conferidos' && !conferido) return false
      if (filtro === 'divergencia' && !temDivergencia) return false

      // Filtro por busca
      if (termo) {
        const alvo = `${item.nome} ${item.codigo || ''} ${item.gtin || ''}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [catalogo, filtro, busca])

  // Adicionar ou atualizar item via produto_id
  const salvarItem = async (produtoId: number, quantidade: number): Promise<boolean> => {
    if (!conferenciaId) return false
    setSavingItem(true)
    setError('')
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto_id: produtoId, quantidade }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar item')
        return false
      }
      await fetchCatalogo()
      return true
    } catch {
      setError('Erro ao salvar item')
      return false
    } finally {
      setSavingItem(false)
    }
  }

  // Remover item (conferencia -> volta pra pendente)
  const removerItem = async (conferidoItemId: number) => {
    if (!conferenciaId) return
    try {
      await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/itens?item_id=${conferidoItemId}`, { method: 'DELETE' })
      await fetchCatalogo()
    } catch { /* ignorar */ }
  }

  // Scan: busca item no catalogo por gtin/codigo, abre editor
  const handleBipar = () => {
    const termo = eanInput.trim()
    if (!termo) return
    setError('')
    const match = catalogo.find(i =>
      i.gtin === termo ||
      i.codigo === termo
    )
    if (!match) {
      setError('Produto nao esta no catalogo desse lojista')
      return
    }
    // Scroll + highlight
    setHighlightedId(match.produto_id)
    setTimeout(() => {
      const el = document.getElementById(`item-${match.produto_id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    setTimeout(() => setHighlightedId(null), 2000)

    // Abrir editor preenchido com qty atual ou 1
    setItemEditando(match)
    setQtdInput(String(match.estoque_conferido ?? 1))
    setEanInput('')
    refocusEan()
  }

  // Atalho: marcar pendentes como OK (usa estoque_sistema como qty)
  const marcarPendentesOk = async () => {
    setAplicandoAtalho(true)
    try {
      const pendentes = catalogo.filter(i => i.conferido_item_id === null && i.estoque_sistema != null)
      for (const p of pendentes) {
        await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/itens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produto_id: p.produto_id, quantidade: p.estoque_sistema ?? 0 }),
        })
      }
      await fetchCatalogo()
      setShowAtalhoOkModal(false)
    } finally {
      setAplicandoAtalho(false)
    }
  }

  const handleEnviar = async () => {
    if (!conferenciaId) return
    setEnviando(true)
    try {
      const res = await fetch(`/api/fornecedor/conferencia-estoque/${conferenciaId}/enviar`, { method: 'POST' })
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

  // Loading states
  if (authLoading || loading) {
    return (
      <FornecedorLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-16" />
          <Skeleton className="h-96" />
        </div>
      </FornecedorLayout>
    )
  }

  if (!empresaId) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-500">Parametro empresa_id nao informado.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/fornecedor/conferencia-estoque')}>
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
          <Button variant="outline" onClick={() => router.push('/fornecedor/conferencia-estoque')}>Voltar</Button>
        </div>
      </FornecedorLayout>
    )
  }

  const filtroCounts = {
    todos: resumo.total,
    pendentes: resumo.pendentes,
    conferidos: resumo.conferidos,
    divergencia: resumo.divergencia,
  }

  return (
    <FornecedorLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Conferencia #{conferenciaId}</h1>
            <p className="text-xs text-gray-500">Marque os itens do catalogo conforme confere o estoque</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/fornecedor/conferencia-estoque')}>
            Voltar
          </Button>
        </div>

        {/* Scan + progresso */}
        <div className="bg-white rounded-2xl border-2 border-[#336FB6] p-4 shadow-sm space-y-3">
          <div className="flex gap-2">
            <input
              ref={eanRef}
              type="text"
              inputMode="numeric"
              placeholder="Bipe ou digite o codigo..."
              value={eanInput}
              onChange={(e) => { setEanInput(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBipar() } }}
              autoFocus
              className="flex-1 px-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] font-mono"
            />
            <Button
              onClick={handleBipar}
              disabled={!eanInput.trim()}
              className="bg-[#336FB6] hover:bg-[#2660a5] text-white px-6"
              size="lg"
            >
              Bipar
            </Button>
          </div>

          {/* Progresso */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                <strong className="text-gray-900">{resumo.conferidos}</strong> de {resumo.total} itens conferidos
              </span>
              <span className="text-gray-500 font-medium">{resumo.percentual}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#336FB6] transition-all"
                style={{ width: `${resumo.percentual}%` }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Busca + Atalhos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-3">
          <input
            type="text"
            placeholder="Buscar por nome, codigo ou EAN..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
          />

          {/* Filtros */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: 'todos', label: 'Todos' },
              { key: 'pendentes', label: 'Pendentes' },
              { key: 'conferidos', label: 'Conferidos' },
              { key: 'divergencia', label: 'Divergencia' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtro === f.key
                    ? 'bg-[#336FB6] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${filtro === f.key ? 'text-white/90' : 'text-gray-500'}`}>
                  ({filtroCounts[f.key]})
                </span>
              </button>
            ))}
          </div>

          {/* Atalho */}
          {resumo.pendentes > 0 && (
            <button
              onClick={() => setShowAtalhoOkModal(true)}
              className="text-xs text-[#336FB6] hover:underline"
            >
              Marcar {resumo.pendentes} pendente(s) como OK (usar estoque do sistema)
            </button>
          )}
        </div>

        {/* Lista checklist */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {itensFiltrados.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {itensFiltrados.map((item) => {
                const conferido = item.conferido_item_id !== null
                const diff = conferido && item.estoque_sistema != null
                  ? (item.estoque_conferido ?? 0) - item.estoque_sistema
                  : null
                const temDivergencia = diff !== null && diff !== 0
                const isHighlighted = highlightedId === item.produto_id

                return (
                  <div
                    id={`item-${item.produto_id}`}
                    key={item.produto_id}
                    className={`px-4 py-3 transition-colors ${
                      isHighlighted ? 'bg-[#336FB6]/10' : temDivergencia ? 'bg-amber-50' : conferido ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                          {item.curva && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded">
                              {item.curva}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {item.codigo || '-'} {item.gtin && `· ${item.gtin}`}
                        </p>
                        {item.ultima_compra && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Ultima compra: <span className="font-medium text-gray-600">{formatUltimaCompra(item.ultima_compra)}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          <span className="text-gray-500">
                            Sistema: <span className="font-semibold text-gray-700">{item.estoque_sistema ?? '-'}</span>
                          </span>
                          {conferido && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-gray-500">
                                Conferido: <span className="font-semibold text-gray-900">{item.estoque_conferido}</span>
                              </span>
                              {temDivergencia && diff !== null && (
                                <span className={`font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {diff > 0 ? '+' : ''}{diff}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {conferido ? (
                          <>
                            <button
                              onClick={() => { setItemEditando(item); setQtdInput(String(item.estoque_conferido ?? 0)) }}
                              className="p-2 text-gray-500 hover:text-[#336FB6] hover:bg-gray-100 rounded-lg"
                              title="Editar quantidade"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => item.conferido_item_id && removerItem(item.conferido_item_id)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              title="Desmarcar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => { setItemEditando(item); setQtdInput(String(item.estoque_sistema ?? 1)) }}
                            className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
                          >
                            Conferir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">
                {busca || filtro !== 'todos'
                  ? 'Nenhum item bate com os filtros.'
                  : 'Catalogo vazio: o fornecedor nao tem produtos vinculados a essa loja.'}
              </p>
            </div>
          )}
        </div>

        {/* Enviar */}
        {resumo.conferidos > 0 && (
          <Button
            onClick={() => setShowEnviarModal(true)}
            fullWidth
            size="xl"
            className="bg-[#FFAA11] hover:bg-[#e99a00] text-white text-base font-bold py-4 rounded-2xl shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Sugerir Atualizacao ao Lojista ({resumo.conferidos})
          </Button>
        )}
      </div>

      {/* Modal de editar quantidade */}
      <Modal isOpen={!!itemEditando} onClose={() => { setItemEditando(null); refocusEan() }} size="sm">
        <ModalHeader onClose={() => { setItemEditando(null); refocusEan() }}>
          <ModalTitle>Conferir quantidade</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {itemEditando && (
            <>
              <p className="text-sm font-medium text-gray-900">{itemEditando.nome}</p>
              <p className="text-xs text-gray-500 font-mono mb-4">{itemEditando.codigo || itemEditando.gtin || '-'}</p>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Estoque do sistema</span>
                <span className="font-semibold text-gray-700">{itemEditando.estoque_sistema ?? '-'}</span>
              </div>

              <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade conferida</label>
              <input
                ref={qtdRef}
                type="number"
                min="0"
                value={qtdInput}
                onChange={(e) => setQtdInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && itemEditando) {
                    const ok = await salvarItem(itemEditando.produto_id, Number(qtdInput) || 0)
                    if (ok) { setItemEditando(null); refocusEan() }
                  }
                }}
                className="w-full px-3 py-2 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] font-mono"
              />

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setQtdInput('0')}
                  className="flex-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Nao tem (0)
                </button>
                <button
                  type="button"
                  onClick={() => setQtdInput(String(itemEditando.estoque_sistema ?? 0))}
                  className="flex-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Copiar sistema ({itemEditando.estoque_sistema ?? 0})
                </button>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setItemEditando(null); refocusEan() }}>Cancelar</Button>
          <Button
            className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
            loading={savingItem}
            onClick={async () => {
              if (!itemEditando) return
              const ok = await salvarItem(itemEditando.produto_id, Number(qtdInput) || 0)
              if (ok) { setItemEditando(null); refocusEan() }
            }}
          >
            Salvar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal confirmacao atalho "OK" */}
      <Modal isOpen={showAtalhoOkModal} onClose={() => setShowAtalhoOkModal(false)} size="sm">
        <ModalHeader onClose={() => setShowAtalhoOkModal(false)}>
          <ModalTitle>Marcar pendentes como OK?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Isso vai marcar <strong>{resumo.pendentes}</strong> item(s) pendente(s) usando o estoque atual do sistema como quantidade conferida (sem divergencia).
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Use quando voce confia no estoque atual e so quer fechar a conferencia rapidamente.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAtalhoOkModal(false)}>Cancelar</Button>
          <Button
            className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
            loading={aplicandoAtalho}
            onClick={marcarPendentesOk}
          >
            Confirmar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal enviar */}
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
              <span className="text-gray-500">Itens conferidos:</span>
              <span className="font-semibold">{resumo.conferidos} de {resumo.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Com divergencia:</span>
              <span className="font-semibold text-amber-600">{resumo.divergencia}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nao conferidos:</span>
              <span className="font-semibold text-gray-500">{resumo.pendentes}</span>
            </div>
          </div>
          {resumo.pendentes > 0 && (
            <p className="text-xs text-amber-600 mt-3">
              Atencao: {resumo.pendentes} item(s) nao foram conferidos e nao serao enviados.
            </p>
          )}
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
