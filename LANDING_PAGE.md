# FlowB2B - Landing Page Specification v2

> **Skills aplicadas:** `design-taste-frontend` (8/6/4), `high-end-visual-design`, `redesign-existing-projects`
> **Vibe Archetype:** Soft Structuralism (Consumer SaaS — silver-grey, massive bold Grotesk, airy floating components, diffused ambient shadows)
> **Layout Archetype:** Asymmetrical Bento + Editorial Split (alternando por seção)
> **Status:** BETA aberto com 3 meses grátis

---

## 0. SISTEMA DE DESIGN (Landing-only)

### 0.1 Paleta de Cores

Monotonal com accent único. Sem misturar warm/cool grays. Sem AI purple.

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-canvas` | `#F8F9FB` | Background global (off-white frio, levemente azulado) |
| `--bg-surface` | `#FFFFFF` | Cards, containers (inner core do Double-Bezel) |
| `--bg-shell` | `#F1F3F7` | Outer shell do Double-Bezel |
| `--bg-deep` | `#0C1220` | Seções imersivas (hero, CTA final) — off-black com tint azul, nunca #000 |
| `--bg-deep-surface` | `#141C2E` | Cards em contexto dark |
| `--accent` | `#2293F9` | Accent UNICO. Links, CTAs, destaques, glow. Saturation ~78% |
| `--accent-muted` | `#2293F9/12` | Backgrounds de badge, icon circles, hover states |
| `--signal` | `#FFBE4A` | Uso restrito: badge BETA, pricing highlight. Nunca como accent geral |
| `--signal-muted` | `#FFBE4A/10` | Background do badge BETA |
| `--text-primary` | `#0F1729` | Headlines, corpo forte — off-black |
| `--text-secondary` | `#4B5563` | Corpo, descrições |
| `--text-muted` | `#9CA3AF` | Captions, metadata, helper text |
| `--text-inverse` | `#F1F3F7` | Texto em fundo dark |
| `--border` | `rgba(15,23,41,0.06)` | Hairlines, divisores |
| `--border-accent` | `rgba(34,147,249,0.12)` | Borders com tint accent |
| `--shadow-ambient` | `0 20px 40px -15px rgba(12,18,32,0.04)` | Shadow difusa principal |
| `--shadow-accent` | `0 20px 40px -15px rgba(34,147,249,0.08)` | Shadow tinted para hover/featured |

### 0.2 Tipografia

Nenhuma font genérica. Hierarchy via peso, tracking e cor — não só tamanho.

| Role | Font | Weight | Tracking | Line-height | Exemplo |
|------|------|--------|----------|-------------|---------|
| Display (H1 hero) | `Satoshi` | 800 (ExtraBold) | `-0.04em` | `1.02` | `text-5xl md:text-7xl` |
| Heading (H2 seções) | `Satoshi` | 700 (Bold) | `-0.03em` | `1.08` | `text-3xl md:text-5xl` |
| Subheading (H3) | `Satoshi` | 600 (SemiBold) | `-0.02em` | `1.15` | `text-xl md:text-2xl` |
| Body | `Geist Sans` | 400 (Regular) | `0` | `1.65` | `text-base max-w-[60ch]` |
| Body strong | `Geist Sans` | 500 (Medium) | `0` | `1.65` | Feature bullets |
| Caption/meta | `Geist Sans` | 400 | `0.01em` | `1.5` | `text-sm text-muted` |
| Monospace (dados) | `Geist Mono` | 500 | `0` | `1.4` | Preços, KPIs, porcentagens |
| Eyebrow | `Geist Sans` | 500 | `0.12em` | `1` | `text-[11px] uppercase` |

**Regras tipográficas:**
- `text-wrap: balance` em todos os H1/H2 para evitar orphaned words
- Largura máxima de corpo: `60ch` (não `65ch` — mais tenso, mais premium)
- Nunca usar ALL-CAPS em headings. Eyebrows sim, resto sentence case.
- Numerais sempre em `font-mono` com `font-variant-numeric: tabular-nums`

### 0.3 Princípio Espacial: Macro-Whitespace

A landing respira. Seções são separadas por vazio, não por bordas ou fundos alternados.

| Contexto | Desktop | Mobile |
|----------|---------|--------|
| Seção padding vertical | `py-32` a `py-40` | `py-20` a `py-24` |
| Gap entre grid items | `gap-6` a `gap-8` | `gap-4` a `gap-6` |
| Container max-width | `max-w-[1280px] mx-auto px-6` | `px-4` |
| Padding interno de cards (inner core) | `p-8` a `p-10` | `p-5` a `p-6` |

### 0.4 Component Architecture: Double-Bezel (Doppelrand)

TODO card ou container de destaque usa a arquitetura de encapsulamento duplo. Nunca colocar um card flat no background.

