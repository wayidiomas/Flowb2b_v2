import {
  DoubleBezel,
  Eyebrow,
  SectionContainer,
  ScrollReveal,
  ButtonPrimary,
} from '@/components/marketing'

/* ── Feature lists ── */

const essentialFeatures = [
  'Ate 15 pedidos de compra automaticos por mes',
  '200 MB de armazenamento',
  'Sugestao inteligente com IA',
  'Curva ABC por faturamento e quantidade',
  'Portal do fornecedor — acesso ilimitado',
  'Portal do representante',
  'Conferencia de estoque colaborativa',
  'Tabelas de preco e politicas de compra',
  'Link publico de pedidos',
  'Exportacao PDF, CSV, Excel',
]

const proFeatures = [
  'Integracao completa com Bling ERP',
  'Sincronizacao de produtos, estoque e vendas',
  'Importacao de notas fiscais detalhadas',
  'Atualizacao diaria automatica',
  'Pedidos de compra ilimitados por mes',
  'Armazenamento expandido',
  'Suporte prioritario',
]

/* ── Feature dot item ── */

function FeatureDot({
  children,
  className = 'text-[var(--text-secondary)]',
  dotColor = 'bg-[var(--accent)]',
}: {
  children: React.ReactNode
  className?: string
  dotColor?: string
}) {
  return (
    <li className="flex items-start gap-3 py-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-2 shrink-0`}
        aria-hidden
      />
      <span className={`text-sm ${className}`}>{children}</span>
    </li>
  )
}

/* ── Card Essencial ── */

function EssentialCard() {
  return (
    <DoubleBezel variant="warm" className="p-8">
      {/* Tag */}
      <span className="text-[11px] uppercase tracking-[0.12em] text-white font-bold">
        Essencial
      </span>

      {/* Price */}
      <div className="mt-4">
        <span className="font-mono text-[3.25rem] font-bold text-white tracking-tight">
          R$ 49,90
        </span>
        <span className="text-base text-white/60 ml-1">/mes</span>
      </div>

      {/* Note */}
      <p className="text-sm text-white/70 mt-2">
        Gratis por 3 meses
      </p>

      {/* Divider */}
      <div className="border-t border-white/20 my-6" />

      {/* Features */}
      <ul>
        {essentialFeatures.map((f) => (
          <FeatureDot key={f} className="text-white/85" dotColor="bg-white">{f}</FeatureDot>
        ))}
      </ul>

      {/* CTA — botão AZUL no card laranja */}
      <a
        href="/register"
        className="flex items-center justify-center gap-3 w-full mt-8 rounded-xl py-3.5 text-sm font-bold bg-white text-[#D97706] hover:bg-white/90 active:scale-[0.98] transition-[background-color,transform] duration-200"
      >
        Comecar 3 meses gratis
      </a>
    </DoubleBezel>
  )
}

/* ── Card Pro ── */

function ProCard() {
  return (
    <DoubleBezel variant="accent" className="p-8">
      {/* Tag */}
      <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--cta)] font-bold flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--cta)] animate-pulse" />
        Pro — Bling integrado
      </span>

      {/* Price */}
      <div className="mt-4">
        <span className="font-mono text-[3.25rem] font-bold text-white tracking-tight">
          R$ 99,90
        </span>
        <span className="text-base text-white/60 ml-1">/mes</span>
      </div>

      {/* Note */}
      <p className="text-sm text-white/70 mt-2">Gratis por 3 meses</p>

      {/* Divider */}
      <div className="border-t border-white/15 my-6" />

      {/* Label */}
      <span className="text-[11px] uppercase tracking-[0.12em] text-white/50 mb-3 block">
        Tudo do Essencial, mais:
      </span>

      {/* Features */}
      <ul>
        {proFeatures.map((f) => (
          <FeatureDot key={f} className="text-white/85" dotColor="bg-[var(--cta)]">
            {f}
          </FeatureDot>
        ))}
      </ul>

      {/* CTA — botão BRANCO no card azul */}
      <a
        href="/register"
        className="flex items-center justify-center gap-3 w-full mt-8 rounded-xl py-3.5 text-sm font-bold bg-white text-[#0A489D] hover:bg-white/90 active:scale-[0.98] transition-[background-color,transform] duration-200"
      >
        Comecar 3 meses gratis
      </a>
    </DoubleBezel>
  )
}

/* ── Main Component ── */

export function Pricing() {
  return (
    <SectionContainer id="precos">
      {/* Header */}
      <div className="text-center mb-14 md:mb-20">
        <ScrollReveal>
          <Eyebrow>PLANOS</Eyebrow>
          <h2
            className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Comece gratis. Pague so se fizer sentido.
          </h2>
          <p className="text-base text-[var(--text-secondary)] mt-4">
            3 meses por nossa conta. Sem cartao. Cancele quando quiser.
          </p>
        </ScrollReveal>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-6">
        {/* Pro card first on mobile */}
        <ScrollReveal delay={0.12} className="md:order-none order-first">
          <ProCard />
        </ScrollReveal>

        {/* Essential card */}
        <ScrollReveal delay={0} className="md:order-first">
          <EssentialCard />
        </ScrollReveal>
      </div>

      {/* Volume note */}
      <p className="text-sm text-[var(--text-muted)] text-center mt-8">
        Volume maior? Entre em contato para um plano sob medida.
      </p>
    </SectionContainer>
  )
}
