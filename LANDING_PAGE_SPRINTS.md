# FlowB2B Landing Page — Sprints de Execucao

> **Referencia:** `LANDING_PAGE.md` v2
> **Estimativa total:** 5 sprints
> **Prerequisito global:** Ter screenshots reais das telas do FlowB2B (Curva ABC, dashboard fornecedor, pedido, conferencia estoque, sync, pedido publico). Capturar ANTES de comecar a Sprint 2.

---

## Sprint 1 — Fundacao

> Objetivo: Estrutura de arquivos, design tokens, fontes, componentes base reutilizaveis. Nenhuma secao visual ainda — apenas o alicerce.

### 1.1 Rota e layout de marketing
- [ ] Criar rota group `src/app/(marketing)/` com `layout.tsx` e `page.tsx` vazios
- [ ] O `layout.tsx` da marketing NÃO herda o layout do app (sidebar, header). É independente.
- [ ] Incluir `<main>` com semantic HTML, skip-to-content link, grain overlay div

### 1.2 Fontes
- [ ] Instalar `Satoshi` via `next/font/local` (baixar .woff2 do fontsource ou fontshare)
- [ ] Configurar `Geist Sans` e `Geist Mono` via `next/font/google` ou local
- [ ] Expor CSS variables: `--font-satoshi`, `--font-geist`, `--font-geist-mono`
- [ ] Aplicar no `layout.tsx` da rota marketing apenas (não afetar app interno)

### 1.3 Design tokens da landing
- [ ] Criar arquivo `src/app/(marketing)/tokens.css` (ou bloco no layout)
- [ ] Definir todas as CSS custom properties da Seção 0.1 do spec (`--bg-canvas`, `--bg-surface`, `--bg-shell`, `--bg-deep`, `--accent`, `--signal`, `--text-*`, `--border-*`, `--shadow-*`)
- [ ] Integrar com Tailwind v4 via `@theme inline` para uso como utilities (`bg-[--bg-canvas]`, etc.)

### 1.4 Grain overlay
- [ ] Implementar div fixa com noise SVG pattern (`position: fixed, inset: 0, z-50, pointer-events-none, opacity 0.025, mix-blend-mode: overlay`)
- [ ] Testar em dark e light backgrounds — ajustar opacity se necessario

### 1.5 Dependencias
- [ ] Verificar `package.json` — instalar `framer-motion` se ausente
- [ ] Verificar `package.json` — instalar `@phosphor-icons/react` se ausente
- [ ] Confirmar Tailwind v4 no `postcss.config.mjs` (deve usar `@tailwindcss/postcss`, NÃO `tailwindcss`)

### 1.6 Componentes base reutilizaveis (landing-only)
- [ ] `DoubleBezel` — wrapper generico com props: `variant` (light | dark | accent), `className`, `children`
  - Light: outer `bg-[--bg-shell] ring-1 ring-black/[0.04]`, inner `bg-white`
  - Dark: outer `bg-white/[0.04] ring-1 ring-white/[0.06]`, inner `bg-[--bg-deep-surface]`
  - Accent: outer `bg-[--accent]/[0.04] ring-1 ring-[--accent]/10`, inner `bg-[--bg-deep]`
  - Radius outer: `rounded-[1.75rem]`, inner: `rounded-[calc(1.75rem-0.375rem)]`
  - Inner shadow: `shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]`

