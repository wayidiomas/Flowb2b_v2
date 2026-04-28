# Design System: FlowB2B — Landing Page do Fornecedor

> Vanguard UI Architecture aplicada à LP pública (`/lp/[slug]`) e telas adjacentes. Source of truth pra implementação. Nada nesse documento é decorativo — cada regra existe pra escapar do "template com fontes legais" e atingir nível **agência $150k**.

---

## 0. Variance Engine — Decisões Travadas

| Eixo | Escolhido | Razão |
|---|---|---|
| **Vibe** | Editorial Luxury | LP é lookbook B2B do fornecedor pro lojista — vibe de catálogo de marca, não SaaS |
| **Layout Hero** | Editorial Split | Tipografia massiva à esquerda (nome do fornecedor + tagline) + pills de produtos scrolláveis à direita |
| **Layout Catálogo** | Asymmetrical Bento | Card grande do produto destaque + bento dos demais. Quebra a monotonia de grade 4-col |
| **Layout Checkout** | Z-Axis Cascade (sutil) | Cards de pedido empilhados, leve `-1deg` rotation no resumo, mola na confirmação |

A `cor_marca` injetada pelo fornecedor é o **único accent saturado**. Tudo mais é warm-cream + espresso + ink.

---

## 1. Anti-Patterns Travados (Section 2 da Skill)

> Se qualquer um desses aparecer no código, a entrega falha. Ponto.

### Fontes
- ✗ Inter, Roboto, Arial, Open Sans, Helvetica
- ✓ Display: **PP Editorial New** (variable serif distintivo)
- ✓ Sans: **Geist** (system grotesk premium)
- ✓ Mono: **Geist Mono** (preços, EANs, qty)

### Ícones
- ✗ Lucide thick-stroke, FontAwesome, Material Icons
- ✓ **Phosphor Light** (line weight 1px, ultra-fina)
- Stroke-width nunca acima de `1.25`

### Bordas & Sombras
- ✗ `border-1 solid gray-200` genérico
- ✗ `shadow-md`, `shadow-lg`, `rgba(0,0,0,0.3)` harsh
- ✓ Hairlines: `ring-1 ring-black/5` (light mode) / `ring-1 ring-white/10` (dark mode)
- ✓ Ambient: `shadow-[0_24px_48px_-24px_rgba(31,21,12,0.08)]` (highly diffused, warm)
- ✓ Inset highlight em containers: `shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`

### Layouts
- ✗ Sticky navbar edge-to-edge no top
- ✗ 3-column Bootstrap symmetric grid
- ✓ **Floating Island Nav**: pill flutuante `mt-6 mx-auto w-max rounded-full backdrop-blur-2xl bg-cream/80`
- ✓ Sections com `py-24` mínimo, `py-32`/`py-40` ideais

### Motion
- ✗ `transition-all` com `linear` ou `ease-in-out`
- ✗ Mudanças de estado instant
- ✓ Cubic-bezier custom: `cubic-bezier(0.32, 0.72, 0, 1)` (heavy spring, premium)
- ✓ Duration mínimo `500ms`, ideal `700-900ms` em transições maiores

---

## 2. Color Palette — Editorial Luxury Calibrated

### Foundation (warm cream tones)

```css
--cream:        #FDFBF7;  /* canvas — substitui pure white */
--cream-deep:   #F5F1E8;  /* surface secundária, eyebrow tags */
--paper:        #FFFFFF;  /* card inner core */
--espresso:     #1F150C;  /* texto primário, substitui pure black */
--clay:         #6B5C4A;  /* texto secundário, descrições */
--ash:          #A89B85;  /* texto terciário, metadata, hint */
--hairline:     rgba(31, 21, 12, 0.06);  /* bordas estruturais */
--inset-highlight: rgba(255, 255, 255, 0.6);  /* shadow inset top */
```

### Semantic

```css
--sage:    #5C7C53;  /* sucesso, confirmação */
--ochre:   #B6822E;  /* warning, sync pendente */
--rust:    #8C3F2D;  /* erro, ruptura */
```

### Brand Accent (single, supplier-injected)

```css
--accent:    var(--cor-marca, #1F150C);  /* fallback é espresso */
--accent-fg: var(--cor-marca-fg, #FDFBF7);
```

WCAG contrast clamping aplicado server-side antes do render. Saturation cap **65%**. Se cor recebida ultrapassa, dessatura.

