# Refatoracao Mobile - Portal do Lojista

## Situacao Atual

O portal do lojista eh **desktop-only**. A navegacao usa um header horizontal com dropdowns que nao funciona em telas pequenas. Tabelas e formularios nao se adaptam ao mobile.

O portal do **fornecedor ja tem mobile implementado** e serve como referencia de padroes (bottom tab bar, card lists, responsive grids).

---

## Mapa Completo de Telas do Lojista

```
/                                         → Dashboard (KPIs, graficos, tabela pedidos)
│
├── /cadastros/
│   ├── colaboradores/                    → Lista de funcionarios (tabela)
│   │   ├── nova/                         → Formulario novo funcionario
│   │   └── [id]/editar/                  → Formulario editar funcionario
│   ├── fornecedores/                     → Lista de fornecedores (tabela)
│   │   ├── novo/                         → Formulario novo fornecedor
│   │   └── [id]/editar/                  → Formulario editar fornecedor
│   ├── produtos/                         → Lista de produtos (tabela)
│   │   ├── novo/                         → Formulario novo produto
│   │   └── [id]/editar/                  → Formulario editar produto
│   ├── representantes/                   → Lista de representantes (tabela)
│   │   └── [id]/                         → Detalhe do representante
│   └── empresas/                         → Lista de empresas (tabela)
│       ├── nova/                         → Formulario nova empresa
│       └── [id]/editar/                  → Formulario editar empresa
│
├── /compras/
│   ├── pedidos/                          → Lista pedidos de compra (tabela + sidebar)
│   │   ├── novo/                         → Formulario novo pedido (tabela de itens)
│   │   ├── gerar-automatico/             → Gerador automatico de pedido
│   │   └── [id]/
│   │       ├── (view)                    → Detalhe do pedido (timeline, status, itens)
│   │       └── editar/                   → Editar pedido (tabela de itens)
│   ├── curva/                            → Curva ABC - lista fornecedores (tabela)
│   │   └── [fornecedorId]/               → Curva ABC - produtos do fornecedor (tabela)
│   ├── tabelas-preco/                    → Tabelas de preco (tabela)
│   └── catalogo/                         → Catalogo de fornecedores (cards/tabela)
│
├── /estoque/
│   ├── produtos/                         → Controle de estoque (tabela + graficos)
│   └── sugestoes/                        → Sugestoes de estoque (lista)
│       └── [id]/                         → Detalhe da sugestao (aceitar/rejeitar)
│
├── /fiscal/
│   └── notas/                            → Notas fiscais de entrada (tabela)
│
├── /suprimentos/
│   └── politica-compra/                  → Politicas de compra (tabela/cards)
│
├── /configuracoes/                       → Config (Bling, plano, assinatura)
│   └── sync/                             → Progresso de sincronizacao
│
└── /publico/pedido/[id]/                 → Link publico do pedido (sem auth)
```

---

## Arquitetura de Navegacao Atual (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Cadastros▼  Suprimentos▼  Suporte  [👤][🔔][⚙] │
└─────────────────────────────────────────────────────────────────┘
│                                                                  │
│                    Conteudo da pagina                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Problemas no mobile:**
- Header horizontal nao cabe em tela pequena
- Dropdowns de "Cadastros" e "Suprimentos" nao sao touch-friendly
- Tabelas com muitas colunas ficam ilegíveis
- Sidebar de acoes (pedidos) nao se adapta
- Formularios com muitos campos nao fluem bem
- Nenhum bottom tab bar para navegacao rapida

---

## Arquitetura de Navegacao Proposta (Mobile)

```
┌──────────────────────────────────┐
│ [Logo]              [🔔] [👤]   │  ← Header compacto (mobile)
└──────────────────────────────────┘
│                                   │
│      Conteudo da pagina           │
│                                   │
│                                   │
│                                   │
└───────────────────────────────────┘
┌──────────────────────────────────┐
│ 🏠    📦    📊    📋    •••     │  ← Bottom tab bar (mobile)
│ Home Pedidos Estoque Notas Mais │
└──────────────────────────────────┘
```

