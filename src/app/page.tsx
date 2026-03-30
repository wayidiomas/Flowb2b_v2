import { Metadata } from 'next'
import { satoshi } from '@/lib/fonts'
import { GrainOverlay, Navbar, Hero, BetaBanner, ProblemSection, Features, HowItWorks, Pricing, FAQ, FornecedorCTA, CTAFinal, Footer } from '@/components/marketing'
import '@/styles/marketing-tokens.css'

export const metadata: Metadata = {
  title: 'FlowB2B — Compras automaticas para atacado e varejo',
  description:
    'Gere pedidos de compra com base em dados de venda e estoque. Curva ABC, portal do fornecedor e integracao Bling. 3 meses gratis.',
  openGraph: {
    title: 'FlowB2B — Compras automaticas para atacado e varejo',
    description: 'Pedidos de compra gerados por dados reais. Teste gratis por 3 meses.',
    type: 'website',
  },
  other: {
    'theme-color': '#2293F9',
  },
}

export default function LandingPage() {
  return (
    <div className={`marketing ${satoshi.variable}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
      >
        Pular para o conteudo
      </a>
      <GrainOverlay />
      <Navbar />

      <main id="main-content">
        <Hero />

        {/* Transition dark to light */}
        <div className="h-24 bg-gradient-to-b from-[#0A489D] to-[var(--bg-canvas)]" />

        {/* Light sections */}
        <div className="bg-[var(--bg-canvas)]">
          <BetaBanner />

          <ProblemSection />
          <Features />

          <HowItWorks />
          <Pricing />
          <FAQ />
          <FornecedorCTA />
        </div>

        {/* CTA Final — dark section with gradient transition */}
        <CTAFinal />

        {/* Footer */}
        <Footer />
      </main>
    </div>
  )
}
