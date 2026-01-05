'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { FornecedorSelectModal } from '@/components/pedido-compra/FornecedorSelectModal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PedidoCompraDetalhes, FornecedorOption } from '@/types/pedido-compra'

// Status config
const STATUS_CONFIG: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-700', label: 'Emitida' },
  2: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
  3: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Registrada' },
  4: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aguardando Entrega' },
  5: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Rascunho' },
}

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function CashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
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

function EditIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR')
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

export default function VisualizarPedidoPage() {
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string
  const { user } = useAuth()
  const printRef = useRef<HTMLDivElement>(null)

  const [pedido, setPedido] = useState<PedidoCompraDetalhes | null>(null)
  const [loading, setLoading] = useState(true)
  const [lancandoConta, setLancandoConta] = useState(false)
  const [contaLancada, setContaLancada] = useState(false)
  const [showFornecedorModal, setShowFornecedorModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)

  // Buscar detalhes do pedido
  useEffect(() => {
    async function fetchPedido() {
      if (!user?.empresa_id || !pedidoId) return

      try {
        // Buscar pedido com itens e parcelas
        const { data, error } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
          p_pedido_id: parseInt(pedidoId)
        })

        if (error) throw error
        // RPC retorna array, pegar primeiro elemento
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

  // Lancar conta no Bling
  const handleLancarConta = async () => {
    if (!pedido) return

    setLancandoConta(true)
    try {
      const response = await fetch(`/api/pedidos-compra/${pedido.id}/lancar-conta`, {
        method: 'POST',
      })

      if (response.ok) {
        setContaLancada(true)
        // Toast de sucesso
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

  // Exportar PDF
  const handleExportPDF = () => {
    window.print()
    setShowExportMenu(false)
  }

  // Exportar CSV
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
      `Total Produtos;;;;;${pedido.total_produtos.toFixed(2)}`,
      `Frete;;;;;${pedido.frete?.toFixed(2) || '0.00'}`,
      `Desconto;;;;;${pedido.desconto?.toFixed(2) || '0.00'}`,
      `TOTAL;;;;;${pedido.total.toFixed(2)}`
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedido_${pedido.numero}_${pedido.fornecedor_nome.replace(/\s+/g, '_')}.csv`
    link.click()
    setShowExportMenu(false)
  }

  // Exportar XLSX (usando CSV com extensao xlsx para simplicidade)
  const handleExportXLSX = () => {
    if (!pedido) return

    const headers = ['Codigo', 'Descricao', 'Unidade', 'Quantidade', 'Valor Unitario', 'Valor Total']
    const rows = pedido.itens.map(item => [
      item.codigo_produto || '',
      item.descricao,
      item.unidade,
      item.quantidade,
      item.valor,
      item.quantidade * item.valor
    ])

    // Criar conteudo tab-separated para Excel
    const content = [
      `Pedido #${pedido.numero} - ${pedido.fornecedor_nome}`,
      `Data: ${formatDate(pedido.data)}`,
      '',
      headers.join('\t'),
      ...rows.map(row => row.join('\t')),
      '',
      `Total Produtos\t\t\t\t\t${pedido.total_produtos}`,
      `Frete\t\t\t\t\t${pedido.frete || 0}`,
      `Desconto\t\t\t\t\t${pedido.desconto || 0}`,
      `TOTAL\t\t\t\t\t${pedido.total}`
    ].join('\n')

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedido_${pedido.numero}_${pedido.fornecedor_nome.replace(/\s+/g, '_')}.xlsx`
    link.click()
    setShowExportMenu(false)
  }

  // Compartilhar WhatsApp
  const handleShareWhatsApp = () => {
    if (!pedido) return

    const itensTexto = pedido.itens.map(item =>
      `- ${item.descricao}: ${item.quantidade} ${item.unidade} x ${formatCurrency(item.valor)} = ${formatCurrency(item.quantidade * item.valor)}`
    ).join('\n')

    const texto = `*Pedido de Compra #${pedido.numero}*
Fornecedor: ${pedido.fornecedor_nome}
Data: ${formatDate(pedido.data)}
${pedido.data_prevista ? `Previsao: ${formatDate(pedido.data_prevista)}` : ''}

*Itens:*
${itensTexto}

*Resumo:*
Produtos: ${formatCurrency(pedido.total_produtos)}
${pedido.frete ? `Frete: ${formatCurrency(pedido.frete)}` : ''}
${pedido.desconto ? `Desconto: ${formatCurrency(pedido.desconto)}` : ''}
*Total: ${formatCurrency(pedido.total)}*

${pedido.observacoes ? `Obs: ${pedido.observacoes}` : ''}`

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
    setShowShareMenu(false)
  }

  // Compartilhar Email
  const handleShareEmail = () => {
    if (!pedido) return

    const itensTexto = pedido.itens.map(item =>
      `- ${item.descricao}: ${item.quantidade} ${item.unidade} x ${formatCurrency(item.valor)} = ${formatCurrency(item.quantidade * item.valor)}`
    ).join('\n')

    const subject = `Pedido de Compra #${pedido.numero} - ${pedido.fornecedor_nome}`
    const body = `Pedido de Compra #${pedido.numero}
Fornecedor: ${pedido.fornecedor_nome}
Data: ${formatDate(pedido.data)}
${pedido.data_prevista ? `Previsao de Entrega: ${formatDate(pedido.data_prevista)}` : ''}

Itens:
${itensTexto}

Resumo:
Produtos: ${formatCurrency(pedido.total_produtos)}
${pedido.frete ? `Frete: ${formatCurrency(pedido.frete)}` : ''}
${pedido.desconto ? `Desconto: ${formatCurrency(pedido.desconto)}` : ''}
Total: ${formatCurrency(pedido.total)}

${pedido.observacoes ? `Observacoes: ${pedido.observacoes}` : ''}`

    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
    setShowShareMenu(false)
  }

  // Carregar fornecedores para o modal
  const loadFornecedores = async () => {
    if (!user?.empresa_id) return

    setLoadingFornecedores(true)
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome, cnpj')
        .eq('empresa_id', user.empresa_id)
        .order('nome')

      if (error) throw error
      setFornecedores(data || [])
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // Abrir modal de novo pedido
  const handleNovoPedido = () => {
    loadFornecedores()
    setShowFornecedorModal(true)
  }

  // Selecionar fornecedor para novo pedido
  const handleSelectFornecedor = (fornecedor: FornecedorOption) => {
    setShowFornecedorModal(false)
    router.push(`/compras/pedidos/gerar-automatico?fornecedor_id=${fornecedor.id}`)
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

  if (!pedido) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Pedido nao encontrado</p>
          <Link href="/compras/pedidos" className="text-[#336FB6] hover:underline mt-2 inline-block">
            Voltar para lista
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[pedido.situacao] || STATUS_CONFIG[3]

  return (
    <DashboardLayout>
      {/* Header com acoes */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido #{pedido.numero}
              </h1>
              <p className="text-gray-500">{pedido.fornecedor_nome}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Acoes principais */}
          <div className="flex items-center gap-2">
            {/* Botao Lancar Conta */}
            <button
              onClick={handleLancarConta}
              disabled={lancandoConta || contaLancada}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                contaLancada
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {contaLancada ? <CheckIcon /> : <CashIcon />}
              {lancandoConta ? 'Lancando...' : contaLancada ? 'Conta Lancada' : 'Lancar Conta'}
            </button>

            {/* Menu Exportar */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <DownloadIcon />
                Exportar
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <PrintIcon />
                    Exportar PDF
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <DownloadIcon />
                    Exportar CSV
                  </button>
                  <button
                    onClick={handleExportXLSX}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <DownloadIcon />
                    Exportar Excel
                  </button>
                </div>
              )}
            </div>

            {/* Menu Compartilhar */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ShareIcon />
                Compartilhar
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={handleShareWhatsApp}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <WhatsAppIcon />
                    WhatsApp
                  </button>
                  <button
                    onClick={handleShareEmail}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <EmailIcon />
                    Email
                  </button>
                </div>
              )}
            </div>

            {/* Editar */}
            <Link
              href={`/compras/pedidos/${pedido.id}/editar`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <EditIcon />
              Editar
            </Link>

            {/* Novo Pedido */}
            <button
              onClick={handleNovoPedido}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#336FB6] hover:bg-[#2660A5] text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon />
              Novo Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Conteudo do Pedido (Espelho) */}
      <div ref={printRef} className="space-y-6 print:space-y-4">
        {/* Cabecalho do Pedido */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-0 print:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fornecedor */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Fornecedor</h3>
              <p className="text-lg font-semibold text-gray-900">{pedido.fornecedor_nome}</p>
            </div>

            {/* Datas */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Data do Pedido</h3>
              <p className="text-lg font-semibold text-gray-900">{formatDate(pedido.data)}</p>
              {pedido.data_prevista && (
                <p className="text-sm text-gray-500">
                  Previsao: {formatDate(pedido.data_prevista)}
                </p>
              )}
            </div>

            {/* Frete */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Frete</h3>
              <p className="text-lg font-semibold text-gray-900">
                {FRETE_LABELS[pedido.frete_por_conta || 'CIF'] || pedido.frete_por_conta}
              </p>
              {pedido.transportador && (
                <p className="text-sm text-gray-500">
                  Transportador: {pedido.transportador}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:border print:border-gray-300">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Itens do Pedido</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Codigo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descricao
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Unit.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pedido.itens.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.codigo_produto || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.descricao}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">
                      {item.unidade}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {item.quantidade}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.quantidade * item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo e Parcelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parcelas */}
          {pedido.parcelas && pedido.parcelas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Parcelas</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {pedido.parcelas.map((parcela, index) => (
                  <div key={parcela.id || index} className="px-6 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Parcela {index + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vencimento: {formatDate(parcela.data_vencimento)}
                      </p>
                      {parcela.forma_pagamento_nome && (
                        <p className="text-xs text-gray-500">
                          {parcela.forma_pagamento_nome}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(parcela.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({pedido.itens.length} itens)</span>
                <span className="font-medium">{formatCurrency(pedido.total_produtos)}</span>
              </div>
              {pedido.frete && pedido.frete > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Frete</span>
                  <span className="font-medium">{formatCurrency(pedido.frete)}</span>
                </div>
              )}
              {pedido.desconto && pedido.desconto > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Desconto</span>
                  <span className="font-medium text-green-600">-{formatCurrency(pedido.desconto)}</span>
                </div>
              )}
              {pedido.total_icms && pedido.total_icms > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ICMS</span>
                  <span className="font-medium">{formatCurrency(pedido.total_icms)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-[#336FB6]">{formatCurrency(pedido.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Observacoes */}
        {(pedido.observacoes || pedido.observacoes_internas) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Observacoes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pedido.observacoes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Observacoes (fornecedor)</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{pedido.observacoes}</p>
                </div>
              )}
              {pedido.observacoes_internas && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Observacoes internas</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{pedido.observacoes_internas}</p>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Estilos de impressao */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}