```
┌─ Outer Shell ─────────────────────────────────────┐
│  bg: --bg-shell (light) ou white/5 (dark)         │
│  border: ring-1 ring-black/[0.04]                 │
│  padding: p-1.5                                   │
│  radius: rounded-[1.75rem]                        │
│                                                    │
│  ┌─ Inner Core ────────────────────────────────┐  │
│  │  bg: --bg-surface (light) ou deep-surface   │  │
│  │  shadow: inset 0 1px 1px white/[0.08]       │  │
│  │  radius: rounded-[calc(1.75rem-0.375rem)]   │  │
│  │  padding: p-8 to p-10                       │  │
│  │                                              │  │
│  │  [conteudo]                                  │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 0.5 Button Architecture: Button-in-Button

CTAs primários nunca são um retângulo flat com texto. Trailing icon SEMPRE em círculo próprio encapsulado.

```
┌─ Button Pill ─────────────────────────────────────────┐
│                                                        │
│  Testar 3 meses gratis    ┌─ Icon Circle ───────┐    │
│                            │  → (ArrowRight)     │    │
│                            │  bg: white/15        │    │
│                            │  w-8 h-8             │    │
│                            │  rounded-full         │    │
│                            └──────────────────────┘    │
│                                                        │
│  rounded-full  px-6 pl-7 pr-2  py-2                   │
│  bg: --accent  text: white                             │
│  hover: scale-[1.02]                                   │
│  active: scale-[0.98] (tactile press)                  │
│  Icon circle: group-hover:translate-x-1                │
│               group-hover:-translate-y-[1px]           │
│               group-hover:scale-105                    │
└────────────────────────────────────────────────────────┘
```

### 0.6 Eyebrow Tags

Precedem todo H2 de seção. Nunca pill-shaped — usar label retangular minimalista.

```
Estilo: inline-block text-[11px] uppercase tracking-[0.12em] font-medium
        text-[--accent] border-b-2 border-[--accent]/20 pb-1
        (SEM background, SEM rounded-full, SEM border completo)
```

### 0.7 Iconografia

- **Biblioteca:** `@phosphor-icons/react` exclusivamente, peso `light` (strokeWidth 1.5)
- **Consistencia:** Todas os ícones no mesmo peso. Nunca misturar light/bold/fill.
- **Icon containers:** Squircle `rounded-xl` (não circle `rounded-full`) com `bg-[--accent-muted]`
- **Tamanho padrão:** `w-5 h-5` em texto, `w-6 h-6` em containers

### 0.8 Grain Overlay (Textura Global)

Elemento fixo, pointer-events-none, z-50 cobrindo toda a viewport. Quebra a planura digital.

```css
.grain {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,..."); /* noise pattern */
  mix-blend-mode: overlay;
}
```

**Regra:** Nunca em scrolling containers. Apenas fixed overlay.

### 0.9 Motion System

**Regra zero:** Nunca `linear` ou `ease-in-out`. Toda transição usa custom cubic-bezier.

| Contexto | Curva | Duration |
|----------|-------|----------|
| Scroll reveal (entrada) | `cubic-bezier(0.32, 0.72, 0, 1)` | `700ms` |
| Hover/interação | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | `300ms` |
| Spring (Framer Motion) | `type: "spring", stiffness: 120, damping: 18` | auto |
| Press feedback | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `150ms` |

**Scroll reveal padrão:**
```
Entrada: translate-y-20 blur-sm opacity-0
Visível: translate-y-0 blur-0 opacity-100
Trigger: IntersectionObserver ou Framer whileInView
Stagger entre items: 80ms
```

**Regra performance:** Nunca animar `top`, `left`, `width`, `height`. Apenas `transform` + `opacity`. `will-change: transform` apenas em elementos ativamente animando.

---

## 1. NAVBAR

**Padrão:** Fluid Island Nav (high-end-visual-design, Seção 5A).

### Estado padrão (top da página):
```
Floating glass pill descolada do topo:
mt-5 mx-auto w-max rounded-full
bg-[--bg-deep]/60 backdrop-blur-2xl
ring-1 ring-white/[0.06]
shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)]
px-2 py-2
```

### Conteúdo:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo]  │  Funcionalidades   Precos   FAQ  │  [Entrar]  [Testar →]     │
│         │  text-sm text-white/60           │                            │
│         │  hover: text-white               │                            │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Logo:** `<Logo />` variant light, size `sm`
- **Links:** `text-sm font-medium text-white/60` com underline que cresce de `scaleX(0)` a `scaleX(1)` no hover (`origin-left`)
- **"Entrar":** `text-sm font-medium text-white/80` sem borda — text link puro
- **"Testar gratis":** Button-in-Button pattern (Seção 0.5). `bg-[--accent] text-white text-sm` com icon circle `bg-white/15`

### Comportamento scroll:
- **Scroll > 100px:** Background transiciona para `bg-white/80 backdrop-blur-2xl ring-1 ring-black/[0.04]`. Texto muda para dark. Transição `duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`.
- **Regra:** `backdrop-blur` APENAS neste elemento fixo. Nunca em scrolling content.

### Mobile (< 768px):
- Pill reduz para Logo + CTA + hamburger (duas linhas, `w-5`)
- **Hamburger morph:** Linhas rotacionam fluidamente para X (`rotate-45` / `-rotate-45` com translate) — nunca desaparecem/reaparecem
- **Menu overlay:** `fixed inset-0 bg-white/95 backdrop-blur-3xl z-40`
- Links entram staggered: `translate-y-12 opacity-0` → `translate-y-0 opacity-100`, delay `80ms` entre items
- CTA "Testar gratis" full-width no bottom do overlay

---

## 2. HERO

**Layout Archetype:** Editorial Split — texto massivo à esquerda, asset interativo à direita.
**Background:** `--bg-deep` (#0C1220) com radial mesh gradient:
  - Orb 1: `radial-gradient(ellipse at 20% 50%, rgba(34,147,249,0.07), transparent 60%)`
  - Orb 2: `radial-gradient(ellipse at 80% 30%, rgba(34,147,249,0.04), transparent 50%)`
  - Nenhum gradiente linear 45deg. Nenhum purple. Apenas diffused accent glow.
**Height:** `min-h-[100dvh]` (nunca `h-screen`)

### Grid: `grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center`

### Coluna Esquerda:

**1. Badge BETA:**
```
Estilo: inline-flex items-center gap-2
        bg-[--signal-muted] ring-1 ring-[--signal]/15
        rounded-lg px-3 py-1.5
        text-[11px] uppercase tracking-[0.1em] font-medium text-[--signal]
        (rounded-lg, NÃO rounded-full — anti-pill badge por redesign-skill)

