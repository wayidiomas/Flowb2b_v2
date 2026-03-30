'use client'

import React, { type ReactNode } from 'react'

interface HeroFloatingBadgeProps {
  children: ReactNode
  className?: string
  delay?: number
}

export const HeroFloatingBadge = React.memo(function HeroFloatingBadge({
  children,
  className = '',
  delay = 0,
}: HeroFloatingBadgeProps) {
  return (
    <div
      className={className}
      style={{
        animation: 'float 4s ease-in-out infinite',
        animationDelay: `${delay}s`,
        willChange: 'transform',
      }}
    >
      {/* Outer shell (mini Double-Bezel) */}
      <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08] p-1">
        {/* Inner core */}
        <div className="rounded-xl bg-[#0A489D] px-3 py-2.5 flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  )
})
