# FlowB2B - Pagina "Para Fornecedores" Specification

> **Publico:** Fornecedores/distribuidores que vendem para lojistas (pet shops, varejos)
> **Tom:** "Voce vende, a gente conecta. E ainda te paga por isso."
> **Cor dominante:** Amber/Orange (identidade do portal fornecedor)
> **Modelo:** Portal GRATUITO + programa de indicacao 5% sobre mensalidade dos lojistas indicados

---

## 0. CONTEXTO DE NEGOCIO

### O fornecedor no FlowB2B:
- NAO paga nada. Zero. O portal eh 100% gratuito.
- Recebe pedidos de compra de multiplos lojistas em um so painel.
- Pode negociar em tempo real (contra-propostas, descontos, bonificacoes, substituicoes).
- Ve o estoque real dos seus clientes lojistas.
- Gerencia tabelas de preco, representantes e conferencia de estoque.

### Programa de indicacao:
- Fornecedor indica lojistas para usar o FlowB2B.
- Quando o lojista indicado assina um plano (Essencial R$49,90 ou Pro R$99,90):
  - Fornecedor ganha **5% da mensalidade** enquanto o lojista for assinante.
- Exemplo: indica 10 lojistas no plano Pro → R$49,95/mes de renda passiva.
- Indicacao ilimitada. Sem teto.

### Motivacao do fornecedor para indicar:
1. **Financeira:** 5% recorrente sobre cada lojista indicado
2. **Operacional:** Quanto mais lojistas no FlowB2B, mais pedidos chegam pelo sistema (menos WhatsApp, menos ligacao)
3. **Dados:** Mais lojistas = mais visibilidade de estoque dos clientes = venda mais inteligente

---

## 1. HERO

**Background:** Gradiente amber/orange — `from-[#F59E0B] via-[#D97706] to-[#EA580C]` (identico ao login fornecedor)

**Layout:** Split assimetrico, mesma estrutura da landing principal.

### Coluna Esquerda:

**Badge:**
```
PORTAL GRATUITO
bg-white text-[#D97706] font-bold rounded-lg px-4 py-2 text-xs uppercase shadow-sm
```

**H1:**
```
Venda para todos
os seus lojistas
em um so lugar.
```
- Satoshi ExtraBold, branco
- "em um so lugar." com destaque — pode ser branco mesmo, ou underline sutil

**Subtitulo:**
```
Receba pedidos, negocie em tempo real e acompanhe o estoque
dos seus clientes. Gratis para sempre — e ganhe 5% indicando lojistas.
```
- text-white/80

**CTAs:**
```
[Criar conta gratuita →]     [Ja tenho conta]
 Botao branco, texto amber    Text link branco underline → /fornecedor/login
```

**Proof metrics:**
```
R$ 0           Ilimitado         5%
por mes        lojistas          por indicacao
```

### Coluna Direita:
- Screenshot `fornecedor-dashboard.png` em Double-Bezel dark
- Floating badges:
  - "3 pedidos pendentes" (icon ClipboardText)
  - "R$ 11.268 em aberto" (icon CurrencyDollar)

---

## 2. BANNER — PROGRAMA DE INDICACAO

**Posicao:** Logo apos o hero, sobre fundo light.
**Destaque visual:** Este eh o HOOK principal. O fornecedor nao paga E ganha dinheiro.

**Layout:** Card largo, Double-Bezel warm (laranja), centralizado.

```
Titulo: Indique lojistas. Ganhe 5% todo mes.

Descricao: Para cada lojista que assinar o FlowB2B por sua indicacao,
voce recebe 5% da mensalidade — todo mes, enquanto ele for assinante.
Sem limite de indicacoes.

Exemplo visual (3 colunas inline):

  10 lojistas          Plano Pro           R$ 49,95/mes
  indicados            R$ 99,90/mes        sua receita passiva

  20 lojistas          Plano Essencial     R$ 49,90/mes
  indicados            R$ 49,90/mes        sua receita passiva

CTA: [Quero indicar lojistas →] botao branco → /fornecedor/registro
Nota: Indicacao via link personalizado no seu painel.
```