- [ ] `ButtonPrimary` — Button-in-Button com trailing icon circle
  - Props: `children`, `href`, `size` (md | lg), `className`
  - Inclui icon circle (`bg-white/15 w-8 h-8 rounded-full`) com ArrowRight Phosphor
  - States: hover `scale-[1.02]`, active `scale-[0.97]`
  - Icon circle: `group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105`
  - Transicao: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` 300ms

- [ ] `Eyebrow` — label de secao
  - Props: `children`, `className`
  - Estilo: `inline-block text-[11px] uppercase tracking-[0.12em] font-medium text-[--accent] border-b-2 border-[--accent]/20 pb-1`

- [ ] `SectionContainer` — wrapper de secao com max-width e padding
  - Props: `children`, `className`, `as` (section | div)
  - Estilo: `max-w-[1280px] mx-auto px-6 md:px-6 py-20 md:py-32`

- [ ] `ScrollReveal` — Client Component wrapper para fade-in on scroll
  - Usa `framer-motion` `whileInView`
  - Default: `translate-y-20 blur-sm opacity-0` → `translate-y-0 blur-0 opacity-100`
  - Duration `700ms`, curve `cubic-bezier(0.32, 0.72, 0, 1)`
  - Props: `delay`, `children`, `className`

### Entregavel Sprint 1:
Pagina `/(marketing)` renderiza com background `--bg-canvas`, fontes corretas, grain overlay, e um bloco de teste com cada componente base (DoubleBezel, ButtonPrimary, Eyebrow, ScrollReveal). Nenhum conteudo real ainda.

---

## Sprint 2 — Hero + Navbar + Beta

> Objetivo: A primeira impressao. O usuario chega e ve hero, navbar e banner beta. Tudo acima do fold.

### 2.1 Navbar
- [ ] Criar `Navbar.tsx` como Client Component
- [ ] Layout: floating pill (`mt-5 mx-auto w-max rounded-full`)
- [ ] Background inicial: `bg-[--bg-deep]/60 backdrop-blur-2xl ring-1 ring-white/[0.06]`
- [ ] Conteudo: Logo (variant light) | links (Funcionalidades, Precos, FAQ) | Entrar (text link) | CTA (ButtonPrimary size sm)
- [ ] Links: `text-sm font-medium text-white/60`, hover underline animada (`scaleX(0)` → `scaleX(1)`, `origin-left`)
- [ ] Scroll behavior: ao passar 100px, transicionar para `bg-white/80 backdrop-blur-2xl ring-1 ring-black/[0.04]` com texto dark. Transicao `500ms cubic-bezier(0.32,0.72,0,1)`.
- [ ] Smooth scroll para ancoras (#funcionalidades, #precos, #faq)

### 2.2 Navbar mobile
- [ ] Abaixo de `768px`: pill reduz para Logo + CTA + hamburger (2 linhas `w-5`)
- [ ] Hamburger morph: linhas rotacionam para X com `rotate-45` e `-rotate-45` (transicao fluida, nao desaparecem)
- [ ] Menu overlay: `fixed inset-0 bg-white/95 backdrop-blur-3xl z-40`
- [ ] Links entram staggered (`translate-y-12 opacity-0` → `translate-y-0 opacity-100`, delay 80ms entre items)
- [ ] CTA full-width no bottom do overlay
- [ ] Travar scroll do body quando menu aberto

### 2.3 Hero — estrutura
- [ ] Criar `Hero.tsx` como Server Component container
- [ ] Background: `--bg-deep` com radial mesh gradients (2 orbs accent em opacity 0.04-0.07)
- [ ] Height: `min-h-[100dvh]` (nunca h-screen)
- [ ] Grid: `grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center`
- [ ] Padding: adequar para caber abaixo da navbar flutuante

### 2.4 Hero — coluna esquerda (texto)
- [ ] Badge BETA: `rounded-lg` (nao pill), `bg-[--signal-muted] ring-1 ring-[--signal]/15`, texto `text-[11px] uppercase`, icon Flask Phosphor light
- [ ] Animacao do badge: ring pulse sutil (opacity 0.1 → 0.25 → 0.1, duration 3s, infinite, CSS)
- [ ] H1: `Satoshi ExtraBold`, tamanhos responsivos (`text-[2.75rem] md:text-[3.75rem] lg:text-[4.5rem]`), `tracking-[-0.04em] leading-[1.02]`, "piloto automatico" em `text-[--accent]`
- [ ] Subtitulo: 3 frases curtas, `text-lg md:text-xl text-slate-400 max-w-[48ch]`
- [ ] CTA group: ButtonPrimary "Testar 3 meses gratis" + text link "Ver funcionalidades" (underline, nao ghost button)
- [ ] Proof metrics: 3 metricas em monospace (`R$ 0 de setup`, `Sem cartao`, `5 min`) com divisores `w-px h-10 bg-slate-700`

### 2.5 Hero — coluna direita (mockup)
- [ ] DoubleBezel variant dark contendo screenshot real da Curva ABC
- [ ] Perspectiva 3D: `perspective(2000px) rotateY(-4deg) rotateX(1deg)`, hover suaviza
- [ ] Imagem via `next/image`, priority, sizes adequados

### 2.6 Hero — floating badges
- [ ] Criar Client Components isolados e memoizados para cada badge
- [ ] Badge 1: DoubleBezel mini, "-47.2% rupturas", icon TrendUp, `text-emerald-400`, posicao `top-[-1rem] right-[-2rem]`
- [ ] Badge 2: DoubleBezel mini, "15 pedidos gerados", icon Package, `text-[--accent]`, posicao `bottom-[2rem] left-[-2.5rem]`
- [ ] Animacao float via CSS keyframes (nao React state): `translateY(0 → -6px → 0)`, 4s infinite, delays diferentes
- [ ] Mobile: repositionar para relative dentro do frame (nao absolute)

### 2.7 Hero — magnetic button (opcional, pode ir para Sprint 5)
- [ ] Implementar magnetic hover no CTA principal com Framer `useMotionValue` + `useTransform`
- [ ] FORA do React render cycle — nunca `useState` para posicao do mouse

### 2.8 Banner Beta
- [ ] Criar `BetaBanner.tsx` como Server Component
- [ ] DoubleBezel com outer tinted `--signal` (`bg-[--signal]/[0.03] ring-1 ring-[--signal]/10`)
- [ ] Conteudo: icon Flask, titulo "Estamos construindo em publico", texto explicativo
- [ ] Overlap negativo `-mt-8` sobre o hero para criar profundidade
- [ ] ScrollReveal wrapper

### Entregavel Sprint 2:
Hero completo com navbar funcional (scroll behavior + mobile menu), mockup com perspectiva 3D, floating badges animados, banner beta. O fold esta pronto.

---

## Sprint 3 — Secoes de conteudo: Problema + Funcionalidades

> Objetivo: O core da landing — dor do cliente e solucao detalhada. A secao de features com sticky scroll eh o maior desafio tecnico.

### 3.1 Screenshots do sistema
- [ ] Capturar screenshots reais de 6 telas (com dados de exemplo preenchidos):
  1. Tela de criacao/edicao de pedido de compra (tabela de itens, qtd sugerida)
  2. Curva ABC (KPI cards + tabela fornecedores + badges urgencia)
  3. Dashboard do fornecedor (metricas + pedidos recentes)
  4. Conferencia de estoque mobile (lista itens + divergencias)
  5. Tela de sync Bling (progress steps + status)
  6. Pedido publico (tabela + botoes export)
- [ ] Otimizar imagens (webp, tamanhos adequados para desktop e mobile)
- [ ] Colocar em `public/assets/landing/`

### 3.2 Secao Problema
- [ ] Criar `ProblemSection.tsx`
- [ ] Eyebrow "ANTES DO FLOWB2B" + H2 "Reconhece alguma dessas situacoes?"
- [ ] Bento grid assimetrico: `grid-template-columns: 1.4fr 1fr 1fr`, `grid-template-rows: auto auto`
- [ ] Card 1 (grande, row-span-2): DoubleBezel com SVG cycle animation (WhatsApp → PDF → Teclado → Loop)
  - [ ] SVG cycle animation: CSS `@keyframes`, icones circulam em loop lento, Client Component isolado + memoizado
- [ ] Cards 2, 3, 4: SEM card container — apenas `border-t` + whitespace + numeracao monospace
- [ ] Conteudo dos 4 pain points conforme spec
- [ ] Mobile: single column stack
- [ ] ScrollReveal com stagger 80ms entre items

### 3.3 Secao Funcionalidades — estrutura sticky scroll
- [ ] Criar `Features.tsx` como Client Component (precisa de IntersectionObserver)
- [ ] Eyebrow "O QUE VOCE GANHA" + H2 "Cada funcionalidade resolve um problema real."
- [ ] Grid desktop: `grid-cols-[1fr_1.1fr] gap-16`
- [ ] Coluna esquerda: lista de 6 features, cada uma ocupa `min-h-[60vh]` com `flex flex-col justify-center`
- [ ] Coluna direita: `position: sticky; top: 20vh` com DoubleBezel contendo mockup
- [ ] Mobile: stack vertical (texto + mockup inline para cada feature)

### 3.4 Funcionalidades — observador de scroll
- [ ] IntersectionObserver monitora cada feature item (threshold ~0.5)
- [ ] Feature ativa: `opacity-100`
- [ ] Features inativas: `opacity-30` (nao somem, recuam)
- [ ] Ao trocar feature ativa, mockup na coluna direita faz crossfade: `opacity 0→1` + `translateY(8px→0)` em `500ms`
- [ ] Testar fluidez — o scroll deve sentir natural, sem "pulos"

### 3.5 Funcionalidades — conteudo das 6 features
- [ ] Feature 1: Pedidos automaticos (eyebrow PEDIDOS, bullets, mockup pedido)
- [ ] Feature 2: Curva ABC (eyebrow ANALISE, bullets, mockup curva)
- [ ] Feature 3: Portal fornecedor (eyebrow CONEXAO, bullets, mockup dashboard fornecedor)
- [ ] Feature 4: Conferencia estoque (eyebrow ESTOQUE, bullets, mockup mobile conferencia)
- [ ] Feature 5: Integracao Bling (eyebrow ERP, bullets, mockup sync)
- [ ] Feature 6: Link publico (eyebrow COMPARTILHAMENTO, bullets, mockup pedido publico)
- [ ] Cada feature: eyebrow accent, titulo Satoshi Bold, descricao Geist, bullets com dot accent

### Entregavel Sprint 3:
Secoes problema e funcionalidades completas. O sticky scroll funciona no desktop e degrada para stack no mobile. Screenshots reais nas molduras Double-Bezel.

---

## Sprint 4 — Como funciona + Pricing + FAQ + CTA + Footer

> Objetivo: Converter. Do entendimento ("como comeco?") ao pricing, duvidas e call-to-action final.

### 4.1 Secao Como Funciona
- [ ] Criar `HowItWorks.tsx` como Client Component (SVG line draw)
- [ ] Eyebrow "COMO COMECAR" + H2 "Primeiro pedido automatico em menos de uma hora."
- [ ] Layout: timeline vertical centralizada, `max-w-[640px] mx-auto`
- [ ] 3 steps com squircle numerado (`w-10 h-10 rounded-xl bg-[--accent-muted]`, numero monospace)
- [ ] Linha vertical SVG conectando os 3 nodes
- [ ] Conteudo dos 3 steps conforme spec (Crie conta → Conecte dados → Receba sugestoes)
- [ ] SVG line draw animation: `stroke-dasharray` + `stroke-dashoffset` animado no scroll via IntersectionObserver
- [ ] Cada node pulsa brevemente quando a linha alcanca (CSS animation triggered por class)

### 4.2 Secao Pricing
- [ ] Criar `Pricing.tsx` como Server Component + Client leaf para hover
- [ ] Eyebrow "PLANOS" + H2 "Comece gratis. Pague so se fizer sentido." + subtitulo
- [ ] Grid: `grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-6`
- [ ] Card Essencial:
  - [ ] DoubleBezel variant light
  - [ ] Tag "Essencial" (text simples, sem badge)
  - [ ] Preco `font-mono text-[3.25rem] font-bold` + "/mes" muted
  - [ ] Nota "Gratis por 3 meses"
  - [ ] Lista 10 features com dot accent
  - [ ] CTA outline full-width
- [ ] Card Pro:
  - [ ] DoubleBezel variant accent (outer tinted, inner dark)
  - [ ] Tag "Pro — Bling integrado" com dot animate-pulse
  - [ ] Preco branco monospace
  - [ ] Label "Tudo do Essencial, mais:" antes da lista
  - [ ] Lista 7 features adicionais
  - [ ] CTA ButtonPrimary full-width com glow hover
- [ ] Hover nos cards: `translateY(-4px)` com spring physics (stiffness 200, damping 20)
- [ ] Mobile: stack vertical, Pro primeiro
- [ ] Texto abaixo: "Volume maior? Falar com a equipe →"

### 4.3 Secao FAQ
- [ ] Criar `FAQ.tsx` como Server Component (zero interatividade — tudo visivel)
- [ ] Eyebrow "DUVIDAS COMUNS" + H2 "O que voce precisa saber antes de comecar."
- [ ] Grid: `grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10`
- [ ] 8 perguntas/respostas conforme spec (4 por coluna)
- [ ] Sem accordion, sem expand/collapse — todas visiveis
- [ ] Estilo: pergunta `font-semibold text-[--text-primary]`, resposta `text-sm text-[--text-secondary] mt-2`
- [ ] Sem cards, sem borders entre items — apenas whitespace
- [ ] ScrollReveal staggered: coluna esquerda primeiro, depois direita, 60ms delay

### 4.4 Secao CTA Final
- [ ] Criar `CTAFinal.tsx` como Server Component + Client leaf (orbs, magnetic CTA)
- [ ] Transicao suave para dark: pseudo-element `::after` com gradient `from-transparent to-[--bg-deep]` height `200px` na secao anterior
- [ ] Background: `--bg-deep`
- [ ] Layout: split assimetrico `grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center`, `min-h-[60vh]`
- [ ] Coluna esquerda: Eyebrow + H2 "3 meses gratis para repensar suas compras." + desc + ButtonPrimary grande + nota BETA
- [ ] Coluna direita: orbs decorativos (2 divs com radial-gradient, `blur(60px)`, CSS animation `drift` 8s infinite alternate)
- [ ] Orbs: `position: absolute, pointer-events-none`. Blur no elemento, nao no container.

### 4.5 Footer
- [ ] Criar `Footer.tsx` como Server Component
- [ ] Background: `#080D18`
- [ ] Grid: `grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-8`
- [ ] Coluna 1: Logo light + descricao curta + icons sociais (Instagram, LinkedIn) Phosphor light
- [ ] Coluna 2: "Produto" — links Funcionalidades, Precos, Integracoes, Changelog
- [ ] Coluna 3: "Legal" — links Termos de uso, Politica de privacidade, Contato
- [ ] Bottom bar: `border-t border-white/[0.04]`, copyright + "Feito no Brasil" (sem emoji)
- [ ] Links: `text-sm text-slate-500 hover:text-slate-300 transition duration-200`