Conteúdo: [icon: Flask weight=light] Beta aberto — 3 meses gratis

Animação: ring pulsa suavemente (opacity 0.1 → 0.25 → 0.1, duration 3s, infinite)
```

**2. Headline (H1):**
```
Compras que funcionam
no piloto automatico.
```
- `font-satoshi text-[2.75rem] md:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[1.02] text-white`
- "piloto automatico" com `text-[--accent]` — cor aplicada inline, sem gradient text (BANNED)
- `text-wrap: balance`
- **Sem "inteligentes", "seamless", "next-gen"** — linguagem concreta

**3. Subtítulo:**
```
Pedidos de compra gerados por dados de venda e estoque.
Rupturas detectadas antes de virarem problema.
Fornecedores conectados sem WhatsApp.
```
- `text-lg md:text-xl text-slate-400 max-w-[48ch] leading-relaxed`
- Três frases curtas, concretas. Sem filler words.

**4. CTA Group:**
```
[Testar 3 meses gratis  →]       [Ver funcionalidades]
 (Button-in-Button)                (text link, underline)
```
- **Primário:** Button-in-Button (Seção 0.5). `text-base py-3`
  - **Magnetic hover:** Botão puxa levemente na direção do cursor (Framer `useMotionValue` + `useTransform`, fora do React render cycle)
  - **Active:** `scale-[0.97]` com `duration-150ms` (tactile press)
- **Secundário:** `text-base font-medium text-slate-400 underline underline-offset-4 decoration-slate-600 hover:text-white hover:decoration-[--accent]` — SEM ghost button, SEM outline. Apenas text link.

**5. Proof metrics (abaixo dos CTAs, mt-10):**
```
Layout: flex gap-8, NÃO cards — apenas texto com divisor vertical

R$ 0          Sem cartão      5 min
de setup      de crédito      para configurar

font-mono text-2xl font-bold text-white (números)
text-[13px] text-slate-500 (labels)
Divisor: w-px h-10 bg-slate-700 entre cada
```
- Dados concretos em monospace. Sem ícones genéricos (shield, clock). Apenas tipografia.

### Coluna Direita:

**Dashboard Preview — Double-Bezel frame:**
```
Outer Shell: bg-white/[0.04] ring-1 ring-white/[0.06] rounded-[2rem] p-2
Inner Core:  rounded-[calc(2rem-0.5rem)] overflow-hidden
             shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
```

**Conteúdo do frame:** Screenshot real da Curva ABC (a tela mais visual do sistema) — não o dashboard genérico. A curva com KPI cards, badges de urgência coloridos, tabela de fornecedores. Imagem estática otimizada via `next/image`.

**Perspectiva:**
```css
transform: perspective(2000px) rotateY(-4deg) rotateX(1deg);
transition: transform 700ms cubic-bezier(0.32, 0.72, 0, 1);
hover: perspective(2000px) rotateY(-1deg) rotateX(0deg); /* suaviza no hover */
```

**Floating proof badges (absolute, fora do frame):**

Badge 1 — posição `top-[-1rem] right-[-2rem]`:
```
┌─ Double-Bezel mini ─────────────────────────────┐
│  bg-white/[0.06] ring-1 ring-white/[0.08] p-1   │
│  rounded-2xl                                      │
│  ┌────────────────────────────────────────────┐  │
│  │  bg-[--bg-deep-surface] p-3 rounded-xl     │  │
│  │  [icon: TrendUp] -47.2% rupturas           │  │
│  │  text-emerald-400  font-mono text-sm       │  │
│  └────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘

Animação: float (translateY 0 → -6px → 0), 4s, infinite
```

Badge 2 — posição `bottom-[2rem] left-[-2.5rem]`:
```
Mesmo Double-Bezel mini
[icon: Package] 15 pedidos gerados
text-[--accent] font-mono text-sm

