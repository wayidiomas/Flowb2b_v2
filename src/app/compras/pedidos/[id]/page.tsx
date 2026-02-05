'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { FornecedorSelectModal } from '@/components/pedido-compra/FornecedorSelectModal'
import { PedidoTimeline } from '@/components/pedido/PedidoTimeline'
import { WorkflowStepper } from '@/components/pedido/WorkflowStepper'
import { StatusActionCard } from '@/components/pedido/StatusActionCard'
import { CancelamentoModal } from '@/components/pedido/CancelamentoModal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PedidoCompraDetalhes, FornecedorOption, SugestaoFornecedor, SugestaoItem, StatusInterno } from '@/types/pedido-compra'

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

  // Envio ao fornecedor nao cadastrado
  const [showEnvioWhatsAppModal, setShowEnvioWhatsAppModal] = useState(false)
  const [fornecedorEnvio, setFornecedorEnvio] = useState<{ id: number; nome: string; telefone: string | null } | null>(null)
  const [linkPublicoEnvio, setLinkPublicoEnvio] = useState('')
  const [numeroPedidoEnvio, setNumeroPedidoEnvio] = useState('')
  const [telefoneEnvioInput, setTelefoneEnvioInput] = useState('')
  const [salvandoTelefoneEnvio, setSalvandoTelefoneEnvio] = useState(false)

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
      } catch (err) {
        console.error('Erro ao buscar status/sugestoes:', err)
      }
    }

    fetchStatusEsugestoes()
  }, [pedidoId, user?.empresa_id])

  // Handlers
  const handleEnviarFornecedor = async () => {
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

  const handleProcessarSugestao = async (action: 'aceitar' | 'rejeitar') => {
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
        setStatusInterno(action === 'aceitar' ? 'aceito' : 'rejeitado')
        setSugestoes(prev => prev.map(s =>
          s.id === pendente.id ? { ...s, status: action === 'aceitar' ? 'aceita' : 'rejeitada' } : s
        ))
        setObservacaoResposta('')
        if (action === 'aceitar') window.location.reload()
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

  const handleEnviarContraProposta = async (
    itens: { item_pedido_compra_id: number; quantidade_contra_proposta: number; desconto_percentual: number; bonificacao_percentual: number }[],
    observacao: string
  ) => {
    if (!pedido) return

    try {
      const res = await fetch(`/api/pedidos-compra/${pedido.id}/contra-proposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens,
          observacao: observacao.trim() || undefined,
        }),
      })

      if (res.ok) {
        setStatusInterno('contra_proposta_pendente')
        window.location.reload()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Falha ao enviar contra-proposta'}`)
      }
    } catch (err) {
      console.error('Erro ao enviar contra-proposta:', err)
      alert('Erro ao enviar contra-proposta')
    }
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!pedido) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Pedido nao encontrado</p>
          <Link href="/compras/pedidos" className="text-primary-600 hover:underline mt-2 inline-block">Voltar para lista</Link>
        </div>
      </DashboardLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[pedido.situacao] || STATUS_CONFIG[0]

  return (
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
              onEnviarFornecedor={handleEnviarFornecedor}
              onAceitarSugestao={() => handleProcessarSugestao('aceitar')}
              onRejeitarSugestao={() => handleProcessarSugestao('rejeitar')}
              onEnviarContraProposta={handleEnviarContraProposta}
              onCancelar={() => setShowCancelamentoModal(true)}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Und</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedido.itens.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{item.codigo_produto || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.unidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{item.quantidade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.valor)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.quantidade * item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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

      {/* Modal de Cancelamento */}
      <CancelamentoModal
        isOpen={showCancelamentoModal}
        onClose={() => setShowCancelamentoModal(false)}
        onConfirm={handleCancelar}
        loading={cancelando}
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
    </DashboardLayout>
  )
}