**Bottom Tab Bar - Itens principais:**
1. Dashboard (`/`)
2. Pedidos (`/compras/pedidos`)
3. Estoque (`/estoque/produtos`)
4. Notas (`/fiscal/notas`)
5. Mais (menu popup com: Cadastros, Curva ABC, Tabelas, Catalogo, Politicas, Sugestoes, Config)

---

## Etapas de Implementacao

---

### ETAPA 1 - Layout e Navegacao Mobile
**Prioridade:** CRITICA
**Impacto:** Todas as paginas

#### 1.1 Adaptar `MainHeader.tsx` para mobile
- Esconder nav horizontal em `md:hidden`
- Manter logo + notificacoes + avatar compacto no mobile
- Header fica: `[Logo] ---- [🔔] [👤▼]`

#### 1.2 Criar `LojistaBottomTabBar.tsx`
- Seguir padrao do `FornecedorLayout.tsx`
- 5 tabs: Dashboard, Pedidos, Estoque, Notas, Mais
- Menu "Mais" com popup para itens secundarios
- `pb-[env(safe-area-inset-bottom)]` para iOS
- `md:hidden` (visivel apenas no mobile)

#### 1.3 Adaptar `DashboardLayout.tsx`
- Incluir `<LojistaBottomTabBar />` dentro do layout
- Adicionar `pb-24 md:pb-6` no main para nao sobrepor conteudo
- Garantir que modais bloqueantes (Trial, Bling) funcionem sobre a tab bar

#### 1.4 Adaptar `PageHeader.tsx`
- Company switcher em `flex-col sm:flex-row`
- Titulo e subtitulo empilhados no mobile

**Arquivos afetados:**
- `src/components/layout/MainHeader.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/LojistaBottomTabBar.tsx` (novo)

---

### ETAPA 2 - Dashboard Responsivo
**Prioridade:** ALTA
**Impacto:** Pagina principal (`/`)

#### 2.1 KPI Cards
- Ja usa `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` - **verificar se funciona bem**

#### 2.2 Graficos (Recharts)
- Usar `<ResponsiveContainer>` (ja usado)
- Reduzir labels no eixo X para mobile
- Graficos lado a lado → empilhados no mobile (`grid-cols-1 lg:grid-cols-2`)

#### 2.3 Tabela de Pedidos Recentes
- Desktop: `hidden md:block` → tabela completa
- Mobile: `md:hidden` → lista de cards com numero, status, valor, data

**Arquivos afetados:**
- `src/app/page.tsx` (dashboard)

---

### ETAPA 3 - Lista de Pedidos de Compra
**Prioridade:** ALTA
**Impacto:** `/compras/pedidos`

#### 3.1 Filtros e busca
- `flex-col sm:flex-row` para barra de busca + botoes
- Filtros de status em `flex-wrap`

#### 3.2 Tabela de pedidos
- Desktop: tabela completa (`hidden md:block`)
- Mobile: cards com info essencial (`md:hidden`)
  - Numero + Status badge
  - Fornecedor
  - Data | Total

#### 3.3 Sidebar de acoes (`SidebarAcoes.tsx`)
- Desktop: sidebar fixa a direita
- Mobile: barra fixa no topo ou bottom sheet
- Considerar colapsar em um FAB (floating action button)

**Arquivos afetados:**
- `src/app/compras/pedidos/page.tsx`
- `src/components/pedido-compra/SidebarAcoes.tsx`

---

### ETAPA 4 - Detalhe e Edicao de Pedido
**Prioridade:** ALTA
**Impacto:** `/compras/pedidos/[id]` e `/compras/pedidos/[id]/editar` e `/compras/pedidos/novo`

#### 4.1 `WorkflowStepper`
- Horizontal no desktop → horizontal com scroll ou mini-stepper no mobile

