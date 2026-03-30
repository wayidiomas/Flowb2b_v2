import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { DoubleBezel, SectionContainer, ScrollReveal } from '@/components/marketing'

export function FornecedorReferralBanner() {
  return (
    <SectionContainer className="!py-0 -mt-8">
      <ScrollReveal>
        <div className="max-w-[800px] mx-auto">
          <DoubleBezel variant="warm">
            <div className="p-8 md:p-10">
              {/* Title */}
              <h2
                className="text-2xl md:text-3xl font-bold text-white tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
              >
                Indique lojistas. Ganhe 10% todo mes.
              </h2>

              {/* Description */}
              <p className="mt-4 text-white/80 text-base md:text-lg leading-relaxed max-w-[60ch]">
                Para cada lojista que assinar o FlowB2B por sua indicacao,
                voce recebe 10% da mensalidade — todo mes, enquanto ele for assinante.
                Sem limite de indicacoes.
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-6 mt-8">
                <div>
                  <span className="font-mono text-2xl md:text-3xl font-bold text-white tabular-nums">
                    10
                  </span>
                  <span className="block text-sm text-white/60 mt-1">
                    lojistas indicados
                  </span>
                </div>
                <div>
                  <span className="font-mono text-2xl md:text-3xl font-bold text-white tabular-nums">
                    R$ 99,90
                  </span>
                  <span className="block text-sm text-white/60 mt-1">
                    Plano Pro / mes
                  </span>
                </div>
                <div>
                  <span className="font-mono text-2xl md:text-3xl font-bold text-white tabular-nums">
                    R$ 99,90
                  </span>
                  <span className="block text-sm text-white/60 mt-1">
                    sua receita / mes
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8">
                <Link
                  href="/fornecedor/registro"
                  className="inline-flex items-center gap-2 bg-white text-[#D97706] font-bold rounded-xl py-3 px-6 hover:bg-white/90 active:scale-[0.98] transition-all duration-200 text-base"
                >
                  Quero indicar lojistas
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Link>
              </div>

              {/* Note */}
              <p className="mt-4 text-sm text-white/50">
                Indicacao via link personalizado no seu painel.
              </p>
            </div>
          </DoubleBezel>
        </div>
      </ScrollReveal>
    </SectionContainer>
  )
}