Animação: float, 4s, infinite, delay 1.5s
```

**Regra:** Floating badges são Client Components isolados (memoized), cada um em seu próprio módulo. Animação via CSS keyframes (NÃO React state, NÃO setInterval).

### Mobile:
- Single column. Texto primeiro, preview abaixo.
- Preview perde perspectiva 3D (flat, `transform: none`).
- Floating badges reposicionados para dentro do frame (relative, não absolute).
- Proof metrics: `grid grid-cols-3` com `text-center`.

---

## 3. SEÇÃO: STATUS BETA

**Posição:** Imediatamente abaixo do hero. Funciona como transição dark → light.
**Background:** `--bg-canvas` com top overlap negativo `-mt-8` para criar profundidade sobre o hero.

**Layout:** Container centralizado, max-w-[720px].

```
┌─ Card Double-Bezel ──────────────────────────────────────────────────────────┐
│  bg-[--signal]/[0.03] ring-1 ring-[--signal]/10 rounded-[1.75rem] p-1.5     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  bg-white rounded-[calc(1.75rem-0.375rem)] p-6                         │ │
│  │                                                                         │ │
│  │  [icon: Flask, text-[--signal], w-5 h-5]                               │ │
│  │                                                                         │ │
│  │  Estamos construindo em publico.                                       │ │
│  │  text-base font-semibold text-[--text-primary]                         │ │
│  │                                                                         │ │
│  │  O FlowB2B esta em versao beta — funcional, em uso, mas ainda          │ │
│  │  em refinamento. Os 3 primeiros meses sao por nossa conta para         │ │
│  │  que voce teste sem risco. Seu feedback define o que priorizamos.      │ │
│  │  text-sm text-[--text-secondary] leading-relaxed max-w-[55ch]         │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Tom:** Transparente, honesto, sem marketing-speak. "Construindo em publico" transmite credibilidade.
- **Scroll reveal:** Fade-up com blur (padrão 0.9).

---

## 4. SEÇÃO: O PROBLEMA

**Objetivo:** Gerar identificação. O visitante deve pensar "isso sou eu".

**Eyebrow + Headline:**
```
Eyebrow: ANTES DO FLOWB2B
H2: Reconhece alguma dessas situacoes?
```

**Layout: Bento Grid assimétrico** — NÃO 2x2 simétrico, NÃO 3 colunas iguais.

```
Desktop grid:
grid-template-columns: 1.4fr 1fr 1fr
grid-template-rows: auto auto

┌─────────────────────────┬──────────────┬──────────────┐
│                         │              │              │
│    Card 1 (GRANDE)      │   Card 2     │   Card 3     │
│    row-span-2           │              │              │
│                         ├──────────────┼──────────────┤
│                         │              │              │
│                         │   Card 4     │   (vazio)    │
│                         │              │              │
└─────────────────────────┴──────────────┴──────────────┘
```

**Mobile:** Single column, stack vertical.

### Cards (sem Double-Bezel aqui — usar apenas border-top para agrupar):

Os pain points NÃO usam cards genéricos (anti-card-overuse do taste-skill). Usar **division by border-top + whitespace**.

```
Cada item:
  border-t: 1px solid --border
  pt-6 pb-8

  [Number] 01        ← font-mono text-sm text-[--text-muted]
  [Title]             ← text-lg font-semibold text-[--text-primary] mt-2
  [Description]       ← text-sm text-[--text-secondary] leading-relaxed mt-2 max-w-[40ch]
```

**Exceção — Card 1 (o item grande, row-span-2):** Este USA Double-Bezel porque é o pain point principal e merece elevação.

### Conteúdo dos items:

**Card 1 (GRANDE — Double-Bezel):**
```
Numero: 01
Titulo: Pedidos por WhatsApp e planilha
Descricao: Mensagem para o fornecedor. PDF de volta. Digitar tudo no sistema.
            Conferir. Errar. Refazer. Toda semana, o mesmo ciclo manual
            que consome horas e gera retrabalho.

Visual interno: Mini ilustração SVG de um ciclo frustrado
                (WhatsApp icon → PDF icon → Teclado → Loop arrow)
                Animação: os ícones circulam em loop infinito, lento,
                reforçando a repetição. CSS animation, NÃO JS.
```

**Card 2:**
```
Numero: 02
Titulo: Rupturas invisiveis
Descricao: Produto acaba na gondola. Ninguem percebe ate o cliente reclamar.
            Sem classificacao ABC, a prioridade eh achismo.
```

**Card 3:**
```
Numero: 03
Titulo: Fornecedor e lojista, cada um no seu mundo
Descricao: Planilhas divergentes, precos desatualizados, pedidos
            que se perdem entre e-mails e ligacoes.
```

**Card 4:**
```
Numero: 04
Titulo: Compras sem dados
Descricao: Sem cruzar vendas com estoque e prazo de entrega,
            voce compra demais ou de menos. Capital empatado
            ou prateleira vazia.
```

**Scroll reveal:** Staggered entry, 80ms delay entre items, da esquerda para direita.

---

## 5. SEÇÃO: FUNCIONALIDADES

**Objetivo:** Mostrar concretamente o que o FlowB2B faz. Sem abstração.

**Eyebrow + Headline:**
```
Eyebrow: O QUE VOCE GANHA
H2: Cada funcionalidade resolve um problema real.
```

**Layout: Sticky Scroll Stack** — A coluna esquerda tem a lista de features (scrollável), a coluna direita mostra o mockup correspondente fixo (sticky) que troca conforme o scroll.

