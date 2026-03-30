import Link from 'next/link'
import { SectionContainer, ScrollReveal, DoubleBezel } from '@/components/marketing'

export function FornecedorCTA() {
  return (
    <SectionContainer className="!py-16 md:!py-20">
      <ScrollReveal>
        <DoubleBezel variant="warm" className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Text */}
            <div className="max-w-[480px]">
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-white/70">
                Para fornecedores
              </span>
              <h3
                className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
              >
                Voce eh fornecedor? O portal eh gratis — e voce ainda ganha por indicar.
              </h3>
              <p className="mt-3 text-sm text-white/75 leading-relaxed max-w-[42ch]">
                Receba pedidos de todos os seus lojistas em um painel.
                Ganhe 10% da mensalidade de cada lojista que indicar.
              </p>
            </div>

            {/* CTA */}
            <div className="shrink-0">
              <Link
                href="/fornecedores"
                className="inline-flex items-center gap-3 bg-white text-[#D97706] font-bold rounded-full px-8 py-4 text-base hover:bg-white/90 active:scale-[0.98] transition-[background-color,transform] duration-200 shadow-lg"
              >
                Seja fornecedor
                <span className="w-8 h-8 rounded-full bg-[#D97706]/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </DoubleBezel>
      </ScrollReveal>
    </SectionContainer>
  )
}