### Banidos
- Pure black `#000000` ✗
- Pure white `#FFFFFF` em background de página ✗ (use `--cream`)
- Roxo neon, ciano elétrico, blue AI `#3B82F6` ✗
- 2+ accents simultâneos ✗
- Gradient text/background em CTAs ✗

### Texture Layer (signature)

Film-grain sutil `opacity-[0.025]` aplicado via fixed `pointer-events-none` pseudo-element em todo `<body>`. Substrato de papel, não pixel limpo. Implementação: SVG noise filter encoded em data URI, attached fixed top z-50.

---

## 3. Typography — Variable Serif + Grotesk

### Stack

```css
--font-display: 'PP Editorial New', 'Fraunces', 'Times New Roman', serif;
--font-sans:    'Geist', 'system-ui', sans-serif;
--font-mono:    'Geist Mono', 'ui-monospace', monospace;
```

### Hero Display (variable, ultra-impact)

- **Display Mega**: `clamp(3rem, 8vw, 6rem)` / line-height `0.95` / weight `400` / serif italic em palavra-chave / Hero título principal da LP
- **Display Hero**: `clamp(2.5rem, 6vw, 4rem)` / `1` / `400` / Section titles em editorial mode

### Application UI

- **Display L**: `clamp(1.75rem, 3.5vw, 2.5rem)` / `1.1` / Geist `500` / Page titles internas
- **Display M**: `1.5rem` / `1.15` / Geist `500` / Card heading

### Body & UI

- **Body L**: `1.125rem` / `1.6` / Geist `400` / Lead paragraph
- **Body**: `1rem` / `1.6` / Geist `400` / Texto padrão
- **Body S**: `0.875rem` / `1.55` / Geist `400` / Card body
- **Eyebrow**: `0.625rem` / Geist `500` uppercase tracking-`0.2em` / Pill badges, section preludes
- **Numeric Hero**: `2rem` / `1` / Geist Mono `600` / Preço destaque
- **Numeric M**: `1rem` / `1.2` / Geist Mono `600` / Cart total, codes

### Hierarchy via weight + color, **nunca** apenas size massivo

Editorial luxury significa: contraste de peso (400 italic vs 500 sans), contraste de família (serif vs grotesk), contraste de cor (espresso vs ash). Nunca recorre ao "fizemos a fonte enorme pra criar hierarquia".

### Banidos
- ✗ All-caps em headlines (exceto eyebrows < 12px)
- ✗ Letter-spacing positivo em headings (use track-tight: `-0.02em` a `-0.04em`)
- ✗ `text-shadow` em qualquer texto
- ✗ Gradient text em headers principais

---

## 4. Double-Bezel (Doppelrand) — Arquitetura de Containers

> Toda card, modal, image holder ou input premium usa **outer shell + inner core**. Nunca chapado no fundo. Simula hardware (placa de vidro em bandeja de alumínio).

### Pattern base

```tsx
<div className="
  /* OUTER SHELL */
  p-1.5
  rounded-[2.5rem]
  bg-cream-deep/40
  ring-1 ring-black/5
  shadow-[0_24px_48px_-24px_rgba(31,21,12,0.08)]
">
  <div className="
    /* INNER CORE */
    rounded-[calc(2.5rem-0.375rem)]
    bg-paper
    p-6
    shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]
  ">
    {/* conteúdo real */}
  </div>
</div>
```

### Concentric radii rule

Outer radius = X. Inner radius = X − padding do shell. Sempre matemático. Nunca aproxime visualmente.

### ProductCard (signature)

```tsx
<article className="
  group relative
  p-1.5 rounded-[2rem]
  bg-cream-deep/30 ring-1 ring-black/5
  transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
  hover:shadow-[0_24px_60px_-24px_rgba(31,21,12,0.12)]
  hover:-translate-y-1
">
  <div className="rounded-[calc(2rem-0.375rem)] bg-paper overflow-hidden">
    {/* image holder com inner shell */}
    <div className="aspect-[4/5] bg-cream-deep relative overflow-hidden">
      <Image src={...} className="
        object-cover
        transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
        group-hover:scale-[1.04]
      " />
    </div>

    {/* meta block */}
    <div className="p-5 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
        {codigo}
      </p>
      <h3 className="font-display text-lg leading-tight text-espresso">
        {nome}
      </h3>
      <div className="flex items-baseline gap-2 pt-2">
        <span className="font-mono text-2xl font-semibold text-espresso">
          {formatBRL(preco)}
        </span>
        {precoOriginal && (
          <span className="font-mono text-sm text-ash line-through">
            {formatBRL(precoOriginal)}
          </span>
        )}
      </div>

      {/* CTA com Button-in-Button */}
      <button className="...">{/* veja Section 5 */}</button>
    </div>
  </div>
</article>
```

