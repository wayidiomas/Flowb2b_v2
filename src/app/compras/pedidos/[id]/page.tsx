'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { FornecedorSelectModal } from '@/components/pedido-compra/FornecedorSelectModal'
import { PedidoTimeline } from '@/components/pedido/PedidoTimeline'
import { WorkflowStepper } from '@/components/pedido/WorkflowStepper'
import { StatusActionCard } from '@/components/pedido/StatusActionCard'
import { CancelamentoModal } from '@/components/pedido/CancelamentoModal'
import { ProductSearchModal } from '@/components/pedido/ProductSearchModal'
import type { CatalogoProduto } from '@/components/pedido/ProductSearchModal'
import { TipoDestinatarioModal } from '@/components/representante/TipoDestinatarioModal'
import { RepresentanteSelectModal } from '@/components/representante/RepresentanteSelectModal'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PedidoCompraDetalhes, FornecedorOption, SugestaoFornecedor, SugestaoItem, StatusInterno } from '@/types/pedido-compra'

interface ValidacaoItemResult {
  status: 'ok' | 'divergencia' | 'faltando' | 'extra'
  status_manual?: 'ok' | 'divergencia' | 'faltando' | 'extra' | 'ignorado' | null
  item_pedido?: {
    codigo: string | null
    descricao: string | null
    quantidade: number
    valor: number | null
    gtin: string | null
  }
  item_espelho?: {
    codigo: string | null
    nome: string | null
    quantidade: number | null
    preco_unitario: number | null
    total: number | null
  }
  diferencas?: string[]
  observacao_item?: string
  motivo_faltante?: 'ruptura' | 'descontinuado' | null
  previsao_retorno?: string | null
}

interface ValidacaoResult {
  resumo: {
    total_pedido: number
    total_espelho: number
    ok: number
    divergencias: number
    faltando: number
    extras: number
  }
  itens: ValidacaoItemResult[]
}

// Status config (valores do Bling para pedido de compra)
const STATUS_CONFIG: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em Aberto' },
  1: { bg: 'bg-green-100', text: 'text-green-700', label: 'Atendido' },
  2: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Em Andamento' },
}

// Mapeamento de frete
const FRETE_LABELS: Record<string, string> = {
  'CIF': 'CIF - Fornecedor entrega',
  'FOB': 'FOB - Comprador paga frete',
  'TERCEIROS': 'Terceiros',
  'PROPRIO_REMETENTE': 'Proprio do remetente',
  'PROPRIO_DESTINATARIO': 'Proprio do destinatario',
  'SEM_FRETE': 'Sem frete',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR')
}

