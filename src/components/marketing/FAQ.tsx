import { SectionContainer, Eyebrow, ScrollReveal } from '@/components/marketing'

/* ── FAQ data ── */

const column1 = [
  {
    question: 'O que significa versao beta?',
    answer:
      'O sistema esta funcional e em uso, mas em refinamento ativo. Funcionalidades podem ser ajustadas com base no seu feedback. Por isso os 3 primeiros meses sao gratuitos.',
  },
  {
    question: 'Preciso ter Bling para usar?',
    answer:
      'Nao. O plano Essencial funciona independente — voce cadastra produtos e fornecedores manualmente. A integracao Bling eh um recurso do plano Pro.',
  },
  {
    question: 'Como funciona o periodo gratis?',
    answer:
      'Crie sua conta sem cartao de credito. Acesso completo ao plano escolhido por 3 meses. No final, voce decide se quer continuar.',
  },
  {
    question: 'Quantos fornecedores posso ter?',
    answer:
      'Ilimitados nos dois planos. Cada fornecedor recebe seu proprio acesso ao portal.',
  },
] as const

const column2 = [
  {
    question: 'Meus dados estao seguros?',
    answer:
      'Cada empresa tem dados completamente isolados. Criptografia em transito e em repouso. Nenhum funcionario tem acesso aos seus dados comerciais.',
  },
  {
    question: 'E se eu passar de 15 pedidos no Essencial?',
    answer:
      'Voce recebe um aviso e pode migrar para o Pro a qualquer momento. Sem perder dados, sem interrupcao.',
  },
  {
    question: 'Como a sugestao inteligente funciona?',
    answer:
      'O sistema analisa historico de vendas e estoque atual, calcula a media diaria, aplica margem de seguranca e arredonda por embalagem. O resultado eh a quantidade ideal por produto.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Sem multa, sem burocracia, sem pegadinha.',
  },
] as const

/* ── FAQ Item ── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {question}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2 max-w-[48ch]">
        {answer}
      </p>
    </div>
  )
}

/* ── Main Component ── */

export function FAQ() {
  return (
    <SectionContainer id="faq">
      {/* Header */}
      <ScrollReveal>
        <Eyebrow>DUVIDAS COMUNS</Eyebrow>
        <h2
          className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
          style={{
            fontFamily: 'var(--font-satoshi), sans-serif',
            textWrap: 'balance',
          }}
        >
          O que voce precisa saber antes de comecar.
        </h2>
      </ScrollReveal>

      {/* Grid */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-x-12">
        {/* Column 1 */}
        <div className="flex flex-col gap-10">
          {column1.map((item, i) => (
            <ScrollReveal key={item.question} delay={i * 0.06}>
              <FAQItem question={item.question} answer={item.answer} />
            </ScrollReveal>
          ))}
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-10 mt-10 md:mt-0">
          {column2.map((item, i) => (
            <ScrollReveal key={item.question} delay={0.04 + i * 0.06}>
              <FAQItem question={item.question} answer={item.answer} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}
