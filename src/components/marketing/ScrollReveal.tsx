'use client'

import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right'
}

const directionOffset = {
  up: { y: 24 },
  down: { y: -24 },
  left: { x: 24 },
  right: { x: -24 },
}

export function ScrollReveal({
  children,
  delay = 0,
  className = '',
  direction = 'up',
}: ScrollRevealProps) {
  const offset = directionOffset[direction]

  return (
    <motion.div
      initial={{
        opacity: 0,
        filter: 'blur(4px)',
        ...offset,
      }}
      whileInView={{
        opacity: 1,
        filter: 'blur(0px)',
        x: 0,
        y: 0,
      }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.32, 0.72, 0, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
