'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { DoubleBezel, SectionContainer, ScrollReveal } from '@/components/marketing'

/* -- Feature data -- */

const features = [
  {
    eyebrow: 'PEDIDOS',
    title: 'Todos os pedidos dos seus lojistas em um painel',
    desc: 'Cada lojista envia pedidos pelo FlowB2B. Voce ve tudo em uma lista, filtra por status, busca por CNPJ ou numero. Sem WhatsApp, sem ligacao.',
    bullets: [
      'Pedidos de todos os lojistas em tempo real',
      'Filtro por status: pendente, aceito, rejeitado, finalizado',
      'Identificacao de pedidos via representante',
      'Historico completo de negociacoes',
    ],
    image: '/assets/landing/fornecedor-dashboard.png',
  },
  {
    eyebrow: 'NEGOCIACAO',
    title: 'Contra-propostas, descontos e substituicoes direto no pedido',
    desc: 'O lojista pediu 10 caixas de X? Voce pode sugerir 12 com 5% de desconto. Produto em falta? Substitua por outro. Tudo registrado.',
    bullets: [
      'Contra-proposta com preco, quantidade e desconto editaveis',
      'Bonificacao por volume (unidades gratis)',
      'Substituicao de produto com justificativa',
      'Prazo de entrega e validade da proposta',
    ],
    image: '/assets/landing/pedido-detalhe.png',
  },
  {
    eyebrow: 'ESTOQUE',
    title: 'Veja o que seu cliente tem na prateleira agora',
    desc: 'Acesse o estoque real de cada lojista. Saiba quais produtos estao abaixo do minimo. Ofereca antes que ele compre de outro.',
    bullets: [
      'Estoque atual vs minimo por produto',
      'Classificacao ABC (quais produtos mais vendem)',
      'Filtro por lojista',
      'Identifique oportunidades de reposicao',
    ],
    image: '/assets/landing/curva-abc.png',
  },
  {
    eyebrow: 'PRECOS',
    title: 'Uma tabela de preco, duplicada para N clientes',
    desc: 'Crie tabelas com descontos por volume, validade e observacoes. Duplique para outros lojistas com um clique. Sem Excel, sem PDF.',
    bullets: [
      'Descontos por volume com faixas de preco',
      'Validade com datas de inicio e fim',
      'Duplicacao em massa para multiplos lojistas',
      'Preco original vs preco tabela com destaque',
    ],
    image: '/assets/landing/ia-sugestao-calculada.png',
  },
  {
    eyebrow: 'AUDITORIA',
    title: 'Confira o estoque na loja com registro digital',
    desc: 'Seu representante visita a loja, escaneia os produtos e registra quantidades. O sistema compara com o estoque do sistema e aponta divergencias.',
    bullets: [
      'Leitura por codigo de barras (GTIN)',
      'Deteccao automatica de divergencias',
      'Historico completo de conferencias',
      'Fluxo de aceite/recusa pelo lojista',
    ],
    image: '/assets/landing/ia-validacao-espelho.png',
  },
  {
    eyebrow: 'REPRESENTANTES',
    title: 'Seus vendedores dentro da plataforma',
    desc: 'Cadastre representantes que vendem em seu nome. Eles recebem acesso proprio, fazem pedidos e conferencias. Voce acompanha tudo.',
    bullets: [
      'Representantes com acesso proprio ao sistema',
      'Pedidos identificados com badge Rep',
      'Status de cadastro: ativo, pendente, inativo',
      'Multi-lojista por representante',
    ],
    image: '/assets/landing/dashboard-lojista.png',
  },
] as const

/* -- Feature Item -- */

function FeatureItem({
  feature,
  isActive,
}: {
  feature: (typeof features)[number]
  isActive: boolean
}) {
  return (
    <div
      className={`min-h-[60vh] flex flex-col justify-center transition-opacity duration-300 ${
        isActive ? 'opacity-100' : 'opacity-30'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {/* Eyebrow */}
      <span className="inline-block text-[11px] uppercase tracking-[0.12em] font-medium text-[var(--accent)]">
        {feature.eyebrow}
      </span>

      {/* Title */}
      <h3
        className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-3"
        style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-[42ch] mt-4">
        {feature.desc}
      </p>

      {/* Bullets */}
      <ul className="mt-6 flex flex-col gap-3">
        {feature.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2.5 shrink-0"
              aria-hidden
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {bullet}
            </span>
          </li>
        ))}
      </ul>

      {/* Mobile mockup -- inline below each feature */}
      <div className="mt-8 lg:hidden">
        <DoubleBezel variant="dark" className="overflow-hidden">
          <Image
            src={feature.image}
            alt={feature.title}
            width={720}
            height={540}
            className="w-full h-auto block"
            sizes="100vw"
          />
        </DoubleBezel>
      </div>
    </div>
  )
}

/* -- Sticky Mockup (desktop only) -- */

function StickyMockup({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="hidden lg:block lg:sticky lg:top-[20vh] self-start">
      <DoubleBezel variant="dark" className="overflow-hidden">
        <div className="relative">
          {features.map((feature, i) => (
            <div
              key={feature.eyebrow}
              className="transition-[opacity,transform] duration-300"
              style={{
                opacity: activeIndex === i ? 1 : 0,
                transform:
                  activeIndex === i
                    ? 'translateY(0)'
                    : 'translateY(8px)',
                transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
                position: i === 0 ? 'relative' : 'absolute',
                inset: i === 0 ? undefined : 0,
                pointerEvents: activeIndex === i ? 'auto' : 'none',
              }}
              aria-hidden={activeIndex !== i}
            >
              <Image
                src={feature.image}
                alt={feature.title}
                width={720}
                height={540}
                className="w-full h-auto block"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </DoubleBezel>
    </div>
  )
}

/* -- Main FornecedorFeatures Component -- */

export function FornecedorFeatures() {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const setItemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      itemRefs.current[index] = el
    },
    [],
  )

  useEffect(() => {
    const elements = itemRefs.current.filter(Boolean) as HTMLDivElement[]
    if (elements.length === 0) return

    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        const viewportCenter = window.innerHeight * 0.4
        let closestIndex = 0
        let closestDistance = Infinity

        elements.forEach((el, i) => {
          const rect = el.getBoundingClientRect()
          const elementCenter = rect.top + rect.height / 2
          const distance = Math.abs(elementCenter - viewportCenter)

          if (distance < closestDistance) {
            closestDistance = distance
            closestIndex = i
          }
        })

        setActiveIndex(closestIndex)
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // initial check

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <SectionContainer id="funcionalidades-fornecedor">
      {/* -- Header -- */}
      <ScrollReveal>
        <div className="mb-16 md:mb-24">
          <span className="inline-block text-[11px] uppercase tracking-[0.12em] font-medium text-[var(--accent)] border-b-2 border-[var(--accent)]/20 pb-1">
            O QUE VOCE GANHA
          </span>
          <h2
            className="mt-5 text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-satoshi), sans-serif',
              textWrap: 'balance',
            }}
          >
            Tudo que voce precisa para vender melhor.
          </h2>
        </div>
      </ScrollReveal>

      {/* -- Grid: scrollable left + sticky right -- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-16">
        {/* Left column -- scrollable feature items */}
        <div>
          {features.map((feature, i) => (
            <div key={feature.eyebrow} ref={setItemRef(i)}>
              <FeatureItem feature={feature} isActive={activeIndex === i} />
            </div>
          ))}
        </div>

        {/* Right column -- sticky mockup (desktop only) */}
        <StickyMockup activeIndex={activeIndex} />
      </div>
    </SectionContainer>
  )
}
