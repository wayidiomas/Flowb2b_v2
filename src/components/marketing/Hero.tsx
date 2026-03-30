import Image from 'next/image'
import { TrendUp, Package } from '@phosphor-icons/react/dist/ssr'
import { DoubleBezel, ButtonPrimary, MagneticButton } from '@/components/marketing'
import { HeroFloatingBadge } from './HeroFloatingBadge'

export function Hero() {
  return (
    <section
      className="relative min-h-[100dvh] flex items-center overflow-hidden pt-28 pb-16 px-4 md:px-6"
      style={{
        background: 'linear-gradient(to bottom, #2293F9, #0A489D)',
      }}
    >
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
        {/* ── Left column: Text ── */}
        <div>
          {/* BETA badge */}
          <span
            className="relative z-10 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs uppercase tracking-[0.08em] font-bold text-[#0A489D] bg-[var(--cta)] shadow-sm"
            style={{ animation: 'ring-pulse 3s ease-in-out infinite' }}
          >
            Beta aberto — 3 meses gratis
          </span>

          {/* H1 */}
          <h1
            className="mt-6 text-[2.75rem] md:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[1.02] text-white"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Compras que funcionam
            <br />
            no <span className="text-[var(--cta)]">piloto automatico</span>.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg md:text-xl text-white/80 max-w-[48ch] leading-relaxed">
            Pedidos de compra gerados por dados de venda e estoque.
            Rupturas detectadas antes de virarem problema.
            Fornecedores conectados sem WhatsApp.
          </p>

          {/* CTA group */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <MagneticButton>
              <ButtonPrimary href="/register" size="lg">
                Testar 3 meses gratis
              </ButtonPrimary>
            </MagneticButton>
            <a
              href="#funcionalidades"
              className="text-base font-medium text-white/80 underline underline-offset-4 decoration-white/40 hover:text-white hover:decoration-white/90 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)]"
            >
              Ver funcionalidades
            </a>
          </div>

          {/* Proof metrics — desktop: inline flex, mobile: 3-col grid */}
          <div className="mt-10 hidden md:flex items-center gap-8">
            <ProofMetric value="R$ 0" label="de setup" />
            <div className="w-px h-10 bg-white/20" aria-hidden />
            <ProofMetric value="Zero" label="cartao de credito" />
            <div className="w-px h-10 bg-white/20" aria-hidden />
            <ProofMetric value="5 min" label="para configurar" />
          </div>
          <div className="mt-10 grid grid-cols-3 text-center gap-4 md:hidden">
            <ProofMetric value="R$ 0" label="de setup" />
            <ProofMetric value="Zero" label="cartao de credito" />
            <ProofMetric value="5 min" label="para configurar" />
          </div>
        </div>

        {/* ── Right column: Mockup ── */}
        <div className="hidden lg:block">
          <div
            className="relative"
            style={{
              perspective: '2000px',
            }}
          >
            <div
              className="transition-transform duration-700"
              style={{
                transform: 'perspective(2000px) rotateY(-4deg) rotateX(1deg)',
                transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              <DoubleBezel
                variant="dark"
                outerClassName="rounded-[2rem] p-2"
                className="rounded-[calc(2rem-0.5rem)] overflow-hidden"
              >
                <Image
                  src="/assets/landing/curva-abc.png"
                  alt="Dashboard da Curva ABC do FlowB2B mostrando classificacao de produtos e KPIs"
                  width={720}
                  height={540}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto block"
                />
              </DoubleBezel>
            </div>

            {/* Floating badge: top-right — rupturas */}
            <HeroFloatingBadge
              className="absolute -top-4 -right-8 z-10"
              delay={0}
            >
              <TrendUp weight="bold" className="w-4 h-4 text-[var(--success)] shrink-0" />
              <span className="font-mono text-sm font-semibold text-[var(--success)] whitespace-nowrap">
                -47.2% rupturas
              </span>
            </HeroFloatingBadge>

            {/* Floating badge: bottom-left — pedidos */}
            <HeroFloatingBadge
              className="absolute bottom-8 -left-10 z-10"
              delay={1.5}
            >
              <Package weight="bold" className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span className="font-mono text-sm font-semibold text-[var(--accent)] whitespace-nowrap">
                15 pedidos gerados
              </span>
            </HeroFloatingBadge>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Proof metric sub-component ── */
function ProofMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <span className="font-mono text-2xl font-bold text-white tabular-nums">
        {value}
      </span>
      <span className="block text-[13px] text-white/60">{label}</span>
    </div>
  )
}
