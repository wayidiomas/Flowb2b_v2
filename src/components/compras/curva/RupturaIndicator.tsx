'use client'

type Urgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK'

interface RupturaIndicatorProps {
  emRuptura?: boolean
  urgencia?: Urgencia
  diasCobertura?: number | null
  showDetails?: boolean
}

const urgenciaConfig = {
  CRITICA: {
    label: 'CRITICA',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    animate: true,
  },
  ALTA: {
    label: 'ALTA',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    animate: true,
  },
  MEDIA: {
    label: 'MEDIA',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    animate: false,
  },
  OK: {
    label: 'OK',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    animate: false,
  },
}

export function RupturaIndicator({
  emRuptura,
  urgencia,
  diasCobertura,
  showDetails = false,
}: RupturaIndicatorProps) {
  // Se urgencia for passado, usar urgencia; senao, usar emRuptura para compatibilidade
  const level: Urgencia = urgencia || (emRuptura ? 'CRITICA' : 'OK')
  const config = urgenciaConfig[level]

  return (
    <div className="inline-flex flex-col items-center">
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bg} ${config.text} text-xs font-medium`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}`} />
        {config.label}
      </span>
      {showDetails && diasCobertura !== undefined && diasCobertura !== null && (
        <span className="text-[10px] text-gray-500 mt-0.5">
          {diasCobertura.toFixed(0)}d cobertura
        </span>
      )}
    </div>
  )
}