### Entregavel Sprint 4:
Todas as secoes implementadas. Landing completa de cima a baixo. Navegacao por ancora funcional. Conteudo final.

---

## Sprint 5 — Motion, responsividade e polish

> Objetivo: Elevar de "funcional" para "premium". Animacoes, responsividade pixel-perfect, SEO, performance.

### 5.1 Scroll reveals globais
- [ ] Verificar que TODAS as secoes usam `ScrollReveal` wrapper
- [ ] Confirmar curve `cubic-bezier(0.32, 0.72, 0, 1)`, duration 700ms
- [ ] Stagger em grids: confirmar delays incrementais (60-80ms)
- [ ] Testar: nenhum elemento aparece estaticamente. Tudo entra com fade-up + blur.

### 5.2 Magnetic button (se nao feito na Sprint 2)
- [ ] Implementar no CTA do hero e CTA final
- [ ] Framer `useMotionValue` + `useTransform` para posicao do mouse
- [ ] Movimento sutil (max 4px de deslocamento) — nao exagerado
- [ ] FORA do render cycle. Sem `useState` para coordenadas.
- [ ] Testar mobile: desativar magnetic em touch devices

### 5.3 Responsividade audit
- [ ] **Navbar:** testar hamburger morph, overlay, stagger em iOS Safari e Chrome Android
- [ ] **Hero:** single column, perspectiva removida, floating badges relative, metrics `grid-cols-3 text-center`
- [ ] **Problema:** bento colapsa para single column, card 1 perde row-span
- [ ] **Features:** sticky scroll desativa, stack vertical com mockup inline abaixo do texto
- [ ] **Como Funciona:** timeline vertical funciona nativamente em mobile
- [ ] **Pricing:** stack vertical, Pro primeiro (mais destaque)
- [ ] **FAQ:** single column
- [ ] **CTA Final:** single column, orbs reposicionados ou ocultos
- [ ] **Geral:** nunca scroll horizontal. Testar em 375px, 390px, 428px, 768px, 1024px, 1440px.