### Hero image holder

Mesmo pattern: outer shell `bg-cream-deep`, inner core com `aspect-[4/3]`. Imagem principal nunca corre direto no canvas.

### Modal/Sheet

Outer shell em `bg-cream/80 backdrop-blur-2xl`, inner core `bg-paper`. Inner highlight no top. Radii concentric.

---

## 5. Button-in-Button — CTA Architecture

> Quando CTA tem arrow ou ícone, ele NUNCA fica solto ao lado do texto. Sempre nested em wrapper circular flush com a borda direita do botão pai.

### Primary (filled)

```tsx
<button className="
  group relative
  inline-flex items-center gap-3
  rounded-full
  bg-accent text-accent-fg
  pl-6 pr-2 py-2
  font-sans font-medium text-sm
  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
  active:scale-[0.98]
  hover:shadow-[0_8px_24px_-8px_rgba(31,21,12,0.2)]
">
  <span>Adicionar ao carrinho</span>
  <span className="
    flex items-center justify-center
    w-9 h-9 rounded-full
    bg-black/10
    transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
    group-hover:translate-x-1 group-hover:-translate-y-[1px]
    group-hover:bg-black/15
  ">
    <ArrowUpRight className="w-4 h-4 stroke-[1.25]" />
    {/* Phosphor Light, NUNCA Lucide */}
  </span>
</button>
```

### Secondary (ghost)

```tsx
<button className="
  group inline-flex items-center gap-3
  rounded-full
  border border-espresso/15 bg-cream/50
  pl-6 pr-2 py-2
  font-sans text-sm text-espresso
  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
  active:scale-[0.98]
  hover:border-espresso/30 hover:bg-cream
">
  <span>Ver detalhes</span>
  <span className="
    flex items-center justify-center
    w-8 h-8 rounded-full
    border border-espresso/15 bg-paper
    transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
    group-hover:translate-x-1
  ">
    <ArrowRight className="w-3.5 h-3.5 stroke-[1.25]" />
  </span>
</button>
```

### Magnetic Hover Physics

- Botão inteiro: `active:scale-[0.98]` (push tactile)
- Inner icon circle: `group-hover:translate-x-1 group-hover:-translate-y-[1px]` (kinetic tension diagonal)
- Background do icon: muda 1 stop de opacity no hover

### Banidos
- ✗ `box-shadow` neon/glow
- ✗ Custom cursor
- ✗ Gradient fill no botão
- ✗ Underline no texto
- ✗ Arrow naked sem wrapper circular

---

## 6. Spatial Rhythm — Macro-Whitespace

### Section padding (sempre)

```css
/* Mobile */ py-16  (4rem = 64px)
/* Tablet */ py-24  (6rem = 96px)
/* Desktop */ py-32 (8rem = 128px)
/* Hero */ py-40    (10rem = 160px)
```

Use `clamp()` se possível: `py-[clamp(4rem,10vw,10rem)]`.

### Eyebrow tags

Antes de toda H1/H2 importante:

```tsx
<span className="
  inline-flex items-center
  rounded-full px-3 py-1
  bg-cream-deep/60 ring-1 ring-black/5
  text-[10px] font-medium uppercase tracking-[0.2em]
  text-clay
">
  Catálogo · MEDICALVET
</span>
```

### Container

```css
max-width: 1400px;
margin-inline: auto;
padding-inline: clamp(1rem, 4vw, 2rem);
```

---

## 7. Layout Architectures Aplicados

### A. Hero — Editorial Split

```
desktop ≥1024px:
┌──────────────────────────────────────────────────┐
│                                                  │
│  [eyebrow tag]                  ┌─────────────┐  │
│                                 │  pill image │  │
│  Catálogo                       │   produto   │  │
│  MEDICALVET                     │     #1      │  │
│  pra sua loja.*                 └─────────────┘  │
│                                                  │
│  *com [logo-img] + prazo               ┌──────┐  │
│  de entrega de 7 dias.                 │ pill │  │
│                                        │ #2   │  │
│  [Button: Ver catalogo →]              └──────┘  │
│                                                  │
│                                            ...   │
└──────────────────────────────────────────────────┘
   col-span-7                       col-span-5
```

