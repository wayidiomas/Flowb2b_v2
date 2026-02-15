'use client'

import { Tooltip } from '@/components/ui/Tooltip'

interface CurvaToggleProps {
  value: 'faturamento' | 'quantidade'
  onChange: (value: 'faturamento' | 'quantidade') => void
}

export function CurvaToggle({ value, onChange }: CurvaToggleProps) {
  return (
    <div className="inline-flex items-center bg-[#F2F4F7] rounded-xl p-1">
      <Tooltip content="Classificacao baseada no valor total vendido (preco x quantidade)" position="bottom">
        <button
          onClick={() => onChange('faturamento')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            value === 'faturamento'
              ? 'bg-white text-[#336FB6] shadow-sm'
              : 'text-[#667085] hover:text-[#344054]'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Faturamento
          </div>
        </button>
      </Tooltip>
      <Tooltip content="Classificacao baseada na quantidade de unidades vendidas (giro)" position="bottom">
        <button
          onClick={() => onChange('quantidade')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            value === 'quantidade'
              ? 'bg-white text-[#336FB6] shadow-sm'
              : 'text-[#667085] hover:text-[#344054]'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            Quantidade
          </div>
        </button>
      </Tooltip>
    </div>
  )
}