---

## 3. SECAO: PROBLEMA DO FORNECEDOR

**Eyebrow:** SEM O FLOWB2B
**H2:** Como voce gerencia seus lojistas hoje?

**4 pain points (bento grid, mesma estrutura da landing principal):**

Card 1 (grande): "Pedidos por WhatsApp, e-mail e telefone"
→ Cada lojista pede de um jeito diferente. Voce perde tempo consolidando,
  errando e reenviando. Multiplica por 20, 50, 100 clientes.

Card 2: "Sem visibilidade do estoque do lojista"
→ Voce nao sabe o que seu cliente tem na prateleira. Liga pra oferecer
  e ele ja comprou de outro. Oportunidade perdida.

Card 3: "Tabelas de preco desatualizadas"
→ Cada vendedor manda uma tabela diferente. O lojista reclama do preco.
  Voce descobre que a tabela era de 3 meses atras.

Card 4: "Conferencia de estoque na base da confianca"
→ Representante visita a loja, conta no olho. Divergencia? Ninguem sabe
  quem errou. Sem registro, sem historico.

---

## 4. SECAO: FUNCIONALIDADES (Sticky scroll com mockups)

**Eyebrow:** O QUE VOCE GANHA
**H2:** Tudo que voce precisa para vender melhor.

### 6 Features:

**Feature 1: Pedidos centralizados**
```
Eyebrow: PEDIDOS
Titulo: Todos os pedidos dos seus lojistas em um painel
Desc: Cada lojista envia pedidos pelo FlowB2B. Voce ve tudo em uma lista,
      filtra por status, busca por CNPJ ou numero. Sem WhatsApp, sem ligacao.

Bullets:
· Pedidos de todos os lojistas em tempo real
· Filtro por status: pendente, aceito, rejeitado, finalizado
· Identificacao de pedidos via representante
· Historico completo de negociacoes

Mockup: fornecedor-dashboard.png (ja temos)
```

**Feature 2: Negociacao em tempo real**
```
Eyebrow: NEGOCIACAO
Titulo: Contra-propostas, descontos e substituicoes direto no pedido
Desc: O lojista pediu 10 caixas de X? Voce pode sugerir 12 com 5% de
      desconto. Produto em falta? Substitua por outro. Tudo registrado.

Bullets:
· Contra-proposta com preco, quantidade e desconto editaveis
· Bonificacao por volume (unidades gratis)
· Substituicao de produto com justificativa
· Prazo de entrega e validade da proposta

Mockup: (capturar — tela de detalhe pedido fornecedor com contra-proposta)
```

**Feature 3: Visibilidade de estoque do lojista**
```
Eyebrow: ESTOQUE
Titulo: Veja o que seu cliente tem na prateleira agora
Desc: Acesse o estoque real de cada lojista. Saiba quais produtos estao
      abaixo do minimo. Ofereca antes que ele compre de outro.

Bullets:
· Estoque atual vs minimo por produto
· Classificacao ABC (quais produtos mais vendem)
· Filtro por lojista
· Identifique oportunidades de reposicao

Mockup: (capturar — tela /fornecedor/estoque)
```

**Feature 4: Tabelas de preco inteligentes**
```
Eyebrow: PRECOS
Titulo: Uma tabela de preco, duplicada para N clientes
Desc: Crie tabelas com descontos por volume, validade e observacoes.
      Duplique para outros lojistas com um clique. Sem Excel, sem PDF.

Bullets:
· Descontos por volume com faixas de preco
· Validade com datas de inicio e fim
· Duplicacao em massa para multiplos lojistas
· Preco original vs preco tabela com destaque

Mockup: (capturar — tela /fornecedor/tabelas-preco)
```