**Características obrigatórias**:
- Headline em PP Editorial New, weight 400, italic em "MEDICALVET", display mega
- **Inline image typography**: logo do fornecedor literalmente embedded entre palavras (`<img className="inline-block h-[1em] w-auto rounded-md mx-1 align-middle">`)
- Pills à direita: 3-4 produtos preview, scrolláveis horizontal, leve overlap, animação sutil de drift contínuo (`@keyframes float` 6s)
- Sem `vh`, usa `min-h-[100dvh]`
- 1 CTA primário Button-in-Button
- Sem "Scroll to explore", sem chevron, sem arrow
- **Mobile <768px**: column stack, headline em cima, pills viram horizontal scroll snap-x abaixo, pad reduz pra `px-4 py-16`

### B. Catálogo — Asymmetrical Bento

```
desktop ≥1024px:
┌──────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌─────────┐  ┌─────────┐  │
│  │                  │  │         │  │         │  │
│  │   PRODUTO        │  │ produto │  │ produto │  │
│  │   DESTAQUE       │  │  #2     │  │  #3     │  │
│  │   (col-span-6)   │  │         │  │         │  │
│  │   (row-span-2)   │  └─────────┘  └─────────┘  │
│  │                  │  ┌─────────┐  ┌─────────┐  │
│  │                  │  │ produto │  │ produto │  │
│  │                  │  │  #4     │  │  #5     │  │
│  └──────────────────┘  └─────────┘  └─────────┘  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────┐  │
│  │ produto │  │ produto │  │ produto │  │ ... │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────┘  │
└──────────────────────────────────────────────────┘
```

```tsx
<div className="grid grid-cols-12 gap-6 md:gap-8">
  {/* Hero card span 6 col, row 2 */}
  <article className="col-span-12 md:col-span-6 md:row-span-2">
    <ProductCardLarge {...} />
  </article>

  {/* Standard cards span 3 each */}
  {produtosNormais.map(p => (
    <article key={p.id} className="col-span-6 sm:col-span-4 md:col-span-3">
      <ProductCard {...p} />
    </article>
  ))}
</div>
```

**Mobile <768px**: tudo `col-span-12`, gap reduz pra `gap-4`. Hero card volta ao tamanho normal — variance asymmetric **não** se aplica em mobile.

### C. Cart — Z-Axis Cascade (sutil)

Drawer lateral desktop, bottom sheet mobile. Items com leve overlap de `-mt-2` quando rolando, e leve rotação `[transform:rotate(-0.3deg)]` no card de resumo. Mobile remove rotation e overlap.

---

## 8. Motion Choreography (Cubic-Bezier System)

### Easings padrão

```css
--ease-out-spring: cubic-bezier(0.32, 0.72, 0, 1);   /* default heavy spring */
--ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);  /* nav transitions */
--ease-snap: cubic-bezier(0.5, 0, 0.1, 1);           /* magnetic buttons */
```

### Durations

- Micro-interactions (botão hover, qty stepper): `300-500ms`
- Card hover, drawer slide: `700ms`
- Page transitions, modal: `800-900ms`

### Floating Island Nav

```tsx
<nav className="
  fixed top-6 left-1/2 -translate-x-1/2 z-50
  inline-flex items-center gap-1
  rounded-full
  bg-cream/70 backdrop-blur-2xl
  ring-1 ring-black/5
  px-2 py-1.5
  shadow-[0_24px_48px_-24px_rgba(31,21,12,0.12)]
">
  <NavLink href="#produtos">Produtos</NavLink>
  <NavLink href="#sobre">Sobre</NavLink>
  <CartButton /* button-in-button pattern */ />
</nav>
```

Nunca colado no top. Sempre `mt-6` flutuando.

### Hamburger Morph (mobile)

2 linhas → X via rotate-45/-45 com mola, expansão modal full-screen com staggered reveal:

```tsx
{/* nav links staggered */}
{[0, 1, 2, 3].map(i => (
  <NavLink
    style={{ transitionDelay: `${100 + i * 50}ms` }}
    className="
      transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
      translate-y-12 opacity-0
      [&.open]:translate-y-0 [&.open]:opacity-100
    "
  />
))}
```

### Scroll Interpolation (Entry Animations)

