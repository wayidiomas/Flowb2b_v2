import { Eyebrow, ScrollReveal, ButtonPrimary, MagneticButton } from '@/components/marketing'
import { CTAOrbs } from './CTAOrbs'

export function CTAFinal() {
  return (
    <div className="relative overflow-hidden">
      {/* Gradient transition from light to dark */}
      <div className="h-[200px] bg-gradient-to-b from-[var(--bg-canvas)] to-[#0A489D]" />

      {/* Section content */}
      <section className="min-h-[60vh] py-20 md:py-32" style={{ background: 'linear-gradient(to bottom, #0A489D, #083B7F)' }}>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          {/* Left column — content */}
          <ScrollReveal>
            <div>
              <Eyebrow>COMECE AGORA</Eyebrow>

              <h2
                className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white leading-[1.08]"
                style={{
                  fontFamily: 'var(--font-satoshi), sans-serif',
                  textWrap: 'balance',
                }}
              >
                3 meses gratis para repensar suas compras.
              </h2>

              <p className="text-lg text-white/75 max-w-[44ch] leading-relaxed mt-6">
                Crie sua conta em 2 minutos. Sem cartao, sem compromisso. Se nao
                fizer sentido, cancele quando quiser.
              </p>

              <MagneticButton className="mt-8">
                <ButtonPrimary
                  size="lg"
                  href="/register"
                  className="shadow-[0_0_40px_rgba(255,190,74,0.2)]"
                >
                  Criar minha conta gratis
                </ButtonPrimary>
              </MagneticButton>

              <p className="text-xs text-white/50 mt-4">
                Versao beta — seu feedback define nossas prioridades.
              </p>
            </div>
          </ScrollReveal>

          {/* Right column — decorative orbs (desktop only) */}
          <div className="hidden lg:block relative">
            <CTAOrbs />
          </div>
        </div>
      </section>
    </div>
  )
}