**Feature 5: Conferencia de estoque colaborativa**
```
Eyebrow: AUDITORIA
Titulo: Confira o estoque na loja com registro digital
Desc: Seu representante visita a loja, escaneia os produtos e registra
      quantidades. O sistema compara com o estoque do sistema e aponta
      divergencias. Tudo documentado.

Bullets:
· Leitura por codigo de barras (GTIN)
· Deteccao automatica de divergencias
· Historico completo de conferencias
· Fluxo de aceite/recusa pelo lojista

Mockup: (capturar — tela /fornecedor/conferencia-estoque)
```

**Feature 6: Gestao de representantes**
```
Eyebrow: REPRESENTANTES
Titulo: Seus vendedores dentro da plataforma
Desc: Cadastre representantes que vendem em seu nome. Eles recebem acesso
      proprio, fazem pedidos e conferencias. Voce acompanha tudo.

Bullets:
· Representantes com acesso proprio ao sistema
· Pedidos identificados com badge "Rep"
· Status de cadastro: ativo, pendente, inativo
· Multi-lojista por representante

Mockup: (capturar — tela /fornecedor/representantes ou dashboard com reps)
```

---

## 5. SECAO: COMO FUNCIONA

**Eyebrow:** COMO COMECAR
**H2:** Seu primeiro pedido em 3 passos.

**Timeline vertical (3 steps):**

```
Step 1 — Seu lojista te cadastra (azul)
Um lojista FlowB2B adiciona seu CNPJ como fornecedor.
Voce nao precisa fazer nada nessa etapa.

Step 2 — Voce cria sua conta (azul)
Acesse /fornecedor/registro, insira seu CNPJ e crie sua senha.
Automaticamente conectado a todos os lojistas que te cadastraram.

Step 3 — Receba pedidos e indique lojistas (dourado — destaque)
Pedidos chegam automaticamente. Negocie, aceite e acompanhe.
Indique novos lojistas e ganhe 5% da mensalidade deles.
```

---

## 6. SECAO: SIMULADOR DE INDICACAO

**Eyebrow:** PROGRAMA DE INDICACAO
**H2:** Quanto voce pode ganhar indicando lojistas?

**Componente interativo (Client Component):**

```
Layout: card largo centralizado, max-w-[720px]

Input slider:
  "Quantos lojistas voce pretende indicar?"
  Range: 1 a 50 (step 1)
  Default: 10

Toggle:
  "Plano medio dos indicados"
  [Essencial R$49,90]  [Pro R$99,90]

Resultado (atualiza em tempo real):

  ┌─────────────────────────────────────────────┐
  │                                              │
  │  Sua receita mensal estimada:               │
  │                                              │
  │  R$ XX,XX /mes                              │
  │  font-mono text-4xl font-bold text-[#D97706]│
  │                                              │
  │  = X lojistas x R$ Y,YY x 5%               │
  │  text-sm text-[--text-muted]                │
  │                                              │
  │  R$ XXX,XX /ano                             │
  │  text-lg font-semibold                       │
  │                                              │
  └─────────────────────────────────────────────┘

Nota abaixo: "Voce recebe enquanto o lojista for assinante.
              Sem limite de indicacoes. Pagamento mensal."
```

---

## 7. SECAO: POR QUE INDICAR?

**Eyebrow:** VANTAGENS
**H2:** Indicar lojistas beneficia voce de 3 formas.

**3 cards horizontais (nao 3-col banned — usar layout diferente):**
Layout: stack vertical com icones grandes, ou zig-zag.

```
1. Receita passiva
   Icone: CurrencyDollar
   5% recorrente sobre cada mensalidade.
   Indica 10 lojistas Pro? R$49,95/mes sem esforco.

2. Mais pedidos automaticos
   Icone: ShoppingCart
   Cada lojista no FlowB2B gera pedidos que chegam
   direto no seu painel. Mais clientes = mais vendas.

3. Dados dos seus clientes
   Icone: ChartBar
   Veja o estoque, a curva ABC e o historico de compras
   de cada lojista. Venda com inteligencia.
```

---

## 8. FAQ FORNECEDOR

**Eyebrow:** DUVIDAS
**H2:** Perguntas frequentes para fornecedores.

**Grid 2 colunas, todas visiveis:**