#### 4.2 Detalhe do pedido
- Layout 2 colunas → 1 coluna no mobile
- `StatusActionCard` full-width no mobile
- `PedidoTimeline` full-width no mobile

#### 4.3 Tabela de itens do pedido
- Desktop: tabela completa
- Mobile: cards empilhados com produto, qtd, valor

#### 4.4 Formulario novo/editar pedido
- Tabela de adicao de itens → interface card-based no mobile
- Busca de produtos: input full-width
- Modal de selecao de fornecedor: full-screen no mobile

**Arquivos afetados:**
- `src/app/compras/pedidos/[id]/page.tsx`
- `src/app/compras/pedidos/[id]/editar/page.tsx`
- `src/app/compras/pedidos/novo/page.tsx`
- `src/components/pedido/WorkflowStepper.tsx`
- `src/components/pedido/StatusActionCard.tsx`
- `src/components/pedido/PedidoTimeline.tsx`
- `src/components/pedido-compra/SidebarAcoes.tsx`
- `src/components/pedido-compra/FornecedorSelectModal.tsx`

---

### ETAPA 5 - Curva ABC
**Prioridade:** MEDIA
**Impacto:** `/compras/curva` e `/compras/curva/[fornecedorId]`

#### 5.1 Lista de fornecedores (Curva)
- Desktop: tabela (`hidden md:block`)
- Mobile: cards com nome, total faturado, qtd produtos, badges ABC

#### 5.2 Produtos do fornecedor (Curva detalhe)
- Desktop: tabela com muitas colunas
- Mobile: cards com produto, curva badge, cobertura bar, sugestao
- Toolbar de selecao: `flex-col sm:flex-row`

#### 5.3 Modais
- `SugestaoModal` e `PedidoEmAbertoModal`: full-screen no mobile

**Arquivos afetados:**
- `src/app/compras/curva/page.tsx`
- `src/app/compras/curva/[fornecedorId]/page.tsx`
- `src/components/compras/curva/FornecedorCurvaTable.tsx`
- `src/components/compras/curva/ProdutosCurvaTable.tsx`
- `src/components/compras/curva/SugestaoModal.tsx`
- `src/components/compras/curva/PedidoEmAbertoModal.tsx`

---

### ETAPA 6 - Estoque
**Prioridade:** MEDIA
**Impacto:** `/estoque/produtos` e `/estoque/sugestoes`

#### 6.1 Controle de estoque
- Tabela de produtos → cards no mobile
- Graficos de movimentacao: responsivos (ja usa ResponsiveContainer)
- Filtros empilhados no mobile

#### 6.2 Sugestoes de estoque
- Lista: tabela → cards no mobile
- Detalhe (`[id]`): tabela de itens → cards
- Botoes aceitar/rejeitar: full-width no mobile

**Arquivos afetados:**
- `src/app/estoque/produtos/page.tsx`
- `src/app/estoque/sugestoes/page.tsx`
- `src/app/estoque/sugestoes/[id]/page.tsx`

---

### ETAPA 7 - Cadastros
**Prioridade:** MEDIA-BAIXA
**Impacto:** `/cadastros/*`

#### 7.1 Listas (colaboradores, fornecedores, produtos, representantes, empresas)
- Todas as tabelas: `hidden md:block` (desktop) / `md:hidden` (mobile cards)
- Busca e filtros: `flex-col sm:flex-row`
- Botao "Novo": full-width ou FAB no mobile

#### 7.2 Formularios (novo/editar)
- Layouts de 2-3 colunas → 1 coluna no mobile
- Inputs full-width
- Botoes de acao fixos no bottom no mobile

#### 7.3 Modais de convite
- `RepresentanteConviteModal` e `FornecedorConviteModal`: full-screen no mobile

