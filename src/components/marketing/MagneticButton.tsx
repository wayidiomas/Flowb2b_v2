'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  strength?: number
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isTouch, setIsTouch] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, { stiffness: 150, damping: 15 })
  const springY = useSpring(y, { stiffness: 150, damping: 15 })

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTouch || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = (e.clientX - centerX) * strength
    const dy = (e.clientY - centerY) * strength

    // Cap displacement at 4px
    const maxDisplacement = 4
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > maxDisplacement) {
      const scale = maxDisplacement / distance
      x.set(dx * scale)
      y.set(dy * scale)
    } else {
      x.set(dx)
      y.set(dy)
    }
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  if (isTouch) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}
