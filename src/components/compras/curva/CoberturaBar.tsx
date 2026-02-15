'use client'

import { Tooltip } from '@/components/ui/Tooltip'

type Urgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK'

interface CoberturaBarProps {
  diasCobertura: number | null
  diasNecessarios: number
  prazoEntrega: number
  urgencia: Urgencia
  showLabels?: boolean
  compact?: boolean
}

const urgenciaColors = {
  CRITICA: {
    bar: 'bg-red-500',
    bg: 'bg-red-100',
    text: 'text-red-700',
  },
  ALTA: {
    bar: 'bg-orange-500',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  MEDIA: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  OK: {
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
}

export function CoberturaBar({
  diasCobertura,
  diasNecessarios,
  prazoEntrega,
  urgencia,
  showLabels = false,
  compact = false,
}: CoberturaBarProps) {
  const colors = urgenciaColors[urgencia]

  // Se nao tem cobertura (sem vendas), mostrar estado especial
  if (diasCobertura === null) {
    return (
      <div className={`${compact ? 'w-20' : 'w-32'}`}>
        <div className={`h-2 rounded-full bg-gray-200 overflow-hidden`}>
          <div className="h-full w-full bg-gray-300 opacity-50" />
        </div>
        {showLabels && (
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Sem vendas</span>
          </div>
        )}
      </div>
    )
  }

  // Calcular porcentagem (max 150% para visualizacao)
  const maxDias = diasNecessarios * 1.5 // Ate 150% do necessario
  const percentage = Math.min((diasCobertura / maxDias) * 100, 100)

  // Marcador do prazo de entrega (linha vermelha)
  const prazoPercentage = (prazoEntrega / maxDias) * 100

  // Marcador dos dias necessarios (linha amarela)
  const necessarioPercentage = (diasNecessarios / maxDias) * 100

  const tooltipContent = `Cobertura: ${diasCobertura.toFixed(0)} dias
Prazo entrega: ${prazoEntrega} dias
Dias necessarios: ${diasNecessarios.toFixed(0)} dias (prazo + margem)`

  return (
    <Tooltip content={tooltipContent} position="top">
      <div className={`${compact ? 'w-20' : 'w-32'} cursor-help`}>
        <div className={`relative h-2 rounded-full ${colors.bg} overflow-hidden`}>
          {/* Barra de cobertura */}
          <div
            className={`absolute left-0 top-0 h-full rounded-full ${colors.bar} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />

          {/* Marcador de prazo de entrega (linha vermelha) */}
          <div
            className="absolute top-0 w-0.5 h-full bg-red-600 opacity-60"
            style={{ left: `${prazoPercentage}%` }}
          />

          {/* Marcador de dias necessarios (linha amarela) */}
          <div
            className="absolute top-0 w-0.5 h-full bg-amber-600 opacity-60"
            style={{ left: `${necessarioPercentage}%` }}
          />
        </div>

        {showLabels && (
          <div className="flex justify-between text-[10px] mt-0.5">
            <span className={colors.text}>{diasCobertura.toFixed(0)}d</span>
            <span className="text-gray-400">{diasNecessarios.toFixed(0)}d</span>
          </div>
        )}

        {!showLabels && (
          <div className={`text-center text-[10px] font-medium mt-0.5 ${colors.text}`}>
            {diasCobertura.toFixed(0)}d
          </div>
        )}
      </div>
    </Tooltip>
  )
}