**Arquivos afetados:**
- `src/app/cadastros/colaboradores/page.tsx` + nova/ + [id]/editar/
- `src/app/cadastros/fornecedores/page.tsx` + novo/ + [id]/editar/
- `src/app/cadastros/produtos/page.tsx` + novo/ + [id]/editar/
- `src/app/cadastros/representantes/page.tsx` + [id]/
- `src/app/cadastros/empresas/page.tsx` + nova/ + [id]/editar/

---

### ETAPA 8 - Fiscal, Suprimentos e Configuracoes
**Prioridade:** BAIXA
**Impacto:** `/fiscal/notas`, `/suprimentos/politica-compra`, `/configuracoes`

#### 8.1 Notas fiscais
- Tabela → cards no mobile
- Filtros empilhados

#### 8.2 Politica de compra
- Cards/tabela → empilhados no mobile
- Formulario de politica: 1 coluna no mobile

#### 8.3 Configuracoes
- Cards de integracao: `grid-cols-1 sm:grid-cols-2`
- Bling connect card: full-width
- Sync status: layout simples, pouca alteracao necessaria

#### 8.4 Catalogo e Tabelas de Preco
- Tabela → cards no mobile

**Arquivos afetados:**
- `src/app/fiscal/notas/page.tsx`
- `src/app/suprimentos/politica-compra/page.tsx`
- `src/app/configuracoes/page.tsx`
- `src/app/configuracoes/sync/page.tsx`
- `src/app/compras/tabelas-preco/page.tsx`
- `src/app/compras/catalogo/page.tsx`

---

### ETAPA 9 - Componentes UI Base
**Prioridade:** TRANSVERSAL (fazer conforme necessidade nas etapas acima)

#### 9.1 Modal (`src/components/ui/Modal.tsx`)
- Mobile: full-screen (`fixed inset-0` em vez de centered dialog)
- Breakpoint: `md:` volta para modal centralizado

#### 9.2 Tabela generica (se existir)
- Criar padrao reutilizavel de "tabela desktop / cards mobile"
- Componente wrapper: `<ResponsiveTable>` ou pattern por pagina

#### 9.3 Formularios
- Garantir que todos os inputs tenham `w-full` no mobile
- Labels empilhados (nao inline)
- Botoes de acao: sticky bottom no mobile

---

## Padroes CSS a Seguir (Referencia do Fornecedor)

| Padrao | Classes Tailwind |
|--------|-----------------|
| Esconder no mobile | `hidden md:block` |
| Mostrar so no mobile | `md:hidden` |
| Empilhar no mobile | `flex-col sm:flex-row` |
| Grid responsivo | `grid-cols-1 md:grid-cols-3` |
| Padding responsivo | `p-4 md:p-6` |
| Padding bottom (tab bar) | `pb-24 md:pb-6` |
| Safe area iOS | `pb-[env(safe-area-inset-bottom)]` |
| Card list mobile | `divide-y divide-gray-100` |
| Touch feedback | `hover:bg-[#336FB6]/5 active:bg-[#336FB6]/10` |
| Bordas mobile | `rounded-xl`, `rounded-2xl` |
| Input full-width mobile | `w-full sm:w-80` |

---

## Resumo por Prioridade

| Etapa | Descricao | Prioridade | Esforco |
|-------|-----------|------------|---------|
| 1 | Layout + Navegacao Mobile | CRITICA | Medio |
| 2 | Dashboard Responsivo | ALTA | Baixo |
| 3 | Lista Pedidos Compra | ALTA | Medio |
| 4 | Detalhe/Edicao Pedido | ALTA | Alto |
| 5 | Curva ABC | MEDIA | Medio |
| 6 | Estoque | MEDIA | Medio |
| 7 | Cadastros | MEDIA-BAIXA | Alto (muitas telas) |
| 8 | Fiscal, Config, outros | BAIXA | Baixo |
| 9 | Componentes UI Base | TRANSVERSAL | Medio |

**Recomendacao:** Executar na ordem 1 → 9 (base) → 2 → 3 → 4 → 5 → 6 → 7 → 8, fazendo componentes UI conforme a necessidade surge em cada etapa.
