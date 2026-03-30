import { SectionContainer } from './SectionContainer'
import { ScrollReveal } from './ScrollReveal'
import { Eyebrow } from './Eyebrow'
import { DoubleBezel } from './DoubleBezel'
import { ProblemCycleAnimation } from './ProblemCycleAnimation'

const painPoints = [
  {
    number: '02',
    title: 'Rupturas invisiveis',
    description:
      'Produto acaba na gondola. Ninguem percebe ate o cliente reclamar. Sem classificacao ABC, a prioridade eh achismo.',
  },
  {
    number: '03',
    title: 'Fornecedor e lojista, cada um no seu mundo',
    description:
      'Planilhas divergentes, precos desatualizados, pedidos que se perdem entre e-mails e ligacoes.',
  },
  {
    number: '04',
    title: 'Compras sem dados',
    description:
      'Sem cruzar vendas com estoque e prazo de entrega, voce compra demais ou de menos. Capital empatado ou prateleira vazia.',
  },
]

export function ProblemSection() {
  return (
    <SectionContainer id="problema">
      {/* ── Eyebrow + Headline ── */}
      <ScrollReveal>
        <Eyebrow>ANTES DO FLOWB2B</Eyebrow>
        <h2
          className="mt-4 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
        >
          Reconhece alguma dessas situacoes?
        </h2>
      </ScrollReveal>

      {/* ── Bento Grid ── */}
      <div
        className="mt-14 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-6 md:gap-8"
        style={{ gridTemplateRows: 'auto auto' }}
      >
        {/* Card 1 — GRANDE, row-span-2, DoubleBezel */}
        <ScrollReveal
          delay={0}
          className="col-span-1 md:row-span-2"
        >
          <DoubleBezel variant="light" className="p-8 h-full">
            <span className="font-mono text-sm text-[var(--text-muted)]">01</span>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-2">
              Pedidos por WhatsApp e planilha
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2 max-w-[40ch]">
              Mensagem para o fornecedor. PDF de volta. Digitar tudo no sistema.
              Conferir. Errar. Refazer. Toda semana, o mesmo ciclo manual que
              consome horas e gera retrabalho.
            </p>
            <ProblemCycleAnimation />
          </DoubleBezel>
        </ScrollReveal>

        {/* Cards 2, 3, 4 — border-top style, no card container */}
        {painPoints.map((point, i) => {
          // Card 2 → col-start-2, Card 3 → col-start-3, Card 4 → col-start-2
          const colStart = i === 2 ? 'md:col-start-2' : i === 1 ? 'md:col-start-3' : 'md:col-start-2'

          return (
            <ScrollReveal
              key={point.number}
              delay={0.08 * (i + 1)}
              className={`col-span-1 ${colStart}`}
            >
              <div className="border-t border-[var(--border)] pt-6 pb-8">
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  {point.number}
                </span>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-2">
                  {point.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2 max-w-[40ch]">
                  {point.description}
                </p>
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    </SectionContainer>
  )
}
