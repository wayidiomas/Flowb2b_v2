'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { CancelamentoModal } from '@/components/pedido/CancelamentoModal'
import { ProductSearchModal } from '@/components/pedido/ProductSearchModal'
import type { CatalogoProduto } from '@/components/pedido/ProductSearchModal'
import { Button, Skeleton } from '@/components/ui'

interface PedidoItem {
  id: number
  descricao: string
  codigo_produto: string      // SKU do lojista
  codigo_fornecedor: string   // SKU do fornecedor
  ean: string | null          // EAN/GTIN do produto
  unidade: string
  preco_catalogo: number | null
  quantidade: number
  aliquota_ipi: number
  produto_id: number | null
}

interface SugestaoItem {
  item_pedido_compra_id: number
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_quantidade: number
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
  bonificacao_quantidade_geral?: number
  prazo_entrega_dias?: number
  validade_proposta?: string
  motivo_rejeicao?: string | null
}

interface RepresentanteInfo {
  id: number
  nome: string
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
    representante: RepresentanteInfo | null
  }
  itens: PedidoItem[]
  sugestoes: SugestaoInfo[]
  sugestaoItens: SugestaoItem[] | null
  timeline: TimelineEvent[]
}

// Mapeamento para o formulario de sugestao por item
interface ItemSugestao {
  item_id: number | null          // null para itens novos
  produto_id: number | null
  quantidade_sugerida: number
  desconto_percentual: number
  bonificacao_quantidade: number
  validade: string
  preco_editado?: number | null            // preco editado pelo fornecedor (null = usar original)
  status_item: 'ok' | 'depreciado' | 'ruptura' | 'divergente'
  observacao_item: string
  // Campos para busca de produtos (substituicao/adicao)
  gtin?: string | null
  codigo_fornecedor?: string | null
  is_substituicao?: boolean
  is_novo?: boolean
  produto_nome?: string | null
  produto_nome_original?: string | null  // nome do item original (para mostrar riscado)
  preco_unitario?: number | null          // preco do produto (novo ou substituto)
  preco_catalogo?: number | null          // preco do catalogo para comparacao na validacao
}

