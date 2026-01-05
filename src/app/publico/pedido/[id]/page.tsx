'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface ItemPedido {
  codigo_produto?: string
  descricao: string
  unidade: string
  quantidade: number
  valor: number
}

interface Parcela {
  valor: number
  data_vencimento: string
  forma_pagamento_nome?: string
}

interface PedidoPublico {
  id: number
  numero: string
  data: string
  data_prevista?: string
  fornecedor_nome: string
  situacao: number
  total_produtos: number
  total: number
  desconto?: number
  frete?: number
  frete_por_conta?: string
  transportador?: string
  observacoes?: string
  itens: ItemPedido[]
  parcelas: Parcela[]
}

// Status config
const STATUS_CONFIG: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em Aberto' },
  1: { bg: 'bg-green-100', text: 'text-green-700', label: 'Atendido' },
  2: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Em Andamento' },
}

// Icons
function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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

export default function PedidoPublicoPage() {
  const params = useParams()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<PedidoPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Buscar pedido
  useEffect(() => {
    async function fetchPedido() {
      try {
        const response = await fetch(`/api/pedidos-compra/${pedidoId}/publico`)
        if (!response.ok) {
          throw new Error('Pedido nao encontrado')
        }
        const data = await response.json()
        setPedido(data)
      } catch (err) {
        console.error('Erro ao buscar pedido:', err)
        setError('Pedido nao encontrado ou link invalido')
      } finally {
        setLoading(false)
      }
    }

    if (pedidoId) {
      fetchPedido()
    }
  }, [pedidoId])

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

  // Exportar XLSX
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#336FB6]"></div>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido nao encontrado</h1>
          <p className="text-gray-500">{error || 'O link pode estar invalido ou expirado.'}</p>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[pedido.situacao] || STATUS_CONFIG[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Pedido de Compra #{pedido.numero}
              </h1>
              <p className="text-sm text-gray-500">{pedido.fornecedor_nome}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
              {/* Menu Exportar */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#336FB6] hover:bg-[#2660A5] text-white rounded-lg font-medium transition-colors"
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
            </div>
          </div>
        </div>
      </header>

      {/* Conteudo */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6" id="print-area">
        {/* Cabecalho para impressao */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900">
            Pedido de Compra #{pedido.numero}
          </h1>
          <p className="text-lg text-gray-700">{pedido.fornecedor_nome}</p>
          <p className="text-sm text-gray-500 mt-1">
            Data: {formatDate(pedido.data)}
            {pedido.data_prevista && ` | Previsao: ${formatDate(pedido.data_prevista)}`}
          </p>
        </div>

        <div className="space-y-6">
          {/* Informacoes do Pedido */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 print:border print:border-gray-300 print:shadow-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Fornecedor</h3>
                <p className="text-lg font-semibold text-gray-900">{pedido.fornecedor_nome}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Data do Pedido</h3>
                <p className="text-lg font-semibold text-gray-900">{formatDate(pedido.data)}</p>
                {pedido.data_prevista && (
                  <p className="text-sm text-gray-500">
                    Previsao: {formatDate(pedido.data_prevista)}
                  </p>
                )}
              </div>
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
                    <tr key={index} className="hover:bg-gray-50">
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
                    <div key={index} className="px-6 py-3 flex justify-between items-center">
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
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-[#336FB6]">{formatCurrency(pedido.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Observacoes */}
          {pedido.observacoes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Observacoes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{pedido.observacoes}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-6 sm:px-6 text-center text-sm text-gray-400 print:hidden">
        Powered by FlowB2B
      </footer>

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
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
          #print-area .bg-white {
            background: white !important;
            box-shadow: none !important;
          }
          #print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #print-area th, #print-area td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
          }
          #print-area th {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
