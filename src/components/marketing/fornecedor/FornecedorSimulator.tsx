'use client'

import { useState } from 'react'
import { SectionContainer, Eyebrow, ScrollReveal, DoubleBezel } from '@/components/marketing'

type Plano = 'essencial' | 'pro'

const PRICES: Record<Plano, number> = {
  essencial: 49.9,
  pro: 99.9,
}

const COMMISSION_RATE = 0.10

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function FornecedorSimulator() {
  const [lojistas, setLojistas] = useState(10)
  const [plano, setPlano] = useState<Plano>('pro')

  const price = PRICES[plano]
  const monthly = lojistas * price * COMMISSION_RATE
  const annual = monthly * 12

  return (
    <SectionContainer id="simulador-indicacao">
      <div className="max-w-[720px] mx-auto">
        <ScrollReveal>
          <Eyebrow>PROGRAMA DE INDICACAO</Eyebrow>
          <h2
            className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Quanto voce pode ganhar indicando lojistas?
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mt-14">
            <DoubleBezel variant="light" className="p-8">
              {/* Slider */}
              <div>
                <label
                  htmlFor="lojistas-slider"
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  Quantos lojistas voce pretende indicar?
                </label>
                <div className="flex items-center gap-4 mt-3">
                  <input
                    id="lojistas-slider"
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={lojistas}
                    onChange={(e) => setLojistas(Number(e.target.value))}
                    className="w-full h-2 rounded-full cursor-pointer accent-[#D97706]"
                  />
                  <span className="font-mono font-bold text-lg text-[var(--text-primary)] tabular-nums min-w-[2.5ch] text-right">
                    {lojistas}
                  </span>
                </div>
              </div>

              {/* Plan toggle */}
              <div className="mt-6">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPlano('essencial')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      plano === 'essencial'
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[var(--bg-shell)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Essencial R$49,90
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlano('pro')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      plano === 'pro'
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[var(--bg-shell)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Pro R$99,90
                  </button>
                </div>
              </div>

              {/* Result card */}
              <div className="mt-8 bg-[var(--bg-shell)] rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  Sua receita mensal estimada:
                </p>
                <p className="font-mono text-[2.5rem] md:text-[3rem] font-bold text-[#D97706] leading-tight mt-2 tabular-nums">
                  R$ {formatBRL(monthly)}
                  <span className="text-lg font-semibold text-[var(--text-muted)]">
                    {' '}/mes
                  </span>
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  = {lojistas} lojistas x R$ {formatBRL(price)} x 10%
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)] mt-2 tabular-nums">
                  R$ {formatBRL(annual)} /ano
                </p>
              </div>

              {/* Note */}
              <p className="text-sm text-[var(--text-muted)] text-center mt-4">
                Voce recebe enquanto o lojista for assinante. Sem limite de indicacoes.
              </p>
            </DoubleBezel>
          </div>
        </ScrollReveal>
      </div>
    </SectionContainer>
  )
}