```
Desktop:
grid grid-cols-[1fr_1.1fr] gap-16

┌──── Coluna Esquerda (scroll) ───┐  ┌──── Coluna Direita (sticky) ──┐
│                                  │  │                                │
│  Feature 1 (ativa: opacity 1)   │  │  ┌─ Double-Bezel ──────────┐  │
│  Feature 2 (inativa: opacity .3)│  │  │                          │  │
│  Feature 3 (inativa: opacity .3)│  │  │  [Mockup da Feature      │  │
│  Feature 4                      │  │  │   atualmente ativa]      │  │
│  Feature 5                      │  │  │                          │  │
│  Feature 6                      │  │  │  Transição: crossfade    │  │
│                                  │  │  │  + translateY(8px)      │  │
│  Cada feature ocupa ~60vh de     │  │  └──────────────────────────┘  │
│  espaço para criar scroll range │  │                                │
│                                  │  │  sticky top-[20vh]            │
└──────────────────────────────────┘  └────────────────────────────────┘
```

**Mobile:** Stack vertical simples. Cada feature com texto + mockup inline abaixo.

### Feature item (coluna esquerda):
```
Cada item:
  min-h-[60vh] flex flex-col justify-center

  Eyebrow:      PEDIDOS                         ← text-[11px] uppercase tracking-[0.12em] text-[--accent]
  Titulo:       Pedidos de compra                ← text-2xl md:text-3xl font-bold tracking-tight
                gerados por dados reais             text-[--text-primary]
  Descricao:    O sistema cruza historico        ← text-base text-[--text-secondary] leading-relaxed
                de vendas, estoque atual            max-w-[42ch] mt-4
                e prazo do fornecedor para
                sugerir o que comprar.

  Bullets:      (mt-6, flex flex-col gap-3)
                Cada bullet: flex items-start gap-3
                [dot: w-1.5 h-1.5 rounded-full bg-[--accent] mt-2.5]
                [text: text-sm font-medium text-[--text-primary]]
```

### As 6 features:

**Feature 1: Pedidos automaticos**
```
Eyebrow: PEDIDOS
Titulo: Pedidos de compra gerados por dados reais
Desc: O sistema cruza historico de vendas, estoque atual e prazo
      do fornecedor. Calcula a quantidade ideal, arredonda por
      embalagem e gera o pedido pronto para enviar.

Bullets:
· Sugestao baseada em media diaria de vendas
· Margem de seguranca automatica para itens zerados
· Arredondamento por caixa — nunca fracionado
· Protecao de 1 embalagem minima por produto

Mockup: Tela de criacao de pedido com tabela de itens, coluna "Qtd sugerida",
        badges de status. Screenshot real estilizado.
```

**Feature 2: Curva ABC**
```
Eyebrow: ANALISE
Titulo: Rupturas detectadas antes de virarem problema
Desc: Classifique produtos por impacto no faturamento ou volume.
      Veja quais itens estao criticos — e crie pedidos direto
      da analise, sem sair da tela.

Bullets:
· Curva por faturamento e por quantidade
· Niveis de urgencia: critica, alta, media
· Receita em risco estimada por fornecedor
· Criacao de pedido rapido ou completo

Mockup: Tela Curva ABC com KPI cards coloridos (rupturas totais,
        curva A, receita em risco) e tabela de fornecedores.
```

**Feature 3: Portal do fornecedor**
```
Eyebrow: CONEXAO
Titulo: Fornecedores dentro da plataforma, nao no WhatsApp
Desc: Cada fornecedor tem acesso proprio. Recebe pedidos,
      envia propostas, atualiza tabelas de preco. Zero ligacao,
      zero e-mail perdido.

Bullets:
· Dashboard com pedidos pendentes e valores abertos
· Contra-propostas e sugestoes direto no sistema
· Upload de tabelas de preco com validade
· Conferencia de estoque colaborativa

Mockup: Dashboard do fornecedor com cards de metricas,
        lista de pedidos recentes, badges de status.
```

**Feature 4: Conferencia de estoque**
```
Eyebrow: ESTOQUE
Titulo: Seu representante verifica o estoque na loja
Desc: O representante visita a loja, registra quantidades reais
      produto a produto. O sistema compara com o estoque do
      sistema e aponta cada divergencia.

Bullets:
· Leitura por GTIN ou codigo de barras
· Deteccao automatica de divergencias
· Aceite, recusa ou ajuste por item
· Historico completo de conferencias

Mockup: Tela mobile de conferencia com lista de itens,
        badges verde/vermelho de divergencia.
```

**Feature 5: Integracao Bling**
```
Eyebrow: ERP
Titulo: Bling conectado em 2 cliques
Desc: Produtos, fornecedores, estoque, vendas e notas fiscais
      sincronizados automaticamente. Atualizacao diaria. Voce
      nunca digita a mesma informacao duas vezes.

Bullets:
· Sincronizacao completa de 6 modulos
· Notas fiscais com dados detalhados
· Atualizacao diaria automatica
· Disponivel no plano Pro

Mockup: Tela de sync com progress steps, status indicators,
        historico de jobs com timestamps.
```

**Feature 6: Link publico de pedido**
```
Eyebrow: COMPARTILHAMENTO
Titulo: Qualquer pessoa visualiza o pedido, sem login
Desc: Gere um link publico para o pedido de compra. O fornecedor
      ve tudo — itens, precos, frete, parcelas — e exporta em
      PDF, CSV ou Excel.

Bullets:
· Visualizacao completa sem autenticacao
· Exportacao em 3 formatos
· Convite para cadastro direto do link
· Responsivo para qualquer dispositivo

Mockup: Tela do pedido publico com tabela de itens,
        botoes de export, banner de convite.
```

