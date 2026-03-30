import Image from 'next/image'
import Link from 'next/link'
import { ClipboardText, CurrencyDollar, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { DoubleBezel } from '@/components/marketing'
import { HeroFloatingBadge } from '../HeroFloatingBadge'

export function FornecedorHero() {
  return (
    <section
      className="relative min-h-[100dvh] flex items-center overflow-hidden pt-28 pb-16 px-4 md:px-6"
      style={{
        background: 'linear-gradient(to bottom, #F59E0B, #EA580C)',
      }}
    >
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
        {/* ── Left column: Text ── */}
        <div>
          {/* Badge */}
          <span
            className="relative z-10 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs uppercase tracking-[0.08em] font-bold text-[#D97706] bg-white shadow-sm"
            style={{ animation: 'ring-pulse 3s ease-in-out infinite' }}
          >
            Portal gratuito
          </span>

          {/* H1 */}
          <h1
            className="mt-6 text-[2.75rem] md:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[1.02] text-white"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Venda para todos
            <br />
            os seus lojistas
            <br />
            em um so lugar.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg md:text-xl text-white/80 max-w-[48ch] leading-relaxed">
            Receba pedidos, negocie em tempo real e acompanhe o estoque
            dos seus clientes. Gratis para sempre — e ganhe 10% indicando lojistas.
          </p>

          {/* CTA group */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/fornecedor/registro"
              className="inline-flex items-center gap-2 bg-white text-[#D97706] font-bold rounded-full px-8 py-4 hover:bg-white/90 active:scale-[0.98] transition-all duration-200 text-base"
            >
              Criar conta gratuita
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Link>
            <Link
              href="/fornecedor/login"
              className="text-base font-medium text-white/80 underline underline-offset-4 decoration-white/40 hover:text-white hover:decoration-white/90 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)]"
            >
              Ja tenho conta
            </Link>
          </div>

          {/* Proof metrics — desktop */}
          <div className="mt-10 hidden md:flex items-center gap-8">
            <ProofMetric value="R$ 0" label="por mes" />
            <div className="w-px h-10 bg-white/20" aria-hidden />
            <ProofMetric value="Ilimitado" label="lojistas" />
            <div className="w-px h-10 bg-white/20" aria-hidden />
            <ProofMetric value="10%" label="por indicacao" />
          </div>
          {/* Proof metrics — mobile */}
          <div className="mt-10 grid grid-cols-3 text-center gap-4 md:hidden">
            <ProofMetric value="R$ 0" label="por mes" />
            <ProofMetric value="Ilimitado" label="lojistas" />
            <ProofMetric value="10%" label="por indicacao" />
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
                  src="/assets/landing/fornecedor-dashboard.png"
                  alt="Dashboard do portal do fornecedor FlowB2B mostrando pedidos e negociacoes"
                  width={720}
                  height={540}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto block"
                />
              </DoubleBezel>
            </div>

            {/* Floating badge: top-right — pedidos pendentes */}
            <HeroFloatingBadge
              className="absolute -top-4 -right-8 z-10"
              delay={0}
            >
              <ClipboardText weight="bold" className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span className="font-mono text-sm font-semibold text-[#F59E0B] whitespace-nowrap">
                3 pedidos pendentes
              </span>
            </HeroFloatingBadge>

            {/* Floating badge: bottom-left — valor em aberto */}
            <HeroFloatingBadge
              className="absolute bottom-8 -left-10 z-10"
              delay={1.5}
            >
              <CurrencyDollar weight="bold" className="w-4 h-4 text-[var(--success)] shrink-0" />
              <span className="font-mono text-sm font-semibold text-[var(--success)] whitespace-nowrap">
                R$ 11.268 em aberto
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
