'use client'

import { memo } from 'react'

export const CTAOrbs = memo(function CTAOrbs() {
  return (
    <div className="relative w-full h-full min-h-[300px]">
      {/* Orb 1 — top-right area */}
      <div
        className="absolute top-8 right-4 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(34,147,249,0.12), transparent 70%)',
          filter: 'blur(60px)',
          animation: 'drift 8s ease-in-out infinite alternate',
        }}
      />

      {/* Orb 2 — bottom-left area */}
      <div
        className="absolute bottom-8 left-4 w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(34,147,249,0.08), transparent 70%)',
          filter: 'blur(60px)',
          animation: 'drift 8s ease-in-out infinite alternate',
          animationDelay: '3s',
        }}
      />
    </div>
  )
})