export default function VisualizarPedidoPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const pedidoId = params.id as string
  const avisoEstorno = searchParams.get('aviso') === 'estorno'
  const { user } = useAuth()
  const printRef = useRef<HTMLDivElement>(null)

  const [pedido, setPedido] = useState<PedidoCompraDetalhes | null>(null)
  const [loading, setLoading] = useState(true)
  const [lancandoConta, setLancandoConta] = useState(false)
  const [contaLancada, setContaLancada] = useState(false)
  const [showFornecedorModal, setShowFornecedorModal] = useState(false)
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [showTelefoneModal, setShowTelefoneModal] = useState(false)
  const [telefoneInput, setTelefoneInput] = useState('')
  const [salvandoTelefone, setSalvandoTelefone] = useState(false)

  // Status interno e sugestoes do fornecedor
  const [statusInterno, setStatusInterno] = useState<StatusInterno>('rascunho')
  const [sugestoes, setSugestoes] = useState<SugestaoFornecedor[]>([])
  const [sugestaoItens, setSugestaoItens] = useState<SugestaoItem[] | null>(null)
  const [enviandoFornecedor, setEnviandoFornecedor] = useState(false)
  const [processandoSugestao, setProcessandoSugestao] = useState(false)
  const [observacaoResposta, setObservacaoResposta] = useState('')

  // Cancelamento e finalizacao
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [recolhendo, setRecolhendo] = useState(false)

  // Envio ao fornecedor nao cadastrado
  const [showEnvioWhatsAppModal, setShowEnvioWhatsAppModal] = useState(false)
  const [fornecedorEnvio, setFornecedorEnvio] = useState<{ id: number; nome: string; telefone: string | null } | null>(null)
  const [linkPublicoEnvio, setLinkPublicoEnvio] = useState('')
  const [numeroPedidoEnvio, setNumeroPedidoEnvio] = useState('')
  const [telefoneEnvioInput, setTelefoneEnvioInput] = useState('')
  const [salvandoTelefoneEnvio, setSalvandoTelefoneEnvio] = useState(false)

  // Rejeicao com motivo
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [rejeitando, setRejeitando] = useState(false)

  // Adicionar produto ao pedido
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false)
  const [adicionandoProduto, setAdicionandoProduto] = useState(false)

  // Espelho do pedido
  const [espelhoInfo, setEspelhoInfo] = useState<{
    espelho_url: string | null
    espelho_nome: string | null
    espelho_status: string | null
    espelho_enviado_em: string | null
    prazo_entrega_fornecedor: string | null
  } | null>(null)
  const [processandoEspelho, setProcessandoEspelho] = useState(false)
  const [showEspelhoViewer, setShowEspelhoViewer] = useState(false)
  const [validandoEspelho, setValidandoEspelho] = useState(false)
  const [validacaoResult, setValidacaoResult] = useState<ValidacaoResult | null>(null)
  const [showValidacaoModal, setShowValidacaoModal] = useState(false)
  const [validacaoItens, setValidacaoItens] = useState<ValidacaoItemResult[]>([])
  const [salvandoValidacao, setSalvandoValidacao] = useState(false)
  const [validacaoObservacao, setValidacaoObservacao] = useState('')

  // Modais de escolha destinatario (fornecedor vs representante)
  const [showTipoDestinatarioModal, setShowTipoDestinatarioModal] = useState(false)
  const [showRepresentanteSelectModal, setShowRepresentanteSelectModal] = useState(false)
  const [representantes, setRepresentantes] = useState<Array<{
    id: number
    nome: string
    telefone?: string
    codigo_acesso: string
    cadastrado: boolean
    fornecedores_count: number
  }>>([])
  const [fornecedoresForRepresentante, setFornecedoresForRepresentante] = useState<Array<{ id: number; nome: string; cnpj?: string }>>([])
  const [loadingRepresentantes, setLoadingRepresentantes] = useState(false)

  // Buscar detalhes do pedido
  useEffect(() => {
    async function fetchPedido() {
      if (!user?.empresa_id || !pedidoId) return

      try {
        const { data, error } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
          p_pedido_id: parseInt(pedidoId),
          p_empresa_id: user.empresa_id
        })

        if (error) throw error
        if (data && Array.isArray(data) && data.length > 0) {
          setPedido(data[0])
        } else if (data && !Array.isArray(data)) {
          setPedido(data)
        }
      } catch (err) {
        console.error('Erro ao buscar pedido:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPedido()
  }, [pedidoId, user?.empresa_id])

  // Buscar status_interno e sugestoes
  useEffect(() => {
    async function fetchStatusEsugestoes() {
      if (!user?.empresa_id || !pedidoId) return

      try {
        const { data: pedidoData } = await supabase
          .from('pedidos_compra')
          .select('status_interno')
          .eq('id', parseInt(pedidoId))
          .eq('empresa_id', user.empresa_id)
          .eq('is_excluded', false)
          .single()

        if (pedidoData?.status_interno) {
          setStatusInterno(pedidoData.status_interno as StatusInterno)
        }

        if (pedidoData?.status_interno && pedidoData.status_interno !== 'rascunho') {
          const res = await fetch(`/api/pedidos-compra/${pedidoId}/sugestoes`)
          if (res.ok) {
            const data = await res.json()
            setSugestoes(data.sugestoes || [])
            setSugestaoItens(data.sugestaoItens || null)
          }
        }

        // Buscar info do espelho
        try {
          const espelhoRes = await fetch(`/api/pedidos-compra/${pedidoId}/espelho`)
          if (espelhoRes.ok) {
            const espelhoData = await espelhoRes.json()
            setEspelhoInfo(espelhoData)
          }
        } catch (espelhoErr) {
          console.error('Erro ao buscar espelho:', espelhoErr)
        }
      } catch (err) {
        console.error('Erro ao buscar status/sugestoes:', err)
      }
    }

    fetchStatusEsugestoes()
  }, [pedidoId, user?.empresa_id])

  // Carregar validacao salva do espelho (se existir)
  useEffect(() => {
    if (!pedidoId) return
    fetch(`/api/pedidos-compra/${pedidoId}/espelho/validacao`)
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          // Reconstruir itens no formato ValidacaoItemResult
          const itensFormatados: ValidacaoItemResult[] = (data.itens || []).map((item: Record<string, unknown>) => ({
            status: (item.status_ia as string) || 'ok',
            status_manual: (item.status_manual as string) || (item.status_ia as string) || null,
            item_pedido: item.item_pedido_descricao ? {
              codigo: item.item_pedido_codigo as string | null,
              descricao: item.item_pedido_descricao as string | null,
              quantidade: (item.item_pedido_quantidade as number) || 0,
              valor: item.item_pedido_valor as number | null,
              gtin: item.item_pedido_gtin as string | null,
            } : undefined,
            item_espelho: item.item_espelho_nome ? {
              codigo: item.item_espelho_codigo as string | null,
              nome: item.item_espelho_nome as string | null,
              quantidade: item.item_espelho_quantidade as number | null,
              preco_unitario: item.item_espelho_preco as number | null,
              total: null,
            } : undefined,
            diferencas: item.diferencas as string[] | undefined,
            observacao_item: item.observacao_item as string | undefined,
            motivo_faltante: (item.motivo_faltante as 'ruptura' | 'descontinuado') || null,
            previsao_retorno: (item.previsao_retorno as string) || null,
          }))
          setValidacaoResult({
            resumo: {
              total_pedido: data.validacao.total_ok + data.validacao.total_divergencias + data.validacao.total_faltando,
              total_espelho: data.validacao.total_ok + data.validacao.total_divergencias + data.validacao.total_extras,
              ok: data.validacao.total_ok,
              divergencias: data.validacao.total_divergencias,
              faltando: data.validacao.total_faltando,
              extras: data.validacao.total_extras,
            },
            itens: itensFormatados,
          })
          setValidacaoItens(itensFormatados)
          setValidacaoObservacao(data.validacao.observacao || '')
        }
      })
      .catch(() => {})
  }, [pedidoId])

  // Handler para aprovar/rejeitar espelho
  const handleEspelhoAction = async (action: 'aprovar' | 'rejeitar') => {
    if (!pedido) return
    setProcessandoEspelho(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/espelho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        setEspelhoInfo(data)
      } else {
        const errData = await res.json()
        alert(errData.error || 'Erro ao processar espelho')
      }
    } catch (err) {
      console.error('Erro ao processar espelho:', err)
      alert('Erro ao processar espelho')
    } finally {
      setProcessandoEspelho(false)
    }
  }

  const handleValidarEspelho = async () => {
    if (validacaoItens.length > 0) {
      if (!confirm('Ja existe uma validacao. Rodar a IA novamente vai substituir os resultados atuais. Continuar?')) return
    }
    setValidandoEspelho(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedidoId}/espelho/validar`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setValidacaoResult(data)
        setValidacaoItens(data.itens.map((item: ValidacaoItemResult) => ({
          ...item,
          status_manual: item.status,
        })))
        setValidacaoObservacao('')
        setShowValidacaoModal(true)
      } else {
        alert(data.error || 'Erro ao validar espelho')
      }
    } catch {
      alert('Erro ao validar espelho')
    } finally {
      setValidandoEspelho(false)
    }
  }

  const handleSalvarValidacao = async () => {
    setSalvandoValidacao(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedidoId}/espelho/validacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'validado',
          observacao: validacaoObservacao,
          itens: validacaoItens.map(item => ({
            status_ia: item.status,
            status_manual: item.status_manual || item.status,
            item_pedido_codigo: item.item_pedido?.codigo,
            item_pedido_descricao: item.item_pedido?.descricao,
            item_pedido_quantidade: item.item_pedido?.quantidade,
            item_pedido_valor: item.item_pedido?.valor,
            item_pedido_gtin: item.item_pedido?.gtin,
            item_espelho_codigo: item.item_espelho?.codigo,
            item_espelho_nome: item.item_espelho?.nome,
            item_espelho_quantidade: item.item_espelho?.quantidade,
            item_espelho_preco: item.item_espelho?.preco_unitario,
            diferencas: item.diferencas,
            observacao_item: item.observacao_item,
            motivo_faltante: item.motivo_faltante || null,
            previsao_retorno: item.previsao_retorno || null,
          })),
        }),
      })
      if (res.ok) {
        setShowValidacaoModal(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao salvar')
      }
    } catch {
      alert('Erro ao salvar validacao')
    } finally {
      setSalvandoValidacao(false)
    }
  }

  // Handlers
  // Abre modal de escolha: fornecedor direto ou representante
  const handleEnviarClick = () => {
    setShowTipoDestinatarioModal(true)
  }

  // Fecha TipoDestinatarioModal e vai para fluxo de fornecedor direto
  const handleEnviarFornecedorDireto = async () => {
    setShowTipoDestinatarioModal(false)
    await handleEnviarFornecedorInterno()
  }

  // Carrega representantes e abre modal de selecao
  const handleSelecionarRepresentante = async () => {
    setShowTipoDestinatarioModal(false)
    setLoadingRepresentantes(true)
    setShowRepresentanteSelectModal(true)

    try {
      const res = await fetch('/api/representantes')
      if (res.ok) {
        const data = await res.json()
        setRepresentantes(data.representantes || [])
      }
      // Buscar fornecedores da empresa para vincular ao novo representante
      if (user?.empresa_id) {
        const { data: fornecedoresData } = await supabase
          .from('fornecedores')
          .select('id, nome')
          .eq('empresa_id', user.empresa_id)
          .order('nome')
        setFornecedoresForRepresentante(fornecedoresData || [])
      }
    } catch (err) {
      console.error('Erro ao carregar representantes:', err)
    } finally {
      setLoadingRepresentantes(false)
    }
  }

  // Seleciona representante existente e envia pedido
  const handleSelectRepresentante = async (rep: {
    id: number
    nome: string
    telefone?: string
    codigo_acesso: string
    cadastrado: boolean
    fornecedores_count: number
  }) => {
    if (!pedido) return
    setEnviandoFornecedor(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/enviar-fornecedor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ representante_id: rep.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(`Erro: ${data.error || 'Falha ao enviar'}`)
        return
      }

      setStatusInterno('enviado_fornecedor')
      setShowRepresentanteSelectModal(false)

      // Se representante nao cadastrado na Flow, enviar link de convite via WhatsApp
      if (data.representanteCadastrado === false && data.representante) {
        const repData = data.representante
        if (repData.telefone) {
          const telefoneFormatado = repData.telefone.replace(/\D/g, '')
          const telefoneWhatsApp = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`
          const linkPublico = data.linkPublico || `${window.location.origin}/publico/pedido/${pedido.id}`
          const conviteUrl = `${window.location.origin}/representante/convite/${repData.codigo_acesso}`
          const mensagem = encodeURIComponent(
            `Ola ${repData.nome}!\n\n` +
            `Voce recebeu o pedido de compra #${data.numeroPedido || pedido.numero} para analise.\n\n` +
            `🔗 Visualizar pedido:\n${linkPublico}\n\n` +
            `📋 Para acessar o portal e gerenciar pedidos, crie sua conta:\n${conviteUrl}\n\n` +
            `Atenciosamente.`
          )
          window.open(`https://wa.me/${telefoneWhatsApp}?text=${mensagem}`, '_blank')
        }
      }
    } catch (err) {
      console.error('Erro ao enviar ao fornecedor via representante:', err)
      alert('Erro ao enviar pedido')
    } finally {
      setEnviandoFornecedor(false)
    }
  }

  // Cria novo representante e envia pedido
  const handleCreateNovoRepresentante = async (dados: {
    nome: string
    telefone: string
    fornecedor_ids: number[]
  }): Promise<void> => {
    if (!pedido) return
    setEnviandoFornecedor(true)
    try {
      // Criar representante
      const resCreate = await fetch('/api/representantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dados.nome,
          telefone: dados.telefone,
          fornecedor_ids: dados.fornecedor_ids,
        }),
      })

      if (!resCreate.ok) {
        const errData = await resCreate.json()
        alert(`Erro ao criar representante: ${errData.error || 'Falha'}`)
        return
      }

      const { representante } = await resCreate.json()

      // Enviar pedido com representante_id
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/enviar-fornecedor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ representante_id: representante.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(`Erro: ${data.error || 'Falha ao enviar'}`)
        return
      }

      setStatusInterno('enviado_fornecedor')
      setShowRepresentanteSelectModal(false)

      // Se tem telefone do representante, enviar WhatsApp com link de convite
      if (dados.telefone) {
        const telefoneFormatado = dados.telefone.replace(/\D/g, '')
        const telefoneWhatsApp = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`
        const linkPublico = data.linkPublico || `${window.location.origin}/publico/pedido/${pedido.id}`
        const codigoAcesso = representante.codigo_acesso || ''
        const conviteUrl = `${window.location.origin}/representante/convite/${codigoAcesso}`
        const mensagem = encodeURIComponent(
          `Ola ${dados.nome}!\n\n` +
          `Voce recebeu o pedido de compra #${pedido.numero} para analise.\n\n` +
          `🔗 Visualizar pedido:\n${linkPublico}\n\n` +
          `📋 Para acessar o portal e gerenciar pedidos, crie sua conta:\n${conviteUrl}\n\n` +
          `Atenciosamente.`
        )
        window.open(`https://wa.me/${telefoneWhatsApp}?text=${mensagem}`, '_blank')
      }
    } catch (err) {
      console.error('Erro ao criar representante e enviar:', err)
      alert('Erro ao processar')
    } finally {
      setEnviandoFornecedor(false)
    }
  }

  // Funcao interna de envio direto ao fornecedor (sem representante)
  const handleEnviarFornecedorInterno = async () => {
    if (!pedido) return
    setEnviandoFornecedor(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/enviar-fornecedor`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        alert(`Erro: ${data.error || 'Falha ao enviar'}`)
        return
      }

      // Caso 1: Fornecedor cadastrado na Flow - avanca status normalmente
      if (data.fornecedorCadastrado) {
        setStatusInterno('enviado_fornecedor')
        return
      }

      // Caso 2 e 3: Fornecedor NAO cadastrado - abrir modal/WhatsApp
      // Status ja foi atualizado no backend, atualizar estado local
      setStatusInterno('enviado_fornecedor')
      setFornecedorEnvio(data.fornecedor)
      setLinkPublicoEnvio(data.linkPublico)
      setNumeroPedidoEnvio(data.numeroPedido)

      if (data.fornecedor.telefone) {
        // Caso 2: Tem telefone - abre WhatsApp direto
        abrirWhatsAppFornecedor(data.fornecedor.telefone, data.linkPublico, data.numeroPedido, data.fornecedor.nome)
      } else {
        // Caso 3: Sem telefone - abre modal para cadastrar
        setShowEnvioWhatsAppModal(true)
      }
    } catch (err) {
      console.error('Erro ao enviar ao fornecedor:', err)
      alert('Erro ao enviar pedido ao fornecedor')
    } finally {
      setEnviandoFornecedor(false)
    }
  }

  // Funcao para abrir WhatsApp com mensagem formatada
  const abrirWhatsAppFornecedor = (telefone: string, linkPublico: string, numeroPedido: string, fornecedorNome: string) => {
    const telefoneFormatado = telefone.replace(/\D/g, '')
    const telefoneWhatsApp = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`

    const mensagem = encodeURIComponent(
      `Ola ${fornecedorNome}!\n\n` +
      `Tenho um novo pedido de compra #${numeroPedido} para voce.\n\n` +
      `Acesse o link abaixo para visualizar e enviar sua proposta comercial:\n` +
      `${linkPublico}\n\n` +
      `Atenciosamente.`
    )

    window.open(`https://wa.me/${telefoneWhatsApp}?text=${mensagem}`, '_blank')
  }

  // Handler para salvar telefone e enviar WhatsApp
  const handleSalvarTelefoneEnvio = async () => {
    if (!fornecedorEnvio || !telefoneEnvioInput.trim()) return

    setSalvandoTelefoneEnvio(true)
    try {
      const res = await fetch(`/api/fornecedores/${fornecedorEnvio.id}/telefone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneEnvioInput.trim() }),
      })

      if (res.ok) {
        // Abre WhatsApp com o telefone cadastrado
        abrirWhatsAppFornecedor(telefoneEnvioInput.trim(), linkPublicoEnvio, numeroPedidoEnvio, fornecedorEnvio.nome)
        setShowEnvioWhatsAppModal(false)
        setTelefoneEnvioInput('')
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Falha ao salvar telefone'}`)
      }
    } catch (err) {
      console.error('Erro ao salvar telefone:', err)
      alert('Erro ao salvar telefone')
    } finally {
      setSalvandoTelefoneEnvio(false)
    }
  }

  const handleProcessarSugestao = async (action: 'aceitar' | 'rejeitar' | 'manter_original') => {
    if (!pedido) return
    const pendente = sugestoes.find(s => s.status === 'pendente')
    if (!pendente) return

    if (action === 'rejeitar' && !observacaoResposta.trim()) {
      if (!confirm('Deseja rejeitar sem informar um motivo?')) return
    }

    setProcessandoSugestao(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/sugestoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sugestao_id: pendente.id,
          observacao: observacaoResposta.trim() || undefined,
        }),
      })

      if (res.ok) {
        // manter_original tambem vai para 'aceito' pois o pedido continua
        const novoStatus = action === 'aceitar' || action === 'manter_original' ? 'aceito' : 'rejeitado'
        setStatusInterno(novoStatus)
        setSugestoes(prev => prev.map(s =>
          s.id === pendente.id ? { ...s, status: action === 'aceitar' ? 'aceita' : 'rejeitada' } : s
        ))
        setObservacaoResposta('')
        if (action === 'aceitar' || action === 'manter_original') window.location.reload()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Falha ao processar'}`)
      }
    } catch (err) {
      console.error('Erro ao processar sugestao:', err)
      alert('Erro ao processar sugestao')
    } finally {
      setProcessandoSugestao(false)
    }
  }

  const handleAdicionarProduto = async (produto: CatalogoProduto) => {
    if (!pedido) return
    setAdicionandoProduto(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto_nome: produto.nome,
          produto_gtin: produto.gtin,
          codigo_fornecedor: produto.codigo_fornecedor,
          quantidade: 1,
          valor: produto.preco || 0,
          unidade: produto.unidade || 'UN',
        }),
      })
      if (res.ok) {
        window.location.reload()
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao adicionar produto')
      }
    } finally {
      setAdicionandoProduto(false)
      setModalAdicionarAberto(false)
    }
  }

  const handleRemoverItem = async (itemId: number, descricao: string) => {
    if (!pedido) return
    if (!confirm(`Remover "${descricao}" do pedido?`)) return
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/itens?item_id=${itemId}`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
      else { const d = await res.json(); alert(d.error || 'Erro ao remover') }
    } catch { alert('Erro ao remover item') }
  }

  const handleEditarQuantidade = async (itemId: number, novaQtd: number) => {
    if (!pedido || novaQtd < 1) return
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/itens`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, quantidade: novaQtd }),
      })
      if (res.ok) window.location.reload()
      else { const d = await res.json(); alert(d.error || 'Erro ao atualizar') }
    } catch { alert('Erro ao atualizar quantidade') }
  }

  const handleCancelar = async (motivo: string) => {
    if (!pedido) return
    setCancelando(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      if (res.ok) {
        setStatusInterno('cancelado')
        setPedido(prev => prev ? { ...prev, situacao: 2 } : null)
        setShowCancelamentoModal(false)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Falha ao cancelar')
      }
    } finally {
      setCancelando(false)
    }
  }

  const handleRecolher = async () => {
    if (!pedido) return
    setRecolhendo(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/recolher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Recolhido pelo lojista' }),
      })
      if (res.ok) {
        setStatusInterno('rascunho')
        // Refresh the page data to show updated state
        router.refresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Falha ao recolher envio')
      }
    } finally {
      setRecolhendo(false)
    }
  }

  const handleFinalizar = async () => {
    if (!pedido) return
    if (!confirm('Deseja finalizar este pedido? Esta acao nao pode ser desfeita.')) return

    setFinalizando(true)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/finalizar`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatusInterno('finalizado')
        if (data.bling_sync) {
          setPedido(prev => prev ? { ...prev, situacao: 1 } : null)
        }
      } else {
        alert(`Erro: ${data.error || 'Falha ao finalizar'}`)
      }
    } catch (err) {
      console.error('Erro ao finalizar:', err)
      alert('Erro ao finalizar pedido')
    } finally {
      setFinalizando(false)
    }
  }

  const handleLancarConta = async () => {
    if (!pedido) return
    setLancandoConta(true)
    try {
      const response = await fetch(`/api/pedidos-compra/${pedido.id}/lancar-conta`, { method: 'POST' })
      if (response.ok) {
        setContaLancada(true)
      } else {
        const error = await response.json()
        alert(`Erro ao lancar conta: ${error.message || 'Erro desconhecido'}`)
      }
    } catch (err) {
      console.error('Erro ao lancar conta:', err)
      alert('Erro ao lancar conta')
    } finally {
      setLancandoConta(false)
    }
  }

  const handleExportPDF = () => window.print()

  const handleExportCSV = () => {
    if (!pedido) return
    const headers = ['Codigo', 'Descricao', 'Unidade', 'Quantidade', 'Valor Unitario', 'Valor Total']
    const rows = pedido.itens.map(item => [
      item.codigo_produto || '',
      item.descricao,
      item.unidade,
      item.quantidade.toString(),
      item.valor.toFixed(2),
      (item.quantidade * item.valor).toFixed(2)
    ])
    const csvContent = [
      `Pedido #${pedido.numero} - ${pedido.fornecedor_nome}`,
      `Data: ${formatDate(pedido.data)}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';')),
      '',
      `Total;;;;;${pedido.total.toFixed(2)}`
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedido_${pedido.numero}.csv`
    link.click()
  }

  const handleShareWhatsApp = async () => {
    if (!pedido || !user?.empresa_id) return
    setShowActionsMenu(false)
    try {
      const { data: fornecedor } = await supabase
        .from('fornecedores')
        .select('telefone, celular')
        .eq('id', pedido.fornecedor_id)
        .eq('empresa_id', user.empresa_id)
        .single()

      const telefone = fornecedor?.celular || fornecedor?.telefone
      if (!telefone) {
        setTelefoneInput('')
        setShowTelefoneModal(true)
        return
      }
      enviarWhatsAppComLink(telefone)
    } catch (err) {
      console.error('Erro ao compartilhar:', err)
    }
  }

  const enviarWhatsAppComLink = (telefone: string) => {
    if (!pedido) return
    const telefoneLimpo = telefone.replace(/\D/g, '')
    const telefoneFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`
    const urlPublica = `${window.location.origin}/publico/pedido/${pedido.id}`
    const texto = `*Pedido de Compra #${pedido.numero}*\n\nOla! Segue o pedido de compra.\n\n*Total: ${formatCurrency(pedido.total)}*\n\n${urlPublica}`
    window.open(`https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const handleSalvarTelefone = async () => {
    if (!pedido || !user?.empresa_id || !telefoneInput.trim()) return
    setSalvandoTelefone(true)
    try {
      await supabase.from('fornecedores').update({ celular: telefoneInput.trim() }).eq('id', pedido.fornecedor_id).eq('empresa_id', user.empresa_id)
      setShowTelefoneModal(false)
      enviarWhatsAppComLink(telefoneInput.trim())
    } catch (err) {
      console.error('Erro ao salvar telefone:', err)
    } finally {
      setSalvandoTelefone(false)
    }
  }

  const handleCopyLink = async () => {
    if (!pedido) return
    const urlPublica = `${window.location.origin}/publico/pedido/${pedido.id}`
    try {
      await navigator.clipboard.writeText(urlPublica)
      alert('Link copiado!')
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = urlPublica
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Link copiado!')
    }
    setShowActionsMenu(false)
  }

  const loadFornecedores = async () => {
    if (!user?.empresa_id) return
    setLoadingFornecedores(true)
    try {
      const { data } = await supabase.from('fornecedores').select('id, nome, cnpj').eq('empresa_id', user.empresa_id).order('nome')
      setFornecedores(data || [])
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  const handleNovoPedido = () => {
    loadFornecedores()
    setShowFornecedorModal(true)
  }

  const handleSelectFornecedor = (fornecedor: FornecedorOption) => {
    setShowFornecedorModal(false)
    router.push(`/compras/pedidos/gerar-automatico?fornecedor_id=${fornecedor.id}`)
  }

  const handleAlterarStatus = async (novaSituacao: number) => {
    if (!pedido) return
    setAlterandoStatus(true)
    setShowStatusMenu(false)
    try {
      const response = await fetch(`/api/pedidos-compra/${pedido.id}/alterar-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situacao: novaSituacao }),
      })
      const result = await response.json()
      if (response.ok && result.success) {
        setPedido(prev => prev ? { ...prev, situacao: novaSituacao as 0 | 1 | 2 | 3 } : null)
      } else {
        alert(`Erro: ${result.error || 'Falha ao alterar status'}`)
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err)
    } finally {
      setAlterandoStatus(false)
    }
  }

  if (loading) {
    return (
      <RequirePermission permission="pedidos">
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  if (!pedido) {
    return (
      <RequirePermission permission="pedidos">
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Pedido nao encontrado</p>
          <Link href="/compras/pedidos" className="text-primary-600 hover:underline mt-2 inline-block">Voltar para lista</Link>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  const statusConfig = STATUS_CONFIG[pedido.situacao] || STATUS_CONFIG[0]

  return (
    <RequirePermission permission="pedidos">
    <DashboardLayout>
      {/* Aviso de estorno */}
      {avisoEstorno && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Contas a pagar</p>
            <p className="text-sm text-amber-700">Nao foi possivel estornar as contas a pagar automaticamente.</p>
          </div>
        </div>
      )}

      {/* Header simplificado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido <span className="text-amber-500">#{pedido.numero}</span>
            </h1>
            <p className="text-gray-500">{pedido.fornecedor_nome}</p>
          </div>
          {/* Status Bling */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={alterandoStatus}
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1`}
            >
              {alterandoStatus ? 'Alterando...' : statusConfig.label}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showStatusMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-b">Alterar Status</div>
                {[0, 3, 1, 2].filter(s => s !== pedido.situacao).map(s => (
                  <button key={s} onClick={() => handleAlterarStatus(s)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].bg.replace('bg-', 'bg-').replace('-100', '-500')}`}></span>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Menu de acoes unificado */}
        <div className="relative">
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Acoes
          </button>
          {showActionsMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <Link href={`/compras/pedidos/${pedido.id}/editar`} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Editar Pedido
              </Link>
              <button onClick={handleNovoPedido} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Novo Pedido
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={handleExportPDF} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
                </svg>
                Imprimir / PDF
              </button>
              <button onClick={handleExportCSV} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={handleShareWhatsApp} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar WhatsApp
              </button>
              <button onClick={handleCopyLink} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Copiar Link Publico
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={handleLancarConta}
                disabled={lancandoConta || contaLancada}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${contaLancada ? 'text-green-600 bg-green-50' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {contaLancada ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Conta Lancada
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                    {lancandoConta ? 'Lancando...' : 'Lancar Conta'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Stepper */}
      <WorkflowStepper statusInterno={statusInterno} className="mb-6 print:hidden" />

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 2xl:gap-8" id="print-area" ref={printRef}>
        {/* Coluna Principal (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Acao Contextual */}
          <div className="print:hidden">
<StatusActionCard
              statusInterno={statusInterno}
              sugestoes={sugestoes}
              sugestaoItens={sugestaoItens}
              itens={pedido.itens.filter(i => i.id !== undefined).map(i => ({ id: i.id as number, descricao: i.descricao, quantidade: i.quantidade, valor: i.valor }))}
              onEnviarFornecedor={handleEnviarClick}
              onAceitarSugestao={() => handleProcessarSugestao('aceitar')}
              onRejeitarSugestao={() => setShowRejectModal(true)}
              onManterOriginal={() => handleProcessarSugestao('manter_original')}
              onCancelar={() => setShowCancelamentoModal(true)}
              onRecolher={handleRecolher}
              recolhendo={recolhendo}
              onFinalizar={handleFinalizar}
              enviandoFornecedor={enviandoFornecedor}
              processandoSugestao={processandoSugestao}
              finalizando={finalizando}
              observacaoResposta={observacaoResposta}
              setObservacaoResposta={setObservacaoResposta}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              situacaoBling={pedido.situacao}
            />
          </div>

          {/* Espelho do Pedido */}
          {espelhoInfo?.espelho_url && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Espelho do Pedido</h3>
                    <p className="text-sm text-gray-500">
                      Enviado pelo fornecedor em {espelhoInfo.espelho_enviado_em ? new Date(espelhoInfo.espelho_enviado_em).toLocaleString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Arquivo para visualizacao */}
                <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <svg className="w-8 h-8 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{espelhoInfo.espelho_nome}</p>
                    {espelhoInfo.prazo_entrega_fornecedor && (
                      <p className="text-sm text-gray-500">
                        Prazo de entrega: {formatDate(espelhoInfo.prazo_entrega_fornecedor)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowEspelhoViewer(true)}
                      className="px-3 py-1.5 bg-white border border-primary-300 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                    >
                      Visualizar
                    </button>
                    <a
                      href={`/api/pedidos-compra/${pedidoId}/espelho/download`}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Download
                    </a>
                    <button
                      onClick={handleValidarEspelho}
                      disabled={validandoEspelho}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      {validandoEspelho ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Validando com IA...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Validar Espelho
                        </>
                      )}
                    </button>
                    {validacaoItens.length > 0 && !showValidacaoModal && (
                      <button
                        onClick={() => setShowValidacaoModal(true)}
                        className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver validacao
                      </button>
                    )}
                  </div>
                </div>

                {/* Botoes de aprovacao (so se pendente) */}
                {espelhoInfo.espelho_status === 'pendente' && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleEspelhoAction('aprovar')}
                      disabled={processandoEspelho}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-green-200/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {processandoEspelho ? 'Processando...' : 'Aprovar Espelho'}
                    </button>
                    <button
                      onClick={() => handleEspelhoAction('rejeitar')}
                      disabled={processandoEspelho}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Rejeitar
                    </button>
                  </div>
                )}

                {espelhoInfo.espelho_status === 'aprovado' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Espelho aprovado
                  </div>
                )}

                {espelhoInfo.espelho_status === 'rejeitado' && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Espelho rejeitado -- aguardando novo envio do fornecedor
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dados do Pedido */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
              Dados do Pedido
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 2xl:gap-6">
              <div>
                <p className="text-xs text-gray-500">Fornecedor</p>
                <p className="text-sm font-medium text-gray-900">{pedido.fornecedor_nome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Data</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(pedido.data)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Previsao Entrega</p>
                <p className="text-sm font-medium text-gray-900">{pedido.data_prevista ? formatDate(pedido.data_prevista) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Frete</p>
                <p className="text-sm font-medium text-gray-900">{FRETE_LABELS[pedido.frete_por_conta || 'CIF'] || pedido.frete_por_conta || 'CIF'}</p>
              </div>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
                Itens do Pedido ({pedido.itens.length})
              </h3>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cod. Forn.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Und</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    {!['cancelado', 'finalizado'].includes(statusInterno) && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acoes</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedido.itens.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{item.codigo_produto || '-'}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{item.codigo_fornecedor || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.unidade}</td>
                      {!['cancelado', 'finalizado'].includes(statusInterno) ? (
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={1}
                            defaultValue={item.quantidade}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value)
                              if (val > 0 && val !== item.quantidade) handleEditarQuantidade(item.id!, val)
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            className="w-16 text-right text-sm font-medium text-gray-900 border border-gray-200 rounded px-2 py-1 focus:border-[#336FB6] focus:outline-none focus:ring-1 focus:ring-[#336FB6]/20"
                          />
                        </td>
                      ) : (
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{item.quantidade}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.valor)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.quantidade * item.valor)}</td>
                      {!['cancelado', 'finalizado'].includes(statusInterno) && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoverItem(item.id!, item.descricao)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-200">
              {pedido.itens.map((item, index) => (
                <div key={item.id || index} className="px-4 py-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.descricao}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.codigo_produto && `SKU: ${item.codigo_produto}`}
                        {item.codigo_fornecedor && ` | Cod: ${item.codigo_fornecedor}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.quantidade * item.valor)}</p>
                      {!['cancelado', 'finalizado'].includes(statusInterno) && (
                        <button
                          onClick={() => handleRemoverItem(item.id!, item.descricao)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    {!['cancelado', 'finalizado'].includes(statusInterno) ? (
                      <span className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          defaultValue={item.quantidade}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value)
                            if (val > 0 && val !== item.quantidade) handleEditarQuantidade(item.id!, val)
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          className="w-14 text-right text-xs font-medium text-gray-900 border border-gray-200 rounded px-1.5 py-0.5 focus:border-[#336FB6] focus:outline-none focus:ring-1 focus:ring-[#336FB6]/20"
                        />
                        <span>{item.unidade}</span>
                      </span>
                    ) : (
                      <span>{item.quantidade} {item.unidade}</span>
                    )}
                    <span>x {formatCurrency(item.valor)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botao Adicionar Produto */}
          {pedido && !['cancelado', 'finalizado'].includes(statusInterno) && (
            <div className="-mt-3 mb-2 flex justify-end px-6 pb-4">
              <button
                onClick={() => setModalAdicionarAberto(true)}
                disabled={adicionandoProduto}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-secondary-50 to-secondary-100/80 hover:from-secondary-100 hover:to-secondary-200/80 text-secondary-700 font-semibold rounded-xl border border-secondary-300/60 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Adicionar Produto
              </button>
            </div>
          )}

          {/* Parcelas */}
          {pedido.parcelas && pedido.parcelas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
                  Parcelas ({pedido.parcelas.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {pedido.parcelas.map((parcela, index) => (
                  <div key={parcela.id || index} className="px-6 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Parcela {index + 1}</p>
                      <p className="text-xs text-gray-500">Vencimento: {formatDate(parcela.data_vencimento)}</p>
                      {parcela.forma_pagamento_nome && <p className="text-xs text-gray-500">{parcela.forma_pagamento_nome}</p>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(parcela.valor)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observacoes */}
          {(pedido.observacoes || pedido.observacoes_internas) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
                Observacoes
              </h3>
              <div className="space-y-3">
                {pedido.observacoes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Para o fornecedor:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.observacoes}</p>
                  </div>
                )}
                {pedido.observacoes_internas && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Internas:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.observacoes_internas}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 border-t-4 border-t-amber-400">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({pedido.itens.length} itens)</span>
                <span className="font-medium">{formatCurrency(pedido.total_produtos)}</span>
              </div>
              {pedido.frete && pedido.frete > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frete</span>
                  <span className="font-medium">{formatCurrency(pedido.frete)}</span>
                </div>
              )}
              {pedido.desconto && pedido.desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto</span>
                  <span className="font-medium text-green-600">-{formatCurrency(pedido.desconto)}</span>
                </div>
              )}
              {pedido.total_icms && pedido.total_icms > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ICMS</span>
                  <span className="font-medium">{formatCurrency(pedido.total_icms)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-primary-600">{formatCurrency(pedido.total)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="print:hidden">
            <PedidoTimeline pedidoCompraId={parseInt(pedidoId)} />
          </div>

          {/* Historico de sugestoes */}
          {sugestoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
                  Sugestoes Anteriores
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {sugestoes.map((s) => (
                  <div key={s.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{s.users_fornecedor?.nome || 'Fornecedor'}</p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        s.status === 'aceita' ? 'bg-green-100 text-green-700' :
                        s.status === 'rejeitada' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {s.status === 'aceita' ? 'Aceita' : s.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                      </span>
                    </div>
                    {s.observacao_fornecedor && <p className="text-xs text-gray-500 mt-1 italic">&quot;{s.observacao_fornecedor}&quot;</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Selecionar Fornecedor */}
      <FornecedorSelectModal
        isOpen={showFornecedorModal}
        onClose={() => setShowFornecedorModal(false)}
        onSelect={handleSelectFornecedor}
        title="Gerar Novo Pedido"
        subtitle="Selecione o fornecedor para gerar um novo pedido automaticamente."
        fornecedores={fornecedores}
        loading={loadingFornecedores}
      />

      {/* Modal Cadastrar Telefone */}
      {showTelefoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Cadastrar Telefone</h3>
              <p className="text-sm text-gray-500 mt-1">O fornecedor nao possui telefone cadastrado.</p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefone/WhatsApp</label>
              <input
                type="tel"
                value={telefoneInput}
                onChange={(e) => setTelefoneInput(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowTelefoneModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={handleSalvarTelefone}
                disabled={salvandoTelefone || !telefoneInput.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {salvandoTelefone ? 'Salvando...' : 'Salvar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar via WhatsApp (fornecedor sem telefone) */}
      {showEnvioWhatsAppModal && fornecedorEnvio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Enviar via WhatsApp</h3>
              <p className="text-sm text-gray-500 mt-1">
                O fornecedor <strong>{fornecedorEnvio.nome}</strong> nao esta cadastrado na Flow e nao possui telefone cadastrado.
              </p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp do Fornecedor</label>
              <input
                type="tel"
                value={telefoneEnvioInput}
                onChange={(e) => setTelefoneEnvioInput(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                O numero sera salvo no cadastro do fornecedor para futuros envios.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEnvioWhatsAppModal(false)
                  setTelefoneEnvioInput('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarTelefoneEnvio}
                disabled={salvandoTelefoneEnvio || !telefoneEnvioInput.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {salvandoTelefoneEnvio ? 'Salvando...' : 'Salvar e Abrir WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejeicao com Motivo */}
      <Modal isOpen={showRejectModal} onClose={() => !rejeitando && setShowRejectModal(false)} size="lg">
        <ModalHeader onClose={() => !rejeitando && setShowRejectModal(false)}>
          <ModalTitle>Devolver ao Fornecedor</ModalTitle>
          <ModalDescription>O pedido sera devolvido para o fornecedor ajustar. Informe o motivo.</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da devolucao *</label>
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={3}
              placeholder="Ex: Preco do colar acima do combinado, quantidade do shampoo incorreta..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={rejeitando}>Cancelar</Button>
          <Button
            variant="primary"
            loading={rejeitando}
            onClick={async () => {
              if (!motivoRejeicao.trim()) return
              const pendente = sugestoes.find(s => s.status === 'pendente')
              if (!pendente || !pedido) return
              setRejeitando(true)
              try {
                const res = await fetch(`/api/pedidos-compra/${pedido.id}/sugestoes`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'rejeitar',
                    sugestao_id: pendente.id,
                    motivo_rejeicao: motivoRejeicao.trim(),
                  }),
                })
                if (res.ok) {
                  setShowRejectModal(false)
                  setMotivoRejeicao('')
                  window.location.reload()
                } else {
                  const errData = await res.json()
                  alert(errData.error || 'Erro ao devolver pedido')
                }
              } catch {
                alert('Erro ao devolver pedido ao fornecedor')
              } finally {
                setRejeitando(false)
              }
            }}
            disabled={!motivoRejeicao.trim()}
          >
            Devolver ao Fornecedor
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Cancelamento */}
      <CancelamentoModal
        isOpen={showCancelamentoModal}
        onClose={() => setShowCancelamentoModal(false)}
        onConfirm={handleCancelar}
        loading={cancelando}
      />

      {/* Modal de Escolha: Fornecedor Direto ou Representante */}
      <TipoDestinatarioModal
        isOpen={showTipoDestinatarioModal}
        onClose={() => setShowTipoDestinatarioModal(false)}
        onSelectFornecedor={handleEnviarFornecedorDireto}
        onSelectRepresentante={handleSelecionarRepresentante}
        fornecedorNome={pedido?.fornecedor_nome}
      />

      {/* Modal de Selecao de Representante */}
      <RepresentanteSelectModal
        isOpen={showRepresentanteSelectModal}
        onClose={() => setShowRepresentanteSelectModal(false)}
        onSelectExistente={handleSelectRepresentante}
        onCreateNovo={handleCreateNovoRepresentante}
        representantes={representantes}
        fornecedores={fornecedoresForRepresentante}
        fornecedorAtual={pedido ? { id: pedido.fornecedor_id, nome: pedido.fornecedor_nome } : undefined}
        loading={loadingRepresentantes}
      />

      {/* Modal Adicionar Produto do Catalogo do Fornecedor */}
      <ProductSearchModal
        isOpen={modalAdicionarAberto}
        onClose={() => setModalAdicionarAberto(false)}
        onSelect={handleAdicionarProduto}
        pedidoId={pedido?.id || ''}
        mode="adicionar"
        apiEndpoint={pedido ? `/api/pedidos-compra/${pedido.id}/catalogo-fornecedor` : undefined}
      />

      {/* Estilos de impressao */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print\\:hidden { display: none !important; }
          #print-area table { width: 100% !important; border-collapse: collapse !important; }
          #print-area th, #print-area td { border: 1px solid #ddd !important; padding: 8px !important; }
        }
      `}</style>

      {/* Espelho Viewer Modal */}
      {showEspelhoViewer && espelhoInfo?.espelho_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEspelhoViewer(false)}
          />
          <div className="relative w-full max-w-4xl h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Espelho do Pedido</h3>
                <p className="text-sm text-gray-500">{espelhoInfo.espelho_nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/pedidos-compra/${pedidoId}/espelho/download`}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={() => setShowEspelhoViewer(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Content - iframe for PDF, img for images */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {espelhoInfo.espelho_nome?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <div className="flex items-center justify-center min-h-full p-4">
                  <img
                    src={espelhoInfo.espelho_url}
                    alt="Espelho do pedido"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <iframe
                  src={espelhoInfo.espelho_url}
                  className="w-full h-full border-0"
                  title="Espelho do pedido"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validacao Espelho Modal - Editavel */}
      {showValidacaoModal && validacaoResult && (() => {
        const manualResumo = {
          ok: validacaoItens.filter(i => (i.status_manual || i.status) === 'ok').length,
          divergencias: validacaoItens.filter(i => (i.status_manual || i.status) === 'divergencia').length,
          faltando: validacaoItens.filter(i => (i.status_manual || i.status) === 'faltando').length,
          extras: validacaoItens.filter(i => (i.status_manual || i.status) === 'extra').length,
          ignorados: validacaoItens.filter(i => i.status_manual === 'ignorado').length,
        }
        const sortedItens = [...validacaoItens]
          .map((item, originalIdx) => ({ ...item, _idx: originalIdx }))
          .sort((a, b) => {
            const order: Record<string, number> = { divergencia: 0, faltando: 1, extra: 2, ok: 3, ignorado: 4 }
            const statusA = (a.status_manual || a.status) as string
            const statusB = (b.status_manual || b.status) as string
            return (order[statusA] ?? 5) - (order[statusB] ?? 5)
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
                  <p className="text-sm text-gray-500">Comparacao via IA -- revise e ajuste o status de cada item</p>
                </div>
                <div className="flex items-center gap-2">
                  {espelhoInfo?.espelho_url && (
                    <>
                      <button
                        onClick={() => { setShowValidacaoModal(false); setShowEspelhoViewer(true) }}
                        className="px-3 py-1.5 bg-white border border-primary-300 rounded-lg text-xs font-medium text-primary-700 hover:bg-primary-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver espelho
                      </button>
                      <a
                        href={`/api/pedidos-compra/${pedidoId}/espelho/download`}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowValidacaoModal(false)
                      router.push(`/compras/pedidos/${pedidoId}/validacao-espelho`)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Abrir em tela inteira"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </button>
                  <button onClick={() => setShowValidacaoModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Dynamic summary badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {manualResumo.ok} OK
                </span>
                {manualResumo.divergencias > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {manualResumo.divergencias} Divergencias
                  </span>
                )}
                {manualResumo.faltando > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    {manualResumo.faltando} Faltando
                  </span>
                )}
                {(() => {
                  const rupturas = validacaoItens.filter(i => (i.status_manual || i.status) === 'faltando' && i.motivo_faltante === 'ruptura').length
                  const descontinuados = validacaoItens.filter(i => (i.status_manual || i.status) === 'faltando' && i.motivo_faltante === 'descontinuado').length
                  return (
                    <>
                      {rupturas > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ {rupturas} Ruptura
                        </span>
                      )}
                      {descontinuados > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          🚫 {descontinuados} Descontinuado
                        </span>
                      )}
                    </>
                  )
                })()}
                {manualResumo.extras > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    + {manualResumo.extras} Extras
                  </span>
                )}
                {manualResumo.ignorados > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                    {manualResumo.ignorados} Ignorados
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Pedido: {validacaoResult.resumo.total_pedido} itens | Espelho: {validacaoResult.resumo.total_espelho} itens
                </span>
              </div>
            </div>

            {/* Editable results table */}
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
                    <th className="px-3 py-3 text-left">Obs. Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedItens.map((item) => {
                    const effectiveStatus = (item.status_manual || item.status) as string
                    const isChangedFromAI = item.status_manual != null && item.status_manual !== item.status
                    return (
                      <tr key={item._idx} className={
                        effectiveStatus === 'ok' ? 'bg-white' :
                        effectiveStatus === 'divergencia' ? 'bg-amber-50/60' :
                        effectiveStatus === 'faltando' ? 'bg-red-50/60' :
                        effectiveStatus === 'extra' ? 'bg-blue-50/60' :
                        'bg-gray-50/60'
                      }>
                        <td className="px-3 py-2.5 text-sm">
                          {item.item_pedido ? (
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-2">{item.item_pedido.descricao}</p>
                              <p className="text-xs text-gray-400">{item.item_pedido.gtin || item.item_pedido.codigo || '-'}</p>
                            </div>
                          ) : '-'}
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
                        <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[140px]">{item.diferencas?.join('; ') || '-'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <select
                              value={effectiveStatus}
                              onChange={(e) => {
                                const newItens = [...validacaoItens]
                                newItens[item._idx] = {
                                  ...newItens[item._idx],
                                  status_manual: e.target.value as ValidacaoItemResult['status_manual'],
                                }
                                setValidacaoItens(newItens)
                              }}
                              className={`text-xs border rounded-lg px-2 py-1.5 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none cursor-pointer ${
                                effectiveStatus === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                                effectiveStatus === 'divergencia' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                                effectiveStatus === 'faltando' ? 'border-red-300 bg-red-50 text-red-700' :
                                effectiveStatus === 'extra' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                                'border-gray-300 bg-gray-50 text-gray-600'
                              }`}
                            >
                              <option value="ok">OK</option>
                              <option value="divergencia">Diverge</option>
                              <option value="faltando">Faltando</option>
                              <option value="extra">+ Extra</option>
                              <option value="ignorado">Ignorar</option>
                            </select>
                            {!isChangedFromAI && (
                              <span className="text-[10px] font-medium text-purple-500 bg-purple-50 px-1 py-0.5 rounded" title="Status sugerido pela IA">IA</span>
                            )}
                          </div>
                          {/* Motivo da falta (set by fornecedor) */}
                          {(effectiveStatus === 'faltando') && item.motivo_faltante && (
                            <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              item.motivo_faltante === 'ruptura'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {item.motivo_faltante === 'ruptura' ? '⏳ Ruptura' : '🚫 Descontinuado'}
                              {item.motivo_faltante === 'ruptura' && item.previsao_retorno && (
                                <span className="text-amber-500 ml-1">
                                  (retorno: {new Date(item.previsao_retorno).toLocaleDateString('pt-BR')})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            placeholder="Obs..."
                            value={item.observacao_item || ''}
                            onChange={(e) => {
                              const newItens = [...validacaoItens]
                              newItens[item._idx] = {
                                ...newItens[item._idx],
                                observacao_item: e.target.value,
                              }
                              setValidacaoItens(newItens)
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full min-w-[100px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Global observation + footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-white shrink-0">
              <textarea
                placeholder="Observacoes gerais sobre a validacao..."
                value={validacaoObservacao}
                onChange={(e) => setValidacaoObservacao(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                rows={2}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-500">
                Ajuste o status de cada item se a IA errou. Clique em Salvar para registrar.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowValidacaoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSalvarValidacao}
                  disabled={salvandoValidacao}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {salvandoValidacao ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Salvando...
                    </>
                  ) : 'Salvar validacao'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

    </DashboardLayout>
    </RequirePermission>
  )
}
