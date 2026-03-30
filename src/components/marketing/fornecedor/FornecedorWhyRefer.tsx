import { CurrencyDollar, ShoppingCart, ChartBar } from '@phosphor-icons/react/dist/ssr'
import { SectionContainer, Eyebrow, ScrollReveal } from '@/components/marketing'
import { type ReactNode } from 'react'

/* -- Items data -- */

const items: {
  icon: ReactNode
  title: string
  desc: string
}[] = [
  {
    icon: <CurrencyDollar weight="duotone" className="w-7 h-7 text-[#D97706]" />,
    title: 'Receita passiva',
    desc: '10% recorrente sobre cada mensalidade. Indica 10 lojistas Pro? R$99,90/mes sem esforco.',
  },
  {
    icon: <ShoppingCart weight="duotone" className="w-7 h-7 text-[#D97706]" />,
    title: 'Mais pedidos automaticos',
    desc: 'Cada lojista no FlowB2B gera pedidos que chegam direto no seu painel. Mais clientes no sistema = mais vendas pra voce.',
  },
  {
    icon: <ChartBar weight="duotone" className="w-7 h-7 text-[#D97706]" />,
    title: 'Dados dos seus clientes',
    desc: 'Veja o estoque, a curva ABC e o historico de compras de cada lojista. Venda com inteligencia, nao no escuro.',
  },
]

/* -- Main Component -- */

export function FornecedorWhyRefer() {
  return (
    <SectionContainer id="vantagens-fornecedor">
      <div className="max-w-[640px] mx-auto">
        <ScrollReveal>
          <Eyebrow>VANTAGENS</Eyebrow>
          <h2
            className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Indicar lojistas beneficia voce de 3 formas.
          </h2>
        </ScrollReveal>

        <div className="mt-14">
          {items.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.1}>
              <div
                className={`flex gap-6 items-start py-8 ${
                  i < items.length - 1 ? 'border-b border-[var(--border)]' : ''
                }`}
              >
                {/* Icon squircle */}
                <div className="w-14 h-14 rounded-2xl bg-[#D97706]/10 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1 max-w-[44ch]">
                    {item.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}