**Scroll behavior (desktop):**
- IntersectionObserver monitora cada feature item
- Feature ativa: `opacity-100 translate-y-0`
- Features inativas: `opacity-30 translate-y-0` (não somem, apenas recuam)
- Mockup troca com crossfade `opacity 0→1` + `translateY(8px→0)` em `500ms`
- Coluna direita: `position: sticky; top: 20vh`

---

## 6. SEÇÃO: COMO FUNCIONA

**Eyebrow + Headline:**
```
Eyebrow: COMO COMECAR
H2: Primeiro pedido automatico em menos de uma hora.
```

**Layout: Timeline vertical com linha lateral** — NÃO 3 colunas horizontais (BANNED pelo taste-skill: "NO 3-Column Card Layouts").

```
Desktop:
max-w-[640px] mx-auto (centralizado e estreito)

        ┌── Linha vertical SVG ──┐
        │                         │
   ○────┤  Step 1                 │
        │  Crie sua conta         │
        │                         │
   ○────┤  Step 2                 │
        │  Conecte seus dados     │
        │                         │
   ○────┤  Step 3                 │
        │  Receba sugestoes       │
        │                         │
        └─────────────────────────┘
```

### Step items:
```
Cada step:
  flex gap-6 items-start

  Left:
    Circle: w-10 h-10 rounded-xl (squircle) bg-[--accent-muted]
            flex items-center justify-center
            [Numero em font-mono text-sm font-bold text-[--accent]]
    Linha: w-px h-full bg-[--border] mx-auto (conecta ao proximo)

  Right:
    Titulo: text-lg font-semibold text-[--text-primary]
    Desc:   text-sm text-[--text-secondary] leading-relaxed max-w-[44ch] mt-1
```

**Conteúdo:**

```
Step 1 — Crie sua conta
Cadastro gratuito em 2 minutos. E-mail, senha, dados da empresa.
Sem cartao de credito. Sem aprovacao.

Step 2 — Conecte seus dados
Importe do Bling (plano Pro) ou cadastre produtos e fornecedores
manualmente. O sistema guia cada passo.

Step 3 — Receba sugestoes de compra
Com dados de venda e estoque carregados, o FlowB2B analisa e gera
pedidos automaticamente. Revise, ajuste e envie ao fornecedor.
```

**Animação da linha:** SVG `stroke-dasharray` + `stroke-dashoffset` animado no scroll. A linha "desenha" conforme o usuario scrolls. Cada circle node pulsa brevemente quando a linha alcanca.

---

## 7. SEÇÃO: PRICING

**Eyebrow + Headline:**
```
Eyebrow: PLANOS
H2: Comece gratis. Pague so se fizer sentido.
Subtítulo: 3 meses por nossa conta. Sem cartao. Cancele quando quiser.
           text-base text-[--text-secondary] mt-4
```

**Layout: Grid assimétrico `grid-cols-[1fr_1.15fr]`** — Pro levemente maior, mas não gritante.

### Card Essencial (coluna esquerda):

```
Double-Bezel:
  Outer: bg-[--bg-shell] ring-1 ring-black/[0.04] rounded-[1.75rem] p-1.5
  Inner: bg-white rounded-[calc(1.75rem-0.375rem)] p-8

Conteúdo:
  Tag: text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium
       "Essencial"
       (sem badge "Mais popular" — anti-pill badge)

  Preço:
    R$ 49,90      ← font-mono text-[3.25rem] font-bold text-[--text-primary] tracking-tight
    /mes          ← text-base text-[--text-muted] font-normal ml-1

  Nota:
    Gratis por 3 meses     ← text-sm text-[--text-secondary] mt-2
    [line-through: R$ 149,70 economizados]

  Divider: border-t border-[--border] my-6

  Lista de features:
    Cada item: flex items-start gap-3 py-1.5
    [dot: w-1.5 h-1.5 rounded-full bg-[--accent] mt-2]
    [text: text-sm text-[--text-secondary]]

    · Ate 15 pedidos de compra automaticos por mes
    · 200 MB de armazenamento
    · Sugestao inteligente com IA
    · Curva ABC por faturamento e quantidade
    · Portal do fornecedor — acesso ilimitado
    · Portal do representante
    · Conferencia de estoque colaborativa
    · Tabelas de preco e politicas de compra
    · Link publico de pedidos
    · Exportacao PDF, CSV, Excel

  CTA (mt-8):
    Full-width button outline:
    border border-[--border] text-[--text-primary] rounded-xl py-3.5
    text-sm font-medium
    hover: bg-[--bg-shell] border-[--accent]/30
    active: scale-[0.98]
    "Comecar 3 meses gratis"
```

### Card Pro (coluna direita):

