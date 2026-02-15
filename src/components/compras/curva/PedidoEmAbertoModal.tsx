'use client'

interface PedidoAberto {
  id: number
  numero: string
  data: string
  total: number
  situacao: number
}

interface ItemPedido {
  produto_id: number
  nome: string
  codigo: string
  quantidade: number
  valor: number
}

interface PedidoEmAbertoModalProps {
  isOpen: boolean
  onClose: () => void
  fornecedorNome: string
  pedidos: PedidoAberto[]
  itens: ItemPedido[]
  loading?: boolean
  onContinuar: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function getSituacaoLabel(situacao: number): string {
  switch (situacao) {
    case 0:
      return 'Em aberto'
    case 3:
      return 'Parcial'
    default:
      return 'Em andamento'
  }
}

export function PedidoEmAbertoModal({
  isOpen,
  onClose,
  fornecedorNome,
  pedidos,
  itens,
  loading,
  onContinuar,
}: PedidoEmAbertoModalProps) {
  if (!isOpen) return null

  const totalPedidos = pedidos.length
  const totalItens = itens.length
  const totalQuantidade = itens.reduce((sum, i) => sum + i.quantidade, 0)
  const totalValor = pedidos.reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EDEDED] bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#344054]">
                Pedido em Andamento
              </h2>
              <p className="text-sm text-[#667085]">
                {fornecedorNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-[#838383] hover:text-[#344054] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-sm text-[#667085] mb-4">
                Este fornecedor ja tem {totalPedidos === 1 ? 'um pedido' : `${totalPedidos} pedidos`} em andamento
                que ainda {totalPedidos === 1 ? 'nao foi finalizado' : 'nao foram finalizados'}:
              </p>

              {/* Pedidos */}
              <div className="space-y-2 mb-4">
                {pedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="bg-[#FBFBFB] border border-[#EDEDED] rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[#344054]">
                          Pedido #{pedido.numero}
                        </span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {getSituacaoLabel(pedido.situacao)}
                        </span>
                      </div>
                      <span className="font-semibold text-[#344054]">
                        {formatCurrency(pedido.total)}
                      </span>
                    </div>
                    <p className="text-xs text-[#838383] mt-1">
                      Data: {formatDate(pedido.data)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Itens ja pedidos */}
              {itens.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[#344054] mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#838383]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Itens ja pedidos ({totalItens})
                  </h3>
                  <div className="border border-[#EDEDED] rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#FBFBFB] sticky top-0">
                          <tr>
                            <th className="py-2 px-3 text-left font-medium text-[#667085]">Produto</th>
                            <th className="py-2 px-3 text-right font-medium text-[#667085] w-24">Qtd</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F0F0]">
                          {itens.slice(0, 10).map((item) => (
                            <tr key={item.produto_id} className="hover:bg-[#FBFBFB]">
                              <td className="py-2 px-3">
                                <div className="font-medium text-[#344054] truncate max-w-[280px]">
                                  {item.nome}
                                </div>
                                <div className="text-xs text-[#838383]">
                                  {item.codigo}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-[#344054]">
                                {item.quantidade}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {itens.length > 10 && (
                        <div className="py-2 px-3 text-xs text-center text-[#838383] bg-[#FBFBFB]">
                          + {itens.length - 10} itens
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Total ja pedido: {totalQuantidade} unidades ({formatCurrency(totalValor)})</p>
                    <p className="mt-1 text-amber-700">
                      Se continuar, as quantidades sugeridas serao <strong>descontadas</strong> do que ja foi pedido.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EDEDED] bg-[#FBFBFB] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#D0D5DD] text-[#344054] font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onContinuar}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#336FB6] text-white font-medium hover:bg-[#2a5a94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Continuar e Descontar
          </button>
        </div>
      </div>
    </div>
  )
}
