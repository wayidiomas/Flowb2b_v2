interface EyebrowProps {
  children: React.ReactNode
  className?: string
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <span
      className={`inline-block text-[11px] uppercase tracking-[0.12em] font-medium text-[var(--accent)] border-b-2 border-[var(--accent)]/20 pb-1 ${className}`}
    >
      {children}
    </span>
  )
}