Todo elemento de seção principal entra com:
```css
.fade-up {
  opacity: 0;
  transform: translateY(4rem);
  filter: blur(8px);
  transition: opacity 800ms cubic-bezier(0.32, 0.72, 0, 1),
              transform 800ms cubic-bezier(0.32, 0.72, 0, 1),
              filter 800ms cubic-bezier(0.32, 0.72, 0, 1);
}
.fade-up.in-view {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}
```

Implementação via **IntersectionObserver** (não `window.scroll`). Stagger `0.04s` por item em listas.

### Add-to-Cart Choreography

Ao clicar:
1. Botão `scale 0.95` por 100ms
2. Thumbnail "voa" pro cart icon (path animation 600ms via `getBoundingClientRect` + `transform`)
3. Cart icon pulse `scale 1 → 1.1 → 1` em 400ms
4. Badge counter incrementa com fade-in

Implementação: Framer Motion ou plain JS com `requestAnimationFrame`.

### Banidos
- ✗ `transition-all` linear ou ease-in-out
- ✗ Animar `top`, `left`, `width`, `height`
- ✗ `window.addEventListener('scroll')` — use IntersectionObserver
- ✗ Backdrop-blur em scroll containers
- ✗ Loops infinitos em elementos invisíveis (off-screen)

---

## 9. Responsive — Mobile Override Universal

### Regras invioláveis

```css
@media (max-width: 768px) {
  /* tudo que era multi-col vira single-col */
  .grid-cols-12 > * { grid-column: span 12 / span 12; }
  /* asymmetric cancela */
  .row-span-2 { grid-row: auto; }
  /* rotações desabilitam */
  .rotate-[-1deg], .rotate-[1deg] { transform: rotate(0); }
  /* overlap negativo desabilita */
  .-mt-2, .-ml-4 { margin: 0; }
}
```

### Touch & viewport

- Touch targets ≥`44px` (botões, qty stepper, ícones)
- `min-h-[100dvh]` em hero (NUNCA `vh`)
- Headlines escalam via `clamp()`
- Body mínimo `1rem`
- Mobile keyboard: `:has(input:focus)` esconde footer cart

### Cart adaptive

- Desktop ≥1024: drawer lateral 420px slide-in
- 768-1023: sheet bottom fullwidth slide-up
- <768: footer fixo 64px tap pra expandir bottom sheet `min-h-[60dvh]`

---

## 10. Performance Guardrails

- **GPU-only**: animar APENAS `transform` e `opacity`. Nada de `top/left/width/height`.
- **`will-change: transform`** apenas em elementos animando NO MOMENTO. Remove após animação.
- **`backdrop-blur` apenas em**: nav fixed, modais, sheets. Nunca em cards, scroll containers ou listas.
- **Grain/noise**: `position: fixed; inset: 0; pointer-events: none; z-index: 50`. Nunca em scroll container.
- **Z-index discipline**: `0` flow / `10` sticky / `20` dropdown / `30` modal backdrop / `40` modal content / `50` toast / `100` debug only.
- **Lazy-load images**: `next/image` com `loading="lazy"`, `priority` apenas nos primeiros 6 do bento.
- **ISR** na LP: `revalidate: 60` (catálogo do fornecedor não muda toda hora).

---

## 11. Tailwind Config (Pronto pra Colar)

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        cream: '#FDFBF7',
        'cream-deep': '#F5F1E8',
        paper: '#FFFFFF',
        espresso: '#1F150C',
        clay: '#6B5C4A',
        ash: '#A89B85',
        sage: '#5C7C53',
        ochre: '#B6822E',
        rust: '#8C3F2D',
        accent: 'var(--cor-marca, #1F150C)',
        'accent-fg': 'var(--cor-marca-fg, #FDFBF7)',
      },
      fontFamily: {
        display: ['"PP Editorial New"', 'Fraunces', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.625rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
      },
      boxShadow: {
        ambient: '0 24px 48px -24px rgba(31, 21, 12, 0.08)',
        'ambient-lg': '0 32px 64px -24px rgba(31, 21, 12, 0.12)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
        soft: 'cubic-bezier(0.65, 0, 0.35, 1)',
        snap: 'cubic-bezier(0.5, 0, 0.1, 1)',
      },
      transitionDuration: {
        '500': '500ms',
        '700': '700ms',
        '900': '900ms',
      },
    },
  },
}
export default config
```

### Fonts via next/font

```ts
// src/app/lp/[slug]/layout.tsx
import localFont from 'next/font/local'