```
Double-Bezel com accent:
  Outer: bg-[--accent]/[0.04] ring-1 ring-[--accent]/10 rounded-[1.75rem] p-1.5
         shadow-[--shadow-accent]
  Inner: bg-[--bg-deep] rounded-[calc(1.75rem-0.375rem)] p-8
         shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]

Conteúdo:
  Tag: text-[11px] uppercase tracking-[0.12em] text-[--accent] font-medium
       flex items-center gap-2
       [dot: w-1.5 h-1.5 rounded-full bg-[--accent] animate-pulse]
       "Pro — Bling integrado"

  Preço:
    R$ 99,90      ← font-mono text-[3.25rem] font-bold text-white tracking-tight
    /mes          ← text-base text-slate-500 font-normal ml-1

  Nota:
    Gratis por 3 meses     ← text-sm text-slate-400 mt-2

  Divider: border-t border-white/[0.06] my-6

  Label: text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-3
         "Tudo do Essencial, mais:"

  Lista:
    [dot: bg-[--accent]]
    [text: text-sm text-slate-300]

    · Integracao completa com Bling ERP
    · Sincronizacao de produtos, estoque e vendas
    · Importacao de notas fiscais detalhadas
    · Atualizacao diaria automatica
    · Pedidos de compra ilimitados por mes
    · Armazenamento expandido
    · Suporte prioritario

  CTA (mt-8):
    Full-width Button-in-Button:
    bg-[--accent] text-white rounded-xl py-3.5
    text-sm font-medium
    hover: shadow-[0_0_30px_rgba(34,147,249,0.25)] scale-[1.01]
    active: scale-[0.98]
    "Comecar 3 meses gratis  →"
    Icon circle: bg-white/15 w-7 h-7
```

**Abaixo dos cards:**
```
text-sm text-[--text-muted] text-center mt-8
"Volume maior? Entre em contato para um plano sob medida."
[text link: Falar com a equipe → underline decoration-[--accent]/30]
```

**Mobile:** Stack vertical, Pro primeiro (mais destaque).

**Scroll reveal:** Os dois cards entram juntos com stagger de 120ms. Spring physics no hover (`stiffness: 200, damping: 20`).

---

## 8. SEÇÃO: FAQ

**Eyebrow + Headline:**
```
Eyebrow: DUVIDAS COMUNS
H2: O que voce precisa saber antes de comecar.
```

**Layout: Grid 2 colunas simples** — NÃO accordion genérico (redesign-skill: "Accordion FAQ sections → Use a side-by-side list"). Todas as respostas visíveis. Sem expand/collapse.

```
Desktop: grid grid-cols-2 gap-x-12 gap-y-10
Mobile:  grid grid-cols-1 gap-y-8
```

### Cada item:
```
Pergunta: text-base font-semibold text-[--text-primary]
Resposta: text-sm text-[--text-secondary] leading-relaxed mt-2 max-w-[48ch]
Divisor:  Nenhum. Whitespace separa. (anti-card, anti-border-overuse)
```

### Conteúdo (8 itens, 4 por coluna):

**Coluna 1:**

```
P: O que significa versao beta?
R: O sistema esta funcional e em uso, mas em refinamento ativo.
   Funcionalidades podem ser ajustadas com base no seu feedback.
   Por isso os 3 primeiros meses sao gratuitos.

P: Preciso ter Bling para usar?
R: Nao. O plano Essencial funciona independente — voce cadastra
   produtos e fornecedores manualmente. A integracao Bling
   eh um recurso do plano Pro.

P: Como funciona o periodo gratis?
R: Crie sua conta sem cartao de credito. Acesso completo ao plano
   escolhido por 3 meses. No final, voce decide se quer continuar.

P: Quantos fornecedores posso ter?
R: Ilimitados nos dois planos. Cada fornecedor recebe
   seu proprio acesso ao portal.
```

**Coluna 2:**

```
P: Meus dados estao seguros?
R: Cada empresa tem dados completamente isolados. Criptografia
   em transito e em repouso. Nenhum funcionario tem acesso
   aos seus dados comerciais.

P: E se eu passar de 15 pedidos no Essencial?
R: Voce recebe um aviso e pode migrar para o Pro a qualquer
   momento. Sem perder dados, sem interrupcao.

P: Como a sugestao inteligente funciona?
R: O sistema analisa historico de vendas e estoque atual, calcula
   a media diaria, aplica margem de seguranca e arredonda por
   embalagem. O resultado eh a quantidade ideal por produto.

P: Posso cancelar a qualquer momento?
R: Sim. Sem multa, sem burocracia, sem pegadinha.
```

**Scroll reveal:** Stagger por item, coluna esquerda primeiro, depois direita. 60ms delay entre items.

---

## 9. SEÇÃO: CTA FINAL

**Background:** `--bg-deep` — transicao suave do light. Não um salto abrupto.
**Transição:** Seção anterior tem um pseudo-element `::after` com gradient `from-transparent to-[--bg-deep]` height `200px` para criar blend suave.

**Layout: Editorial Split assimétrico** — NÃO centralizado (ANTI-CENTER BIAS para DESIGN_VARIANCE 7).

```
grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center
min-h-[60vh] py-32
```

### Coluna Esquerda:

```
Eyebrow: COMECE AGORA
         text-[11px] uppercase tracking-[0.12em] text-[--accent]
         border-b-2 border-[--accent]/20 pb-1 inline-block

H2: 3 meses gratis para
    repensar suas compras.
    text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white leading-[1.08]
    text-wrap: balance

Desc: Crie sua conta em 2 minutos. Sem cartao, sem compromisso.
      Se nao fizer sentido, cancele quando quiser.
      text-lg text-slate-400 max-w-[44ch] leading-relaxed mt-6

CTA (mt-8):
    Button-in-Button grande:
    bg-[--accent] text-white rounded-full px-8 py-4 text-base
    shadow-[0_0_40px_rgba(34,147,249,0.2)]
    hover: shadow-[0_0_60px_rgba(34,147,249,0.3)] scale-[1.02]
    "Criar minha conta gratis  →"
    Magnetic hover ativo.

Nota BETA (mt-4):
    text-xs text-slate-600
    "Versao beta — seu feedback define nossas prioridades."
```

