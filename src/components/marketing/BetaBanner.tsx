import { DoubleBezel, ScrollReveal } from '@/components/marketing'

export function BetaBanner() {
  return (
    <div className="max-w-[720px] mx-auto -mt-8">
      <ScrollReveal>
        <DoubleBezel
          variant="light"
          outerClassName="ring-[var(--signal)]/10 bg-[var(--signal)]/[0.03]"
          className="p-6"
        >
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Estamos construindo em publico.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2 max-w-[55ch]">
            O FlowB2B esta em versao beta — funcional, em uso, mas ainda em
            refinamento. Os 3 primeiros meses sao por nossa conta para que voce
            teste sem risco. Seu feedback define o que priorizamos.
          </p>
        </DoubleBezel>
      </ScrollReveal>
    </div>
  )
}