export const editorial = localFont({
  src: '../../../assets/fonts/PPEditorialNew-Regular.woff2',
  variable: '--font-display',
  display: 'swap',
})

export const geist = localFont({
  src: '../../../assets/fonts/Geist-Variable.woff2',
  variable: '--font-sans',
  display: 'swap',
})
```

### Phosphor Light import

```bash
pnpm add @phosphor-icons/react
```

```tsx
import { ArrowUpRight, ArrowRight, ShoppingBag } from '@phosphor-icons/react/dist/ssr'

// uso (SEMPRE weight="thin" ou "light")
<ArrowUpRight weight="light" className="w-4 h-4" />
```

---

## 12. Pre-Output Checklist (filtro final por screen)

Antes de declarar uma tela "pronta":

- [ ] Sem fontes banidas (Inter, Roboto, Helvetica). Display em PP Editorial New, body em Geist
- [ ] Ícones Phosphor Light (weight="light"), nunca Lucide thick
- [ ] Variance Engine consciente: declarei Vibe (Editorial Luxury) + Layout (Editorial Split / Bento / Cascade)
- [ ] Toda card/modal/input usa Double-Bezel (outer shell + inner core, radii concentric)
- [ ] CTAs com arrow usam Button-in-Button trailing icon
- [ ] Section padding mínimo `py-24`, ideal `py-32-40`
- [ ] Todas as transitions usam cubic-bezier custom — sem `linear`/`ease-in-out`
- [ ] Scroll entries via IntersectionObserver com fade-up + blur — nada estático
- [ ] Layout collapsa pra single-col abaixo de 768px, rotações desabilitam, overlaps zeram
- [ ] Animações apenas em `transform` + `opacity`. `will-change` removido após
- [ ] `backdrop-blur` só em fixed/sticky elements
- [ ] Eyebrow tag uppercase tracked-wide antes de toda H1/H2 importante
- [ ] Inline image typography no hero (logo embedded entre palavras)
- [ ] Floating island nav (nunca edge-to-edge)
- [ ] `min-h-[100dvh]` no hero (nunca `h-screen`)
- [ ] Touch targets ≥44px
- [ ] Film-grain layer presente (`opacity-[0.025]` fixed)
- [ ] Impressão final: agência $150k, não template

---

## 13. Aplicação ao restante do app

Esse DESIGN.md é primário pra **LP pública** e **/fornecedor/landing-pages/***. Pra dashboards internos (`/compras/*`, `/fornecedor/pedidos`, etc):

- **Mantém paleta** (cream, espresso, clay, ash) — substitui o azul `#336FB6` antigo gradualmente
- **Display**: pode usar Geist 500 em vez de PP Editorial New (densidade > beleza tipográfica)
- **Density** sobe 7-8 — tabelas, filtros densos, ações inline
- **Mono** vira obrigatório em colunas numéricas
- **Hero asymmetric não aplica** — dashboards começam direto em filtros + lista
- **Variance** cai pra 4 — simetria ajuda escaneabilidade
- **Motion** cai pra 4 — micro só, sem perpetual loops
- **Double-Bezel** opcional — pode usar nos cards de KPI principais, omitir em rows de tabela densa

A `cor_marca` no dashboard interno é o `#336FB6` padrão FlowB2B (e fica como Brand Accent, mantendo o sistema atual).

---

## 14. Próximos artefatos a produzir

Pra desbloquear a Fase 4 da arquitetura (LP pública + checkout):

1. **Componente `<LpHero/>`** — Editorial Split com inline image typography, 1 sample real
2. **Componente `<LpProductCard/>`** — Double-Bezel completo, button-in-button, hover physics
3. **Componente `<LpProductGrid/>`** — Asymmetrical Bento responsivo
4. **Componente `<LpCartDrawer/>`** — Drawer lateral + bottom sheet mobile
5. **Hook `useScrollReveal()`** — IntersectionObserver wrapper pra entries
6. **Asset bundle** — PP Editorial New + Geist em `/public/assets/fonts/`, SVG noise filter em `/public/assets/textures/grain.svg`

Esses 6 itens, junto com a tabela `landing_pages_fornecedor` (Fase 3a do architecture spec), formam o MVP funcional da LP. Estimativa: ~16-20h dev pra ter primeira LP renderizando com produto real.
