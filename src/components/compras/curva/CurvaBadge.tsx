'use client'

interface CurvaBadgeProps {
  curva: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const curvaColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  B: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  C: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  D: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
}

export function CurvaBadge({ curva, size = 'sm', showLabel = false }: CurvaBadgeProps) {
  const colors = curvaColors[curva] || curvaColors.D
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      {showLabel ? `Curva ${curva}` : curva}
    </span>
  )
}
