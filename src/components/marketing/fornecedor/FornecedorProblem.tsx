import { SectionContainer } from '../SectionContainer'
import { ScrollReveal } from '../ScrollReveal'
import { Eyebrow } from '../Eyebrow'
import { DoubleBezel } from '../DoubleBezel'
import { FornecedorProblemCycleAnimation } from './FornecedorProblemCycleAnimation'

const painPoints = [
  {
    number: '02',
    title: 'Sem visibilidade do estoque do lojista',
    description:
      'Voce nao sabe o que seu cliente tem na prateleira. Liga pra oferecer e ele ja comprou de outro. Oportunidade perdida.',
  },
  {
    number: '03',
    title: 'Tabelas de preco desatualizadas',
    description:
      'Cada vendedor manda uma tabela diferente. O lojista reclama do preco. Voce descobre que a tabela era de 3 meses atras.',
  },
  {
    number: '04',
    title: 'Conferencia de estoque na base da confianca',
    description:
      'Representante visita a loja, conta no olho. Divergencia? Ninguem sabe quem errou. Sem registro, sem historico.',
  },
]

export function FornecedorProblem() {
  return (
    <SectionContainer id="problema-fornecedor">
      {/* -- Eyebrow + Headline -- */}
      <ScrollReveal>
        <Eyebrow>SEM O FLOWB2B</Eyebrow>
        <h2
          className="mt-4 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
        >
          Como voce gerencia seus lojistas hoje?
        </h2>
      </ScrollReveal>

      {/* -- Bento Grid -- */}
      <div
        className="mt-14 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-6 md:gap-8"
        style={{ gridTemplateRows: 'auto auto' }}
      >
        {/* Card 1 -- GRANDE, row-span-2, DoubleBezel */}
        <ScrollReveal delay={0} className="col-span-1 md:row-span-2">
          <DoubleBezel variant="light" className="p-8 h-full">
            <span className="font-mono text-sm text-[var(--text-muted)]">01</span>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-2">
              Pedidos por WhatsApp, e-mail e telefone
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2 max-w-[40ch]">
              Cada lojista pede de um jeito diferente. Voce perde tempo
              consolidando, errando e reenviando. Multiplica por 20, 50, 100
              clientes.
            </p>
            <FornecedorProblemCycleAnimation />
          </DoubleBezel>
        </ScrollReveal>

        {/* Cards 2, 3, 4 -- border-top style */}
        {painPoints.map((point, i) => {
          const colStart =
            i === 2 ? 'md:col-start-2' : i === 1 ? 'md:col-start-3' : 'md:col-start-2'

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
