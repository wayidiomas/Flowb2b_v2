'use client'

interface SidebarAcoesProps {
  resumo: {
    qtd: number
    valorTotal: number
  }
  onNovoPedido: () => void
  onGerarAutomatico?: () => void
  onImprimir?: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

// Icons
function PlusIcon() {
  return (
    <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 12.998h-6v6h-2v-6H5v-2h6v-6h2v6h6v2z" />
    </svg>
  )
}

function AutoFixIcon() {
  return (
    <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.996.996 0 0 0-1.41 0L1.29 18.96a.996.996 0 0 0 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05a.996.996 0 0 0 0-1.41l-2.33-2.35zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg className="w-[17px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-[14px] h-[24px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-[14px] h-[24px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function SidebarAcoes({ resumo, onNovoPedido, onGerarAutomatico, onImprimir, isCollapsed, onToggleCollapse }: SidebarAcoesProps) {
  // Estado colapsado - barra estreita com chevron
  if (isCollapsed) {
    return (
      <div className="w-[48px] flex-shrink-0 transition-all duration-300 ease-in-out">
        <div className="bg-white rounded-[20px] overflow-hidden flex flex-col h-full shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)]">
          {/* Botao de expandir */}
          <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-2 py-[18px] flex flex-col items-center">
            <button
              onClick={onToggleCollapse}
              className="p-2 text-[#667085] hover:text-[#344054] hover:bg-gray-100 rounded-lg transition-colors"
              title="Expandir"
            >
              <ChevronRightIcon />
            </button>
          </div>

          {/* Icones das acoes colapsadas */}
          <div className="bg-white flex-1 flex flex-col items-center py-2">
            <button
              onClick={onNovoPedido}
              className="p-3 text-[#009E3F] hover:bg-gray-50 rounded-lg transition-colors"
              title="Novo pedido"
            >
              <PlusIcon />
            </button>

            <button
              onClick={onGerarAutomatico}
              disabled={!onGerarAutomatico}
              className="p-3 text-[#4684CD] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!onGerarAutomatico ? 'Em breve' : 'Gerar automaticamente'}
            >
              <AutoFixIcon />
            </button>

            <button
              onClick={onImprimir}
              disabled={!onImprimir}
              className="p-3 text-[#5C5C5C] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!onImprimir ? 'Em breve' : 'Imprimir pedidos'}
            >
              <PrintIcon />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Estado expandido - sidebar completa
  return (
    <div className="w-[280px] flex-shrink-0 transition-all duration-300 ease-in-out">
      <div className="bg-white rounded-[20px] overflow-hidden flex flex-col shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)]">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-tl-[20px] rounded-bl-[20px] px-[19px] py-[18px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[6px]">
              <h3 className="text-[16px] font-medium text-[#344054] leading-[1.3] tracking-[0.16px]">
                Acoes rapidas
              </h3>
              <p className="text-[12px] text-[#838383] leading-[1.3] tracking-[0.12px]">
                Explore mais acoes na plataforma
              </p>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-1 text-[#667085] hover:text-[#344054] hover:bg-gray-100 rounded transition-colors"
              title="Recolher"
            >
              <ChevronLeftIcon />
            </button>
          </div>
        </div>

        {/* Actions List */}
        <div className="bg-white px-[18px] flex-1">
          {/* Novo pedido */}
          <button
            onClick={onNovoPedido}
            className="w-full flex items-center gap-[10px] p-[9px] h-[54px] border-b border-[#EFEFEF] hover:bg-gray-50 transition-colors"
          >
            <span className="text-[#009E3F]">
              <PlusIcon />
            </span>
            <span className="text-[12px] font-medium text-[#009E3F] leading-[1.3] tracking-[0.12px]">
              Novo pedido
            </span>
          </button>

          {/* Gerar automaticamente */}
          <button
            onClick={onGerarAutomatico}
            disabled={!onGerarAutomatico}
            className="w-full flex items-center gap-[12px] p-[9px] h-[54px] border-b border-[#EFEFEF] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!onGerarAutomatico ? 'Em breve' : undefined}
          >
            <span className="text-[#4684CD]">
              <AutoFixIcon />
            </span>
            <span className="text-[12px] font-medium text-[#4684CD] leading-[1.3] tracking-[0.12px]">
              Gerar pedido automaticamente
            </span>
          </button>

          {/* Imprimir pedidos */}
          <button
            onClick={onImprimir}
            disabled={!onImprimir}
            className="w-full flex items-center gap-[12px] p-[9px] h-[54px] border-b border-[#EFEFEF] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!onImprimir ? 'Em breve' : undefined}
          >
            <span className="text-[#5C5C5C]">
              <PrintIcon />
            </span>
            <span className="text-[12px] font-medium text-[#5C5C5C] leading-[1.3] tracking-[0.12px]">
              Imprimir pedidos
            </span>
          </button>

          {/* Resumo */}
          <div className="p-[9px] flex flex-col gap-[10px]">
            <p className="text-[13px] font-medium text-[#5C5C5C] leading-[1.3] tracking-[0.13px]">
              Resumo
            </p>
            <p className="text-[12px] font-medium text-[#949494] leading-[1.3] tracking-[0.12px]">
              Quantidade de pedidos
            </p>
            <p className="text-[12px] font-medium text-[#336FB6] leading-[1.3] tracking-[0.12px]">
              {resumo.qtd}
            </p>
            <p className="text-[12px] font-medium text-[#949494] leading-[1.3] tracking-[0.12px]">
              Valor total dos pedidos
            </p>
            <p className="text-[12px] font-medium text-[#336FB6] leading-[1.3] tracking-[0.12px]">
              {formatCurrency(resumo.valorTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
