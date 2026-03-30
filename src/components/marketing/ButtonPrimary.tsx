'use client'

import { ArrowRight } from '@phosphor-icons/react'
import Link from 'next/link'

interface ButtonPrimaryProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  size?: 'md' | 'lg'
  className?: string
  fullWidth?: boolean
}

const sizeStyles = {
  md: 'py-2.5 pl-6 pr-2 text-sm',
  lg: 'py-3.5 pl-8 pr-3 text-base',
}

const iconSizes = {
  md: 'w-7 h-7',
  lg: 'w-8 h-8',
}

export function ButtonPrimary({
  children,
  href,
  onClick,
  size = 'md',
  className = '',
  fullWidth = false,
}: ButtonPrimaryProps) {
  const baseStyles = `
    group relative inline-flex items-center gap-3
    rounded-full font-medium
    bg-[var(--cta)] text-[var(--cta-text)]
    transition-transform duration-300
    hover:scale-[1.02] active:scale-[0.97]
    [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)]
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full justify-center' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  const iconCircle = (
    <span className={`
      ${iconSizes[size]} rounded-full bg-black/10
      flex items-center justify-center
      transition-[transform] duration-300
      group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105
      [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)]
    `.trim().replace(/\s+/g, ' ')}>
      <ArrowRight weight="bold" className="w-4 h-4" />
    </span>
  )

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        <span>{children}</span>
        {iconCircle}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={baseStyles}>
      <span>{children}</span>
      {iconCircle}
    </button>
  )
}
