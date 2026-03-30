'use client'

import { useRef, useEffect, useState } from 'react'
import { SectionContainer, Eyebrow, ScrollReveal } from '@/components/marketing'

/* -- Steps data -- */

const steps = [
  {
    number: '01',
    title: 'Seu lojista te cadastra',
    desc: 'Um lojista FlowB2B adiciona seu CNPJ como fornecedor. Voce nao precisa fazer nada nessa etapa.',
    color: 'var(--accent)',
  },
  {
    number: '02',
    title: 'Voce cria sua conta',
    desc: 'Acesse /fornecedor/registro, insira seu CNPJ e crie sua senha. Automaticamente conectado a todos os lojistas que te cadastraram.',
    color: 'var(--accent)',
  },
  {
    number: '03',
    title: 'Receba pedidos e indique lojistas',
    desc: 'Pedidos chegam automaticamente. Negocie, aceite e acompanhe. Indique novos lojistas e ganhe 10% da mensalidade deles.',
    color: '#D97706',
  },
] as const

/* -- Timeline line animation -- */

function TimelineLine() {
  const lineRef = useRef<SVGSVGElement>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const el = lineRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <svg
      ref={lineRef}
      className="absolute left-5 top-10 w-px pointer-events-none"
      style={{ height: 'calc(100% - 40px)' }}
      aria-hidden
    >
      <line
        x1="0.5"
        y1="0"
        x2="0.5"
        y2="100%"
        stroke="var(--border)"
        strokeWidth="1"
        strokeDasharray="500"
        strokeDashoffset={drawn ? '0' : '500'}
        style={{
          transition: 'stroke-dashoffset 1.6s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      />
    </svg>
  )
}

/* -- Step item -- */

function StepItem({
  step,
  isLast,
}: {
  step: (typeof steps)[number]
  isLast: boolean
}) {
  return (
    <div className="flex gap-6 items-start">
      {/* Left -- number squircle + connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${step.color} 10%, transparent)` }}
        >
          <span className="font-mono text-sm font-bold" style={{ color: step.color }}>
            {step.number}
          </span>
        </div>
        {!isLast && (
          <div className="w-px bg-[var(--border)] mx-auto flex-1 min-h-[40px]" />
        )}
      </div>

      {/* Right -- content */}
      <div className={isLast ? '' : 'pb-10'}>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {step.title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[44ch] mt-1">
          {step.desc}
        </p>
      </div>
    </div>
  )
}

/* -- Main Component -- */

export function FornecedorHowItWorks() {
  return (
    <SectionContainer id="como-comecar-fornecedor">
      {/* Header */}
      <div className="max-w-[640px] mx-auto">
        <ScrollReveal>
          <Eyebrow>COMO COMECAR</Eyebrow>
          <h2
            className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Seu primeiro pedido em 3 passos.
          </h2>
        </ScrollReveal>

        {/* Timeline */}
        <div className="mt-14 relative">
          <TimelineLine />

          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 0.15}>
              <StepItem step={step} isLast={i === steps.length - 1} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}