// Condicoes comerciais gerais da sugestao
interface CondicoesComerciais {
  valor_minimo_pedido: number
  desconto_geral: number
  bonificacao_quantidade_geral: number
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [sugestoes, setSugestoes] = useState<ItemSugestao[]>([])
  const [observacao, setObservacao] = useState('')
  const [condicoesComerciais, setCondicoesComerciais] = useState<CondicoesComerciais>({
    valor_minimo_pedido: 0,
    desconto_geral: 0,
    bonificacao_quantidade_geral: 0,
    prazo_entrega_dias: 0,
    validade_proposta: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false)
  const [showSucessoModal, setShowSucessoModal] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [modalBuscaAberto, setModalBuscaAberto] = useState(false)
  const [modalBuscaMode, setModalBuscaMode] = useState<'substituir' | 'adicionar'>('adicionar')
  const [itemParaSubstituir, setItemParaSubstituir] = useState<number | null>(null)
  const [itemParaSubstituirNome, setItemParaSubstituirNome] = useState('')
  const router = useRouter()

  // Espelho do pedido
  const [showEspelhoViewer, setShowEspelhoViewer] = useState(false)
  const [espelhoFile, setEspelhoFile] = useState<File | null>(null)
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [enviandoEspelho, setEnviandoEspelho] = useState(false)
  const [espelhoInfo, setEspelhoInfo] = useState<{
    espelho_url: string | null
    espelho_nome: string | null
    espelho_status: string | null
    espelho_enviado_em: string | null
    prazo_entrega_fornecedor: string | null
  } | null>(null)

  // Validacao IA do espelho
  const [validandoEspelho, setValidandoEspelho] = useState(false)
  const [validacaoResult, setValidacaoResult] = useState<{
    resumo: { total_pedido: number; total_espelho: number; ok: number; divergencias: number; faltando: number; extras: number }
    itens: Array<{
      status: 'ok' | 'divergencia' | 'faltando' | 'extra'
      item_pedido?: { codigo: string | null; descricao: string | null; quantidade: number; valor: number | null; gtin: string | null }
      item_espelho?: { codigo: string | null; nome: string | null; quantidade: number | null; preco_unitario: number | null; total: number | null }
      diferencas?: string[]
    }>
  } | null>(null)
  const [showValidacaoModal, setShowValidacaoModal] = useState(false)
  const [validacaoItens, setValidacaoItens] = useState<Array<{
    status: string
    item_pedido?: { codigo: string | null; descricao: string | null; quantidade: number; valor: number | null; gtin: string | null }
    item_espelho?: { codigo: string | null; nome: string | null; quantidade: number | null; preco_unitario: number | null; total: number | null }
    diferencas?: string[]
    motivo_faltante?: string | null
    previsao_retorno?: string | null
  }>>([])
  const [salvandoDisponibilidade, setSalvandoDisponibilidade] = useState(false)

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  // Persistir validacaoResult em localStorage
  useEffect(() => {
    if (validacaoResult) {
      try { localStorage.setItem(`validacao_${id}`, JSON.stringify(validacaoResult)) } catch {}
    }
  }, [validacaoResult, id])

  // Carregar validacao do localStorage ao montar
  useEffect(() => {
    if (!validacaoResult) {
      try {
        const saved = localStorage.getItem(`validacao_${id}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          setValidacaoResult(parsed)
          setValidacaoItens((parsed.itens || []).map((item: any) => ({
            ...item, status_manual: null, observacao_item: '',
            motivo_faltante: item.status === 'faltando' ? 'ruptura' : null,
          })))
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Auto-validate when entering Step 3 without validation result
  useEffect(() => {
    if (currentStep === 3 && !validacaoResult && !validandoEspelho && espelhoInfo?.espelho_url) {
      (async () => {
        setValidandoEspelho(true)
        try {
          const res = await fetch(`/api/fornecedor/pedidos/${id}/espelho/validar`, { method: 'POST' })
          if (res.ok) {
            const validacao = await res.json()
            if (validacao.success) {
              setValidacaoResult(validacao)
              setValidacaoItens((validacao.itens || []).map((item: any) => ({
                ...item,
                status_manual: null,
                observacao_item: '',
                motivo_faltante: item.status === 'faltando' ? 'ruptura' : null,
              })))
              // Auto-fill status_item: compara preco CATALOGO vs ESPELHO
              setSugestoes(prev => prev.map(sug => {
                const codForn = (sug.codigo_fornecedor || '').replace(/^0+/, '')
                const sugGtin = sug.gtin || ''
                const valItem = (validacao.itens || []).find((vi: any) => {
                  if (!vi.item_pedido && !vi.item_espelho) return false
                  const viCod = (vi.item_pedido?.codigo || '').replace(/^0+/, '')
                  const viGtin = vi.item_pedido?.gtin || ''
                  const viEspCod = (vi.item_espelho?.codigo || '').replace(/^0+/, '')
                  if (codForn && viCod && codForn === viCod) return true
                  if (codForn && viEspCod && codForn === viEspCod) return true
                  if (sugGtin && viGtin && sugGtin === viGtin) return true
                  return false
                })
                if (valItem?.status === 'faltando') return { ...sug, status_item: 'ruptura' as const }
                const precoCat = sug.preco_catalogo ?? 0
                const precoEsp = valItem?.item_espelho?.preco_unitario ?? 0
                if (precoCat > 0 && precoEsp > 0 && Math.abs(precoCat - precoEsp) / precoCat > 0.02) {
                  return { ...sug, status_item: 'divergente' as const }
                }
                const qtyPed = Number(sug.quantidade_sugerida) || 0
                const qtyEsp = valItem?.item_espelho?.quantidade ?? qtyPed
                if (qtyPed > 0 && qtyEsp > 0 && qtyPed !== qtyEsp) {
                  const totalCat = precoCat * qtyPed
                  const totalEsp = precoEsp * qtyEsp
                  if (totalCat > 0 && totalEsp > 0 && Math.abs(totalCat - totalEsp) / totalCat > 0.05) {
                    return { ...sug, status_item: 'divergente' as const }
                  }
                }
                return { ...sug, status_item: 'ok' as const }
              }))
            }
          }
        } catch (err) {
          console.error('Erro ao auto-validar espelho:', err)
        } finally {
          setValidandoEspelho(false)
        }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

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
              bonificacao_quantidade: existingSugestao?.bonificacao_quantidade ?? 0,
              validade: existingSugestao?.validade || '',
              status_item: (existingSugestao as any)?.status_item || 'ok',
              observacao_item: (existingSugestao as any)?.observacao_item || '',
              preco_catalogo: item.preco_catalogo ?? null,
            }
          })
          setSugestoes(initialSugestoes)

          // Buscar info do espelho apos carregar o pedido
          try {
            const espelhoRes = await fetch(`/api/fornecedor/pedidos/${id}/espelho`)
            if (espelhoRes.ok) {
              const espelhoData = await espelhoRes.json()
              setEspelhoInfo(espelhoData)
              if (espelhoData.prazo_entrega_fornecedor) {
                setPrazoEntrega(espelhoData.prazo_entrega_fornecedor)
              }
              // Auto-avançar step baseado no estado atual
              if (espelhoData.espelho_url) {
                // Espelho já existe — pular pra Step 3 (validar)
                setCurrentStep(3)
              }
            }
          } catch (espelhoErr) {
            console.error('Erro ao carregar espelho:', espelhoErr)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar pedido:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPedido()
  }, [user, id])

  const updateSugestao = (itemIdOrIndex: number | null, field: keyof ItemSugestao, value: number | string, index?: number) => {
    setSugestoes(prev =>
      prev.map((s, i) => {
        if (itemIdOrIndex !== null && s.item_id === itemIdOrIndex) return { ...s, [field]: value }
        if (itemIdOrIndex === null && i === index) return { ...s, [field]: value }
        return s
      })
    )
  }

  const handleProdutoSelecionado = (produto: CatalogoProduto) => {
    if (modalBuscaMode === 'substituir' && itemParaSubstituir !== null) {
      // TROCAR: atualizar item existente com novo produto
      setSugestoes(prev => prev.map(s => {
        if (s.item_id !== itemParaSubstituir) return s
        return {
          ...s,
          gtin: produto.gtin,
          codigo_fornecedor: produto.codigo_fornecedor,
          is_substituicao: true,
          produto_nome: produto.nome,
          produto_nome_original: s.produto_nome_original || null, // sera setado no click
          preco_unitario: produto.preco,
        }
      }))
    } else {
      // ADICIONAR: novo item na lista
      const novoItem: ItemSugestao = {
        item_id: null,
        produto_id: null,
        quantidade_sugerida: 1,
        desconto_percentual: 0,
        bonificacao_quantidade: 0,
        validade: '',
        status_item: 'ok',
        observacao_item: '',
        gtin: produto.gtin,
        codigo_fornecedor: produto.codigo_fornecedor,
        is_novo: true,
        produto_nome: produto.nome,
        preco_unitario: produto.preco,
      }
      setSugestoes(prev => [...prev, novoItem])
    }
    setModalBuscaAberto(false)
  }

  const handleTrocarProduto = (itemId: number, nomeOriginal: string) => {
    // Pre-setar o nome original no item para exibir riscado apos substituicao
    setSugestoes(prev => prev.map(s =>
      s.item_id === itemId ? { ...s, produto_nome_original: s.produto_nome_original || nomeOriginal } : s
    ))
    setItemParaSubstituir(itemId)
    setItemParaSubstituirNome(nomeOriginal)
    setModalBuscaMode('substituir')
    setModalBuscaAberto(true)
  }

  const handleAdicionarProduto = () => {
    setItemParaSubstituir(null)
    setItemParaSubstituirNome('')
    setModalBuscaMode('adicionar')
    setModalBuscaAberto(true)
  }

  const handleRemoverItemNovo = (index: number) => {
    setSugestoes(prev => prev.filter((_, i) => i !== index))
  }

  // Handler para alterar (remover) espelho do pedido
  const handleAlterarEspelho = async () => {
    if (!confirm('Deseja remover o espelho atual e enviar outro?')) return
    try {
      const res = await fetch(`/api/fornecedor/pedidos/${id}/espelho`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
      else { const d = await res.json(); alert(d.error || 'Erro ao remover espelho') }
    } catch { alert('Erro ao remover espelho') }
  }

  // Handler para enviar espelho do pedido
  const handleEnviarEspelho = async () => {
    if (!espelhoFile) return
    setEnviandoEspelho(true)
    try {
      const formData = new FormData()
      formData.append('file', espelhoFile)
      if (prazoEntrega) formData.append('prazo_entrega', prazoEntrega)

      const res = await fetch(`/api/fornecedor/pedidos/${id}/espelho`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const espelhoData = await res.json()
        setEspelhoInfo(espelhoData)
        setEspelhoFile(null)
        setToast({ type: 'success', msg: 'Espelho enviado com sucesso!' })
        setTimeout(() => setToast(null), 4000)

        // After successful espelho upload, auto-validate
        try {
          setValidandoEspelho(true)
          const validarRes = await fetch(`/api/fornecedor/pedidos/${id}/espelho/validar`, { method: 'POST' })
          if (validarRes.ok) {
            const validacao = await validarRes.json()
            if (validacao.success) {
              setValidacaoResult(validacao)
              // Auto-fill validacaoItens from the result
              setValidacaoItens((validacao.itens || []).map((item: any) => ({
                ...item,
                status_manual: null,
                observacao_item: '',
                motivo_faltante: item.status === 'faltando' ? 'ruptura' : null,
              })))
              // Auto-fill status_item: compara preco CATALOGO vs ESPELHO (nao lojista)
              setSugestoes(prev => prev.map(sug => {
                // Matching amplo: codigo, gtin, ou descricao parcial
                const codForn = (sug.codigo_fornecedor || '').replace(/^0+/, '')
                const sugGtin = sug.gtin || ''
                const valItem = (validacao.itens || []).find((vi: any) => {
                  if (!vi.item_pedido && !vi.item_espelho) return false
                  const viCod = (vi.item_pedido?.codigo || '').replace(/^0+/, '')
                  const viGtin = vi.item_pedido?.gtin || ''
                  const viEspCod = (vi.item_espelho?.codigo || '').replace(/^0+/, '')
                  // Match por codigo fornecedor
                  if (codForn && viCod && codForn === viCod) return true
                  if (codForn && viEspCod && codForn === viEspCod) return true
                  // Match por GTIN/EAN
                  if (sugGtin && viGtin && sugGtin === viGtin) return true
                  return false
                })

                // Item faltando no espelho = ruptura
                if (valItem?.status === 'faltando') {
                  return { ...sug, status_item: 'ruptura' as const }
                }

                // Pra items encontrados: checar preco catalogo vs espelho
                const precoCat = sug.preco_catalogo ?? 0
                const precoEsp = valItem?.item_espelho?.preco_unitario ?? 0
                const qtyPed = Number(sug.quantidade_sugerida) || 0
                const qtyEsp = valItem?.item_espelho?.quantidade ?? qtyPed

                // Divergente se preco catalogo difere >2% do espelho
                if (precoCat > 0 && precoEsp > 0 && Math.abs(precoCat - precoEsp) / precoCat > 0.02) {
                  return { ...sug, status_item: 'divergente' as const }
                }

                // Divergente se qty difere significativamente (e nao eh conversao embalagem)
                if (qtyPed > 0 && qtyEsp > 0 && qtyPed !== qtyEsp) {
                  const totalCat = precoCat * qtyPed
                  const totalEsp = precoEsp * qtyEsp
                  // Se total da linha NAO bate (>5%), eh divergencia de qty real
                  if (totalCat > 0 && totalEsp > 0 && Math.abs(totalCat - totalEsp) / totalCat > 0.05) {
                    return { ...sug, status_item: 'divergente' as const }
                  }
                }

                return { ...sug, status_item: 'ok' as const }
              }))
            }
          }
        } catch (err) {
          console.error('Erro ao auto-validar espelho:', err)
        } finally {
          setValidandoEspelho(false)
        }
        // Advance to Step 3
        setCurrentStep(3)
      } else {
        const errData = await res.json()
        setToast({ type: 'error', msg: errData.error || 'Erro ao enviar espelho' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (err) {
      console.error('Erro ao enviar espelho:', err)
      setToast({ type: 'error', msg: 'Erro ao enviar espelho' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setEnviandoEspelho(false)
    }
  }

  // Handler para validar espelho com IA
  // Handler para salvar disponibilidade dos itens faltando
  const handleSalvarDisponibilidade = async () => {
    setSalvandoDisponibilidade(true)
    try {
      // Build all items payload
      const todosItens = validacaoItens.map(i => ({
        status_ia: i.status,
        status_manual: i.status,
        item_pedido_codigo: i.item_pedido?.codigo,
        item_pedido_descricao: i.item_pedido?.descricao,
        item_pedido_quantidade: i.item_pedido?.quantidade,
        item_pedido_valor: i.item_pedido?.valor,
        item_pedido_gtin: i.item_pedido?.gtin,
        item_espelho_codigo: i.item_espelho?.codigo,
        item_espelho_nome: i.item_espelho?.nome,
        item_espelho_quantidade: i.item_espelho?.quantidade,
        item_espelho_preco: i.item_espelho?.preco_unitario,
        diferencas: i.diferencas,
        motivo_faltante: i.motivo_faltante || null,
        previsao_retorno: i.previsao_retorno || null,
      }))

      const res = await fetch(`/api/fornecedor/pedidos/${id}/espelho/disponibilidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: todosItens,
        }),
      })
      if (res.ok) {
        setShowValidacaoModal(false)
        setToast({ type: 'success', msg: 'Disponibilidade salva com sucesso!' })
        setTimeout(() => setToast(null), 4000)
      } else {
        const d = await res.json()
        setToast({ type: 'error', msg: d.error || 'Erro ao salvar disponibilidade' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar disponibilidade' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSalvandoDisponibilidade(false)
    }
  }

  // Calculo em tempo real dos valores sugeridos
  const calcularTotaisSugeridos = () => {
    if (!data) return null

    // Total original
    const totalOriginal = data.itens.reduce((sum, item) => sum + (item.preco_catalogo ?? 0) * item.quantidade, 0)

    // Total sugerido (com desconto por item)
    let totalSugeridoItens = 0
    let totalDescontoItens = 0
    let totalBonificacaoUnidades = 0

    data.itens.forEach(item => {
      const sug = sugestoes.find(s => s.item_id === item.id)
      if (sug) {
        // Prioridade: preco_editado > preco_unitario (substituicao) > item.preco_catalogo (original)
        const valorUnit = sug.preco_editado != null ? sug.preco_editado : (sug.is_substituicao && sug.preco_unitario != null ? sug.preco_unitario : (item.preco_catalogo ?? 0))
        const subtotalOriginal = valorUnit * sug.quantidade_sugerida
        const descontoItem = subtotalOriginal * (sug.desconto_percentual / 100)
        const subtotalComDesconto = subtotalOriginal - descontoItem

        totalSugeridoItens += subtotalComDesconto
        totalDescontoItens += descontoItem

        // Bonificacao: unidades extras gratis (agora eh quantidade direta, nao percentual)
        if (sug.bonificacao_quantidade > 0) {
          totalBonificacaoUnidades += sug.bonificacao_quantidade
        }
      } else {
        totalSugeridoItens += (item.preco_catalogo ?? 0) * item.quantidade
      }
    })

    // Incluir itens novos adicionados via busca
    sugestoes.filter(s => s.is_novo).forEach(s => {
      const preco = s.preco_unitario || 0
      const valorComDesconto = preco * (1 - (s.desconto_percentual || 0) / 100)
      totalSugeridoItens += valorComDesconto * s.quantidade_sugerida
      totalBonificacaoUnidades += s.bonificacao_quantidade || 0
    })

    // Aplicar desconto geral se atingir valor minimo
    let descontoGeral = 0
    let bonificacaoGeralUnidades = 0
    if (condicoesComerciais.valor_minimo_pedido > 0 && totalSugeridoItens >= condicoesComerciais.valor_minimo_pedido) {
      if (condicoesComerciais.desconto_geral > 0) {
        descontoGeral = totalSugeridoItens * (condicoesComerciais.desconto_geral / 100)
      }
      if (condicoesComerciais.bonificacao_quantidade_geral > 0) {
        // Bonificacao geral: quantidade direta de unidades
        bonificacaoGeralUnidades = condicoesComerciais.bonificacao_quantidade_geral
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

    // Validacao: itens alterados precisam ter validade preenchida
    const itensAlteradosSemValidade = sugestoes.filter(sug => {
      // Itens novos que foram modificados precisam de validade
      if (sug.is_novo) {
        return !sug.validade
      }

      const itemOriginal = data.itens.find(item => item.id === sug.item_id)
      if (!itemOriginal) return false

      // Verifica se o item foi alterado (quantidade, desconto, bonificacao, preco ou substituicao)
      const foiAlterado =
        sug.quantidade_sugerida !== itemOriginal.quantidade ||
        sug.desconto_percentual > 0 ||
        sug.bonificacao_quantidade > 0 ||
        sug.is_substituicao ||
        (sug.preco_editado != null && sug.preco_editado !== (itemOriginal.preco_catalogo ?? 0))

      // Se foi alterado, precisa ter validade
      return foiAlterado && !sug.validade
    })

    if (itensAlteradosSemValidade.length > 0) {
      const nomesItens = itensAlteradosSemValidade
        .map(sug => {
          if (sug.is_novo) return sug.produto_nome || 'Novo item'
          const item = data.itens.find(i => i.id === sug.item_id)
          return item?.descricao || `Item #${sug.item_id}`
        })
        .slice(0, 3)
        .join(', ')
      const mais = itensAlteradosSemValidade.length > 3
        ? ` e mais ${itensAlteradosSemValidade.length - 3}`
        : ''

      setToast({
        type: 'error',
        msg: `Preencha a validade dos itens alterados: ${nomesItens}${mais}`
      })

      // Scroll para o primeiro item sem validade
      setTimeout(() => {
        const primeiroItem = itensAlteradosSemValidade[0]
        const elementId = primeiroItem.is_novo
          ? `validade-novo-${sugestoes.indexOf(primeiroItem)}`
          : `validade-${primeiroItem.item_id}`
        const inputElement = document.getElementById(elementId)
        if (inputElement) {
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          inputElement.focus()
          inputElement.classList.add('ring-2', 'ring-red-500', 'border-red-500')
          setTimeout(() => {
            inputElement.classList.remove('ring-2', 'ring-red-500', 'border-red-500')
          }, 3000)
        }
      }, 100)
      return
    }

    // Block if divergent items without edited price
    const divergenteSemPreco = sugestoes.filter(s =>
      s.status_item === 'divergente' && !s.preco_editado && !s.preco_unitario
    )
    if (divergenteSemPreco.length > 0) {
      setToast({ type: 'error', msg: `${divergenteSemPreco.length} item(ns) divergente(s) precisam ter o preco ajustado.` })
      return
    }

    setSubmitting(true)
    setToast(null)

    try {
      const payload = {
        itens: sugestoes.map(s => ({
          item_pedido_compra_id: s.item_id,  // null para novos
          produto_id: s.produto_id,
          quantidade_sugerida: s.quantidade_sugerida,
          desconto_percentual: s.desconto_percentual,
          bonificacao_quantidade: s.bonificacao_quantidade,
          validade: s.validade || null,
          status_item: s.status_item || 'ok',
          observacao_item: s.observacao_item || null,
          // Campos de busca de produtos
          gtin: s.gtin || null,
          codigo_fornecedor: s.codigo_fornecedor || null,
          is_substituicao: s.is_substituicao || false,
          is_novo: s.is_novo || false,
          produto_nome: s.produto_nome || null,
          preco_unitario: s.preco_editado ?? s.preco_unitario ?? null,
        })),
        observacao: observacao || undefined,
        condicoes_comerciais: {
          valor_minimo_pedido: condicoesComerciais.valor_minimo_pedido || undefined,
          desconto_geral: condicoesComerciais.desconto_geral || undefined,
          bonificacao_quantidade_geral: condicoesComerciais.bonificacao_quantidade_geral || undefined,
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
        // Mostrar modal de sucesso
        setShowSucessoModal(true)
        // Atualizar status local imediatamente
        setData(prev => prev ? {
          ...prev,
          pedido: { ...prev.pedido, status_interno: 'sugestao_pendente' }
        } : null)
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

  const handleExcluirSugestao = async (sugestaoId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta cotacao?')) return
    try {
      const res = await fetch(`/api/fornecedor/pedidos/${id}/sugestao?sugestao_id=${sugestaoId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Cotacao excluida com sucesso')
        window.location.reload()
      } else {
        alert(data.error || 'Erro ao excluir cotacao')
      }
    } catch {
      alert('Erro ao excluir cotacao')
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
  const hasPendingSugestao = lastSugestao?.status === 'pendente' && lastSugestao?.autor_tipo !== 'lojista'
  const canCancel = !ESTADOS_FINAIS.includes(pedido.status_interno)
  const isStepper = pedido.status_interno === 'enviado_fornecedor'

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
        <div className="space-y-3">
          <button
            onClick={() => router.push('/fornecedor/pedidos')}
            className="text-sm text-gray-500 hover:text-[#336FB6] flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                Pedido #{pedido.numero}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[pedido.status_interno] || pedido.status_interno}
                </span>
                {pedido.representante && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Rep
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {pedido.empresa_nome} - {new Date(pedido.data).toLocaleDateString('pt-BR')}
                {pedido.representante && (
                  <span className="ml-2 text-violet-600">
                    (Rep: {pedido.representante.nome})
                  </span>
                )}
              </p>
            </div>
            {canCancel && (
              <button
                onClick={() => setShowCancelamentoModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 w-full sm:w-auto shrink-0"
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

        {/* Sugestao pendente - opcao de excluir */}
        {lastSugestao?.status === 'pendente' && lastSugestao?.autor_tipo !== 'lojista' && pedido.status_interno === 'sugestao_pendente' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-orange-800">Sua cotacao foi enviada e esta aguardando analise do lojista.</p>
            <button
              onClick={() => handleExcluirSugestao(lastSugestao.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Excluir cotacao
            </button>
          </div>
        )}

        {/* Stepper — sticky top, todas as etapas clicáveis */}
        {data.pedido.status_interno === 'enviado_fornecedor' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6 sticky top-2 z-30">
            <div className="flex items-center justify-between">
              {[
                { n: 1, label: 'Conferir Itens', done: true },
                { n: 2, label: 'Subir Espelho', done: !!espelhoInfo?.espelho_url },
                { n: 3, label: 'Validar e Ajustar', done: !!validacaoResult },
                { n: 4, label: 'Enviar', done: false },
              ].map((step, idx) => (
                <React.Fragment key={step.n}>
                  {idx > 0 && (
                    <div className={`flex-1 h-px ${step.done || currentStep > idx ? 'bg-[#336FB6]' : 'bg-gray-200'}`} />
                  )}
                  <button
                    onClick={() => setCurrentStep(step.n as 1|2|3|4)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentStep === step.n
                        ? 'bg-[#336FB6] text-white shadow-sm'
                        : step.done
                          ? 'bg-[#336FB6]/10 text-[#336FB6] cursor-pointer hover:bg-[#336FB6]/15'
                          : 'bg-gray-50 text-gray-400 cursor-pointer hover:bg-gray-100'
                    }`}
                  >
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      currentStep === step.n
                        ? 'bg-white/20 text-white'
                        : step.done
                          ? 'bg-[#336FB6] text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step.done && currentStep !== step.n ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : step.n}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Banner de rejeicao do lojista */}
        {data.sugestoes?.some(s => s.motivo_rejeicao) && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="font-semibold text-red-800">Pedido devolvido pelo lojista</p>
                <p className="text-red-700 text-sm mt-1">
                  {data.sugestoes.filter(s => s.motivo_rejeicao).pop()?.motivo_rejeicao}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Espelho do Pedido (Step 2 when enviado_fornecedor) */}
        {pedido && ['aceito', 'sugestao_pendente', 'enviado_fornecedor'].includes(pedido.status_interno) && (!isStepper || currentStep === 2) && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#336FB6] to-[#2a5a94] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Espelho do Pedido</h3>
                  <p className="text-sm text-gray-500">Anexe o espelho de confirmacao e informe o prazo de entrega</p>
                </div>
              </div>
            </div>

            {isStepper && (
              <div className="px-6 pt-4 pb-0">
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <strong>{itens.length}</strong> itens no pedido
                </p>
              </div>
            )}

            <div className="p-6">
              {espelhoInfo?.espelho_url ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-green-800 truncate">{espelhoInfo.espelho_nome}</p>
                      <p className="text-sm text-green-600">
                        Enviado em {espelhoInfo.espelho_enviado_em ? new Date(espelhoInfo.espelho_enviado_em).toLocaleString('pt-BR') : '-'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowEspelhoViewer(true)}
                      className="shrink-0 px-3 py-1.5 bg-white border border-[#336FB6]/30 rounded-lg text-sm font-medium text-[#336FB6] hover:bg-[#336FB6]/5 transition-colors"
                    >
                      Visualizar
                    </button>
                    <a
                      href={`/api/fornecedor/pedidos/${id}/espelho/download`}
                      className="shrink-0 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Download
                    </a>
                    {validandoEspelho && (
                      <span className="shrink-0 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Validando...
                      </span>
                    )}
                    {validacaoResult && !showValidacaoModal && (
                      <button
                        onClick={() => setShowValidacaoModal(true)}
                        className="shrink-0 px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver validacao
                      </button>
                    )}
                    {espelhoInfo.espelho_status === 'pendente' && (
                      <button
                        onClick={handleAlterarEspelho}
                        className="shrink-0 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Alterar
                      </button>
                    )}
                  </div>

                  {espelhoInfo.espelho_status === 'pendente' && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Aguardando aprovacao do lojista
                    </div>
                  )}
                  {espelhoInfo.espelho_status === 'aprovado' && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Espelho aprovado pelo lojista
                    </div>
                  )}
                  {espelhoInfo.espelho_status === 'rejeitado' && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Espelho rejeitado -- envie um novo
                    </div>
                  )}

                  {espelhoInfo.prazo_entrega_fornecedor && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      Prazo de entrega: <strong>{new Date(espelhoInfo.prazo_entrega_fornecedor + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                    </div>
                  )}

                  {/* Permitir reenvio se rejeitado */}
                  {espelhoInfo.espelho_status === 'rejeitado' && (
                    <div className="pt-4 border-t border-gray-200 space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#336FB6] transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => setEspelhoFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="espelho-reupload"
                        />
                        <label htmlFor="espelho-reupload" className="cursor-pointer">
                          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          {espelhoFile ? (
                            <p className="text-sm font-medium text-[#336FB6]">{espelhoFile.name}</p>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-600">Clique para selecionar um novo arquivo</p>
                              <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG (max 10MB)</p>
                            </>
                          )}
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de entrega</label>
                        <input
                          type="date"
                          value={prazoEntrega}
                          onChange={(e) => setPrazoEntrega(e.target.value)}
                          className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] text-sm"
                        />
                      </div>

                      <button
                        onClick={handleEnviarEspelho}
                        disabled={!espelhoFile || enviandoEspelho}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#336FB6] to-[#2a5a94] hover:from-[#2a5a94] hover:to-[#1e4a7a] text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-[#336FB6]/20"
                      >
                        {enviandoEspelho ? 'Enviando...' : 'Reenviar Espelho'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#336FB6] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => setEspelhoFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="espelho-upload"
                    />
                    <label htmlFor="espelho-upload" className="cursor-pointer">
                      <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {espelhoFile ? (
                        <p className="text-sm font-medium text-[#336FB6]">{espelhoFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-600">Clique para selecionar ou arraste o arquivo</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG (max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de entrega</label>
                    <input
                      type="date"
                      value={prazoEntrega}
                      onChange={(e) => setPrazoEntrega(e.target.value)}
                      className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] text-sm"
                    />
                  </div>

                  <button
                    onClick={handleEnviarEspelho}
                    disabled={!espelhoFile || enviandoEspelho}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#336FB6] to-[#2a5a94] hover:from-[#2a5a94] hover:to-[#1e4a7a] text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-[#336FB6]/20"
                  >
                    {enviandoEspelho ? 'Enviando...' : 'Enviar Espelho'}
                  </button>
                </div>
              )}
            </div>
            {pedido.status_interno === 'enviado_fornecedor' && (
              <div className="flex justify-end px-6 pb-6" style={{ display: 'none' }}>
                <button onClick={() => setCurrentStep(3)} className="px-6 py-2.5 bg-[#336FB6] text-white rounded-xl font-medium hover:bg-[#2a5a94] transition-colors">
                  Proximo: Validar e Ajustar &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resumo do pedido (Step 1 when enviado_fornecedor) */}
        {pedido && (!isStepper || currentStep === 1) && (<>
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
        {false && (
          <div className="flex justify-end mt-4">
            <button className="hidden">removed</button>
          </div>
        )}
        </>)}

        {/* Condicoes Comerciais - so aparece quando pode sugerir (Step 3 when enviado_fornecedor) */}
        {canSuggest && (!isStepper || currentStep === 3) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Condicoes Comerciais</h2>
            <p className="text-sm text-gray-500 mb-4">
              Defina condicoes gerais para o pedido. O desconto/bonificacao geral sera aplicado se o total do pedido atingir o valor minimo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    step={1}
                    value={condicoesComerciais.bonificacao_quantidade_geral || ''}
                    onChange={(e) => setCondicoesComerciais(prev => ({
                      ...prev,
                      bonificacao_quantidade_geral: Number(e.target.value)
                    }))}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <span className="text-sm text-gray-500">un</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Unidades extras gratis</p>
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

        {/* Step 1 (stepper): Read-only items table */}
        {isStepper && currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-[#336FB6]/5">
              <h2 className="text-lg font-semibold text-gray-900">Itens do pedido</h2>
              <p className="text-sm text-gray-500 mt-1">Confira os itens solicitados pelo lojista</p>
            </div>
            {/* Desktop read-only table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                    <th className="px-4 py-3">Cod. Fornecedor</th>
                    <th className="px-4 py-3">EAN</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Und</th>
                    <th className="px-4 py-3 text-right">Qtd Pedida</th>
                    <th className="px-4 py-3 text-right">Preco Catalogo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {itens.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.codigo_fornecedor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.ean || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[250px] truncate" title={item.descricao}>{item.descricao}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{item.quantidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(item.preco_catalogo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile read-only cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {itens.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{item.descricao}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {item.codigo_fornecedor && <span>SKU: {item.codigo_fornecedor}</span>}
                    {item.ean && <span>EAN: {item.ean}</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Unidade</p>
                      <p className="text-gray-900 font-medium">{item.unidade}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Qtd Pedida</p>
                      <p className="text-gray-900 font-semibold">{item.quantidade}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Preco Catalogo</p>
                      <p className="text-gray-900 font-medium">R$ {(item.preco_catalogo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 (stepper): Loading state for validation */}
        {isStepper && currentStep === 3 && validandoEspelho && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg className="w-12 h-12 animate-spin text-[#336FB6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-600 font-medium">Validando espelho com IA...</p>
              <p className="text-sm text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          </div>
        )}

        {/* Step 4 (stepper): Summary cards + Observacao + Submit */}
        {isStepper && currentStep === 4 && canSuggest && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-[#336FB6]/5">
              <h2 className="text-lg font-semibold text-gray-900">Resumo da Sugestao</h2>
              <p className="text-sm text-gray-500 mt-1">Revise os status e envie sua sugestao</p>
            </div>
            <div className="p-4 sm:p-6">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{sugestoes.filter(s => s.status_item === 'ok').length}</p>
                  <p className="text-xs text-emerald-600">OK</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{sugestoes.filter(s => s.status_item === 'ruptura').length}</p>
                  <p className="text-xs text-red-600">Ruptura</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{sugestoes.filter(s => s.status_item === 'depreciado').length}</p>
                  <p className="text-xs text-gray-500">Depreciado</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{sugestoes.filter(s => s.status_item === 'divergente').length}</p>
                  <p className="text-xs text-amber-600">Divergente</p>
                </div>
              </div>

              {/* Observacao */}
              <div className="mb-4">
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
                  className="w-full sm:w-auto"
                >
                  {hasPendingSugestao ? 'Reenviar sugestao' : 'Enviar sugestao'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Itens + Formulario de sugestao (Step 3 when stepper, always when not stepper) */}
        {(!isStepper || (currentStep === 3 && !validandoEspelho)) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-[#336FB6]/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {canSuggest
                    ? hasPendingSugestao
                      ? 'Itens - Editar sugestao enviada'
                      : 'Itens - Enviar sugestao'
                    : 'Itens do pedido'}
                </h2>
                {canSuggest && (
                  <p className="text-sm text-gray-500 mt-1">
                    Altere quantidade, desconto, bonificacao e validade para enviar sua sugestao comercial
                  </p>
                )}
              </div>
              {isStepper && espelhoInfo?.espelho_url && (
                <button
                  onClick={async () => {
                    setValidandoEspelho(true)
                    setValidacaoResult(null)
                    localStorage.removeItem(`validacao_${id}`)
                    try {
                      const res = await fetch(`/api/fornecedor/pedidos/${id}/espelho/validar`, { method: 'POST' })
                      if (res.ok) {
                        const validacao = await res.json()
                        if (validacao.success) {
                          setValidacaoResult(validacao)
                          setValidacaoItens((validacao.itens || []).map((item: any) => ({
                            ...item, status_manual: null, observacao_item: '',
                            motivo_faltante: item.status === 'faltando' ? 'ruptura' : null,
                          })))
                        }
                      }
                    } finally {
                      setValidandoEspelho(false)
                    }
                  }}
                  disabled={validandoEspelho}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#336FB6] border border-[#336FB6]/30 rounded-lg hover:bg-[#336FB6]/5 transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${validandoEspelho ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  {validandoEspelho ? 'Validando...' : 'Refazer validacao'}
                </button>
              )}
            </div>
          </div>

          {/* Desktop: tabela completa */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                  {canSuggest && (
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 w-24">Status</th>
                  )}
                  {canSuggest && (
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 w-32">Obs</th>
                  )}
                  {canSuggest && (
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acao</th>
                  )}
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Codigos</th>
                  <th className="px-4 py-3">Und</th>
                  <th className="px-4 py-3 text-right">Preco Catalogo</th>
                  <th className="px-4 py-3 text-right">Qtd original</th>
                  <th className="px-4 py-3 text-right">Subtotal original</th>
                  {isStepper && validacaoResult && (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider bg-purple-50">Produto (Espelho)</th>
                      <th className="px-3 py-3 text-right bg-purple-50">Qty Espelho</th>
                      <th className="px-3 py-3 text-right bg-purple-50">Preco Espelho</th>
                      <th className="px-3 py-3 text-left bg-purple-50">Diferencas</th>
                    </>
                  )}
                  {canSuggest && (
                    <>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-[#FFAA11] uppercase tracking-wider bg-[#FFAA11]/10">Preco sug.</th>
                      <th className="px-4 py-3 text-right bg-[#FFAA11]/10">Qtd sugerida</th>
                      <th className="px-4 py-3 text-right bg-[#FFAA11]/10">Desconto %</th>
                      <th className="px-4 py-3 text-right bg-[#FFAA11]/10">Bonif.</th>
                      <th className="px-4 py-3 bg-[#FFAA11]/10">Validade</th>
                      <th className="px-4 py-3 text-right bg-[#336FB6]/10">Subtotal sugerido</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itens.map((item) => {
                  const sug = sugestoes.find(s => s.item_id === item.id)
                  const valorUnitarioEfetivo = sug?.preco_editado != null ? sug.preco_editado : (sug?.is_substituicao && sug?.preco_unitario != null ? sug.preco_unitario : (item.preco_catalogo ?? 0))
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {canSuggest && sug && (<>
                        <td className="px-2 py-3">
                          <select
                            value={sug.status_item}
                            onChange={(e) => updateSugestao(item.id, 'status_item', e.target.value)}
                            className={`text-xs px-2 py-1 rounded-lg border font-medium w-full ${
                              sug.status_item === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              sug.status_item === 'ruptura' ? 'bg-red-50 text-red-700 border-red-200' :
                              sug.status_item === 'depreciado' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                              sug.status_item === 'divergente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            <option value="ok">OK</option>
                            <option value="ruptura">Ruptura</option>
                            <option value="depreciado">Depreciado</option>
                            <option value="divergente">Divergente</option>
                          </select>
                        </td>
                        <td className="px-2 py-3 align-top">
                          <textarea
                            maxLength={100}
                            rows={1}
                            value={sug.observacao_item}
                            onChange={(e) => {
                              updateSugestao(item.id, 'observacao_item', e.target.value)
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            placeholder="Obs..."
                            className="w-full min-w-[100px] text-[11px] px-2 py-1.5 border border-gray-200 rounded-md focus:border-[#336FB6] focus:ring-1 focus:ring-[#336FB6]/20 resize-none overflow-hidden"
                          />
                        </td>
                      </>)}
                      {canSuggest && !sug && (
                        <>
                          <td className="px-2 py-3" />
                          <td className="px-2 py-3" />
                        </>
                      )}
                      {canSuggest && (
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleTrocarProduto(item.id, item.descricao)}
                            className="p-1.5 text-gray-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                            title="Trocar produto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px]" title={item.descricao}>
                        {sug?.is_substituicao ? (
                          <div>
                            <p className="line-through text-gray-400 text-xs truncate">{item.descricao}</p>
                            <p className="font-semibold text-gray-900 truncate">{sug.produto_nome}</p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-secondary-100 text-secondary-700 mt-0.5">Substituido</span>
                          </div>
                        ) : (
                          <span className="truncate block">{item.descricao}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {sug?.is_substituicao ? (
                          <div>
                            {sug.codigo_fornecedor && (
                              <div className="font-medium text-gray-900" title="SKU Fornecedor">
                                <span className="text-xs text-gray-400 mr-1">SKU:</span>
                                {sug.codigo_fornecedor}
                              </div>
                            )}
                            {sug.gtin && (
                              <div className="text-xs text-gray-500" title="EAN/GTIN">
                                <span className="text-gray-400 mr-1">EAN:</span>
                                {sug.gtin}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {item.codigo_fornecedor && (
                              <div className="font-medium text-gray-900" title="SKU Fornecedor">
                                <span className="text-xs text-gray-400 mr-1">SKU:</span>
                                {item.codigo_fornecedor}
                              </div>
                            )}
                            {item.ean && (
                              <div className="text-xs text-gray-500" title="EAN/GTIN">
                                <span className="text-gray-400 mr-1">EAN:</span>
                                {item.ean}
                              </div>
                            )}
                            {item.codigo_produto && (
                              <div className="text-xs text-gray-400" title="Codigo Lojista">
                                <span className="mr-1">Lojista:</span>
                                {item.codigo_produto}
                              </div>
                            )}
                            {!item.codigo_fornecedor && !item.ean && !item.codigo_produto && '-'}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {sug?.is_substituicao ? (
                          <div>
                            <span className="text-xs text-gray-400 line-through block">{(item.preco_catalogo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="font-medium">{(sug.preco_unitario ?? item.preco_catalogo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ) : (
                          (item.preco_catalogo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {item.quantidade}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        R$ {((item.preco_catalogo ?? 0) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      {isStepper && validacaoResult && (() => {
                        const valItem = validacaoResult.itens?.find(vi =>
                          vi.item_pedido?.codigo === (sug?.codigo_fornecedor || item.codigo_fornecedor) ||
                          vi.item_pedido?.gtin === (sug?.gtin || item.ean)
                        )
                        return (
                          <>
                            <td className="px-3 py-2.5 text-sm bg-purple-50/30 max-w-[150px]">
                              <span className="truncate block text-gray-700" title={valItem?.item_espelho?.nome || ''}>
                                {valItem?.item_espelho?.nome || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-right bg-purple-50/30">
                              {valItem?.item_espelho?.quantidade ?? '-'}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-right bg-purple-50/30">
                              {valItem?.item_espelho?.preco_unitario != null
                                ? `R$ ${valItem.item_espelho.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-500 bg-purple-50/30 max-w-[200px]">
                              {(() => {
                                const diffs: string[] = []
                                const qtyPed = Number(item.quantidade) || 0
                                const qtyEsp = valItem?.item_espelho?.quantidade
                                const precoCat = item.preco_catalogo ?? 0
                                const precoEsp = valItem?.item_espelho?.preco_unitario ?? 0
                                if (qtyEsp != null && qtyPed !== qtyEsp) {
                                  diffs.push(`Qty: pedido ${qtyPed}, espelho ${qtyEsp}`)
                                }
                                if (precoCat > 0 && precoEsp > 0 && Math.abs(precoCat - precoEsp) / precoCat > 0.02) {
                                  diffs.push(`Preco: catalogo R$${precoCat.toFixed(2)}, espelho R$${precoEsp.toFixed(2)}`)
                                }
                                return diffs.length > 0 ? diffs.join('; ') : '-'
                              })()}
                            </td>
                          </>
                        )
                      })()}
                      {canSuggest && sug && (
                        <>
                          <td className="px-3 py-2 text-right bg-[#FFAA11]/5">
                            <div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sug.preco_editado ?? (item.preco_catalogo ?? 0)}
                                onChange={(e) => updateSugestao(item.id, 'preco_editado', parseFloat(e.target.value) || 0)}
                                className={`w-20 px-2 py-1 text-sm text-right border rounded-md focus:ring-1 focus:ring-[#FFAA11] focus:border-[#FFAA11] bg-[#FFAA11]/5 ${sug.preco_editado != null && sug.preco_editado !== (item.preco_catalogo ?? 0) ? 'border-[#FFAA11]' : 'border-gray-300'}`}
                              />
                              {sug.preco_editado != null && sug.preco_editado !== (item.preco_catalogo ?? 0) && (
                                <div className={`text-xs mt-0.5 ${sug.preco_editado < (item.preco_catalogo ?? 0) ? 'text-green-600' : 'text-red-500'}`}>
                                  {sug.preco_editado < (item.preco_catalogo ?? 0) ? '\u2193' : '\u2191'} {(item.preco_catalogo ?? 0) > 0 ? Math.abs(((sug.preco_editado - (item.preco_catalogo ?? 0)) / (item.preco_catalogo ?? 1)) * 100).toFixed(1) : '0.0'}%
                                </div>
                              )}
                            </div>
                          </td>
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
                              value={sug.desconto_percentual || ''}
                              onChange={(e) => updateSugestao(item.id, 'desconto_percentual', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={sug.bonificacao_quantidade || ''}
                              onChange={(e) => updateSugestao(item.id, 'bonificacao_quantidade', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              id={`validade-${item.id}`}
                              type="date"
                              value={sug.validade}
                              onChange={(e) => updateSugestao(item.id, 'validade', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6] transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 bg-[#336FB6]/5">
                            {(() => {
                              const subtotalBase = valorUnitarioEfetivo * sug.quantidade_sugerida
                              const desconto = subtotalBase * (sug.desconto_percentual / 100)
                              const subtotalComDesconto = subtotalBase - desconto
                              const bonifUnidades = sug.bonificacao_quantidade || 0
                              const totalUnidades = sug.quantidade_sugerida + bonifUnidades
                              const custoEfetivo = totalUnidades > 0 ? subtotalComDesconto / totalUnidades : 0
                              const diferenca = subtotalComDesconto - ((item.preco_catalogo ?? 0) * item.quantidade)
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
                                    <>
                                      <p className="text-xs text-purple-600 font-medium">+{bonifUnidades} gratis ({totalUnidades} un total)</p>
                                      <p className="text-xs text-gray-500">R$ {custoEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un efetivo</p>
                                    </>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
                {/* Itens novos adicionados via busca */}
                {sugestoes.filter(s => s.is_novo).map((sug, idx) => {
                  const globalIndex = sugestoes.indexOf(sug)
                  const preco = sug.preco_unitario || 0
                  const subtotalBase = preco * sug.quantidade_sugerida
                  const descontoVal = subtotalBase * (sug.desconto_percentual / 100)
                  const subtotalComDesconto = subtotalBase - descontoVal
                  return (
                    <tr key={`novo-${idx}`} className="bg-secondary-50/30 border-l-4 border-secondary-400">
                      {canSuggest && (
                        <td className="px-2 py-3">
                          <select
                            value={sug.status_item}
                            onChange={(e) => updateSugestao(null, 'status_item', e.target.value, globalIndex)}
                            className={`text-xs px-2 py-1 rounded-lg border font-medium w-full ${
                              sug.status_item === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              sug.status_item === 'ruptura' ? 'bg-red-50 text-red-700 border-red-200' :
                              sug.status_item === 'depreciado' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                              sug.status_item === 'divergente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            <option value="ok">OK</option>
                            <option value="ruptura">Ruptura</option>
                            <option value="depreciado">Depreciado</option>
                            <option value="divergente">Divergente</option>
                          </select>
                        </td>
                      )}
                      {canSuggest && (
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleRemoverItemNovo(globalIndex)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-700">Novo</span>
                          <span className="font-medium text-gray-900 text-sm truncate">{sug.produto_nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {sug.codigo_fornecedor && (
                          <div className="font-medium text-gray-900">
                            <span className="text-xs text-gray-400 mr-1">SKU:</span>
                            {sug.codigo_fornecedor}
                          </div>
                        )}
                        {sug.gtin && (
                          <div className="text-xs text-gray-500">
                            <span className="text-gray-400 mr-1">EAN:</span>
                            {sug.gtin}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">-</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {preco > 0 ? preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-400 text-right">-</td>
                      <td className="px-4 py-2 text-sm text-gray-400 text-right">-</td>
                      {isStepper && validacaoResult && (
                        <>
                          <td className="px-3 py-2.5 text-sm bg-purple-50/30">-</td>
                          <td className="px-3 py-2.5 text-sm text-right bg-purple-50/30">-</td>
                          <td className="px-3 py-2.5 text-sm text-right bg-purple-50/30">-</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 bg-purple-50/30">-</td>
                        </>
                      )}
                      {canSuggest && (
                        <>
                          <td className="px-3 py-2 text-right bg-[#FFAA11]/5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={sug.preco_editado ?? preco}
                              onChange={(e) => updateSugestao(null, 'preco_editado', parseFloat(e.target.value) || 0, globalIndex)}
                              className={`w-20 px-2 py-1 text-sm text-right border rounded-md focus:ring-1 focus:ring-[#FFAA11] focus:border-[#FFAA11] bg-[#FFAA11]/5 ${sug.preco_editado != null && sug.preco_editado !== preco ? 'border-[#FFAA11]' : 'border-gray-300'}`}
                            />
                            {sug.preco_editado != null && preco > 0 && sug.preco_editado !== preco && (
                              <div className={`text-xs mt-0.5 ${sug.preco_editado < preco ? 'text-green-600' : 'text-red-500'}`}>
                                {sug.preco_editado < preco ? '\u2193' : '\u2191'} {Math.abs(((sug.preco_editado - preco) / preco) * 100).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={1}
                              value={sug.quantidade_sugerida}
                              onChange={(e) => updateSugestao(null, 'quantidade_sugerida', Number(e.target.value), globalIndex)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={sug.desconto_percentual || ''}
                              onChange={(e) => updateSugestao(null, 'desconto_percentual', Number(e.target.value) || 0, globalIndex)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={sug.bonificacao_quantidade || ''}
                              onChange={(e) => updateSugestao(null, 'bonificacao_quantidade', Number(e.target.value) || 0, globalIndex)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[#FFAA11]/5">
                            <input
                              id={`validade-novo-${globalIndex}`}
                              type="date"
                              value={sug.validade}
                              onChange={(e) => updateSugestao(null, 'validade', e.target.value, globalIndex)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6] transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 bg-[#336FB6]/5">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#336FB6]">
                                R$ {subtotalComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              {sug.bonificacao_quantidade > 0 && (
                                <p className="text-xs text-blue-500">+{sug.bonificacao_quantidade} gratis</p>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards por item */}
          <div className="md:hidden divide-y divide-gray-200">
            {itens.map((item) => {
              const sug = sugestoes.find(s => s.item_id === item.id)
              const subtotalOriginal = (item.preco_catalogo ?? 0) * item.quantidade
              const valorUnitMobile = sug?.preco_editado != null ? sug.preco_editado : (sug?.is_substituicao && sug?.preco_unitario != null ? sug.preco_unitario : (item.preco_catalogo ?? 0))

              // Calculo do subtotal sugerido
              let subtotalSugerido = subtotalOriginal
              let diferenca = 0
              let bonifUnidades = 0
              if (canSuggest && sug) {
                const subtotalBase = valorUnitMobile * sug.quantidade_sugerida
                const desconto = subtotalBase * (sug.desconto_percentual / 100)
                subtotalSugerido = subtotalBase - desconto
                diferenca = subtotalSugerido - subtotalOriginal
                bonifUnidades = sug.bonificacao_quantidade || 0
              }

              return (
                <div key={item.id} className="p-4 space-y-3">
                  {/* Nome do produto + botao trocar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {sug?.is_substituicao ? (
                        <div>
                          <p className="text-xs text-gray-400 line-through truncate">{item.descricao}</p>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{sug.produto_nome}</p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-secondary-100 text-secondary-700 mt-0.5">Substituido</span>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                            {sug.codigo_fornecedor && <span>SKU: {sug.codigo_fornecedor}</span>}
                            {sug.gtin && <span>EAN: {sug.gtin}</span>}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{item.descricao}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                            {item.codigo_fornecedor && <span>SKU: {item.codigo_fornecedor}</span>}
                            {item.ean && <span>EAN: {item.ean}</span>}
                            {item.codigo_produto && <span>Lojista: {item.codigo_produto}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    {canSuggest && (
                      <button
                        onClick={() => handleTrocarProduto(item.id, item.descricao)}
                        className="p-1.5 text-gray-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors flex-shrink-0"
                        title="Trocar produto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Info basica: valor, qtd, subtotal */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Preco Catalogo</p>
                      <p className="text-gray-900 font-medium">R$ {(item.preco_catalogo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Qtd original</p>
                      <p className="text-gray-900 font-semibold">{item.quantidade} {item.unidade}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Subtotal</p>
                      <p className="text-gray-900 font-semibold">R$ {subtotalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Campos de sugestao */}
                  {canSuggest && sug && (
                    <div className="bg-[#FFAA11]/5 border border-[#FFAA11]/20 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-[#FFAA11] uppercase tracking-wider">Sua sugestao</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-[#FFAA11] font-medium mb-1">Preco sug.</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={sug.preco_editado ?? (item.preco_catalogo ?? 0)}
                            onChange={(e) => updateSugestao(item.id, 'preco_editado', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-[#FFAA11] focus:border-[#FFAA11] bg-[#FFAA11]/5 ${sug.preco_editado != null && sug.preco_editado !== (item.preco_catalogo ?? 0) ? 'border-[#FFAA11]' : 'border-gray-300'}`}
                          />
                          {sug.preco_editado != null && sug.preco_editado !== (item.preco_catalogo ?? 0) && (
                            <div className={`text-xs mt-0.5 ${sug.preco_editado < (item.preco_catalogo ?? 0) ? 'text-green-600' : 'text-red-500'}`}>
                              {sug.preco_editado < (item.preco_catalogo ?? 0) ? '\u2193' : '\u2191'} {(item.preco_catalogo ?? 0) > 0 ? Math.abs(((sug.preco_editado - (item.preco_catalogo ?? 0)) / (item.preco_catalogo ?? 1)) * 100).toFixed(1) : '0.0'}% vs original
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Qtd sugerida</label>
                          <input
                            type="number"
                            min={0}
                            value={sug.quantidade_sugerida}
                            onChange={(e) => updateSugestao(item.id, 'quantidade_sugerida', Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Desconto %</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={sug.desconto_percentual || ''}
                            onChange={(e) => updateSugestao(item.id, 'desconto_percentual', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Bonificacao (un)</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={sug.bonificacao_quantidade || ''}
                            onChange={(e) => updateSugestao(item.id, 'bonificacao_quantidade', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Validade</label>
                          <input
                            id={`validade-${item.id}`}
                            type="date"
                            value={sug.validade}
                            onChange={(e) => updateSugestao(item.id, 'validade', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6] transition-all"
                          />
                        </div>
                      </div>

                      {/* Subtotal sugerido */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#FFAA11]/20">
                        <span className="text-xs text-gray-500">Subtotal sugerido</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#336FB6]">
                            R$ {subtotalSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {diferenca !== 0 && (
                            <span className={`text-xs ml-1.5 ${diferenca > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              ({diferenca > 0 ? '+' : ''}{diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                            </span>
                          )}
                          {bonifUnidades > 0 && (
                            <>
                              <span className="text-xs text-purple-600 font-medium ml-1.5">+{bonifUnidades} gratis ({sug.quantidade_sugerida + bonifUnidades} un)</span>
                              <p className="text-xs text-gray-500">R$ {(subtotalSugerido / (sug.quantidade_sugerida + bonifUnidades)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un efetivo</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Mobile: itens novos adicionados via busca */}
            {sugestoes.filter(s => s.is_novo).map((sug, idx) => {
              const globalIndex = sugestoes.indexOf(sug)
              const preco = sug.preco_unitario || 0
              const subtotalBase = preco * sug.quantidade_sugerida
              const descontoValMobile = subtotalBase * (sug.desconto_percentual / 100)
              const subtotalComDescontoMobile = subtotalBase - descontoValMobile

              return (
                <div key={`novo-mobile-${idx}`} className="p-4 space-y-3 border-l-4 border-secondary-400 bg-secondary-50/30">
                  {/* Nome do produto novo + botao remover */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-700">Novo</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{sug.produto_nome}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {sug.gtin && <span>EAN: {sug.gtin}</span>}
                        {sug.codigo_fornecedor && <span>SKU: {sug.codigo_fornecedor}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoverItemNovo(globalIndex)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Remover item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Info basica */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Preco Catalogo</p>
                      <p className="text-gray-900 font-medium">{preco > 0 ? `R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400">Subtotal</p>
                      <p className="text-gray-900 font-semibold">R$ {subtotalComDescontoMobile.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Campos de sugestao para item novo */}
                  {canSuggest && (
                    <div className="bg-[#FFAA11]/5 border border-[#FFAA11]/20 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-[#FFAA11] uppercase tracking-wider">Sua sugestao</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Qtd sugerida</label>
                          <input
                            type="number"
                            min={1}
                            value={sug.quantidade_sugerida}
                            onChange={(e) => updateSugestao(null, 'quantidade_sugerida', Number(e.target.value), globalIndex)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Desconto %</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={sug.desconto_percentual || ''}
                            onChange={(e) => updateSugestao(null, 'desconto_percentual', Number(e.target.value) || 0, globalIndex)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Bonificacao (un)</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={sug.bonificacao_quantidade || ''}
                            onChange={(e) => updateSugestao(null, 'bonificacao_quantidade', Number(e.target.value) || 0, globalIndex)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Validade</label>
                          <input
                            id={`validade-novo-${globalIndex}`}
                            type="date"
                            value={sug.validade}
                            onChange={(e) => updateSugestao(null, 'validade', e.target.value, globalIndex)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6] transition-all"
                          />
                        </div>
                      </div>

                      {/* Subtotal sugerido */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#FFAA11]/20">
                        <span className="text-xs text-gray-500">Subtotal sugerido</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#336FB6]">
                            R$ {subtotalComDescontoMobile.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {sug.bonificacao_quantidade > 0 && (
                            <span className="text-xs text-blue-500 ml-1.5">+{sug.bonificacao_quantidade} gratis</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Botao Adicionar Produto */}
          {canSuggest && (
            <div className="mt-4 flex justify-center px-4 pb-4">
              <button
                onClick={handleAdicionarProduto}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-secondary-50 to-secondary-100 hover:from-secondary-100 hover:to-secondary-200 text-secondary-700 font-semibold rounded-xl border border-secondary-300/60 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Adicionar Produto
              </button>
            </div>
          )}

          {/* Observacao + Submit (only when NOT in stepper mode; stepper uses Step 4) */}
          {canSuggest && !isStepper && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 space-y-4">
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
                  className="w-full sm:w-auto"
                >
                  {hasPendingSugestao ? 'Reenviar sugestao' : 'Enviar sugestao'}
                </Button>
              </div>
            </div>
          )}
        </div>
        )}

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

        {/* Barra flutuante de navegação */}
        {data.pedido.status_interno === 'enviado_fornecedor' && (
          <div className="fixed bottom-[65px] md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg px-4 md:px-6 py-2.5 md:py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1) as 1|2|3|4)}
                disabled={currentStep === 1}
                className="flex items-center gap-1.5 px-3 md:px-5 py-2 text-xs md:text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <span className="text-xs md:text-sm text-gray-500">
                {currentStep}/4 {['Conferir', 'Espelho', 'Validar', 'Enviar'][currentStep - 1]}
              </span>
              <button
                onClick={() => setCurrentStep(Math.min(4, currentStep + 1) as 1|2|3|4)}
                disabled={currentStep === 4}
                className="flex items-center gap-1.5 px-3 md:px-5 py-2 text-xs md:text-sm font-medium text-white bg-[#336FB6] rounded-lg hover:bg-[#2a5a94] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Proximo</span>
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Modal de Sucesso ao Enviar Sugestao */}
        {showSucessoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              {/* Icone de sucesso */}
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Sugestao Enviada!
              </h2>

              <p className="text-gray-600 text-center mb-6">
                Sua sugestao comercial foi enviada com sucesso para o lojista.
                Voce sera notificado quando houver uma resposta.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-700 text-center">
                  <strong>Aguarde:</strong> O lojista ira analisar sua proposta e podera aceitar,
                  rejeitar ou manter o pedido original.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowSucessoModal(false)
                    router.push('/fornecedor/pedidos')
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Ver Pedidos
                </Button>
                <Button
                  onClick={() => {
                    setShowSucessoModal(false)
                    router.refresh()
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  Continuar
                </Button>
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

        {/* Modal de Busca de Produtos */}
        <ProductSearchModal
          isOpen={modalBuscaAberto}
          onClose={() => setModalBuscaAberto(false)}
          onSelect={handleProdutoSelecionado}
          pedidoId={id}
          mode={modalBuscaMode}
          itemOriginalNome={itemParaSubstituirNome}
        />
      </div>

      {/* Modal Viewer do Espelho */}
      {showEspelhoViewer && espelhoInfo?.espelho_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEspelhoViewer(false)} />
          <div className="relative w-full max-w-4xl h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Espelho do Pedido</h3>
                <p className="text-sm text-gray-500">{espelhoInfo.espelho_nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/fornecedor/pedidos/${id}/espelho/download`}
                  className="px-3 py-1.5 bg-[#336FB6] text-white rounded-lg text-sm font-medium hover:bg-[#2b5e9e] transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </a>
                <button onClick={() => setShowEspelhoViewer(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100">
              {espelhoInfo.espelho_nome?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <div className="flex items-center justify-center min-h-full p-4">
                  <img src={espelhoInfo.espelho_url} alt="Espelho do pedido" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                </div>
              ) : (
                <iframe src={espelhoInfo.espelho_url} className="w-full h-full border-0" title="Espelho do pedido" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Validacao IA do Espelho (parcialmente editavel para itens faltando) */}
      {showValidacaoModal && validacaoResult && (() => {
        const resumo = validacaoResult.resumo
        const sortedItens = [...validacaoItens]
          .map((item, originalIdx) => ({ ...item, _idx: originalIdx }))
          .sort((a, b) => {
            const order: Record<string, number> = { divergencia: 0, faltando: 1, extra: 2, ok: 3 }
            return (order[a.status] ?? 5) - (order[b.status] ?? 5)
          })
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowValidacaoModal(false)} />
          <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Validacao do Espelho</h3>
                  <p className="text-sm text-gray-500">Comparacao via IA -- informe o motivo dos itens faltantes</p>
                </div>
                <div className="flex items-center gap-2">
                  {espelhoInfo?.espelho_url && (
                    <>
                      <button
                        onClick={() => { setShowValidacaoModal(false); setShowEspelhoViewer(true) }}
                        className="px-3 py-1.5 bg-white border border-[#336FB6]/30 rounded-lg text-xs font-medium text-[#336FB6] hover:bg-[#336FB6]/5 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver espelho
                      </button>
                      <a
                        href={`/api/fornecedor/pedidos/${id}/espelho/download`}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </a>
                    </>
                  )}
                  <button onClick={() => setShowValidacaoModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {resumo.ok} OK
                </span>
                {resumo.divergencias > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {resumo.divergencias} Divergencias
                  </span>
                )}
                {resumo.faltando > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    {resumo.faltando} Faltando
                  </span>
                )}
                {resumo.extras > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    + {resumo.extras} Extras
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Pedido: {resumo.total_pedido} itens | Espelho: {resumo.total_espelho} itens
                </span>
              </div>
            </div>

            {/* Results table */}
            <div className="flex-1 overflow-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-3 text-left">Produto (Pedido)</th>
                    <th className="px-3 py-3 text-left">Produto (Espelho)</th>
                    <th className="px-3 py-3 text-center">Qtd Ped.</th>
                    <th className="px-3 py-3 text-center">Qtd Esp.</th>
                    <th className="px-3 py-3 text-right">Preco Ped.</th>
                    <th className="px-3 py-3 text-right">Preco Esp.</th>
                    <th className="px-3 py-3 text-left">Diferencas</th>
                    <th className="px-3 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedItens.map((item) => (
                    <tr key={item._idx} className={
                      item.status === 'ok' ? 'bg-white' :
                      item.status === 'divergencia' ? 'bg-amber-50/60' :
                      item.status === 'faltando' ? 'bg-red-50/60' :
                      item.status === 'extra' ? 'bg-blue-50/60' : 'bg-white'
                    }>
                      <td className="px-3 py-2.5 text-sm">
                        <div>
                          {item.item_pedido ? (
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-2">{item.item_pedido.descricao}</p>
                              <p className="text-xs text-gray-400">{item.item_pedido.gtin || item.item_pedido.codigo || '-'}</p>
                            </div>
                          ) : '-'}
                          {/* Motivo faltante controls for faltando items */}
                          {(item.status === 'faltando') && (
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-red-100">
                              <select
                                value={item.motivo_faltante || ''}
                                onChange={(e) => {
                                  const newItens = [...validacaoItens]
                                  newItens[item._idx].motivo_faltante = e.target.value || null
                                  if (e.target.value !== 'ruptura') {
                                    newItens[item._idx].previsao_retorno = null
                                  }
                                  setValidacaoItens(newItens)
                                }}
                                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                              >
                                <option value="">Selecione o motivo...</option>
                                <option value="ruptura">Ruptura (sem estoque)</option>
                                <option value="descontinuado">Descontinuado</option>
                              </select>
                              {item.motivo_faltante === 'ruptura' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500">Previsao retorno:</span>
                                  <input
                                    type="date"
                                    value={item.previsao_retorno || ''}
                                    onChange={(e) => {
                                      const newItens = [...validacaoItens]
                                      newItens[item._idx].previsao_retorno = e.target.value || null
                                      setValidacaoItens(newItens)
                                    }}
                                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        {item.item_espelho ? (
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-2">{item.item_espelho.nome}</p>
                            <p className="text-xs text-gray-400">{item.item_espelho.codigo || '-'}</p>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center">{item.item_pedido?.quantidade ?? '-'}</td>
                      <td className="px-3 py-2.5 text-sm text-center">{item.item_espelho?.quantidade ?? '-'}</td>
                      <td className="px-3 py-2.5 text-sm text-right">{item.item_pedido?.valor != null ? `R$ ${item.item_pedido.valor.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2.5 text-sm text-right">{item.item_espelho?.preco_unitario != null ? `R$ ${item.item_espelho.preco_unitario.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[180px]">{item.diferencas?.join('; ') || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                          item.status === 'ok' ? 'bg-emerald-100 text-emerald-700' :
                          item.status === 'divergencia' ? 'bg-amber-100 text-amber-700' :
                          item.status === 'faltando' ? 'bg-red-100 text-red-700' :
                          item.status === 'extra' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="text-[10px] font-medium text-purple-500 bg-purple-50 px-1 py-0.5 rounded">IA</span>
                          {item.status === 'ok' ? 'OK' : item.status === 'divergencia' ? 'Diverge' : item.status === 'faltando' ? 'Faltando' : '+ Extra'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-500">
                Resultado gerado por IA. Informe o motivo dos itens faltantes para o lojista.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowValidacaoModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                {validacaoItens.some(i => i.status === 'faltando' && i.motivo_faltante) && (
                  <button
                    onClick={handleSalvarDisponibilidade}
                    disabled={salvandoDisponibilidade}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2b5e9e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {salvandoDisponibilidade ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Salvando...
                      </>
                    ) : 'Salvar disponibilidade'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        )
      })()}
    </FornecedorLayout>
  )
}
