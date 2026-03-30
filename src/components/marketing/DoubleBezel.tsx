import { type ReactNode } from 'react'

type Variant = 'light' | 'dark' | 'accent' | 'warm'

interface DoubleBezelProps {
  variant?: Variant
  children: ReactNode
  className?: string
  outerClassName?: string
}

const outerStyles: Record<Variant, string> = {
  light: 'bg-[var(--bg-shell)] ring-1 ring-black/[0.04]',
  dark: 'bg-white/[0.04] ring-1 ring-white/[0.06]',
  accent: 'bg-[#0A489D]/30 ring-1 ring-[#0A489D]/40 shadow-[var(--shadow-accent)]',
  warm: 'bg-[#D97706]/30 ring-1 ring-[#F59E0B]/40 shadow-[var(--shadow-cta)]',
}

const innerStyles: Record<Variant, string> = {
  light: 'bg-[var(--bg-surface)]',
  dark: 'bg-[var(--bg-deep-surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]',
  accent: 'bg-gradient-to-b from-[#1A7CD6] to-[#0A489D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]',
  warm: 'bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#EA580C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
}

export function DoubleBezel({ variant = 'light', children, className = '', outerClassName = '' }: DoubleBezelProps) {
  return (
    <div className={`rounded-[1.75rem] p-1.5 ${outerStyles[variant]} ${outerClassName}`}>
      <div className={`rounded-[calc(1.75rem-0.375rem)] ${innerStyles[variant]} ${className}`}>
        {children}
      </div>
    </div>
  )
}
