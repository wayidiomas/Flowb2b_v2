'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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
        const fields = Object.keys(parsed.error.fields).join(', ')
        return `Campos com problema: ${fields}. Verifique os dados informados.`
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
  estoque_atual: number
  media_vendas_dia: number
  sugestao_quantidade: number
  quantidade_ajustada: number
  valor_unitario: number
  valor_total: number
  itens_por_caixa: number
  caixas: number
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
}

function GerarAutomaticoContent() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fornecedorIdParam = searchParams.get('fornecedor_id')

  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  const [politica, setPolitica] = useState<PoliticaCompra | null>(null)
  const [sugestoes, setSugestoes] = useState<SugestaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

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
    prazo_estoque: 30,
    prazo_entrega: 7,
    valor_minimo: 0,
    desconto: 0,
  })

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
        .limit(100)

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

        // Buscar politica de compra
        const { data: politicaData } = await supabase
          .from('politica_compra')
          .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque')
          .eq('fornecedor_id', parseInt(fornecedorIdParam))
          .eq('empresa_id', empresaId)
          .eq('status', true)
          .single()

        setPolitica(politicaData || null)
        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados do fornecedor')
        setLoading(false)
      }
    }

    fetchData()
  }, [fornecedorIdParam, user?.id, user?.empresa_id, empresa?.id])

  // Selecionar fornecedor do modal
  const handleSelectFornecedor = async (selected: FornecedorOption) => {
    setFornecedor({ id: selected.id, id_bling: selected.id_bling || null, nome: selected.nome, cnpj: selected.cnpj || null })
    setShowFornecedorModal(false)

    // Buscar politica do fornecedor selecionado
    const empresaId = empresa?.id || user?.empresa_id
    if (empresaId) {
      const { data: politicaData } = await supabase
        .from('politica_compra')
        .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque')
        .eq('fornecedor_id', selected.id)
        .eq('empresa_id', empresaId)
        .eq('status', true)
        .single()

      setPolitica(politicaData || null)
    }
  }

  // Filtrar fornecedores no modal
  const filteredFornecedores = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase()) ||
    (f.cnpj && f.cnpj.includes(fornecedorSearch))
  )

  // Salvar politica de compra e calcular sugestoes
  const handleSavePoliticaAndCalculate = async () => {
    if (!fornecedor) return

    // Validacao basica
    if (politicaForm.prazo_estoque <= 0) {
      showToast('warning', 'Campo obrigatorio', 'Informe o prazo de estoque (dias).')
      return
    }

    setSavingPolitica(true)

    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) throw new Error('Empresa nao encontrada')

      // Inserir politica de compra
      const { data: novaPolitica, error: insertError } = await supabase
        .from('politica_compra')
        .insert({
          empresa_id: empresaId,
          fornecedor_id: fornecedor.id,
          prazo_estoque: politicaForm.prazo_estoque,
          prazo_entrega: politicaForm.prazo_entrega || null,
          valor_minimo: politicaForm.valor_minimo || null,
          desconto: politicaForm.desconto || null,
          status: true,
        })
        .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque')
        .single()

      if (insertError) throw insertError

      // Atualizar estado da politica
      setPolitica(novaPolitica)
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

  // Calcular sugestoes com politica especifica (usado apos criar politica)
  const calcularSugestoesComPolitica = async (pol: PoliticaCompra) => {
    if (!fornecedor) return

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sugestoesCalculadas: SugestaoItem[] = data.sugestoes.map((item: any) => ({
        produto_id: item.produto_id,
        id_produto_bling: item.id_produto_bling,
        codigo: item.codigo || '-',
        nome: item.nome,
        estoque_atual: item.estoque_atual || 0,
        media_vendas_dia: item.media_venda_dia || 0,
        sugestao_quantidade: item.quantidade_sugerida,
        quantidade_ajustada: item.quantidade_sugerida,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        itens_por_caixa: item.itens_por_caixa || 1,
        caixas: Math.ceil(item.quantidade_sugerida / (item.itens_por_caixa || 1))
      }))

      sugestoesCalculadas.sort((a, b) => b.valor_total - a.valor_total)
      setSugestoes(sugestoesCalculadas)
    } catch (err) {
      console.error('Erro ao calcular sugestoes:', err)
      setError(err instanceof Error ? err.message : 'Erro ao calcular sugestoes de compra')
    } finally {
      setCalculando(false)
    }
  }

  // Calcular sugestoes via API externa
  const calcularSugestoes = async () => {
    if (!fornecedor) return

    // Validacao: Politica de compra obrigatoria
    if (!politica) {
      showToast('error', 'Politica de compra obrigatoria',
        'Este fornecedor nao possui uma politica de compra configurada.\n\nO calculo automatico precisa do prazo de estoque e prazo de entrega para funcionar corretamente.')
      return
    }

    // Validacao: Prazo de estoque obrigatorio
    if (!politica.prazo_estoque) {
      showToast('warning', 'Politica incompleta',
        'A politica de compra nao possui o prazo de estoque configurado.\n\nEsse valor e essencial para calcular a quantidade ideal de produtos.')
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

      // Verificar se retornou sugestoes
      if (!data.sugestoes || data.sugestoes.length === 0) {
        setError('Nenhuma sugestao de compra para este fornecedor. Verifique se ha produtos com vendas recentes.')
        setCalculando(false)
        return
      }

      // Mapear resposta da API para SugestaoItem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sugestoesCalculadas: SugestaoItem[] = data.sugestoes.map((item: any) => ({
        produto_id: item.produto_id,
        id_produto_bling: item.id_produto_bling,
        codigo: item.codigo || '-',
        nome: item.nome,
        estoque_atual: item.estoque_atual || 0,
        media_vendas_dia: item.media_venda_dia || 0,
        sugestao_quantidade: item.quantidade_sugerida,
        quantidade_ajustada: item.quantidade_sugerida,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        itens_por_caixa: item.itens_por_caixa || 1,
        caixas: Math.ceil(item.quantidade_sugerida / (item.itens_por_caixa || 1))
      }))

      // Ordenar por valor total decrescente
      sugestoesCalculadas.sort((a, b) => b.valor_total - a.valor_total)
      setSugestoes(sugestoesCalculadas)
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

    setSaving(true)
    setError(null)

    try {
      const dataAtual = new Date().toISOString().split('T')[0]

      // Calcular data prevista baseada na politica
      const dataPrevista = politica?.prazo_entrega
        ? new Date(Date.now() + politica.prazo_entrega * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : undefined

      // Montar payload para API
      const itensPayload = sugestoes.map(item => ({
        descricao: item.nome,
        unidade: 'UN',
        valor: item.valor_unitario,
        quantidade: item.quantidade_ajustada,
        aliquotaIPI: 0,
        produto: item.id_produto_bling ? {
          id: item.id_produto_bling,
          codigo: item.codigo
        } : undefined
      }))

      const payload = {
        fornecedor_id: fornecedor.id,
        fornecedor_id_bling: fornecedor.id_bling,
        data: dataAtual,
        dataPrevista: dataPrevista,
        totalProdutos: valorTotal,
        total: valorTotal,
        desconto: politica?.desconto || 0,
        observacoesInternas: 'Pedido gerado automaticamente',
        itens: itensPayload
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

      // Aguardar um pouco para o usuario ver a mensagem antes de redirecionar
      setTimeout(() => {
        router.push(`/compras/pedidos/${result.id}/editar`)
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <SpinnerIcon />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Toast de notificacao */}
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Gerar Pedido Automatico"
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

      {/* Card principal */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border-b border-[#EDEDED] px-6 py-4">
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

          {/* Info da politica */}
          {politica && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Politica de compra:</strong>{' '}
                {politica.valor_minimo && `Valor minimo: ${formatCurrency(politica.valor_minimo)}`}
                {politica.desconto && ` | Desconto: ${politica.desconto}%`}
                {politica.prazo_estoque && ` | Prazo estoque: ${politica.prazo_estoque} dias`}
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Prazo de estoque (dias) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={politicaForm.prazo_estoque}
                        onChange={(e) => setPoliticaForm(prev => ({ ...prev, prazo_estoque: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="30"
                      />
                      <p className="mt-1 text-[10px] text-amber-600">Dias de estoque que deseja manter</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Prazo de entrega (dias)
                      </label>
                      <input
                        type="number"
                        min="0"
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
                        value={politicaForm.valor_minimo}
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
                        value={politicaForm.desconto}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#F9F9F9]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Codigo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Produto</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Estoque</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Media/dia</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Sugestao</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Qtd</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">Valor Unit.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">Total</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sugestoes.map((item, index) => (
                    <tr key={item.produto_id} className="border-b border-[#EFEFEF] hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-[#344054]">{item.codigo}</td>
                      <td className="px-4 py-3 text-sm text-[#344054] max-w-[200px] truncate" title={item.nome}>
                        {item.nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-[#667085]">{item.estoque_atual}</td>
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer com totais */}
            <div className="px-6 py-4 bg-[#FBFBFB] border-t border-[#EDEDED] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500">Itens</p>
                  <p className="text-lg font-semibold text-[#344054]">{sugestoes.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantidade total</p>
                  <p className="text-lg font-semibold text-[#344054]">{totalItens}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valor total</p>
                  <p className="text-lg font-semibold text-[#336FB6]">{formatCurrency(valorTotal)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={calcularSugestoes}
                  disabled={calculando}
                  className="px-4 py-2.5 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Recalcular
                </button>
                <button
                  onClick={handleCriarPedido}
                  disabled={saving || sugestoes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#009E3F] hover:bg-[#008735] rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <SpinnerIcon />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckIcon />
                      Criar Pedido
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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
    </DashboardLayout>
  )
}

export default function GerarAutomaticoPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <SpinnerIcon />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      </DashboardLayout>
    }>
      <GerarAutomaticoContent />
    </Suspense>
  )
}
