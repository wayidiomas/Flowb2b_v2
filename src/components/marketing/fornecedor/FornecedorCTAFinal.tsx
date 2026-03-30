import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { ScrollReveal } from '@/components/marketing'

/* -- Decorative orbs (amber variant) -- */

function FornecedorCTAOrbs() {
  return (
    <div className="relative w-full h-full min-h-[300px]">
      {/* Orb 1 -- top-right area */}
      <div
        className="absolute top-8 right-4 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(217,119,6,0.15), transparent 70%)',
          filter: 'blur(60px)',
          animation: 'drift 8s ease-in-out infinite alternate',
        }}
      />

      {/* Orb 2 -- bottom-left area */}
      <div
        className="absolute bottom-8 left-4 w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)',
          filter: 'blur(60px)',
          animation: 'drift 8s ease-in-out infinite alternate',
          animationDelay: '3s',
        }}
      />
    </div>
  )
}

/* -- Main Component -- */

export function FornecedorCTAFinal() {
  return (
    <div className="relative overflow-hidden">
      {/* Gradient transition from light to amber */}
      <div className="h-[200px] bg-gradient-to-b from-[var(--bg-canvas)] to-[#D97706]" />

      {/* Section content */}
      <section
        className="min-h-[60vh] py-20 md:py-32"
        style={{ background: 'linear-gradient(to bottom, #D97706, #EA580C)' }}
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          {/* Left column -- content */}
          <ScrollReveal>
            <div>
              {/* Eyebrow override: white on amber background */}
              <span className="inline-block text-[11px] uppercase tracking-[0.12em] font-medium text-white/60 border-b-2 border-white/20 pb-1">
                COMECE AGORA
              </span>

              <h2
                className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white leading-[1.08]"
                style={{
                  fontFamily: 'var(--font-satoshi), sans-serif',
                  textWrap: 'balance',
                }}
              >
                Gratuito para sempre. E voce ainda ganha por indicar.
              </h2>

              <p className="text-lg text-white/75 max-w-[44ch] leading-relaxed mt-6">
                Crie sua conta em 2 minutos. Receba pedidos, negocie em tempo
                real e ganhe 10% por cada lojista indicado.
              </p>

              <Link
                href="/fornecedor/registro"
                className="inline-flex items-center gap-2 bg-white text-[#D97706] font-bold rounded-full px-8 py-4 hover:bg-white/90 active:scale-[0.98] transition-all duration-200 text-base mt-8"
              >
                Criar conta gratuita
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Link>

              <p className="text-xs text-white/50 mt-4">
                Seu CNPJ precisa estar cadastrado por um lojista FlowB2B.
              </p>
            </div>
          </ScrollReveal>

          {/* Right column -- decorative orbs (desktop only) */}
          <div className="hidden lg:block relative">
            <FornecedorCTAOrbs />
          </div>
        </div>
      </section>
    </div>
  )
}
