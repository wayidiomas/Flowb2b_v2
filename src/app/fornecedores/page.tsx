import { Metadata } from 'next'
import { satoshi } from '@/lib/fonts'
import { GrainOverlay, Navbar, Footer } from '@/components/marketing'
import {
  FornecedorHero,
  FornecedorReferralBanner,
  FornecedorProblem,
  FornecedorFeatures,
  FornecedorHowItWorks,
  FornecedorSimulator,
  FornecedorWhyRefer,
  FornecedorFAQ,
  FornecedorCTAFinal,
} from '@/components/marketing/fornecedor'
import '@/styles/marketing-tokens.css'

export const metadata: Metadata = {
  title: 'FlowB2B para Fornecedores — Portal gratuito + programa de indicacao',
  description: 'Receba pedidos de multiplos lojistas em um painel. Gratis para sempre. Ganhe 5% indicando lojistas.',
}

export default function FornecedoresPage() {
  return (
    <div className={`marketing ${satoshi.variable}`}>
      <GrainOverlay />
      <Navbar />
      <main id="main-content">
        <FornecedorHero />
        <div className="h-24 bg-gradient-to-b from-[#EA580C] to-[var(--bg-canvas)]" />
        <div className="bg-[var(--bg-canvas)]">
          <FornecedorReferralBanner />
          <FornecedorProblem />
          <FornecedorFeatures />
          <FornecedorHowItWorks />
          <FornecedorSimulator />
          <FornecedorWhyRefer />
          <FornecedorFAQ />
        </div>
        <FornecedorCTAFinal />
        <Footer />
      </main>
    </div>
  )
}
