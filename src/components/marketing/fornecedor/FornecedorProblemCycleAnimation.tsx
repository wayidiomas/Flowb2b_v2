'use client'

import { memo } from 'react'
import { WhatsappLogo, EnvelopeSimple, Phone, ArrowsClockwise } from '@phosphor-icons/react'

const icons = [
  { Icon: WhatsappLogo, label: 'WhatsApp' },
  { Icon: EnvelopeSimple, label: 'E-mail' },
  { Icon: Phone, label: 'Telefone' },
  { Icon: ArrowsClockwise, label: 'Repetir' },
]

export const FornecedorProblemCycleAnimation = memo(
  function FornecedorProblemCycleAnimation() {
    return (
      <div className="relative mt-6 flex items-center justify-center">
        {/* Spinning ring with icons */}
        <div
          className="relative w-[180px] h-[180px]"
          style={{ animation: 'problem-cycle-spin 14s linear infinite' }}
        >
          {icons.map(({ Icon, label }, i) => {
            // Position each icon at 0deg, 90deg, 180deg, 270deg on the circle
            const angle = (i * 90) * (Math.PI / 180)
            const radius = 80
            const x = 90 + radius * Math.sin(angle)
            const y = 90 - radius * Math.cos(angle)

            return (
              <span
                key={label}
                className="absolute flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  // Counter-rotate so icons stay upright
                  animation: 'problem-cycle-spin 14s linear infinite reverse',
                }}
              >
                <Icon weight="duotone" className="w-5 h-5" />
              </span>
            )
          })}

          {/* Dashed ring */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 180 180"
            fill="none"
          >
            <circle
              cx="90"
              cy="90"
              r="80"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="8 6"
              className="text-[var(--accent)]/20"
            />
          </svg>
        </div>
      </div>
    )
  },
)
