import { SectionContainer, Eyebrow, ScrollReveal } from '@/components/marketing'

/* -- FAQ data -- */

const column1 = [
  {
    question: 'O portal do fornecedor eh pago?',
    answer:
      'Nao. O FlowB2B eh 100% gratuito para fornecedores. Quem paga sao os lojistas.',
  },
  {
    question: 'Como me cadastro?',
    answer:
      'Um lojista precisa adicionar seu CNPJ primeiro. Depois voce acessa /fornecedor/registro e cria sua conta.',
  },
  {
    question: 'Posso atender varios lojistas?',
    answer:
      'Sim. Uma conta de fornecedor se conecta automaticamente a todos os lojistas que cadastraram seu CNPJ.',
  },
  {
    question: 'Como funciona a contra-proposta?',
    answer:
      'Ao receber um pedido, voce pode alterar quantidades, precos, adicionar descontos ou sugerir substituicoes. O lojista ve sua proposta e decide.',
  },
] as const

const column2 = [
  {
    question: 'Como funciona o programa de indicacao?',
    answer:
      'Voce recebe um link no seu painel. Cada lojista que assinar pelo seu link gera 10% da mensalidade pra voce. Sem limite. Pagamento mensal.',
  },
  {
    question: 'Preciso ter Bling?',
    answer:
      'Nao. O portal do fornecedor funciona independente. A integracao Bling eh um recurso do lojista.',
  },
  {
    question: 'Meus representantes podem usar?',
    answer:
      'Sim. Voce pode ter representantes com acesso proprio. Eles fazem pedidos e conferencias em seu nome.',
  },
  {
    question: 'Posso ver o estoque dos meus clientes?',
    answer:
      'Sim. Para cada lojista conectado, voce ve o estoque atual, minimo e classificacao ABC dos produtos.',
  },
] as const

/* -- FAQ Item -- */

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

/* -- Main Component -- */

export function FornecedorFAQ() {
  return (
    <SectionContainer id="faq-fornecedor">
      {/* Header */}
      <ScrollReveal>
        <Eyebrow>DUVIDAS</Eyebrow>
        <h2
          className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
          style={{
            fontFamily: 'var(--font-satoshi), sans-serif',
            textWrap: 'balance',
          }}
        >
          Perguntas frequentes para fornecedores.
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
