'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type {
  ItemPedidoCompra,
  PoliticaCompra,
  ProdutoFornecedor,
  ParcelaPedido,
} from '@/types/pedido-compra'
import { FRETE_POR_CONTA_OPTIONS } from '@/types/pedido-compra'

// Interface local para formas de pagamento
interface FormaPagamento {
  id: number
  id_bling: number | null
  descricao: string
}

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ExclamationTriangleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function XMarkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// Tipo para notificacoes
type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  type: ToastType
  title: string
  message: string
}

// Componente Toast
function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircleIcon />,
      iconColor: 'text-green-500',
      titleColor: 'text-green-800',
      textColor: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <XCircleIcon />,
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <ExclamationTriangleIcon />,
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-800',
      textColor: 'text-yellow-700',
    },
  }

  const style = styles[toast.type]

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full ${style.bg} ${style.border} border rounded-lg shadow-lg p-4 animate-slide-in`}>
      <div className="flex items-start gap-3">
        <div className={style.iconColor}>{style.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${style.titleColor}`}>{toast.title}</p>
          <p className={`text-sm mt-1 ${style.textColor} whitespace-pre-wrap`}>{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className={`${style.textColor} hover:opacity-70 transition-opacity`}
        >
          <XMarkIcon />
        </button>
      </div>
    </div>
  )
}

// Funcao para parsear erros do Bling
function parseBlingError(errorMessage: string, details?: string): string {
  // Erros comuns do Bling
  const errorMappings: Record<string, string> = {
    'fornecedor': 'O fornecedor selecionado nao esta cadastrado ou sincronizado corretamente no Bling.',
    'produto': 'Um ou mais produtos nao estao cadastrados no Bling. Sincronize os produtos primeiro.',
    'token': 'Sessao do Bling expirada. Reconecte sua conta Bling nas configuracoes.',
    'autoriza': 'Sem autorizacao para criar pedidos. Verifique as permissoes da sua conta Bling.',
    'limite': 'Limite de requisicoes atingido. Aguarde alguns minutos e tente novamente.',
    'obrigatorio': 'Campos obrigatorios nao preenchidos. Verifique os dados do pedido.',
    'valor': 'Valores invalidos detectados. Verifique precos e quantidades.',
    'data': 'Data invalida. Verifique as datas informadas.',
  }

  const lowerError = errorMessage.toLowerCase()

  for (const [key, message] of Object.entries(errorMappings)) {
    if (lowerError.includes(key)) {
      return message
    }
  }

  // Se tiver detalhes, tentar extrair informacao util
  if (details) {
    try {
      const parsed = JSON.parse(details)
      if (parsed.error?.fields) {
        const fields = parsed.error.fields
        // Bling retorna fields como array: [{msg, element}, ...]
        if (Array.isArray(fields)) {
          const msgs = fields.map((f: { msg?: string; element?: string }) => f.msg || f.element).filter(Boolean)
          const unique = [...new Set(msgs)]
          if (unique.length > 0) {
            return unique.join('\n')
          }
        } else {
          const fieldNames = Object.keys(fields).join(', ')
          return `Campos com problema: ${fieldNames}. Verifique os dados informados.`
        }
      }
    } catch {
      // Ignorar erro de parse
    }
  }

  return errorMessage
}

