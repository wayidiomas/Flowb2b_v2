'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { FRETE_POR_CONTA_OPTIONS, calcularTotalPedido } from '@/types/pedido-compra'
import { PedidoEmAbertoModal } from '@/components/compras/curva'
import { ModalSincronizarCatalogo } from '@/components/compras/ModalSincronizarCatalogo'
import { useCatalogoGate } from '@/hooks/useCatalogoGate'
import { ProductSearchModal, type CatalogoProduto } from '@/components/pedido/ProductSearchModal'

// Data de hoje no formato YYYY-MM-DD usando o fuso LOCAL (nao UTC).
// new Date().toISOString() retorna UTC: apos 21h em Brasilia (UTC-3) ja virou o
// dia seguinte, gravando o pedido com data de "amanha". getFullYear/Month/Date
// usam o fuso local do navegador, pegando o dia correto.
function hojeLocalISO(): string {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function AutoFixIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.996.996 0 0 0-1.41 0L1.29 18.96a.996.996 0 0 0 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05a.996.996 0 0 0 0-1.41l-2.33-2.35zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

interface SugestaoItem {
  produto_id: number
  id_produto_bling?: number
  codigo: string
  nome: string
  ean?: string
  codigo_fornecedor?: string  // Codigo do produto no sistema do fornecedor
  estoque_atual: number
  media_vendas_dia: number
  sugestao_quantidade: number
  quantidade_ajustada: number
  valor_unitario: number
  valor_total: number
  itens_por_caixa: number
  caixas: number
  is_adicional?: boolean  // Item adicionado manualmente (linha destacada em amarelo)
}

interface Fornecedor {
  id: number
  id_bling: number | null
  nome: string
  cnpj: string | null
}

interface FornecedorOption {
  id: number
  id_bling?: number
  nome: string
  cnpj?: string
}

interface PoliticaCompra {
  id: number
  valor_minimo: number | null
  desconto: number | null
  prazo_entrega: number | null
  prazo_estoque: number | null
  bonificacao?: number | null
  forma_pagamento_dias?: number[]
  observacao?: string
  status?: boolean
}

// Politica aplicavel retornada pela API de calculo (atingiu valor minimo)
interface PoliticaAplicavel {
  politica_id: number
  melhor_politica: boolean
  valor_total_sem_desconto: number
  valor_total_com_desconto: number
  sugestoes: Array<{
    produto_id: number
    id_produto_bling: number
    codigo: string
    nome: string
    estoque_atual: number
    media_venda_dia: number
    quantidade_sugerida: number
    valor_unitario: number
    valor_total: number
    itens_por_caixa: number
  }>
}

interface ParcelaPedido {
  valor: number
  data_vencimento: string
  observacao?: string
  forma_pagamento_id?: number
  forma_pagamento_id_bling?: number
  forma_pagamento_nome?: string
}

interface FormaPagamento {
  id: number
  id_bling: number | null
  descricao: string
}

function GerarAutomaticoContent() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fornecedorIdParam = searchParams.get('fornecedor_id')
  const pedidoIdParam = searchParams.get('pedido_id')

  // Modo edicao: a tela tambem edita um pedido de compra existente
  const isEdicao = !!pedidoIdParam
  const pedidoId = pedidoIdParam ? parseInt(pedidoIdParam) : null
  const [numeroPedido, setNumeroPedido] = useState<string>('')

  // Modal de busca de produtos (item extra)
  const [showProdutoModal, setShowProdutoModal] = useState(false)

  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  // Gate do catálogo: bloqueia o cálculo da IA até o lojista sincronizar atualizações
  const { catalogoPendente, refetch: refetchGate } = useCatalogoGate(fornecedor?.cnpj)
  const [gateResolved, setGateResolved] = useState(false)
  const [showGateModal, setShowGateModal] = useState(false)
  const [politicas, setPoliticas] = useState<PoliticaCompra[]>([])
  const [politicaSelecionadaId, setPoliticaSelecionadaId] = useState<number | null>(null)
  const [sugestoes, setSugestoes] = useState<SugestaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  // Politicas aplicaveis (retornadas pela API de calculo - atingiram valor minimo)
  const [politicasAplicaveis, setPoliticasAplicaveis] = useState<PoliticaAplicavel[]>([])

  // Politica selecionada (computed) - busca nas politicas do Supabase para ter detalhes completos
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

  // Persistencia local do resultado do calculo (somente modo CRIAR)
  // Recalcular e caro (API externa ~60-90s); ao dar F5 restauramos o estado.
  const lsKeyPedido = (empId: number, fornId: string) => `flowb2b:gerar-pedido:${empId}:${fornId}`
  const restauradoRef = useRef(false)

  // Estados para modal de fornecedor
  const [showFornecedorModal, setShowFornecedorModal] = useState(false)
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [fornecedorSearch, setFornecedorSearch] = useState('')
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorOption | null>(null)

  // Estados para criacao de politica de compra inline
  const [showPoliticaForm, setShowPoliticaForm] = useState(false)
  const [savingPolitica, setSavingPolitica] = useState(false)
  const [politicaForm, setPoliticaForm] = useState({
    forma_pagamento_dias: [30] as number[],  // Array de dias de pagamento
    prazo_entrega: 7,
    valor_minimo: 0,
    desconto: 0,
  })
  const [novoDiaPagamento, setNovoDiaPagamento] = useState('')

  // Estados para detalhes do pedido
  const [frete, setFrete] = useState(0)
  const [fretePorConta, setFretePorConta] = useState('CIF')
  const [observacoes, setObservacoes] = useState('')
  const [observacoesInternas, setObservacoesInternas] = useState('Pedido gerado automaticamente')
  const [dataPrevista, setDataPrevista] = useState('')
  const [parcelas, setParcelas] = useState<ParcelaPedido[]>([])
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([])

  // SAVE: persiste o estado relevante no localStorage sempre que mudar
  useEffect(() => {
    const empId = empresa?.id || user?.empresa_id
    if (isEdicao || !fornecedorIdParam || !empId || sugestoes.length === 0) return
    try {
      localStorage.setItem(
        lsKeyPedido(empId, fornecedorIdParam),
        JSON.stringify({
          savedAt: Date.now(),
          sugestoes,
          politicasAplicaveis,
          politicaSelecionadaId,
          parcelas,
          frete,
          fretePorConta,
          observacoes,
          observacoesInternas,
          dataPrevista,
        })
      )
    } catch {
      // localStorage pode falhar (quota / modo privado) - ignora
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugestoes, politicasAplicaveis, politicaSelecionadaId, parcelas, frete, fretePorConta, observacoes, observacoesInternas, dataPrevista, isEdicao, fornecedorIdParam, empresa?.id, user?.empresa_id])

  // RESTORE: restaura o estado salvo no mount (uma unica vez), modo CRIAR
  useEffect(() => {
    if (restauradoRef.current || isEdicao || !fornecedorIdParam) return
    const empId = empresa?.id || user?.empresa_id
    if (!empId) return
    const chave = lsKeyPedido(empId, fornecedorIdParam)
    try {
      const raw = localStorage.getItem(chave)
      if (!raw) return
      const data = JSON.parse(raw)
      if (!data || typeof data !== 'object') return
      // expira em 24h
      if (Date.now() - (data.savedAt || 0) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(chave)
        return
      }
      if (Array.isArray(data.sugestoes) && data.sugestoes.length > 0) {
        setSugestoes(data.sugestoes)
        setPoliticasAplicaveis(Array.isArray(data.politicasAplicaveis) ? data.politicasAplicaveis : [])
        setPoliticaSelecionadaId(data.politicaSelecionadaId ?? null)
        if (Array.isArray(data.parcelas)) setParcelas(data.parcelas)
        if (typeof data.frete === 'number') setFrete(data.frete)
        if (data.fretePorConta) setFretePorConta(data.fretePorConta)
        if (typeof data.observacoes === 'string') setObservacoes(data.observacoes)
        if (typeof data.observacoesInternas === 'string') setObservacoesInternas(data.observacoesInternas)
        if (data.dataPrevista) setDataPrevista(data.dataPrevista)
        restauradoRef.current = true
      }
    } catch {
      // JSON invalido / acesso negado - ignora
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecedorIdParam, isEdicao, empresa?.id, user?.empresa_id])

  // Estados para modal de pedido em aberto
  const [pedidoAbertoModalOpen, setPedidoAbertoModalOpen] = useState(false)
  const [pedidoAbertoLoading, setPedidoAbertoLoading] = useState(false)
  const [pedidosEmAberto, setPedidosEmAberto] = useState<Array<{
    id: number
    numero: string
    data: string
    total: number
    situacao: number
  }>>([])
  const [itensJaPedidos, setItensJaPedidos] = useState<Array<{
    produto_id: number
    nome: string
    codigo: string
    quantidade: number
    valor: number
  }>>([])
  const [descontarPedidos, setDescontarPedidos] = useState(false)

  // Busca e filtros avancados da tabela de sugestoes
  const [buscaSugestao, setBuscaSugestao] = useState('')
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false)
  const [filtroEstoqueMin, setFiltroEstoqueMin] = useState('')
  const [filtroEstoqueMax, setFiltroEstoqueMax] = useState('')
  const [filtroSugestaoMin, setFiltroSugestaoMin] = useState('')
  const [filtroSugestaoMax, setFiltroSugestaoMax] = useState('')
  const [showAcoesMenu, setShowAcoesMenu] = useState(false) // kebab da barra fixa no mobile

  // Buscar fornecedores para o modal
  const fetchFornecedores = async () => {
    if (!user?.id) return
    setLoadingFornecedores(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, id_bling, nome, cnpj')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true })

      if (error) throw error
      setFornecedores(data || [])
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // Carregar dados do fornecedor e politica
  useEffect(() => {
    const fetchData = async () => {
      // MODO EDICAO: carregar pedido existente em vez de exigir selecao + calculo
      if (pedidoIdParam) {
        if (!user?.id) {
          setLoading(false)
          return
        }
        await carregarPedidoExistente(parseInt(pedidoIdParam))
        return
      }

      // Se nao tiver fornecedor_id, mostrar modal de selecao
      if (!fornecedorIdParam) {
        setLoading(false)
        setShowFornecedorModal(true)
        fetchFornecedores()
        return
      }

      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const empresaId = empresa?.id || user?.empresa_id
        if (!empresaId) return

        // Buscar fornecedor (incluindo id_bling para integracao)
        const { data: fornecedorData, error: fornecedorError } = await supabase
          .from('fornecedores')
          .select('id, id_bling, nome, cnpj')
          .eq('id', parseInt(fornecedorIdParam))
          .eq('empresa_id', empresaId)
          .single()

        if (fornecedorError || !fornecedorData) {
          setError('Fornecedor nao encontrado')
          setLoading(false)
          return
        }

        setFornecedor(fornecedorData)

        // Buscar politicas de compra ativas do fornecedor
        const { data: politicasData } = await supabase
          .from('politica_compra')
          .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque, bonificacao, forma_pagamento_dias, observacao, status')
          .eq('fornecedor_id', parseInt(fornecedorIdParam))
          .eq('empresa_id', empresaId)
          .or('isdeleted.is.null,isdeleted.eq.false')
          .order('valor_minimo', { ascending: true })

        if (politicasData && politicasData.length > 0) {
          setPoliticas(politicasData)
          setPoliticaSelecionadaId(politicasData[0].id)
        }
        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados do fornecedor')
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecedorIdParam, pedidoIdParam, user?.id, user?.empresa_id, empresa?.id])

  // MODO EDICAO: carrega um pedido de compra existente e popula o formulario
  const carregarPedidoExistente = async (id: number) => {
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) {
        setLoading(false)
        return
      }

      // Buscar detalhes do pedido via RPC (mesmo padrao da tela de edicao)
      const { data: pedidoRows, error: pError } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
        p_pedido_id: id,
        p_empresa_id: empresaId,
      })

      if (pError) throw pError
      if (!pedidoRows || pedidoRows.length === 0) {
        setError('Pedido nao encontrado')
        setLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = pedidoRows[0] as any

      setNumeroPedido(p.numero || '')

      // Fornecedor
      setFornecedor({
        id: p.fornecedor_id,
        id_bling: p.fornecedor_id_bling || null,
        nome: p.fornecedor_nome || '',
        cnpj: p.fornecedor_cnpj || null,
      })

      // Cabecalho
      setFrete(p.frete || 0)
      setFretePorConta(p.frete_por_conta || 'CIF')
      setObservacoes(p.observacoes || '')
      setObservacoesInternas(p.observacoes_internas || '')
      setDataPrevista(p.data_prevista ? String(p.data_prevista).split('T')[0] : '')
      setPoliticaSelecionadaId(p.politica_id || null)

      // Itens -> SugestaoItem
      if (p.itens && p.itens.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itensFormatados: SugestaoItem[] = p.itens.map((item: any) => {
          const itensPorCaixa = item.itens_por_caixa || 1
          const quantidade = item.quantidade || 0
          const valorUnitario = item.valor || 0
          return {
            produto_id: item.produto_id,
            id_produto_bling: item.id_produto_bling || undefined,
            codigo: item.codigo_produto || item.codigo || '-',
            nome: item.descricao || '',
            ean: item.ean || '',
            codigo_fornecedor: item.codigo_fornecedor || undefined,
            estoque_atual: item.estoque_atual || 0,
            media_vendas_dia: 0,
            sugestao_quantidade: quantidade,
            quantidade_ajustada: quantidade,
            valor_unitario: valorUnitario,
            valor_total: quantidade * valorUnitario,
            itens_por_caixa: itensPorCaixa,
            caixas: itensPorCaixa > 0 ? Math.ceil(quantidade / itensPorCaixa) : quantidade,
          }
        })
        setSugestoes(itensFormatados)
      }

      // Carregar politicas do fornecedor (para detalhes/desconto)
      if (p.fornecedor_id) {
        const { data: politicasData } = await supabase
          .from('politica_compra')
          .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque, bonificacao, forma_pagamento_dias, observacao, status')
          .eq('fornecedor_id', p.fornecedor_id)
          .eq('empresa_id', empresaId)
          .or('isdeleted.is.null,isdeleted.eq.false')
          .order('valor_minimo', { ascending: true })

        if (politicasData && politicasData.length > 0) {
          setPoliticas(politicasData)
        }
      }

      // Carregar formas de pagamento ANTES de processar parcelas
      const { data: formas } = await supabase
        .from('formas_de_pagamento')
        .select('id, id_forma_de_pagamento_bling, descricao')
        .eq('empresa_id', empresaId)
        .order('descricao')

      const formasFormatadas: FormaPagamento[] = (formas || []).map(f => ({
        id: f.id,
        id_bling: f.id_forma_de_pagamento_bling,
        descricao: f.descricao,
      }))
      setFormasPagamento(formasFormatadas)

      // Parcelas (forma_pagamento_id da RPC vem como Bling ID)
      if (p.parcelas && p.parcelas.length > 0) {
        const blingToInternal = new Map<number, number>()
        formasFormatadas.forEach(f => {
          if (f.id_bling) blingToInternal.set(f.id_bling, f.id)
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parcelasFormatadas: ParcelaPedido[] = p.parcelas.map((parcela: any) => {
          const blingId = parcela.forma_pagamento_id
          const idInterno = blingId ? blingToInternal.get(blingId) : undefined
          const formaEncontrada = formasFormatadas.find(f => f.id_bling === blingId)
          return {
            valor: parcela.valor,
            data_vencimento: parcela.data_vencimento ? String(parcela.data_vencimento).split('T')[0] : '',
            observacao: parcela.observacao || '',
            forma_pagamento_id: idInterno,
            forma_pagamento_id_bling: blingId || undefined,
            forma_pagamento_nome: formaEncontrada?.descricao,
          }
        })
        setParcelas(parcelasFormatadas)
      }

      setLoading(false)
    } catch (err) {
      console.error('Erro ao carregar pedido para edicao:', err)
      setError('Erro ao carregar dados do pedido')
      setLoading(false)
    }
  }

  // Selecionar fornecedor do modal
  const handleSelectFornecedor = async (selected: FornecedorOption) => {
    setFornecedor({ id: selected.id, id_bling: selected.id_bling || null, nome: selected.nome, cnpj: selected.cnpj || null })
    setShowFornecedorModal(false)

    // Resetar politicas e sugestoes anteriores
    setPoliticas([])
    setPoliticaSelecionadaId(null)
    setPoliticasAplicaveis([])
    setSugestoes([])

    // Buscar politicas de compra ativas do fornecedor selecionado
    const empresaId = empresa?.id || user?.empresa_id
    if (empresaId) {
      const { data: politicasData } = await supabase
        .from('politica_compra')
        .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque, bonificacao, forma_pagamento_dias, observacao, status')
        .eq('fornecedor_id', selected.id)
        .eq('empresa_id', empresaId)
        .or('isdeleted.is.null,isdeleted.eq.false')
        .order('valor_minimo', { ascending: true })

      if (politicasData && politicasData.length > 0) {
        setPoliticas(politicasData)
        setPoliticaSelecionadaId(politicasData[0].id)
      }
    }
  }

  // Filtrar fornecedores no modal
  const filteredFornecedores = fornecedores.filter(f =>
    (f.nome || '').toLowerCase().includes(fornecedorSearch.toLowerCase()) ||
    (f.cnpj && f.cnpj.includes(fornecedorSearch))
  )

  // Adicionar dia de pagamento
  const handleAddDiaPagamento = () => {
    const dia = parseInt(novoDiaPagamento)
    if (isNaN(dia) || dia <= 0) return
    if (politicaForm.forma_pagamento_dias.includes(dia)) return

    setPoliticaForm(prev => ({
      ...prev,
      forma_pagamento_dias: [...prev.forma_pagamento_dias, dia].sort((a, b) => a - b)
    }))
    setNovoDiaPagamento('')
  }

  // Remover dia de pagamento
  const handleRemoveDiaPagamento = (dia: number) => {
    setPoliticaForm(prev => ({
      ...prev,
      forma_pagamento_dias: prev.forma_pagamento_dias.filter(d => d !== dia)
    }))
  }

  // Buscar formas de pagamento
  const fetchFormasPagamento = async () => {
    const empresaId = empresa?.id || user?.empresa_id
    if (!empresaId) return

    const { data } = await supabase
      .from('formas_de_pagamento')
      .select('id, id_forma_de_pagamento_bling, descricao')
      .eq('empresa_id', empresaId)
      .order('descricao')

    if (data) {
      setFormasPagamento(data.map(f => ({
        id: f.id,
        id_bling: f.id_forma_de_pagamento_bling,
        descricao: f.descricao
      })))
    }
  }

  // Carregar formas de pagamento quando sugestoes sao calculadas
  useEffect(() => {
    if (sugestoes.length > 0 && formasPagamento.length === 0) {
      fetchFormasPagamento()
      // Calcular data prevista baseada na politica
      if (politica?.prazo_entrega) {
        const data = new Date(Date.now() + politica.prazo_entrega * 24 * 60 * 60 * 1000)
        setDataPrevista(data.toISOString().split('T')[0])
      }
    }
  }, [sugestoes.length, formasPagamento.length, politica?.prazo_entrega])

  // Auto-gerar parcelas quando politica com forma_pagamento_dias estiver disponivel
  useEffect(() => {
    // Só gerar se tiver sugestões, política com dias de pagamento e ainda não tiver parcelas
    if (
      sugestoes.length > 0 &&
      politica?.forma_pagamento_dias &&
      politica.forma_pagamento_dias.length > 0 &&
      parcelas.length === 0
    ) {
      // Calcular valor total com desconto e frete usando logica correta de CIF/FOB
      const totalProdutos = sugestoes.reduce((acc, item) => acc + item.valor_total, 0)
      const descPerc = politica?.desconto || 0
      const descValor = totalProdutos * (descPerc / 100)
      const valorFinal = calcularTotalPedido({
        totalProdutos,
        frete,
        desconto: descValor,
        fretePorConta,
      })

      if (valorFinal <= 0) return

      const dias = politica.forma_pagamento_dias
      const quantidade = dias.length
      const valorPorParcela = Number((valorFinal / quantidade).toFixed(2))
      const hoje = new Date()

      const novasParcelas: ParcelaPedido[] = dias.map((diasVencimento, i) => {
        const dataVencimento = new Date(hoje.getTime() + diasVencimento * 24 * 60 * 60 * 1000)
        const valorParcela = i === quantidade - 1
          ? Number((valorFinal - valorPorParcela * (quantidade - 1)).toFixed(2))
          : valorPorParcela

        return {
          valor: valorParcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
        }
      })

      setParcelas(novasParcelas)
    }
  }, [sugestoes, politica?.forma_pagamento_dias, politica?.desconto, politica?.id, frete, fretePorConta, parcelas.length])

  // Gerar parcelas baseado nos dias da politica de compra
  const handleGerarParcelasPolitica = () => {
    if (!politica?.forma_pagamento_dias || politica.forma_pagamento_dias.length === 0) return

    const dias = politica.forma_pagamento_dias
    const quantidade = dias.length
    const valorPorParcela = Number((valorTotalComFrete / quantidade).toFixed(2))
    const hoje = new Date()

    const novasParcelas: ParcelaPedido[] = dias.map((diasVencimento, i) => {
      const dataVencimento = new Date(hoje.getTime() + diasVencimento * 24 * 60 * 60 * 1000)

      // Ultima parcela pega o resto para evitar centavos perdidos
      const valorParcela = i === quantidade - 1
        ? Number((valorTotalComFrete - valorPorParcela * (quantidade - 1)).toFixed(2))
        : valorPorParcela

      return {
        valor: valorParcela,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
      }
    })

    setParcelas(novasParcelas)
  }

  // Gerar parcelas com quantidade fixa (atalhos rapidos: 1x, 3x, 6x, etc)
  const handleGerarParcelas = (quantidade: number) => {
    const valorPorParcela = Number((valorTotalComFrete / quantidade).toFixed(2))
    const hoje = new Date()

    const novasParcelas: ParcelaPedido[] = Array.from({ length: quantidade }, (_, i) => {
      // A vista = hoje, parcelado = 30, 60, 90 dias...
      const diasParaVencimento = quantidade === 1 ? 0 : (i + 1) * 30
      const dataVencimento = new Date(hoje.getTime() + diasParaVencimento * 24 * 60 * 60 * 1000)

      // Ultima parcela pega o resto para evitar centavos perdidos
      const valorParcela = i === quantidade - 1
        ? Number((valorTotalComFrete - valorPorParcela * (quantidade - 1)).toFixed(2))
        : valorPorParcela

      return {
        valor: valorParcela,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
      }
    })

    setParcelas(novasParcelas)
  }

  // Adicionar parcela individual (modo personalizado)
  const handleAddParcela = () => {
    // Calcula a proxima data baseada na ultima parcela ou 30 dias a partir de hoje
    const ultimaParcela = parcelas[parcelas.length - 1]
    let proximaData: Date

    if (ultimaParcela) {
      proximaData = new Date(ultimaParcela.data_vencimento)
      proximaData.setDate(proximaData.getDate() + 30)
    } else {
      proximaData = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    const novaParcela: ParcelaPedido = {
      valor: 0,
      data_vencimento: proximaData.toISOString().split('T')[0],
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

    // Se mudou a forma de pagamento, atualizar os campos relacionados
    if (field === 'forma_pagamento_id' && value) {
      const formaSelecionada = formasPagamento.find(f => f.id === Number(value))
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

  // Distribuir valor total nas parcelas
  const handleDistribuirParcelas = () => {
    if (parcelas.length === 0) return
    const valorPorParcela = Number((valorTotalComFrete / parcelas.length).toFixed(2))
    const newParcelas = parcelas.map((p, i) => ({
      ...p,
      valor: i === parcelas.length - 1
        ? Number((valorTotalComFrete - valorPorParcela * (parcelas.length - 1)).toFixed(2))
        : valorPorParcela
    }))
    setParcelas(newParcelas)
  }

  // Salvar politica de compra e calcular sugestoes
  const handleSavePoliticaAndCalculate = async () => {
    if (!fornecedor) return

    // Validacao basica
    if (politicaForm.forma_pagamento_dias.length === 0) {
      showToast('warning', 'Campo obrigatorio', 'Adicione pelo menos um prazo de pagamento (ex: 30 dias).')
      return
    }

    if (politicaForm.prazo_entrega <= 0) {
      showToast('warning', 'Campo obrigatorio', 'Informe o prazo de entrega (dias).')
      return
    }

    setSavingPolitica(true)

    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) throw new Error('Empresa nao encontrada')

      // Inserir politica de compra (prazo_estoque e calculado automaticamente pelo banco)
      // IMPORTANTE: Enviar 0 em vez de null para campos numericos (API Python espera numeros)
      const { data: novaPolitica, error: insertError } = await supabase
        .from('politica_compra')
        .insert({
          empresa_id: empresaId,
          fornecedor_id: fornecedor.id,
          forma_pagamento_dias: politicaForm.forma_pagamento_dias,
          prazo_entrega: politicaForm.prazo_entrega,
          valor_minimo: politicaForm.valor_minimo || 0,
          desconto: politicaForm.desconto || 0,
          status: true,
        })
        .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque, bonificacao, forma_pagamento_dias, observacao, status')
        .single()

      if (insertError) throw insertError

      // Adicionar nova politica ao array e seleciona-la
      setPoliticas(prev => [novaPolitica, ...prev])
      setPoliticaSelecionadaId(novaPolitica.id)
      setShowPoliticaForm(false)
      showToast('success', 'Politica criada!', 'Calculando sugestoes de compra...')

      // Aguardar um pouco e depois calcular sugestoes automaticamente
      setTimeout(() => {
        calcularSugestoesComPolitica(novaPolitica)
      }, 500)

    } catch (err) {
      console.error('Erro ao salvar politica:', err)
      showToast('error', 'Erro ao salvar', 'Nao foi possivel criar a politica de compra.')
    } finally {
      setSavingPolitica(false)
    }
  }

  // Funcao auxiliar para converter sugestoes da API para SugestaoItem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapSugestoesAPI = (sugestoesAPI: any[]): SugestaoItem[] => {
    return sugestoesAPI.map(item => {
      const itensPorCaixa = item.itens_por_caixa || 1
      // Calcula quantidade ajustada como multiplo de itens_por_caixa
      const caixas = Math.ceil(item.quantidade_sugerida / itensPorCaixa)
      const quantidadeAjustada = caixas * itensPorCaixa
      return {
        produto_id: item.produto_id,
        id_produto_bling: item.id_produto_bling,
        codigo: item.codigo || '-',
        nome: item.nome || item.codigo || `Produto ${item.produto_id}`,
        ean: item.gtin || item.ean || '',
        codigo_fornecedor: item.codigo_fornecedor || undefined,
        estoque_atual: item.estoque_atual || 0,
        media_vendas_dia: item.media_venda_dia || 0,
        sugestao_quantidade: item.quantidade_sugerida,
        quantidade_ajustada: quantidadeAjustada,
        valor_unitario: item.valor_unitario,
        valor_total: quantidadeAjustada * item.valor_unitario,
        itens_por_caixa: itensPorCaixa,
        caixas: caixas
      }
    }).sort((a, b) => b.valor_total - a.valor_total)
  }

  // Calcular sugestoes com politica especifica (usado apos criar politica)
  const calcularSugestoesComPolitica = async (pol: PoliticaCompra) => {
    if (!fornecedor) return
    // Gate: se catálogo desatualizado, sincronizar antes de chamar a IA
    if (catalogoPendente && !gateResolved) {
      setShowGateModal(true)
      return
    }

    setCalculando(true)
    setError(null)

    try {
      const response = await fetch('/api/pedidos-compra/calcular-automatico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fornecedor_id: fornecedor.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao calcular sugestoes')
      }

      const data = await response.json()

      if (!data.sugestoes || data.sugestoes.length === 0) {
        setError('Nenhuma sugestao de compra para este fornecedor. Verifique se ha produtos com vendas recentes.')
        setCalculando(false)
        return
      }

      // Usa a funcao auxiliar para converter e ajustar quantidades
      const sugestoesCalculadas = mapSugestoesAPI(data.sugestoes)
      setSugestoes(sugestoesCalculadas)
    } catch (err) {
      console.error('Erro ao calcular sugestoes:', err)
      setError(err instanceof Error ? err.message : 'Erro ao calcular sugestoes de compra')
    } finally {
      setCalculando(false)
    }
  }
  // Quando trocar de politica, atualizar sugestoes com os produtos daquela politica
  useEffect(() => {
    if (politicasAplicaveis.length > 0 && politicaSelecionadaId) {
      const politicaAtual = politicasAplicaveis.find(p => p.politica_id === politicaSelecionadaId)
      if (politicaAtual) {
        const sugestoesAtualizadas = mapSugestoesAPI(politicaAtual.sugestoes)
        setSugestoes(sugestoesAtualizadas)
      }
    }
  }, [politicaSelecionadaId, politicasAplicaveis])

  // Verificar pedido em aberto e abrir modal se existir
  const verificarPedidoEmAberto = async () => {
    if (!fornecedor) return

    setPedidoAbertoLoading(true)

    try {
      const res = await fetch(`/api/compras/curva/pedido-aberto-itens?fornecedor_id=${fornecedor.id}`)
      const data = await res.json()

      if (data.success && data.pedidos?.length > 0) {
        // Tem pedido em aberto - abrir modal de aviso
        setPedidosEmAberto(data.pedidos || [])
        setItensJaPedidos(data.itens || [])
        setPedidoAbertoModalOpen(true)
      } else {
        // Nao tem pedido em aberto - calcular diretamente
        setDescontarPedidos(false)
        executarCalculo(false)
      }
    } catch (error) {
      console.error('Erro ao verificar pedido em aberto:', error)
      // Em caso de erro, continuar normalmente
      setDescontarPedidos(false)
      executarCalculo(false)
    } finally {
      setPedidoAbertoLoading(false)
    }
  }

  // Continuar com desconto apos ver modal de pedido em aberto
  const handleContinuarComDesconto = () => {
    setPedidoAbertoModalOpen(false)
    setDescontarPedidos(true)
    executarCalculo(true)
  }

  // Calcular sugestoes via API externa
  const calcularSugestoes = async () => {
    if (!fornecedor) return
    // Gate: se catálogo desatualizado, sincronizar antes de chamar a IA
    if (catalogoPendente && !gateResolved) {
      setShowGateModal(true)
      return
    }
    // Verificar se tem pedido em aberto antes de calcular
    await verificarPedidoEmAberto()
  }

  // Executa o calculo de fato (pode ser com ou sem desconto)
  const executarCalculo = async (comDesconto: boolean) => {
    if (!fornecedor) return

    setCalculando(true)
    setError(null)

    try {
      const response = await fetch('/api/pedidos-compra/calcular-automatico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedor_id: fornecedor.id,
          descontar_pedidos_abertos: comDesconto
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao calcular sugestoes')
      }

      const data = await response.json()

      // Verificar se retornou politicas aplicaveis
      if (!data.politicas_aplicaveis || data.politicas_aplicaveis.length === 0) {
        setError('Nenhuma politica de compra atingiu o valor minimo para este fornecedor.')
        setCalculando(false)
        return
      }

      // Armazenar todas as politicas aplicaveis
      setPoliticasAplicaveis(data.politicas_aplicaveis)

      // Selecionar a melhor politica (ou a primeira)
      const melhorPoliticaId = data.politica_selecionada_id || data.politicas_aplicaveis[0].politica_id
      setPoliticaSelecionadaId(melhorPoliticaId)

      // Mostrar quantas politicas foram aplicaveis
      if (data.politicas_aplicaveis.length > 1) {
        showToast('success', 'Calculo concluido!',
          `${data.politicas_aplicaveis.length} politicas atingiram o valor minimo. Voce pode alternar entre elas.`)
      }

      // Se foi com desconto, mostrar aviso
      if (comDesconto) {
        showToast('success', 'Sugestao ajustada',
          'As quantidades foram ajustadas descontando os itens ja pedidos em pedidos anteriores.')
      }
    } catch (err) {
      console.error('Erro ao calcular sugestoes:', err)
      setError(err instanceof Error ? err.message : 'Erro ao calcular sugestoes de compra')
    } finally {
      setCalculando(false)
    }
  }

  // Atualizar quantidade de um item
  const handleQuantidadeChange = (index: number, novaQuantidade: number) => {
    setSugestoes(prev => prev.map((item, i) => {
      if (i === index) {
        const caixas = Math.ceil(novaQuantidade / item.itens_por_caixa)
        const quantidadeAjustada = caixas * item.itens_por_caixa
        return {
          ...item,
          quantidade_ajustada: quantidadeAjustada,
          caixas: caixas,
          valor_total: quantidadeAjustada * item.valor_unitario
        }
      }
      return item
    }))
  }

  // Remover item da lista
  const handleRemoverItem = (index: number) => {
    setSugestoes(prev => prev.filter((_, i) => i !== index))
  }

  // Exportar a tabela de sugestoes para CSV (padrao BR: ; como separador + BOM para Excel)
  const handleExportarCSV = () => {
    if (sugestoes.length === 0) {
      showToast('warning', 'Sem produtos', 'Nao ha itens para exportar.')
      return
    }

    const escaparCampo = (valor: string | number | undefined | null): string => {
      const texto = valor === undefined || valor === null ? '' : String(valor)
      // Aspas duplas para campos com ; aspas ou quebra de linha
      if (/[";\n]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`
      }
      return texto
    }

    const cabecalho = ['Codigo', 'EAN', 'Produto', 'Estoque', 'Itens/Cx', 'Media/dia', 'Sugestao', 'Qtd', 'Valor Unit', 'Total']
    const linhas = sugestoes.map(item => [
      escaparCampo(item.codigo),
      escaparCampo(item.ean),
      escaparCampo(item.nome),
      escaparCampo(item.estoque_atual),
      escaparCampo(item.itens_por_caixa),
      escaparCampo(item.media_vendas_dia),
      escaparCampo(item.sugestao_quantidade),
      escaparCampo(item.quantidade_ajustada),
      escaparCampo(item.valor_unitario.toFixed(2).replace('.', ',')),
      escaparCampo(item.valor_total.toFixed(2).replace('.', ',')),
    ].join(';'))

    const csv = '﻿' + [cabecalho.join(';'), ...linhas].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

    const dataStr = new Date().toISOString().split('T')[0]
    const fornecedorSlug = (fornecedor?.nome || 'fornecedor')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pedido_${fornecedorSlug}_${dataStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Adicionar item extra ao pedido a partir do catalogo do fornecedor
  const handleAdicionarItemExtra = async (produto: CatalogoProduto) => {
    if (!fornecedor || !produto.produto_id) {
      showToast('warning', 'Dados insuficientes', 'Nao foi possivel adicionar o item (faltam dados do produto).')
      return
    }

    // Fecha o modal imediatamente para feedback rapido; populamos via chamada ao backend
    setShowProdutoModal(false)

    // Defaults caso a chamada falhe — usa apenas o que veio do catalogo
    const itensPorCaixaFallback = produto.itens_por_caixa && produto.itens_por_caixa > 0 ? produto.itens_por_caixa : 1
    const valorUnitarioFallback = produto.preco || 0
    let estoqueAtual = 0
    let mediaVendasDia = 0
    let sugestaoQuantidade = 0
    let itensPorCaixa = itensPorCaixaFallback
    let valorUnitario = valorUnitarioFallback

    try {
      const params = new URLSearchParams({
        fornecedor_id: String(fornecedor.id),
        produto_id: String(produto.produto_id),
      })
      if (politicaSelecionadaId) params.set('politica_id', String(politicaSelecionadaId))
      const res = await fetch(`/api/pedidos-compra/calcular-produto?${params.toString()}`)
      if (res.ok) {
        const dados = await res.json()
        estoqueAtual = Number(dados.estoque_atual ?? 0)
        mediaVendasDia = Number(dados.media_vendas_dia ?? 0)
        sugestaoQuantidade = Number(dados.sugestao_quantidade ?? 0)
        if (dados.itens_por_caixa) itensPorCaixa = Number(dados.itens_por_caixa)
        if (dados.valor_unitario) valorUnitario = Number(dados.valor_unitario)
      }
    } catch (err) {
      // Falha de calculo nao bloqueia adicao — o item entra com defaults e o lojista ajusta
      console.warn('[adicionar item extra] calculo falhou, usando defaults', err)
    }

    // Quantidade inicial: sugestao calculada, ou 1 caixa se 0
    const quantidadeInicial = sugestaoQuantidade > 0 ? sugestaoQuantidade : itensPorCaixa
    const caixas = Math.ceil(quantidadeInicial / itensPorCaixa)
    const quantidadeAjustada = caixas * itensPorCaixa

    const novoItem: SugestaoItem = {
      produto_id: produto.produto_id ?? 0,
      id_produto_bling: produto.id_produto_bling,
      codigo: produto.codigo_fornecedor || '-',
      nome: produto.nome,
      ean: produto.gtin || '',
      codigo_fornecedor: produto.codigo_fornecedor || undefined,
      estoque_atual: estoqueAtual,
      media_vendas_dia: mediaVendasDia,
      sugestao_quantidade: sugestaoQuantidade,
      quantidade_ajustada: quantidadeAjustada,
      valor_unitario: valorUnitario,
      valor_total: quantidadeAjustada * valorUnitario,
      itens_por_caixa: itensPorCaixa,
      caixas,
      is_adicional: true,
    }

    setSugestoes(prev => [...prev, novoItem])
    showToast('success', 'Item adicionado', `"${produto.nome}" foi adicionado ao pedido.`)
  }

  // MODO EDICAO: salvar alteracoes no pedido existente (PUT)
  const handleSalvarEdicao = async () => {
    if (!pedidoId || !fornecedor) return

    if (sugestoes.length === 0) {
      showToast('warning', 'Sem produtos', 'Adicione pelo menos um produto ao pedido.')
      return
    }

    const itensInvalidos = sugestoes.filter(item => item.quantidade_ajustada <= 0 || item.valor_unitario <= 0)
    if (itensInvalidos.length > 0) {
      showToast('error', 'Valores invalidos',
        'Existem produtos com quantidade ou valor zerado/negativo. Corrija antes de continuar.')
      return
    }

    // Validacao: forma de pagamento nas parcelas
    if (parcelas.length > 0) {
      const indiceSemForma = parcelas.findIndex(p => !p.forma_pagamento_id_bling)
      if (indiceSemForma !== -1) {
        showToast('error', 'Forma de pagamento obrigatoria',
          'Selecione uma forma de pagamento para todas as parcelas antes de salvar.')
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const dataAtual = hojeLocalISO()

      const itensPayload = sugestoes.map(item => ({
        descricao: item.nome,
        codigoFornecedor: item.codigo_fornecedor || undefined,
        unidade: 'UN',
        valor: item.valor_unitario,
        quantidade: item.quantidade_ajustada,
        aliquotaIPI: 0,
        produto_id: item.produto_id,
        produto: item.id_produto_bling ? {
          id: item.id_produto_bling,
          codigo: item.codigo,
        } : undefined,
      }))

      const parcelasPayload = parcelas.length > 0 ? parcelas.map(p => ({
        valor: p.valor,
        dataVencimento: p.data_vencimento,
        observacao: p.observacao || '',
        formaPagamento: p.forma_pagamento_id_bling ? { id: p.forma_pagamento_id_bling } : undefined,
      })) : undefined

      let observacoesFinais = observacoes || ''
      if (politica?.bonificacao && politica.bonificacao > 0) {
        const textoBonificacao = `Bonificacao acordada: ${politica.bonificacao}%`
        observacoesFinais = observacoesFinais
          ? `${observacoesFinais}\n${textoBonificacao}`
          : textoBonificacao
      }

      const payload = {
        fornecedor_id: fornecedor.id,
        fornecedor_id_bling: fornecedor.id_bling,
        data: dataAtual,
        dataPrevista: dataPrevista || undefined,
        totalProdutos: valorTotal,
        total: valorTotalComFrete,
        desconto: valorDesconto,
        frete: frete,
        fretePorConta: fretePorConta,
        observacoes: observacoesFinais || undefined,
        observacoesInternas: observacoesInternas || undefined,
        politicaId: politicaSelecionadaId || undefined,
        itens: itensPayload,
        parcelas: parcelasPayload,
      }

      const response = await fetch(`/api/pedidos-compra/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = parseBlingError(result.error || 'Erro desconhecido', result.details)
        showToast('error', 'Erro ao salvar edicao', errorMessage)
        return
      }

      showToast('success', 'Pedido atualizado!', `Pedido #${numeroPedido || pedidoId} foi salvo com sucesso.`)

      setTimeout(() => {
        router.push(`/compras/pedidos/${pedidoId}`)
      }, 1500)
    } catch (err) {
      console.error('Erro ao salvar edicao:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado ao salvar o pedido.'
      showToast('error', 'Erro ao salvar edicao', parseBlingError(errorMessage))
    } finally {
      setSaving(false)
    }
  }

  // Criar pedido com as sugestoes - Envia para Bling e depois salva localmente
  const handleCriarPedido = async () => {
    // Validacao: Sugestoes existentes
    if (sugestoes.length === 0) {
      showToast('warning', 'Sem produtos', 'Nenhum produto para criar pedido. Calcule a sugestao primeiro.')
      return
    }

    // Validacao: Fornecedor selecionado
    if (!fornecedor) {
      showToast('warning', 'Fornecedor obrigatorio', 'Selecione um fornecedor para criar o pedido.')
      return
    }

    // Validacao: Fornecedor sincronizado com Bling
    if (!fornecedor.id_bling) {
      showToast('error', 'Fornecedor nao sincronizado',
        'Este fornecedor nao esta sincronizado com o Bling.\n\nVa em Cadastros > Fornecedores e sincronize o fornecedor primeiro.')
      return
    }

    // Validacao: Produtos com ID Bling
    const produtosSemBling = sugestoes.filter(item => !item.id_produto_bling)
    if (produtosSemBling.length > 0) {
      const nomes = produtosSemBling.map(p => p.nome).slice(0, 3).join(', ')
      const mais = produtosSemBling.length > 3 ? ` e mais ${produtosSemBling.length - 3}` : ''
      showToast('warning', 'Produtos nao sincronizados',
        `${produtosSemBling.length} produto(s) nao estao sincronizados com o Bling:\n${nomes}${mais}\n\nO pedido sera criado, mas esses produtos nao serao vinculados no Bling.`)
    }

    // Validacao: Quantidades validas
    const itensInvalidos = sugestoes.filter(item => item.quantidade_ajustada <= 0 || item.valor_unitario <= 0)
    if (itensInvalidos.length > 0) {
      showToast('error', 'Valores invalidos',
        'Existem produtos com quantidade ou valor zerado/negativo. Corrija antes de continuar.')
      return
    }

    // Validacao: Forma de pagamento nas parcelas
    if (parcelas.length > 0) {
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
    }

    setSaving(true)
    setError(null)

    try {
      const dataAtual = hojeLocalISO()

      // Montar payload para API
      // produto_id = ID interno do Supabase (para FK)
      // produto.id = id_produto_bling (para API do Bling)
      const itensPayload = sugestoes.map(item => ({
        descricao: item.nome,
        codigoFornecedor: item.codigo_fornecedor || undefined,
        unidade: 'UN',
        valor: item.valor_unitario,
        quantidade: item.quantidade_ajustada,
        aliquotaIPI: 0,
        produto_id: item.produto_id, // ID interno Supabase para FK
        produto: item.id_produto_bling ? {
          id: item.id_produto_bling, // id_produto_bling para API Bling
          codigo: item.codigo
        } : undefined
      }))

      // Montar parcelas para API (com forma de pagamento Bling)
      const parcelasPayload = parcelas.length > 0 ? parcelas.map(p => ({
        valor: p.valor,
        dataVencimento: p.data_vencimento,
        observacao: p.observacao || '',
        formaPagamento: p.forma_pagamento_id_bling ? { id: p.forma_pagamento_id_bling } : undefined
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
        fornecedor_id: fornecedor.id,
        fornecedor_id_bling: fornecedor.id_bling,
        data: dataAtual,
        dataPrevista: dataPrevista || undefined,
        totalProdutos: valorTotal,
        total: valorTotalComFrete,
        desconto: valorDesconto, // Valor em reais (calculado a partir da % da politica)
        frete: frete,
        fretePorConta: fretePorConta,
        observacoes: observacoesFinais || undefined,
        observacoesInternas: observacoesInternas || undefined,
        politicaId: politicaSelecionadaId || undefined, // ID da politica selecionada
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

      // Verificar se houve warning (pedido criado no Bling mas erro local)
      if (result.warning) {
        showToast('warning', 'Pedido criado com ressalvas',
          `Pedido #${result.numero || result.bling_id} criado no Bling.\n\n${result.warning}`)
      } else {
        showToast('success', 'Pedido criado com sucesso!',
          `Pedido #${result.numero || result.id} foi registrado no Bling e salvo localmente.`)
      }

      // Limpa o rascunho persistido (pedido foi criado com sucesso)
      const empIdClear = empresa?.id || user?.empresa_id
      if (empIdClear && fornecedorIdParam) {
        try {
          localStorage.removeItem(lsKeyPedido(empIdClear, fornecedorIdParam))
        } catch {
          // ignora
        }
      }

      // Aguardar um pouco para o usuario ver a mensagem antes de redirecionar
      setTimeout(() => {
        router.push(`/compras/pedidos/${result.id}`)
      }, 2000)

    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado ao criar pedido.'
      showToast('error', 'Erro ao criar pedido', parseBlingError(errorMessage))
    } finally {
      setSaving(false)
    }
  }

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Calcular totais
  const totalItens = sugestoes.reduce((acc, item) => acc + item.quantidade_ajustada, 0)
  const valorTotal = sugestoes.reduce((acc, item) => acc + item.valor_total, 0)

  // Lista derivada para exibicao (busca + filtros) - NAO altera `sugestoes`
  const filtrosAvancadosAtivos = [filtroEstoqueMin, filtroEstoqueMax, filtroSugestaoMin, filtroSugestaoMax].filter(v => v !== '').length
  const buscaOuFiltroAtivo = buscaSugestao.trim() !== '' || filtrosAvancadosAtivos > 0
  const limparFiltrosSugestao = () => {
    setBuscaSugestao('')
    setFiltroEstoqueMin('')
    setFiltroEstoqueMax('')
    setFiltroSugestaoMin('')
    setFiltroSugestaoMax('')
  }
  const sugestoesExibidas = sugestoes.filter(item => {
    // SEARCH: codigo, ean, produto(nome)
    const termo = buscaSugestao.toLowerCase().trim()
    if (termo) {
      const hay = `${item.codigo || ''} ${item.ean || ''} ${item.nome || ''}`.toLowerCase()
      if (!hay.includes(termo)) return false
    }
    // FILTRO AVANCADO estoque (faixa)
    const est = Number(item.estoque_atual ?? 0)
    if (filtroEstoqueMin !== '' && est < Number(filtroEstoqueMin)) return false
    if (filtroEstoqueMax !== '' && est > Number(filtroEstoqueMax)) return false
    // FILTRO AVANCADO sugestao (faixa)
    const sug = Number(item.sugestao_quantidade ?? 0)
    if (filtroSugestaoMin !== '' && sug < Number(filtroSugestaoMin)) return false
    if (filtroSugestaoMax !== '' && sug > Number(filtroSugestaoMax)) return false
    return true
  })

  // Aplicar desconto da politica (percentual sobre valor dos produtos)
  const descontoPolitica = politica?.desconto || 0
  const valorDesconto = valorTotal * (descontoPolitica / 100)

  // Calcular total final usando a logica correta de CIF/FOB
  const valorTotalComFrete = calcularTotalPedido({
    totalProdutos: valorTotal,
    frete,
    desconto: valorDesconto,
    fretePorConta,
  })
  const totalParcelas = parcelas.reduce((acc, p) => acc + p.valor, 0)

  // Recalcular parcelas quando o total do pedido mudar (frete, desconto, etc)
  // Mantendo as datas de vencimento, apenas atualizando os valores
  useEffect(() => {
    if (parcelas.length > 0 && valorTotalComFrete > 0) {
      const totalAtualParcelas = parcelas.reduce((acc, p) => acc + p.valor, 0)
      const diferenca = Math.abs(totalAtualParcelas - valorTotalComFrete)

      // Se a diferenca for maior que 1 centavo, recalcular
      if (diferenca > 0.01) {
        const quantidade = parcelas.length
        const valorPorParcela = Number((valorTotalComFrete / quantidade).toFixed(2))

        const parcelasAtualizadas = parcelas.map((parcela, i) => {
          const valorParcela = i === quantidade - 1
            ? Number((valorTotalComFrete - valorPorParcela * (quantidade - 1)).toFixed(2))
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
  }, [valorTotalComFrete])

  if (loading) {
    return (
      <RequirePermission permission="pedidos">
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <SpinnerIcon />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="pedidos">
    <DashboardLayout>
      {/* Toast de notificacao */}
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title={isEdicao ? `Editar Pedido${numeroPedido ? ` #${numeroPedido}` : ''}` : 'Gerar Pedido Automatico'}
        subtitle={fornecedor?.nome || ''}
      />

      {/* Navegacao */}
      <div className="mb-6">
        <Link
          href="/compras/pedidos"
          className="inline-flex items-center gap-2 text-sm text-[#336FB6] hover:text-[#2660A5]"
        >
          <ArrowLeftIcon />
          Voltar para pedidos
        </Link>
      </div>

      {/* Card principal (sem overflow-hidden para permitir footer sticky) */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)]">
        {/* Header */}
        <div className="bg-[#FBFBFB] border-b border-[#EDEDED] px-6 py-4 rounded-t-[20px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#4684CD]/10 flex items-center justify-center text-[#4684CD]">
                <AutoFixIcon />
              </div>
              <div>
                <h2 className="text-base font-medium text-[#344054]">
                  {fornecedor?.nome}
                </h2>
                {fornecedor?.cnpj && (
                  <p className="text-sm text-gray-500">{fornecedor.cnpj}</p>
                )}
              </div>
            </div>

            {/* Botao calcular */}
            {sugestoes.length === 0 && (
              <button
                onClick={calcularSugestoes}
                disabled={calculando || !politica}
                title={!politica ? 'Configure uma politica de compra primeiro' : undefined}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#4684CD] hover:bg-[#3A75B8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculando ? (
                  <>
                    <SpinnerIcon />
                    Calculando...
                  </>
                ) : (
                  <>
                    <AutoFixIcon />
                    Calcular Sugestoes
                  </>
                )}
              </button>
            )}
          </div>

          {/* Selecao de politica de compra - APOS o calculo mostra aplicaveis e nao aplicaveis */}
          {politicasAplicaveis.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-blue-800">
                  Politicas de compra
                  <span className="ml-2 text-xs font-normal text-blue-600">
                    ({politicasAplicaveis.length} de {politicas.length} {politicasAplicaveis.length === 1 ? 'atingiu' : 'atingiram'} valor minimo)
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                {/* Politicas aplicaveis (atingiram valor minimo) */}
                {politicasAplicaveis.map((polAplicavel) => {
                  // Buscar detalhes da politica no Supabase
                  const polDetalhes = politicas.find(p => p.id === polAplicavel.politica_id)
                  return (
                    <label
                      key={polAplicavel.politica_id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        politicaSelecionadaId === polAplicavel.politica_id
                          ? 'bg-white border-blue-400 shadow-sm'
                          : 'bg-blue-50/50 border-blue-200 hover:bg-white hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="politica"
                        value={polAplicavel.politica_id}
                        checked={politicaSelecionadaId === polAplicavel.politica_id}
                        onChange={() => setPoliticaSelecionadaId(polAplicavel.politica_id)}
                        className="mt-0.5 w-4 h-4 text-blue-600 border-blue-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {polAplicavel.melhor_politica && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-medium">
                                Melhor opcao
                              </span>
                            )}
                            {polDetalhes?.desconto ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                -{polDetalhes.desconto}%
                              </span>
                            ) : null}
                            {polDetalhes?.prazo_entrega ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                                Entrega: {polDetalhes.prazo_entrega}d
                              </span>
                            ) : null}
                            {polDetalhes?.forma_pagamento_dias && polDetalhes.forma_pagamento_dias.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                                Pgto: {polDetalhes.forma_pagamento_dias.join('/')}d
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-800">
                              {formatCurrency(polAplicavel.valor_total_com_desconto)}
                            </p>
                            {polAplicavel.valor_total_sem_desconto !== polAplicavel.valor_total_com_desconto && (
                              <p className="text-xs text-gray-500 line-through">
                                {formatCurrency(polAplicavel.valor_total_sem_desconto)}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {polAplicavel.sugestoes.length} produtos
                          {polDetalhes?.valor_minimo ? ` • Min: ${formatCurrency(polDetalhes.valor_minimo)}` : ''}
                        </p>
                      </div>
                    </label>
                  )
                })}

                {/* Politicas NAO aplicaveis (nao atingiram valor minimo) */}
                {(() => {
                  // Calcular valor total atual (da melhor politica aplicavel)
                  const melhorPolitica = politicasAplicaveis.find(p => p.melhor_politica) || politicasAplicaveis[0]
                  const valorTotalAtual = melhorPolitica?.valor_total_sem_desconto || 0

                  // Filtrar politicas que NAO estao nas aplicaveis
                  const politicasNaoAplicaveis = politicas.filter(
                    pol => !politicasAplicaveis.some(pa => pa.politica_id === pol.id)
                  )

                  if (politicasNaoAplicaveis.length === 0) return null

                  return (
                    <>
                      {/* Separador */}
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="text-xs text-gray-400">Nao atingiram valor minimo</span>
                        <div className="flex-1 h-px bg-gray-300" />
                      </div>

                      {politicasNaoAplicaveis.map((polNaoAplicavel) => {
                        const valorFaltante = (polNaoAplicavel.valor_minimo || 0) - valorTotalAtual
                        const isInativa = polNaoAplicavel.status === false
                        return (
                          <div
                            key={polNaoAplicavel.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60"
                          >
                            <input
                              type="radio"
                              disabled
                              className="mt-0.5 w-4 h-4 text-gray-300 border-gray-300 cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isInativa ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full text-xs">
                                      Inativa
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                                      Falta {formatCurrency(valorFaltante > 0 ? valorFaltante : 0)}
                                    </span>
                                  )}
                                  {polNaoAplicavel.desconto ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                                      -{polNaoAplicavel.desconto}%
                                    </span>
                                  ) : null}
                                  {polNaoAplicavel.prazo_entrega ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                                      Entrega: {polNaoAplicavel.prazo_entrega}d
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-400">
                                    Min: {formatCurrency(polNaoAplicavel.valor_minimo || 0)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400">
                                {isInativa ? 'Politica desativada' : 'Adicione mais produtos para atingir esta politica'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Antes do calculo: mostra politicas disponiveis (informativo) */}
          {politicasAplicaveis.length === 0 && politicas.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                {politicas.length} {politicas.length === 1 ? 'politica disponivel' : 'politicas disponiveis'}
              </p>
              <p className="text-xs text-gray-500">
                Clique em &quot;Calcular Sugestoes&quot; para ver quais atingem o valor minimo.
              </p>
            </div>
          )}

          {/* Formulario inline: Criar politica de compra rapidamente */}
          {fornecedor && !politica && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              {!showPoliticaForm ? (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-amber-500">
                    <ExclamationTriangleIcon />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      Politica de compra necessaria
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      Configure rapidamente os parametros de compra para gerar o pedido automaticamente.
                    </p>
                    <button
                      onClick={() => setShowPoliticaForm(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Configurar agora
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-amber-800">
                      Configurar Politica de Compra
                    </h4>
                    <button
                      onClick={() => setShowPoliticaForm(false)}
                      className="text-amber-600 hover:text-amber-800"
                    >
                      <XMarkIcon />
                    </button>
                  </div>

                  {/* Formas de pagamento (dias) */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-amber-800 mb-1">
                      Prazos de pagamento (dias) *
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[38px] px-3 py-1.5 border border-amber-300 rounded-lg bg-white">
                        {politicaForm.forma_pagamento_dias.length === 0 ? (
                          <span className="text-xs text-amber-400">Adicione os prazos...</span>
                        ) : (
                          politicaForm.forma_pagamento_dias.map(dia => (
                            <span
                              key={dia}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#336FB6] text-white text-xs rounded-full"
                            >
                              {dia}d
                              <button
                                type="button"
                                onClick={() => handleRemoveDiaPagamento(dia)}
                                className="hover:bg-white/20 rounded-full p-0.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <input
                        type="number"
                        value={novoDiaPagamento}
                        onChange={(e) => setNovoDiaPagamento(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDiaPagamento())}
                        placeholder="Ex: 30"
                        min="1"
                        className="w-20 px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={handleAddDiaPagamento}
                        className="p-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-amber-600">Ex: 10, 20, 30 dias. O prazo de estoque e calculado automaticamente.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Prazo de entrega (dias) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={politicaForm.prazo_entrega}
                        onChange={(e) => setPoliticaForm(prev => ({ ...prev, prazo_entrega: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="7"
                      />
                      <p className="mt-1 text-[10px] text-amber-600">Tempo medio de entrega</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Valor minimo (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={politicaForm.valor_minimo || ''}
                        onChange={(e) => setPoliticaForm(prev => ({ ...prev, valor_minimo: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="0"
                      />
                      <p className="mt-1 text-[10px] text-amber-600">Pedido minimo do fornecedor</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Desconto (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={politicaForm.desconto || ''}
                        onChange={(e) => setPoliticaForm(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="0"
                      />
                      <p className="mt-1 text-[10px] text-amber-600">Desconto padrao negociado</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowPoliticaForm(false)}
                      className="px-4 py-2 text-sm font-medium text-amber-700 hover:text-amber-900"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSavePoliticaAndCalculate}
                      disabled={savingPolitica}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#4684CD] hover:bg-[#3A75B8] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingPolitica ? (
                        <>
                          <SpinnerIcon />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckIcon />
                          Salvar e Calcular
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Estado inicial - sem sugestoes */}
        {!calculando && sugestoes.length === 0 && !error && (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AutoFixIcon />
            </div>
            {politica ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Gerar sugestoes de compra
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  Clique em &quot;Calcular Sugestoes&quot; para analisar as vendas e estoque
                  e receber sugestoes de quantidades a comprar.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Politica de compra necessaria
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                  Configure os parametros de compra acima para gerar o pedido automaticamente.
                </p>
                <button
                  onClick={() => setShowPoliticaForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#4684CD] hover:bg-[#3A75B8] rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Configurar Agora
                </button>
              </>
            )}
          </div>
        )}

        {/* Calculando */}
        {calculando && (
          <div className="px-6 py-12 text-center">
            <div className="flex justify-center">
              <SpinnerIcon />
            </div>
            <p className="mt-4 text-sm text-gray-700 font-medium">
              Analisando vendas e calculando sugestoes...
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Este processo pode levar alguns minutos. Por favor, aguarde.
            </p>
          </div>
        )}

        {/* Tabela de sugestoes */}
        {sugestoes.length > 0 && (
          <>
            {/* Barra de busca e filtros */}
            <div className="px-4 py-3 border-b border-[#EFEFEF]">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={buscaSugestao}
                    onChange={(e) => setBuscaSugestao(e.target.value)}
                    placeholder="Buscar por codigo, EAN ou produto..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg text-[#344054] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarFiltrosAvancados(v => !v)}
                  className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${mostrarFiltrosAvancados || filtrosAvancadosAtivos > 0 ? 'border-[#4684CD] text-[#4684CD] bg-[#4684CD]/5' : 'border-gray-300 text-[#344054] hover:bg-gray-50'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
                  </svg>
                  Filtros
                  {filtrosAvancadosAtivos > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-[#4684CD] rounded-full">
                      {filtrosAvancadosAtivos}
                    </span>
                  )}
                </button>
              </div>

              {buscaOuFiltroAtivo && (
                <p className="mt-2 text-xs text-[#667085]">
                  Mostrando {sugestoesExibidas.length} de {sugestoes.length} itens
                </p>
              )}

              {mostrarFiltrosAvancados && (
                <div className="mt-3 p-3 bg-[#F9F9F9] border border-[#EFEFEF] rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#344054] mb-1.5">Estoque</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={filtroEstoqueMin}
                          onChange={(e) => setFiltroEstoqueMin(e.target.value)}
                          placeholder="Min"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-[#344054] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                        />
                        <span className="text-gray-400 text-sm">-</span>
                        <input
                          type="number"
                          value={filtroEstoqueMax}
                          onChange={(e) => setFiltroEstoqueMax(e.target.value)}
                          placeholder="Max"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-[#344054] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#344054] mb-1.5">Sugestao</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={filtroSugestaoMin}
                          onChange={(e) => setFiltroSugestaoMin(e.target.value)}
                          placeholder="Min"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-[#344054] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                        />
                        <span className="text-gray-400 text-sm">-</span>
                        <input
                          type="number"
                          value={filtroSugestaoMax}
                          onChange={(e) => setFiltroSugestaoMax(e.target.value)}
                          placeholder="Max"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-[#344054] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={limparFiltrosSugestao}
                      className="text-xs font-medium text-[#4684CD] hover:underline"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#F9F9F9]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Codigo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">EAN</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Produto</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Estoque</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Itens/Cx</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Media/dia</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Sugestao</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Qtd</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">Valor Unit.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">Total</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sugestoesExibidas.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-sm text-[#667085]">
                        Nenhum item corresponde a busca/filtros
                      </td>
                    </tr>
                  )}
                  {sugestoesExibidas.map((item) => {
                    const index = sugestoes.indexOf(item)
                    return (
                    <tr key={`${item.produto_id}-${index}`} className={`border-b border-[#EFEFEF] hover:bg-gray-50 ${item.is_adicional ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-[#344054]">{item.codigo}</td>
                      <td className="px-4 py-3 text-sm text-[#667085] font-mono text-xs">{item.ean || '-'}</td>
                      <td className="px-4 py-3 text-sm text-[#344054] max-w-[200px] truncate" title={item.nome}>
                        {item.nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-[#667085]">{item.estoque_atual}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#667085]">{item.itens_por_caixa}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#667085]">{item.media_vendas_dia}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#4684CD] font-medium">
                        {item.sugestao_quantidade}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step={item.itens_por_caixa}
                          value={item.quantidade_ajustada}
                          onChange={(e) => handleQuantidadeChange(index, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#667085]">
                        {formatCurrency(item.valor_unitario)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-[#344054]">
                        {formatCurrency(item.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoverItem(index)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-100">
              {sugestoesExibidas.length === 0 && (
                <div className="p-6 text-center text-sm text-[#667085]">
                  Nenhum item corresponde a busca/filtros
                </div>
              )}
              {sugestoesExibidas.map((item) => {
                const index = sugestoes.indexOf(item)
                return (
                <div key={`${item.produto_id}-${index}`} className={`p-4 space-y-3 ${item.is_adicional ? 'bg-yellow-50' : ''}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#344054] truncate">{item.nome}</p>
                      <p className="text-xs text-[#667085]">{item.codigo}{item.ean ? ` • ${item.ean}` : ''}</p>
                    </div>
                    <button
                      onClick={() => handleRemoverItem(index)}
                      className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                      title="Remover"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-500">Estoque</p>
                      <p className="text-sm font-medium text-[#344054]">{item.estoque_atual}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-500">Cx</p>
                      <p className="text-sm font-medium text-[#344054]">{item.itens_por_caixa}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-500">Media/dia</p>
                      <p className="text-sm font-medium text-[#344054]">{item.media_vendas_dia}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-[10px] text-blue-500">Sugestao</p>
                      <p className="text-sm font-medium text-[#4684CD]">{item.sugestao_quantidade}</p>
                    </div>
                  </div>

                  {/* Quantity + Values */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 mb-1">Qtd</label>
                      <input
                        type="number"
                        min="0"
                        step={item.itens_por_caixa}
                        value={item.quantidade_ajustada}
                        onChange={(e) => handleQuantidadeChange(index, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">Unit.</p>
                      <p className="text-sm text-[#667085]">{formatCurrency(item.valor_unitario)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">Total</p>
                      <p className="text-sm font-medium text-[#344054]">{formatCurrency(item.valor_total)}</p>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>

            {/* Secao de detalhes do pedido */}
            <div className="px-6 py-5 border-t border-[#EDEDED]">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Detalhes do Pedido</h3>

              {/* Data prevista e Frete */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data Prevista</label>
                  <input
                    type="date"
                    value={dataPrevista}
                    onChange={(e) => setDataPrevista(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frete (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={frete || ''}
                    onChange={(e) => setFrete(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frete por Conta</label>
                  <select
                    value={fretePorConta}
                    onChange={(e) => setFretePorConta(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                  >
                    {FRETE_POR_CONTA_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="text-right w-full">
                    <p className="text-xs text-gray-500">Total com frete</p>
                    <p className="text-lg font-semibold text-[#336FB6]">{formatCurrency(valorTotalComFrete)}</p>
                  </div>
                </div>
              </div>

              {/* Observacoes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes (visivel ao fornecedor)</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observacoes para o fornecedor..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#336FB6] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes Internas</label>
                  <textarea
                    value={observacoesInternas}
                    onChange={(e) => setObservacoesInternas(e.target.value)}
                    placeholder="Observacoes internas..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#336FB6] resize-none"
                  />
                </div>
              </div>

              {/* Parcelas */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Parcelas</h4>
                  <div className="flex items-center gap-2">
                    {parcelas.length > 0 && (
                      <>
                        <button
                          onClick={handleDistribuirParcelas}
                          className="text-xs text-[#336FB6] hover:underline"
                        >
                          Redistribuir
                        </button>
                        <button
                          onClick={() => setParcelas([])}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Limpar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Atalhos de parcelamento */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Gerar parcelas rapidamente:</p>
                  <div className="flex flex-wrap gap-2">
                    {/* Botao da politica - se tiver forma_pagamento_dias */}
                    {politica?.forma_pagamento_dias && politica.forma_pagamento_dias.length > 0 && (
                      <button
                        onClick={handleGerarParcelasPolitica}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#336FB6] rounded-lg hover:bg-[#2A5A94] transition-colors"
                      >
                        Usar politica ({politica.forma_pagamento_dias.length}x: {politica.forma_pagamento_dias.join('/')}d)
                      </button>
                    )}
                    {/* Atalhos comuns */}
                    {[
                      { label: 'A vista', qtd: 1 },
                      { label: '3x', qtd: 3 },
                      { label: '6x', qtd: 6 },
                      { label: '10x', qtd: 10 },
                      { label: '12x', qtd: 12 },
                    ].map(({ label, qtd }) => (
                      <button
                        key={qtd}
                        onClick={() => handleGerarParcelas(qtd)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    {/* Botao personalizado */}
                    <button
                      onClick={handleAddParcela}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#336FB6] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Manual
                    </button>
                  </div>
                </div>

                {parcelas.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Selecione uma opcao acima para gerar as parcelas automaticamente.</p>
                ) : (
                  <div className="space-y-2">
                    {parcelas.map((parcela, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Valor (R$)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={parcela.valor}
                              onChange={(e) => handleUpdateParcela(index, 'valor', Number(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Vencimento</label>
                            <input
                              type="date"
                              value={parcela.data_vencimento}
                              onChange={(e) => handleUpdateParcela(index, 'data_vencimento', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Forma de Pagamento</label>
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
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => handleRemoveParcela(index)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remover parcela"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Total das parcelas */}
                    <div className="flex justify-end pt-2 border-t border-gray-200">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Total das parcelas: </span>
                        <span className={`text-sm font-semibold ${Math.abs(totalParcelas - valorTotalComFrete) > 0.01 ? 'text-amber-600' : 'text-gray-900'}`}>
                          {formatCurrency(totalParcelas)}
                        </span>
                        {Math.abs(totalParcelas - valorTotalComFrete) > 0.01 && (
                          <span className="ml-2 text-xs text-amber-600">
                            (diferenca: {formatCurrency(valorTotalComFrete - totalParcelas)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Espacador para o conteudo nao ficar atras da barra fixa */}
            <div aria-hidden className="h-32 md:h-24" />
          </>
        )}
      </div>

      {/* Barra de acoes FIXA no rodape da tela (responsiva) */}
      {sugestoes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EDEDED] shadow-[0_-4px_16px_rgba(0,0,0,0.10)]">
          <div className="max-w-[1800px] 2xl:max-w-[2200px] 3xl:max-w-none mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Totais (compactam no mobile) */}
            <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar">
              <div className="hidden md:block shrink-0">
                <p className="text-xs text-gray-500">Itens</p>
                <p className="text-base lg:text-lg font-semibold text-[#344054]">{sugestoes.length}</p>
              </div>
              <div className="hidden md:block shrink-0">
                <p className="text-xs text-gray-500">Qtd total</p>
                <p className="text-base lg:text-lg font-semibold text-[#344054]">{totalItens}</p>
              </div>
              <div className="hidden lg:block shrink-0">
                <p className="text-xs text-gray-500">Valor produtos</p>
                <p className="text-base lg:text-lg font-semibold text-[#667085]">{formatCurrency(valorTotal)}</p>
              </div>
              {valorDesconto > 0 && (
                <div className="hidden lg:block shrink-0">
                  <p className="text-xs text-gray-500">Desconto ({descontoPolitica}%)</p>
                  <p className="text-base lg:text-lg font-semibold text-green-600">-{formatCurrency(valorDesconto)}</p>
                </div>
              )}
              {frete > 0 && fretePorConta !== 'CIF' && fretePorConta !== 'SEM_FRETE' && (
                <div className="hidden lg:block shrink-0">
                  <p className="text-xs text-gray-500">Frete ({fretePorConta})</p>
                  <p className="text-base lg:text-lg font-semibold text-[#667085]">+{formatCurrency(frete)}</p>
                </div>
              )}
              <div className="shrink-0">
                <p className="text-xs text-gray-500">Total do pedido</p>
                <p className="text-lg font-bold text-[#336FB6]">{formatCurrency(valorTotalComFrete)}</p>
              </div>
            </div>

            {/* Botoes */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Exportar CSV — desktop (no mobile vai pro kebab) */}
              <button
                onClick={handleExportarCSV}
                disabled={sugestoes.length === 0}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#475569] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV
              </button>
              {/* Recalcular — desktop (no mobile vai pro kebab) */}
              {!isEdicao && (
                <button
                  onClick={calcularSugestoes}
                  disabled={calculando}
                  className="hidden md:inline-flex px-4 py-2.5 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
                >
                  Recalcular
                </button>
              )}
              {/* Adicionar item extra — sempre visivel (desktop e mobile) */}
              {sugestoes.length > 0 && fornecedor && (
                <button
                  onClick={() => setShowProdutoModal(true)}
                  className="inline-flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-medium text-[#336FB6] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="whitespace-nowrap">Adicionar item extra</span>
                </button>
              )}
              {/* Criar / Salvar — sempre visivel */}
              <button
                onClick={isEdicao ? handleSalvarEdicao : handleCriarPedido}
                disabled={saving || sugestoes.length === 0}
                className="inline-flex flex-1 md:flex-none justify-center items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#009E3F] hover:bg-[#008735] rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {saving ? (
                  <>
                    <SpinnerIcon />
                    {isEdicao ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  <>
                    <CheckIcon />
                    <span className="whitespace-nowrap">{isEdicao ? 'Salvar edicao' : 'Criar Pedido'}</span>
                  </>
                )}
              </button>
              {/* Kebab — SO no mobile: agrupa Exportar CSV e Recalcular */}
              <div className="relative md:hidden shrink-0">
                <button
                  onClick={() => setShowAcoesMenu(v => !v)}
                  aria-label="Mais acoes"
                  className="inline-flex items-center justify-center w-10 h-10 text-[#475569] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5a2 2 0 110-4 2 2 0 010 4zm0 9a2 2 0 110-4 2 2 0 010 4zm0 9a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showAcoesMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAcoesMenu(false)} />
                    <div className="absolute right-0 bottom-12 z-50 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden py-1">
                      <button
                        onClick={() => { setShowAcoesMenu(false); handleExportarCSV() }}
                        disabled={sugestoes.length === 0}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#475569] hover:bg-gray-50 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Exportar CSV
                      </button>
                      {!isEdicao && (
                        <button
                          onClick={() => { setShowAcoesMenu(false); calcularSugestoes() }}
                          disabled={calculando}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#336FB6] hover:bg-gray-50 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Recalcular
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selecao de fornecedor */}
      {showFornecedorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => router.push('/compras/pedidos')}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-[24px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[520px]">
            {/* Content */}
            <div className="p-8">
              {/* Titulo */}
              <h2 className="text-[24px] font-semibold text-[#1a1a2e] leading-[1.2]">
                Gerar Pedido Automatico
              </h2>

              {/* Subtitulo */}
              <p className="mt-4 text-[15px] text-[#64748b] leading-[1.6]">
                Selecione o fornecedor para gerar o pedido automaticamente com base nas vendas e estoque.
              </p>

              {/* Campo de busca */}
              <div className="mt-6 relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar fornecedor..."
                  value={fornecedorSearch}
                  onChange={(e) => setFornecedorSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 text-[15px] text-[#1e293b] placeholder-[#cbd5e1] bg-white border border-[#e2e8f0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-all"
                />
              </div>

              {/* Lista de fornecedores */}
              <div className="mt-4 border border-[#e2e8f0] rounded-[16px] overflow-hidden">
                <div className="max-h-[280px] overflow-y-auto">
                  {loadingFornecedores ? (
                    <div className="flex items-center justify-center py-12">
                      <SpinnerIcon />
                      <span className="ml-3 text-[14px] text-[#64748b]">Carregando fornecedores...</span>
                    </div>
                  ) : filteredFornecedores.length === 0 ? (
                    <div className="py-12 text-center text-[14px] text-[#64748b]">
                      Nenhum fornecedor encontrado
                    </div>
                  ) : (
                    <div>
                      {filteredFornecedores.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFornecedor(f)}
                          className={`w-full px-5 py-4 text-left border-b border-[#f1f5f9] last:border-b-0 transition-all ${
                            selectedFornecedor?.id === f.id
                              ? 'bg-[#f0f7ff]'
                              : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <p className="text-[15px] font-semibold text-[#1e293b] leading-[1.4] uppercase">
                            {f.nome}
                          </p>
                          {f.cnpj && (
                            <p className="mt-0.5 text-[14px] text-[#64748b] leading-[1.4]">
                              {f.cnpj}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer com botoes */}
            <div className="px-8 pb-8 pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push('/compras/pedidos')}
                className="px-7 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-full hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => selectedFornecedor && handleSelectFornecedor(selectedFornecedor)}
                disabled={!selectedFornecedor}
                className="px-7 py-2.5 text-[14px] font-medium text-white bg-[#94a8c7] rounded-full hover:bg-[#8299ba] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gate de sincronização do catálogo (antes da IA) */}
      {showGateModal && catalogoPendente && (
        <ModalSincronizarCatalogo
          catalogo={catalogoPendente}
          onSincronizado={() => {
            setGateResolved(true)
            setShowGateModal(false)
            refetchGate()
            // Re-tenta calcular agora que o catálogo está sincronizado
            calcularSugestoes()
          }}
          onVoltar={() => setShowGateModal(false)}
        />
      )}

      {/* Modal de busca de produtos para adicionar item extra (catalogo do fornecedor) */}
      {fornecedor && (
        <ProductSearchModal
          isOpen={showProdutoModal}
          onClose={() => setShowProdutoModal(false)}
          onSelect={handleAdicionarItemExtra}
          pedidoId={pedidoId ?? 0}
          mode="adicionar"
          apiEndpoint={`/api/pedidos-compra/catalogo-fornecedor?fornecedor_id=${fornecedor.id}`}
        />
      )}

      {/* Modal de Pedido em Aberto */}
      <PedidoEmAbertoModal
        isOpen={pedidoAbertoModalOpen}
        onClose={() => {
          setPedidoAbertoModalOpen(false)
          setPedidosEmAberto([])
          setItensJaPedidos([])
        }}
        fornecedorNome={fornecedor?.nome || ''}
        pedidos={pedidosEmAberto}
        itens={itensJaPedidos}
        loading={pedidoAbertoLoading}
        onContinuar={handleContinuarComDesconto}
        onContinuarSemDesconto={() => {
          setPedidoAbertoModalOpen(false)
          setDescontarPedidos(false)
          executarCalculo(false)
        }}
      />
    </DashboardLayout>
    </RequirePermission>
  )
}

export default function GerarAutomaticoPage() {
  return (
    <Suspense fallback={
      <RequirePermission permission="pedidos">
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <SpinnerIcon />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      </DashboardLayout>
      </RequirePermission>
    }>
      <GerarAutomaticoContent />
    </Suspense>
  )
}
