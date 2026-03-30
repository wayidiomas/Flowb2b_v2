'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { DoubleBezel, SectionContainer, ScrollReveal } from '@/components/marketing'

/* ── Feature data ── */

const features = [
  {
    eyebrow: 'PEDIDOS',
    title: 'Pedidos de compra gerados por dados reais',
    desc: 'O sistema cruza historico de vendas, estoque atual e prazo do fornecedor. Calcula a quantidade ideal, arredonda por embalagem e gera o pedido pronto para enviar.',
    bullets: [
      'Sugestao baseada em media diaria de vendas',
      'Margem de seguranca automatica para itens zerados',
      'Arredondamento por caixa — nunca fracionado',
      'Protecao de 1 embalagem minima por produto',
    ],
    image: '/assets/landing/ia-sugestao-calculada.png',
  },
  {
    eyebrow: 'ANALISE',
    title: 'Rupturas detectadas antes de virarem problema',
    desc: 'Classifique produtos por impacto no faturamento ou volume. Veja quais itens estao criticos — e crie pedidos direto da analise, sem sair da tela.',
    bullets: [
      'Curva por faturamento e por quantidade',
      'Niveis de urgencia: critica, alta, media',
      'Receita em risco estimada por fornecedor',
      'Criacao de pedido rapido ou completo',
    ],
    image: '/assets/landing/curva-abc.png',
  },
  {
    eyebrow: 'CONEXAO',
    title: 'Fornecedores dentro da plataforma, nao no WhatsApp',
    desc: 'Cada fornecedor tem acesso proprio. Recebe pedidos, envia propostas, atualiza tabelas de preco. Zero ligacao, zero e-mail perdido.',
    bullets: [
      'Dashboard com pedidos pendentes e valores abertos',
      'Contra-propostas e sugestoes direto no sistema',
      'Upload de tabelas de preco com validade',
      'Conferencia de estoque colaborativa',
    ],
    image: '/assets/landing/fornecedor-dashboard.png',
  },
  {
    eyebrow: 'VALIDACAO',
    title: 'IA compara seu pedido com o espelho do fornecedor',
    desc: 'O fornecedor envia o espelho. A IA analisa item a item — quantidade, preco, codigo — e aponta divergencias automaticamente.',
    bullets: [
      'Comparacao automatica pedido vs espelho',
      'Status por item: OK, divergencia, faltando',
      'Ajuste manual com observacoes',
      'Historico completo de validacoes',
    ],
    image: '/assets/landing/ia-validacao-espelho.png',
  },
  {
    eyebrow: 'ERP',
    title: 'Bling conectado em 2 cliques',
    desc: 'Produtos, fornecedores, estoque, vendas e notas fiscais sincronizados automaticamente. Atualizacao diaria. Voce nunca digita a mesma informacao duas vezes.',
    bullets: [
      'Sincronizacao completa de 6 modulos',
      'Notas fiscais com dados detalhados',
      'Atualizacao diaria automatica',
      'Disponivel no plano Pro',
    ],
    image: '/assets/landing/pedido-detalhe.png',
  },
  {
    eyebrow: 'INTELIGENCIA',
    title: 'IA detecta pedidos em andamento antes de duplicar',
    desc: 'Ao gerar um pedido automatico, o sistema verifica se ja existe um pedido aberto para o mesmo fornecedor e desconta as quantidades automaticamente.',
    bullets: [
      'Verificacao automatica de pedidos em andamento',
      'Desconto inteligente de quantidades ja pedidas',
      'Zero duplicacao de pedidos',
      'Controle total antes de confirmar',
    ],
    image: '/assets/landing/ia-pedido-andamento.png',
  },
] as const

/* ── Feature Item ── */

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

      {/* Mobile mockup — inline below each feature */}
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

/* ── Sticky Mockup (desktop only) ── */

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

/* ── Main Features Component ── */

export function Features() {
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
        const viewportCenter = window.innerHeight * 0.4 // slightly above center for better feel
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
    <SectionContainer id="funcionalidades">
      {/* ── Header ── */}
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
            Cada funcionalidade resolve um problema real.
          </h2>
        </div>
      </ScrollReveal>

      {/* ── Grid: scrollable left + sticky right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-16">
        {/* Left column — scrollable feature items */}
        <div>
          {features.map((feature, i) => (
            <div key={feature.eyebrow} ref={setItemRef(i)}>
              <FeatureItem feature={feature} isActive={activeIndex === i} />
            </div>
          ))}
        </div>

        {/* Right column — sticky mockup (desktop only) */}
        <StickyMockup activeIndex={activeIndex} />
      </div>
    </SectionContainer>
  )
}