function NovoPedidoContent() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fornecedorIdParam = searchParams.get('fornecedor_id')
  const fromCurva = searchParams.get('from') === 'curva'

  // Form state
  const [fornecedorId, setFornecedorId] = useState<number | null>(null)
  const [fornecedorIdBling, setFornecedorIdBling] = useState<number | null>(null)
  const [fornecedorNome, setFornecedorNome] = useState('')
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0])
  const [dataPrevista, setDataPrevista] = useState('')
  const [ordemCompra, setOrdemCompra] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [observacoesInternas, setObservacoesInternas] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [frete, setFrete] = useState(0)
  const [totalIcms, setTotalIcms] = useState(0)
  const [transportador, setTransportador] = useState('')
  const [fretePorConta, setFretePorConta] = useState('CIF')
  const [itens, setItens] = useState<ItemPedidoCompra[]>([])
  const [parcelas, setParcelas] = useState<ParcelaPedido[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'produtos' | 'politicas' | 'pagamento'>('produtos')
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([])
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [produtoSearch, setProdutoSearch] = useState('')
  const [produtosFornecedor, setProdutosFornecedor] = useState<ProdutoFornecedor[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [politicas, setPoliticas] = useState<PoliticaCompra[]>([])
  const [politicaSelecionadaId, setPoliticaSelecionadaId] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  // Politica selecionada (computed)
  const politica = politicas.find(p => p.id === politicaSelecionadaId) || politicas[0] || null

  // Auto-fechar toast apos 6 segundos
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Funcao para mostrar notificacao
  const showToast = (type: ToastType, title: string, message: string) => {
    setToast({ type, title, message })
  }

  // Carregar dados do fornecedor
  useEffect(() => {
    const fetchFornecedor = async () => {
      if (!fornecedorIdParam || !user?.id) {
        setLoading(false)
        return
      }

      try {
        const empresaId = empresa?.id || user?.empresa_id
        if (!empresaId) {
          setLoading(false)
          return
        }

        const fId = parseInt(fornecedorIdParam)
        setFornecedorId(fId)

        // Buscar dados do fornecedor (incluindo id_bling para integracao)
        const { data: fornecedor, error: fError } = await supabase
          .from('fornecedores')
          .select('id, id_bling, nome')
          .eq('id', fId)
          .eq('empresa_id', empresaId)
          .single()

        if (fError) throw fError
        if (fornecedor) {
          setFornecedorNome(fornecedor.nome)
          setFornecedorIdBling(fornecedor.id_bling)
        }

        // Buscar politicas de compra do fornecedor
        const { data: politicasData } = await supabase
          .from('politica_compra')
          .select('*')
          .eq('fornecedor_id', fId)
          .eq('empresa_id', empresaId)
          .eq('status', 'ativa')
          .order('id', { ascending: false })

        if (politicasData && politicasData.length > 0) {
          setPoliticas(politicasData)
          // Selecionar a primeira politica por padrao
          setPoliticaSelecionadaId(politicasData[0].id)
          // Se tiver prazo de entrega na politica, calcular data prevista
          if (politicasData[0].prazo_entrega) {
            const prevista = new Date()
            prevista.setDate(prevista.getDate() + politicasData[0].prazo_entrega)
            setDataPrevista(prevista.toISOString().split('T')[0])
          }
        }

        // Buscar formas de pagamento (incluindo id_bling para integracao)
        const { data: formas } = await supabase
          .from('formas_de_pagamento')
          .select('id, id_forma_de_pagamento_bling, descricao')
          .eq('empresa_id', empresaId)
          .order('descricao')

        if (formas) {
          setFormasPagamento(formas.map(f => ({
            id: f.id,
            id_bling: f.id_forma_de_pagamento_bling,
            descricao: f.descricao
          })))
        }

      } catch (err) {
        console.error('Erro ao carregar fornecedor:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFornecedor()
  }, [fornecedorIdParam, user?.id, user?.empresa_id, empresa?.id])

  // Carregar itens pre-preenchidos do sessionStorage (vindo da pagina de curva)
  useEffect(() => {
    if (fromCurva && fornecedorId) {
      try {
        const itensJson = sessionStorage.getItem('curva_pedido_itens')
        if (itensJson) {
          const itensSalvos = JSON.parse(itensJson)
          if (Array.isArray(itensSalvos) && itensSalvos.length > 0) {
            // Converter para o formato ItemPedidoCompra
            const itensFormatados: ItemPedidoCompra[] = itensSalvos.map((item: {
              produto_id: number
              id_produto_bling: number
              codigo_produto: string
              codigo_fornecedor?: string
              descricao: string
              unidade: string
              quantidade: number
              valor: number
              aliquota_ipi: number
              estoque_atual: number
              ean?: string
            }) => ({
              produto_id: item.produto_id,
              id_produto_bling: item.id_produto_bling,
              codigo_produto: item.codigo_produto,
              codigo_fornecedor: item.codigo_fornecedor,
              descricao: item.descricao,
              unidade: item.unidade || 'UN',
              quantidade: item.quantidade,
              valor: item.valor,
              aliquota_ipi: item.aliquota_ipi || 0,
              estoque_atual: item.estoque_atual || 0,
              ean: item.ean,
            }))
            setItens(itensFormatados)
            // Limpar sessionStorage apos carregar
            sessionStorage.removeItem('curva_pedido_itens')
            // Mostrar notificacao de sucesso
            showToast('success', 'Itens carregados', `${itensFormatados.length} produto(s) foram adicionados ao pedido a partir da analise de curva.`)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar itens do sessionStorage:', error)
      }
    }
  }, [fromCurva, fornecedorId])

  // Buscar produtos do fornecedor
  const fetchProdutosFornecedor = async (search: string = '') => {
    if (!fornecedorId || !user?.id) return

    setLoadingProdutos(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      let query = supabase
        .from('fornecedores_produtos')
        .select(`
          produto_id,
          valor_de_compra,
          codigo_fornecedor,
          produtos!inner(id, id_produto_bling, codigo, nome, unidade, estoque_atual, gtin)
        `)
        .eq('fornecedor_id', fornecedorId)
        .eq('empresa_id', empresaId)

      if (search) {
        query = query.or(`produtos.nome.ilike.%${search}%,produtos.codigo.ilike.%${search}%`)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error

      if (data) {
        const formatted: ProdutoFornecedor[] = data.map((item: any) => ({
          produto_id: item.produto_id,
          id_produto_bling: item.produtos.id_produto_bling,
          codigo: item.produtos.codigo || '',
          nome: item.produtos.nome || '',
          unidade: item.produtos.unidade || 'UN',
          valor_de_compra: item.valor_de_compra || 0,
          estoque_atual: item.produtos.estoque_atual || 0,
          gtin: item.produtos.gtin,
          codigo_fornecedor: item.codigo_fornecedor || undefined
        }))
        setProdutosFornecedor(formatted)
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    } finally {
      setLoadingProdutos(false)
    }
  }

  // Buscar produtos quando abrir modal
  useEffect(() => {
    if (showProdutoModal) {
      fetchProdutosFornecedor(produtoSearch)
    }
  }, [showProdutoModal, produtoSearch])

  // Auto-gerar parcelas quando politica com forma_pagamento_dias for selecionada
  useEffect(() => {
    if (
      politica?.forma_pagamento_dias &&
      politica.forma_pagamento_dias.length > 0 &&
      parcelas.length === 0 &&
      itens.length > 0
    ) {
      // Calcular o valor total com frete para as parcelas
      const valorComFrete = totalPedido
      if (valorComFrete <= 0) return

      const dias = politica.forma_pagamento_dias
      const quantidade = dias.length
      const valorPorParcela = Number((valorComFrete / quantidade).toFixed(2))
      const hoje = new Date()

      const novasParcelas: ParcelaPedido[] = dias.map((diasVencimento, i) => {
        const dataVencimento = new Date(hoje.getTime() + diasVencimento * 24 * 60 * 60 * 1000)
        // Ultima parcela pega o residual para evitar centavos perdidos
        const valorParcela = i === quantidade - 1
          ? Number((valorComFrete - valorPorParcela * (quantidade - 1)).toFixed(2))
          : valorPorParcela
        return {
          valor: valorParcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
        }
      })
      setParcelas(novasParcelas)
    }
  }, [politica?.forma_pagamento_dias, politica?.id, itens.length])

  // Funcao para gerar parcelas manualmente usando a politica
  const handleUsarPolitica = () => {
    if (!politica?.forma_pagamento_dias || politica.forma_pagamento_dias.length === 0) {
      showToast('warning', 'Politica sem parcelas', 'Esta politica nao possui dias de pagamento configurados.')
      return
    }

    const valorComFrete = totalPedido
    if (valorComFrete <= 0) {
      showToast('warning', 'Valor zerado', 'Adicione produtos ao pedido antes de gerar parcelas.')
      return
    }

    const dias = politica.forma_pagamento_dias
    const quantidade = dias.length
    const valorPorParcela = Number((valorComFrete / quantidade).toFixed(2))
    const hoje = new Date()

    const novasParcelas: ParcelaPedido[] = dias.map((diasVencimento, i) => {
      const dataVencimento = new Date(hoje.getTime() + diasVencimento * 24 * 60 * 60 * 1000)
      const valorParcela = i === quantidade - 1
        ? Number((valorComFrete - valorPorParcela * (quantidade - 1)).toFixed(2))
        : valorPorParcela
      return {
        valor: valorParcela,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
      }
    })
    setParcelas(novasParcelas)
    showToast('success', 'Parcelas geradas', `${quantidade} parcela(s) criada(s) com base na politica de compra.`)
    setActiveTab('pagamento')
  }

  // Adicionar produto ao pedido
  const handleAddProduto = (produto: ProdutoFornecedor) => {
    // Verificar se ja existe
    if (itens.some(i => i.produto_id === produto.produto_id)) {
      return
    }

    const novoItem: ItemPedidoCompra = {
      produto_id: produto.produto_id,
      id_produto_bling: produto.id_produto_bling,
      descricao: produto.nome,
      codigo_produto: produto.codigo,
      codigo_fornecedor: produto.codigo_fornecedor,
      unidade: produto.unidade,
      quantidade: 1,
      valor: produto.valor_de_compra,
      aliquota_ipi: 0,
      estoque_atual: produto.estoque_atual,
      ean: produto.gtin
    }

    setItens([...itens, novoItem])
    setShowProdutoModal(false)
    setProdutoSearch('')
  }

  // Remover item
  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  // Atualizar item
  const handleUpdateItem = (index: number, field: keyof ItemPedidoCompra, value: number) => {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }
    setItens(newItens)
  }

  // Adicionar parcela
  const handleAddParcela = () => {
    const novaParcela: ParcelaPedido = {
      valor: 0,
      data_vencimento: new Date().toISOString().split('T')[0]
    }
    setParcelas([...parcelas, novaParcela])
  }

  // Remover parcela
  const handleRemoveParcela = (index: number) => {
    setParcelas(parcelas.filter((_, i) => i !== index))
  }

  // Atualizar parcela
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateParcela = (index: number, field: keyof ParcelaPedido, value: any) => {
    const newParcelas = [...parcelas]
    newParcelas[index] = { ...newParcelas[index], [field]: value }

    // Se atualizou forma_pagamento_id, tambem atualizar forma_pagamento_id_bling
    if (field === 'forma_pagamento_id' && value) {
      const formaSelecionada = formasPagamento.find(fp => fp.id === Number(value))
      if (formaSelecionada) {
        newParcelas[index].forma_pagamento_id_bling = formaSelecionada.id_bling || undefined
        newParcelas[index].forma_pagamento_nome = formaSelecionada.descricao

        // Auto-preencher outras parcelas que ainda nao tem forma de pagamento
        newParcelas.forEach((parcela, i) => {
          if (i !== index && !parcela.forma_pagamento_id) {
            newParcelas[i] = {
              ...parcela,
              forma_pagamento_id: Number(value),
              forma_pagamento_id_bling: formaSelecionada.id_bling || undefined,
              forma_pagamento_nome: formaSelecionada.descricao,
            }
          }
        })
      }
    }

    setParcelas(newParcelas)
  }

  // Calculos
  const totalProdutos = itens.reduce((acc, item) => {
    const subtotal = item.quantidade * item.valor
    const ipi = subtotal * (item.aliquota_ipi / 100)
    return acc + subtotal + ipi
  }, 0)

  const descontoValor = totalProdutos * (desconto / 100)
  // Se CIF ou SEM_FRETE, frete nao soma ao total (ja incluso ou nao existe)
  // Se FOB, TERCEIROS, PROPRIO_*, frete soma ao total
  const freteNaoSoma = fretePorConta === 'CIF' || fretePorConta === 'SEM_FRETE'
  const freteEfetivo = freteNaoSoma ? 0 : frete
  const totalPedido = totalProdutos - descontoValor + freteEfetivo + totalIcms

  // Recalcular parcelas quando o total do pedido mudar (frete, desconto, etc)
  // Mantendo as datas de vencimento, apenas atualizando os valores
  useEffect(() => {
    if (parcelas.length > 0 && totalPedido > 0) {
      const totalAtualParcelas = parcelas.reduce((acc, p) => acc + p.valor, 0)
      const diferenca = Math.abs(totalAtualParcelas - totalPedido)

      // Se a diferenca for maior que 1 centavo, recalcular
      if (diferenca > 0.01) {
        const quantidade = parcelas.length
        const valorPorParcela = Number((totalPedido / quantidade).toFixed(2))

        const parcelasAtualizadas = parcelas.map((parcela, i) => {
          const valorParcela = i === quantidade - 1
            ? Number((totalPedido - valorPorParcela * (quantidade - 1)).toFixed(2))
            : valorPorParcela
          return {
            ...parcela,
            valor: valorParcela,
          }
        })
        setParcelas(parcelasAtualizadas)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPedido])

  const totalItens = itens.length
  const somaQuantidades = itens.reduce((acc, item) => acc + item.quantidade, 0)

  // Formatar valor
  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Salvar pedido - Envia para Bling e depois salva localmente
  const handleSave = async () => {
    // Validacao: Fornecedor selecionado
    if (!fornecedorId) {
      showToast('warning', 'Fornecedor obrigatorio', 'Selecione um fornecedor para criar o pedido.')
      return
    }

    // Validacao: Pelo menos um produto
    if (itens.length === 0) {
      showToast('warning', 'Produtos obrigatorios', 'Adicione pelo menos um produto ao pedido.')
      return
    }

    // Validacao: Fornecedor sincronizado com Bling
    if (!fornecedorIdBling) {
      showToast('error', 'Fornecedor nao sincronizado',
        'Este fornecedor nao esta sincronizado com o Bling.\n\nVa em Cadastros > Fornecedores e sincronize o fornecedor primeiro.')
      return
    }

    // Validacao: Produtos com ID Bling
    const produtosSemBling = itens.filter(item => !item.id_produto_bling)
    if (produtosSemBling.length > 0) {
      const nomes = produtosSemBling.map(p => p.descricao).slice(0, 3).join(', ')
      const mais = produtosSemBling.length > 3 ? ` e mais ${produtosSemBling.length - 3}` : ''
      showToast('warning', 'Produtos nao sincronizados',
        `${produtosSemBling.length} produto(s) nao estao sincronizados com o Bling:\n${nomes}${mais}\n\nO pedido sera criado, mas esses produtos nao serao vinculados no Bling.`)
    }

    // Validacao: Quantidades validas
    const itensInvalidos = itens.filter(item => item.quantidade <= 0 || item.valor <= 0)
    if (itensInvalidos.length > 0) {
      showToast('error', 'Valores invalidos',
        'Existem produtos com quantidade ou valor zerado/negativo. Corrija antes de continuar.')
      return
    }

    // Validacao: Parcelas (se houver)
    if (parcelas.length > 0) {
      const totalParcelas = parcelas.reduce((acc, p) => acc + p.valor, 0)
      const parcelasInvalidas = parcelas.filter(p => p.valor <= 0 || !p.data_vencimento)

      if (parcelasInvalidas.length > 0) {
        showToast('error', 'Parcelas invalidas',
          'Existem parcelas com valor zerado ou sem data de vencimento.')
        return
      }

      // Validacao: Forma de pagamento obrigatoria em todas as parcelas
      const indicePrimeiraSemFormaPagamento = parcelas.findIndex(p => !p.forma_pagamento_id_bling)
      if (indicePrimeiraSemFormaPagamento !== -1) {
        showToast('error', 'Forma de pagamento obrigatoria',
          'Selecione uma forma de pagamento para todas as parcelas antes de criar o pedido.')

        // Scroll e foco no campo de forma de pagamento vazio
        setTimeout(() => {
          const selectElement = document.getElementById(`forma-pagamento-${indicePrimeiraSemFormaPagamento}`)
          if (selectElement) {
            selectElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            selectElement.focus()
            // Adicionar borda vermelha temporária para destacar
            selectElement.classList.add('ring-2', 'ring-red-500', 'border-red-500')
            setTimeout(() => {
              selectElement.classList.remove('ring-2', 'ring-red-500', 'border-red-500')
            }, 3000)
          }
        }, 100)
        return
      }

      // Aviso se total das parcelas diferente do total do pedido
      const diferenca = Math.abs(totalParcelas - totalPedido)
      if (diferenca > 0.01) {
        showToast('warning', 'Parcelas divergentes',
          `O total das parcelas (${formatCurrency(totalParcelas)}) difere do total do pedido (${formatCurrency(totalPedido)}).`)
      }
    }

    setSaving(true)
    try {
      // Montar payload para API
      const itensPayload = itens.map(item => ({
        descricao: item.descricao,
        codigoFornecedor: item.codigo_fornecedor || undefined,
        unidade: item.unidade,
        valor: item.valor,
        quantidade: item.quantidade,
        aliquotaIPI: item.aliquota_ipi,
        produto_id: item.produto_id,  // ID interno Supabase para FK
        produto: item.id_produto_bling ? {
          id: item.id_produto_bling,
          codigo: item.codigo_produto
        } : undefined
      }))

      // Montar parcelas para API (com forma de pagamento Bling)
      const parcelasPayload = parcelas.length > 0 ? parcelas.map(p => ({
        valor: p.valor,
        dataVencimento: p.data_vencimento,
        observacao: p.observacao || '',
        formaPagamento: p.forma_pagamento_id_bling ? {
          id: p.forma_pagamento_id_bling
        } : undefined
      })) : undefined

      // Montar observacoes incluindo bonificacao se existir na politica
      let observacoesFinais = observacoes || ''
      if (politica?.bonificacao && politica.bonificacao > 0) {
        const textoBonificacao = `Bonificacao acordada: ${politica.bonificacao}%`
        observacoesFinais = observacoesFinais
          ? `${observacoesFinais}\n${textoBonificacao}`
          : textoBonificacao
      }

      const payload = {
        fornecedor_id: fornecedorId,
        fornecedor_id_bling: fornecedorIdBling,
        data: dataPedido,
        dataPrevista: dataPrevista || undefined,
        totalProdutos: totalProdutos,
        total: totalPedido,
        desconto: desconto,
        frete: frete,
        totalIcms: totalIcms,
        transportador: transportador || undefined,
        fretePorConta: fretePorConta,
        ordemCompra: ordemCompra || undefined,
        observacoes: observacoesFinais || undefined,
        observacoesInternas: observacoesInternas || undefined,
        itens: itensPayload,
        parcelas: parcelasPayload
      }

      // Chamar API que integra com Bling
      const response = await fetch('/api/pedidos-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        // Parsear erro do Bling para mensagem amigavel
        const errorMessage = parseBlingError(result.error || 'Erro desconhecido', result.details)
        showToast('error', 'Erro ao criar pedido', errorMessage)
        return
      }

      showToast('success', 'Pedido criado com sucesso!',
        `Pedido #${result.numero || result.id} foi registrado no Bling e salvo localmente.`)

      // Redirecionar para espelho do pedido (com aviso se houve warning de estorno)
      const targetId = result.id || result.bling_id
      const queryParam = result.warning ? '?aviso=estorno' : ''
      setTimeout(() => {
        router.push(`/compras/pedidos/${targetId}${queryParam}`)
      }, 1500)

    } catch (err) {
      console.error('Erro ao salvar pedido:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado ao salvar pedido.'
      showToast('error', 'Erro ao criar pedido', parseBlingError(errorMessage))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#336FB6]"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!fornecedorId) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-[20px] p-8 text-center">
          <p className="text-gray-600 mb-4">Fornecedor nao encontrado.</p>
          <Link href="/compras/pedidos" className="text-[#336FB6] hover:underline">
            Voltar para lista
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Toast de notificacao */}
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/compras/pedidos"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#344054]">Novo Pedido de Compra</h1>
          <p className="text-sm text-[#667085]">{fornecedorNome}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Form */}
        <div className="col-span-8">
          {/* Alert Politica */}
          {politica && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <InfoIcon />
              <div>
                <p className="text-sm font-medium text-blue-800">Politica de compra aplicada</p>
                <p className="text-sm text-blue-600">
                  Valor minimo: {formatCurrency(politica.valor_minimo || 0)} |
                  Desconto: {politica.desconto || 0}% |
                  Prazo entrega: {politica.prazo_entrega || 0} dias
                </p>
              </div>
            </div>
          )}

          {/* Dados do Pedido */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 mb-6">
            <h2 className="text-base font-semibold text-[#344054] mb-4">Detalhes da Compra</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de Compra</label>
                <input
                  type="text"
                  value={ordemCompra}
                  onChange={(e) => setOrdemCompra(e.target.value)}
                  placeholder="Numero da OC"
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pedido</label>
                <input
                  type="date"
                  value={dataPedido}
                  readOnly
                  className="block w-full px-3 py-2 text-sm text-gray-500 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Prevista</label>
                <input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frete por Conta</label>
                <select
                  value={fretePorConta}
                  onChange={(e) => setFretePorConta(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FRETE_POR_CONTA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Transportador</label>
              <input
                type="text"
                value={transportador}
                onChange={(e) => setTransportador(e.target.value)}
                placeholder="Nome do transportador"
                className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observacoes para o fornecedor..."
                  rows={3}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes Internas</label>
                <textarea
                  value={observacoesInternas}
                  onChange={(e) => setObservacoesInternas(e.target.value)}
                  placeholder="Notas internas..."
                  rows={3}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
            {/* Tab Header */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('produtos')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'produtos'
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Produtos
                </button>
                <button
                  onClick={() => setActiveTab('politicas')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'politicas'
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Politicas de Compra
                </button>
                <button
                  onClick={() => setActiveTab('pagamento')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'pagamento'
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pagamento
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'produtos' && (
                <div>
                  {/* Botao Adicionar */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setShowProdutoModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                    >
                      <PlusIcon />
                      Adicionar produto
                    </button>
                  </div>

                  {/* Tabela de produtos */}
                  {itens.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Nenhum produto adicionado.</p>
                      <button
                        onClick={() => setShowProdutoModal(true)}
                        className="mt-2 text-sm text-[#336FB6] hover:underline"
                      >
                        Adicionar primeiro produto
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">SKU</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">Un</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Qtde</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Preco</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">IPI%</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Total</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">Estq</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map((item, index) => {
                            const subtotal = item.quantidade * item.valor
                            const ipi = subtotal * (item.aliquota_ipi / 100)
                            const total = subtotal + ipi

                            return (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-600">{index + 1}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{item.descricao}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{item.codigo_produto || '-'}</td>
                                <td className="px-3 py-2 text-center text-sm text-gray-600">{item.unidade}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantidade}
                                    onChange={(e) => handleUpdateItem(index, 'quantidade', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.valor}
                                    onChange={(e) => handleUpdateItem(index, 'valor', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={item.aliquota_ipi}
                                    onChange={(e) => handleUpdateItem(index, 'aliquota_ipi', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(total)}
                                </td>
                                <td className="px-3 py-2 text-center text-sm text-gray-600">
                                  {item.estoque_atual || 0}
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <TrashIcon />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'politicas' && (
                <div>
                  {politicas.length > 0 ? (
                    <div className="space-y-4">
                      {/* Seletor de politica (se houver multiplas) */}
                      {politicas.length > 1 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Selecione a politica:</label>
                          <div className="space-y-2">
                            {politicas.map((p) => (
                              <label
                                key={p.id}
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                  politicaSelecionadaId === p.id
                                    ? 'border-[#336FB6] bg-blue-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="politica"
                                  checked={politicaSelecionadaId === p.id}
                                  onChange={() => setPoliticaSelecionadaId(p.id)}
                                  className="w-4 h-4 text-[#336FB6] border-gray-300 focus:ring-[#336FB6]"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Minimo: {formatCurrency(p.valor_minimo || 0)} | Desconto: {p.desconto || 0}%
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Prazo: {p.prazo_entrega || 0} dias
                                    {p.forma_pagamento_dias?.length ? ` | Pagamento: ${p.forma_pagamento_dias.join('/')} dias` : ''}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detalhes da politica selecionada */}
                      {politica && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-sm font-semibold text-gray-900">Politica Selecionada</h3>
                            {politica.forma_pagamento_dias && politica.forma_pagamento_dias.length > 0 && (
                              <button
                                onClick={handleUsarPolitica}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                              >
                                Usar politica
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Valor minimo:</span>
                              <span className="ml-2 font-medium">{formatCurrency(politica.valor_minimo || 0)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Desconto:</span>
                              <span className="ml-2 font-medium">{politica.desconto || 0}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Bonificacao:</span>
                              <span className="ml-2 font-medium">{politica.bonificacao || 0}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Prazo de entrega:</span>
                              <span className="ml-2 font-medium">{politica.prazo_entrega || 0} dias</span>
                            </div>
                            {politica.forma_pagamento_dias && politica.forma_pagamento_dias.length > 0 && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Dias de pagamento:</span>
                                <span className="ml-2 font-medium">{politica.forma_pagamento_dias.join(', ')} dias</span>
                              </div>
                            )}
                            {politica.observacao && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Observacao:</span>
                                <span className="ml-2">{politica.observacao}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Nenhuma politica de compra cadastrada para este fornecedor.</p>
                      <Link
                        href="/suprimentos/politica-compra"
                        className="mt-2 inline-block text-sm text-[#336FB6] hover:underline"
                      >
                        Cadastrar politica
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pagamento' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Parcelas</h3>
                    <button
                      onClick={handleAddParcela}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#336FB6] border border-[#336FB6] rounded-lg hover:bg-[#336FB6]/5 transition-colors"
                    >
                      <PlusIcon />
                      Adicionar parcela
                    </button>
                  </div>

                  {parcelas.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Nenhuma parcela adicionada.</p>
                      <button
                        onClick={handleAddParcela}
                        className="mt-2 text-sm text-[#336FB6] hover:underline"
                      >
                        Adicionar primeira parcela
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-32">Valor</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-40">Data Vencimento</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Forma de Pagamento</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcelas.map((parcela, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={parcela.valor}
                                  onChange={(e) => handleUpdateParcela(index, 'valor', Number(e.target.value))}
                                  className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={parcela.data_vencimento}
                                  onChange={(e) => handleUpdateParcela(index, 'data_vencimento', e.target.value)}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  id={`forma-pagamento-${index}`}
                                  value={parcela.forma_pagamento_id || ''}
                                  onChange={(e) => handleUpdateParcela(index, 'forma_pagamento_id', e.target.value ? Number(e.target.value) : null)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6] transition-all"
                                >
                                  <option value="">Selecione...</option>
                                  {formasPagamento.map(fp => (
                                    <option key={fp.id} value={fp.id}>{fp.descricao}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleRemoveParcela(index)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <TrashIcon />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {parcelas.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <div className="text-sm">
                        <span className="text-gray-500">Total das parcelas: </span>
                        <span className="font-semibold">{formatCurrency(parcelas.reduce((acc, p) => acc + p.valor, 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Totals */}
        <div className="col-span-4">
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 sticky top-4">
            <h2 className="text-base font-semibold text-[#344054] mb-4">Totais da Compra</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total dos produtos</span>
                <span className="font-medium">{formatCurrency(totalProdutos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">No de itens</span>
                <span className="font-medium">{totalItens}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Soma das quantidades</span>
                <span className="font-medium">{somaQuantidades}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Desconto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={desconto || ''}
                  onChange={(e) => setDesconto(Number(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Frete (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={frete || ''}
                  onChange={(e) => setFrete(Number(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">ICMS ST (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalIcms || ''}
                  onChange={(e) => setTotalIcms(Number(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-gray-900">Total do Pedido</span>
                <span className="text-[#336FB6]">{formatCurrency(totalPedido)}</span>
              </div>
            </div>

            {/* Botoes */}
            <div className="mt-6 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving || itens.length === 0}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-[#009E3F] hover:bg-[#008A36] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Pedido'}
              </button>
              <Link
                href="/compras/pedidos"
                className="block w-full px-4 py-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Produto */}
      <Modal isOpen={showProdutoModal} onClose={() => setShowProdutoModal(false)}>
        <ModalHeader>
          <ModalTitle>Adicionar Produto</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600 mb-4">
            Selecione um produto do fornecedor para adicionar ao pedido.
          </p>

          {/* Busca */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#898989]">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou codigo..."
              value={produtoSearch}
              onChange={(e) => setProdutoSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Lista de produtos */}
          <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
            {loadingProdutos ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : produtosFornecedor.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhum produto encontrado para este fornecedor
              </div>
            ) : (
              produtosFornecedor.map(p => {
                const jaAdicionado = itens.some(i => i.produto_id === p.produto_id)
                return (
                  <button
                    key={p.produto_id}
                    onClick={() => !jaAdicionado && handleAddProduto(p)}
                    disabled={jaAdicionado}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                      jaAdicionado ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[#344054]">{p.nome}</p>
                        <p className="text-xs text-gray-500">
                          Codigo: {p.codigo || '-'} | Un: {p.unidade} | Estoque: {p.estoque_atual}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#336FB6]">{formatCurrency(p.valor_de_compra)}</p>
                        {jaAdicionado && (
                          <span className="text-xs text-gray-400">Ja adicionado</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setShowProdutoModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}

export default function NovoPedidoCompraPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#336FB6]"></div>
        </div>
      </DashboardLayout>
    }>
      <NovoPedidoContent />
    </Suspense>
  )
}