### 5.4 Viewport e Safari fixes
- [ ] Confirmar `min-h-[100dvh]` no hero (nunca `h-screen`)
- [ ] Testar navbar `backdrop-blur` no Safari — pode precisar de `-webkit-backdrop-filter`
- [ ] Testar grain overlay no Safari — ajustar opacity se muito visivel
- [ ] Testar `text-wrap: balance` — fallback para navegadores sem suporte

### 5.5 Performance audit
- [ ] Confirmar que animacoes usam apenas `transform` + `opacity` (nunca top/left/width/height)
- [ ] `will-change: transform` APENAS em elementos ativamente animando
- [ ] Floating badges, cycle SVG, orbs: todos em Client Components isolados + `React.memo`
- [ ] Images: `next/image` com `sizes` prop adequado, format webp, lazy load (exceto hero que eh priority)
- [ ] Lighthouse: target 90+ em Performance, Accessibility, SEO
- [ ] Testar em mobile real (nao so DevTools) — especialmente animacoes

### 5.6 SEO e meta tags
- [ ] Title: "FlowB2B — Compras automaticas para atacado e varejo"
- [ ] Meta description conforme spec
- [ ] Open Graph tags (title, description, image, type)
- [ ] `theme-color: #0C1220`
- [ ] Criar `og-image.png` (1200x630) com logo + headline
- [ ] Semantic HTML: `<nav>`, `<main>`, `<section>`, `<footer>` em todas as secoes
- [ ] Alt text descritivo em todas as imagens
- [ ] Skip-to-content link no topo