### Coluna Direita:

Decorativa. Mesh gradient com orbs `--accent` em motion lenta (CSS animation, position absolute, blur massivo):

```css
.orb-1 {
  position: absolute;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(34,147,249,0.12), transparent 70%);
  border-radius: 50%;
  filter: blur(60px);
  animation: drift 8s ease-in-out infinite alternate;
}
.orb-2 {
  /* similar, offset position, delay 3s, accent muted */
}
```

**Performance:** Orbs em `position: fixed` com `pointer-events: none`. Blur aplicado ao elemento, não ao container.

---

## 10. FOOTER

**Background:** `#080D18` (um shade mais profundo que `--bg-deep`).

**Layout simplificado** (redesign-skill: "Footer link farm with 4 columns → Simplify"):

```
grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-8
max-w-[1280px] mx-auto px-6 py-16
```

### Coluna 1 (Brand):
```
[Logo] variant light, size md
mt-4: text-sm text-slate-500 max-w-[28ch] leading-relaxed
"Plataforma B2B que automatiza compras com dados reais."

mt-6: flex gap-4
[icon: InstagramLogo w-5 h-5 text-slate-600 hover:text-slate-300]
[icon: LinkedinLogo w-5 h-5 text-slate-600 hover:text-slate-300]
```

### Coluna 2 (Produto):
```
Label: text-[11px] uppercase tracking-[0.12em] text-slate-600 font-medium mb-4
       "Produto"

Links: flex flex-col gap-2.5
       text-sm text-slate-500 hover:text-slate-300
       transition duration-200

· Funcionalidades
· Precos
· Integracoes
· Changelog
```

### Coluna 3 (Legal):
```
Label: "Legal"

· Termos de uso           ← link para /(legal)/termos-de-uso
· Politica de privacidade ← link para /(legal)/politica-privacidade
· Contato
```

### Bottom bar:
```
border-t border-white/[0.04] mt-12 pt-6
flex justify-between items-center

Left:  text-xs text-slate-600 "2025 FlowB2B. Todos os direitos reservados."
Right: text-xs text-slate-600 "Feito no Brasil" (sem emoji, sem ícone de bandeira)
```

---

## 11. SEO & META

```html
<title>FlowB2B — Compras automaticas para atacado e varejo</title>
<meta name="description" content="Gere pedidos de compra com base em dados de venda e estoque. Curva ABC, portal do fornecedor e integracao Bling. 3 meses gratis." />
<meta property="og:title" content="FlowB2B — Compras automaticas para atacado e varejo" />
<meta property="og:description" content="Pedidos de compra gerados por dados reais. Teste gratis por 3 meses." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:type" content="website" />
<meta name="theme-color" content="#0C1220" />
```

---

## 12. IMPLEMENTACAO

### Estrutura de arquivos:
```
src/app/(marketing)/
├── layout.tsx          ← Fonts (Satoshi + Geist), grain overlay, metadata
├── page.tsx            ← Server Component, compõe todas as seções
└── components/
    ├── Navbar.tsx       ← Client Component (scroll behavior, mobile menu)
    ├── Hero.tsx         ← Server Component container + Client leaf (floating badges, magnetic CTA)
    ├── BetaBanner.tsx   ← Server Component
    ├── ProblemSection.tsx ← Server Component + Client leaf (cycle animation)
    ├── Features.tsx     ← Client Component (IntersectionObserver, sticky scroll)
    ├── HowItWorks.tsx   ← Client Component (SVG line draw on scroll)
    ├── Pricing.tsx      ← Server Component + Client leaf (hover spring)
    ├── FAQ.tsx          ← Server Component (sem interatividade — tudo visivel)
    ├── CTAFinal.tsx     ← Server Component + Client leaf (magnetic CTA, orbs)
    └── Footer.tsx       ← Server Component
```

### Regras de implementação:
- **RSC first:** Tudo Server Component por padrão. `'use client'` APENAS nos leaf components que precisam de interatividade.
- **Isolation:** Cada animação infinita (floating badges, cycle loop, orbs) em seu próprio Client Component, wrapped em `React.memo`.
- **Fonts:** `Satoshi` via `next/font/local`. `Geist` e `Geist Mono` via `next/font/google` ou local.
- **Package check:** Antes de usar `framer-motion`, verificar `package.json`. Se ausente, instalar.
- **Images:** Screenshots reais do FlowB2B dentro de Double-Bezel frames. `next/image` com lazy loading.
- **Tailwind v4:** Confirmar versão. NÃO usar plugin `tailwindcss` em `postcss.config.js` — usar `@tailwindcss/postcss`.
- **Performance:** `will-change: transform` apenas em elementos ativamente animando. Remover após animação.
- **Acessibilidade:** Semantic HTML (`<nav>`, `<main>`, `<section>`, `<footer>`). Focus rings visíveis. Skip-to-content link. Alt text em todas as imagens.