Coluna 1:
```
P: O portal do fornecedor eh pago?
R: Nao. O FlowB2B eh 100% gratuito para fornecedores.
   Quem paga sao os lojistas.

P: Como me cadastro?
R: Um lojista precisa adicionar seu CNPJ primeiro.
   Depois voce acessa /fornecedor/registro e cria sua conta.

P: Posso atender varios lojistas?
R: Sim. Uma conta de fornecedor se conecta automaticamente
   a todos os lojistas que cadastraram seu CNPJ.

P: Como funciona a contra-proposta?
R: Ao receber um pedido, voce pode alterar quantidades,
   precos, adicionar descontos ou sugerir substituicoes.
   O lojista ve sua proposta e decide.
```

Coluna 2:
```
P: Como funciona o programa de indicacao?
R: Voce recebe um link no seu painel. Cada lojista que
   assinar pelo seu link gera 5% da mensalidade pra voce.
   Sem limite. Pagamento mensal.

P: Preciso ter Bling?
R: Nao. O portal do fornecedor funciona independente.
   A integracao Bling eh um recurso do lojista.

P: Meus representantes podem usar?
R: Sim. Voce pode ter representantes com acesso proprio.
   Eles fazem pedidos e conferencias em seu nome.

P: Posso ver o estoque dos meus clientes?
R: Sim. Para cada lojista conectado, voce ve o estoque
   atual, minimo e classificacao ABC dos produtos.
```

---

## 9. CTA FINAL

**Background:** Gradiente amber/orange (espelhando o hero)

```
Eyebrow: COMECE AGORA
H2: Gratuito para sempre. E voce ainda ganha por indicar.
Desc: Crie sua conta em 2 minutos. Receba pedidos, negocie
      em tempo real e ganhe 5% por cada lojista indicado.

CTA: [Criar conta gratuita →] botao branco, texto amber
Nota: Seu CNPJ precisa estar cadastrado por um lojista FlowB2B.

Link secundario: "Nao foi cadastrado ainda? Peca ao seu lojista."
```

---

## 10. IMPLEMENTACAO

### Estrutura:
```
src/app/fornecedores/page.tsx          ← Server Component, compoe secoes
src/components/marketing/fornecedor/
  ├── FornecedorHero.tsx               ← Server + Client leaf (badges)
  ├── FornecedorReferralBanner.tsx     ← Server (programa indicacao)
  ├── FornecedorProblem.tsx            ← Server (4 pain points)
  ├── FornecedorFeatures.tsx           ← Client (sticky scroll)
  ├── FornecedorHowItWorks.tsx         ← Client (timeline)
  ├── FornecedorSimulator.tsx          ← Client (slider interativo)
  ├── FornecedorWhyRefer.tsx           ← Server (3 vantagens)
  ├── FornecedorFAQ.tsx               ← Server (8 perguntas)
  └── FornecedorCTAFinal.tsx           ← Server + Client leaf (orbs)
```

### Reutiliza da landing principal:
- `Navbar` (adicionar link "Para Fornecedores" → `/fornecedores`)
- `Footer`
- `DoubleBezel` (variants: warm, accent, light, dark)
- `ButtonPrimary` (CTA laranja global)
- `ScrollReveal`, `SectionContainer`, `Eyebrow`
- `GrainOverlay`
- `MagneticButton`

### Navbar update:
Adicionar entre "FAQ" e "Entrar":
```
[Para Fornecedores]  ← link para /fornecedores
```
Ou melhor: manter a navbar da landing com link extra. Na pagina /fornecedores, a navbar mostra "Para Lojistas" que volta pra `/`.

### Screenshots a capturar:
1. Detalhe pedido fornecedor (com formulario de contra-proposta)
2. Tela de estoque (/fornecedor/estoque com dados)
3. Tabelas de preco (/fornecedor/tabelas-preco)
4. Conferencia de estoque (/fornecedor/conferencia-estoque)

### Cor no Navbar:
Na pagina `/fornecedores`, a navbar quando scrollada pode ficar amber em vez de azul:
`bg-[#D97706]/95` com textos brancos.
