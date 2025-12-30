'use client'

interface SidebarAcoesProps {
  resumo: {
    qtd: number
    valorTotal: number
  }
  onNovoPedido: () => void
  onGerarAutomatico?: () => void
}

// Icons
function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function SidebarAcoes({ resumo, onNovoPedido, onGerarAutomatico }: SidebarAcoesProps) {
  return (
    <div className="w-[280px] flex-shrink-0">
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-5">
        {/* Header */}
        <h3 className="text-base font-semibold text-[#344054] mb-4">
          Acoes rapidas
        </h3>

        {/* Botoes de acao */}
        <div className="space-y-3 mb-6">
          <button
            onClick={onNovoPedido}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium text-white bg-[#009E3F] hover:bg-[#008A36] rounded-lg shadow-xs transition-colors"
          >
            <PlusIcon />
            Novo pedido
          </button>

          <button
            onClick={onGerarAutomatico}
            disabled={!onGerarAutomatico}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium text-white bg-[#4684CD] hover:bg-[#3A74B8] rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!onGerarAutomatico ? 'Em breve' : undefined}
          >
            <SparklesIcon />
            Gerar automaticamente
          </button>
        </div>

        {/* Divisor */}
        <div className="border-t border-[#EFEFEF] my-4" />

        {/* Resumo */}
        <div>
          <h4 className="text-sm font-medium text-[#667085] mb-3">
            Resumo
          </h4>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#667085]">Pedidos</span>
              <span className="text-sm font-medium text-[#344054]">{resumo.qtd}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#667085]">Valor total</span>
              <span className="text-sm font-medium text-[#344054]">{formatCurrency(resumo.valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