### 5.7 Polish final
- [ ] Revisar todos os textos — ortografia, pontuacao, consistencia
- [ ] Confirmar que nenhum placeholder (lorem ipsum, TODO, "em breve") ficou
- [ ] Confirmar que nenhum emoji existe no codigo ou markup
- [ ] Confirmar que nenhuma font Inter aparece na landing
- [ ] Confirmar contrast ratio WCAG AA em todos os pares texto/background
- [ ] Smooth scroll global: `scroll-behavior: smooth` no html ou via JS
- [ ] Testar todos os links de ancora (#funcionalidades, #precos, #faq)
- [ ] Testar links de navegacao (Entrar → /login, Termos → /termos-de-uso, etc.)

### Entregavel Sprint 5:
Landing page production-ready. Responsiva, performatica, acessivel, com SEO completo. Pronta para deploy.

---

## Dependencias entre sprints

```
Sprint 1 ──→ Sprint 2 ──→ Sprint 3 ──→ Sprint 4 ──→ Sprint 5
(fundacao)   (hero+nav)   (conteudo)   (conversao)   (polish)
                              │
                              └── Screenshots reais necessarios
                                  (capturar no inicio da Sprint 3)
```

## Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Sticky scroll nao funciona bem em Safari | Testar cedo na Sprint 3. Fallback: stack vertical sem sticky. |
| Screenshots do sistema com dados vazios/feios | Criar dados seed bonitos ANTES de capturar. Usar dados realistas (nomes de fornecedores reais, numeros organicos). |
| `framer-motion` peso no bundle | Tree-shake. Importar apenas `motion`, `AnimatePresence`, `useMotionValue`. Lazy load secoes abaixo do fold. |
| Magnetic button com jank em mobile | Feature-detect touch device. Desativar magnetic em `(pointer: coarse)`. |
| Fontes Satoshi/Geist nao carregam rapido | `font-display: swap`. Preload da fonte do H1 no `<head>`. |
| SVG line draw nao smooth | Usar `pathLength="1"` e animar `strokeDashoffset` de 1 a 0. Testar em 60fps. |
