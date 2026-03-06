# Catálogo Público do Fornecedor - "Vitrine B2B"

> Status: **Engavetado** - Conceito aprovado, aguardando priorização.

---

## O Conceito

O fornecedor distribui pra centenas de lojistas. Hoje manda lista de preço por PDF no WhatsApp. Com a FlowB2B, ele manda **um link**:

> *"Confira nosso catálogo: flowb2b.com/catalogo/royal-distribuidora"*

O lojista abre no celular, direto do WhatsApp, sem cadastro, sem login. Vê os produtos, joga no carrinho, faz o pedido. Simples como pedir comida no iFood.

---

## O que já existe vs. o que falta

**Já temos:**
- `catalogo_fornecedor` + `catalogo_itens` + `catalogo_precos_lojista` (tabelas)
- Fornecedor gerencia catálogo em `/fornecedor/catalogo`
- Lojista autenticado navega em `/compras/catalogo`

**O que falta:** Uma página pública, sem auth, mobile-first, compartilhável.

---

## Experiência do Lojista (quem abre o link)

```
1. Abre o link no WhatsApp
2. Vê a vitrine: logo do fornecedor, banner, categorias
3. Navega por categorias (scroll horizontal, tipo iFood)
4. Busca produto por nome/código
5. Adiciona ao carrinho (quantidade em caixas)
6. Revisa carrinho (botão flutuante com contador)
7. Se identifica (CNPJ ou telefone) → vê preço personalizado se tiver
8. Confirma pedido
9. Recebe confirmação no WhatsApp
```

## Experiência do Fornecedor (quem configura)

```
1. Vai em /fornecedor/catalogo → "Configurar Vitrine Pública"
2. Personaliza: logo, banner, cor, mensagem de boas-vindas
3. Escolhe um slug (royal-distribuidora)
4. Define valor mínimo do pedido
5. Categoriza os produtos
6. Ativa a vitrine pública
7. Compartilha o link
8. Recebe pedidos em /fornecedor/catalogo/pedidos
```

---

## URL e Estrutura de Páginas

```
PÚBLICO (sem auth):
/catalogo/[slug]                → Vitrine principal
/catalogo/[slug]/carrinho       → Carrinho
/catalogo/[slug]/finalizar      → Checkout (identificação + confirmação)
/catalogo/[slug]/pedido/[id]    → Comprovante do pedido

FORNECEDOR (autenticado):
/fornecedor/catalogo            → (já existe) Gerenciar itens
/fornecedor/catalogo/vitrine    → Configurar página pública
/fornecedor/catalogo/pedidos    → Pedidos recebidos via vitrine
```

---

## Mudanças no Banco de Dados

### Estender `catalogo_fornecedor`

```sql
ALTER TABLE catalogo_fornecedor ADD COLUMN slug VARCHAR(100) UNIQUE;
ALTER TABLE catalogo_fornecedor ADD COLUMN descricao TEXT;
ALTER TABLE catalogo_fornecedor ADD COLUMN logo_url TEXT;
ALTER TABLE catalogo_fornecedor ADD COLUMN banner_url TEXT;
ALTER TABLE catalogo_fornecedor ADD COLUMN cor_primaria VARCHAR(7);       -- hex (#FF6B00)
ALTER TABLE catalogo_fornecedor ADD COLUMN whatsapp VARCHAR(20);
ALTER TABLE catalogo_fornecedor ADD COLUMN publico BOOLEAN DEFAULT false;
ALTER TABLE catalogo_fornecedor ADD COLUMN mensagem_boas_vindas TEXT;
ALTER TABLE catalogo_fornecedor ADD COLUMN valor_minimo_pedido DECIMAL(15,2);
ALTER TABLE catalogo_fornecedor ADD COLUMN forma_pagamento_info TEXT;
```

### Estender `catalogo_itens`

```sql
ALTER TABLE catalogo_itens ADD COLUMN categoria VARCHAR(100);
ALTER TABLE catalogo_itens ADD COLUMN imagem_url TEXT;
ALTER TABLE catalogo_itens ADD COLUMN descricao TEXT;
ALTER TABLE catalogo_itens ADD COLUMN destaque BOOLEAN DEFAULT false;
```

### Nova tabela `pedidos_catalogo`

```sql
CREATE TABLE pedidos_catalogo (
  id SERIAL PRIMARY KEY,
  catalogo_id INTEGER REFERENCES catalogo_fornecedor(id),
  cnpj_cliente VARCHAR(14),
  nome_cliente VARCHAR(255),
  telefone_cliente VARCHAR(20),
  email_cliente VARCHAR(255),
  observacao TEXT,
  total DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'novo',  -- novo | visto | em_andamento | concluido | cancelado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Nova tabela `itens_pedido_catalogo`

```sql
CREATE TABLE itens_pedido_catalogo (
  id SERIAL PRIMARY KEY,
  pedido_catalogo_id INTEGER REFERENCES pedidos_catalogo(id),
  catalogo_item_id INTEGER REFERENCES catalogo_itens(id),
  quantidade INTEGER,
  preco_unitario DECIMAL(15,2),
  subtotal DECIMAL(15,2)
);
```

---

## UX da Vitrine (Mobile-First)

```
┌─────────────────────────────┐
│  [Logo]  Royal Distribuidora│
│  "Seu parceiro em pet shop" │
├─────────────────────────────┤
│ 🔍 Buscar produto...        │
├─────────────────────────────┤
│ [Todos] [Ração] [Acessórios]│  ← categorias scroll horizontal
├─────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ │
│ │  [imagem]  │ │  [imagem]  │ │  ← grid 2 colunas
│ │ Ração Royal│ │ Coleira P │ │
│ │ CX 12un   │ │ UN        │ │
│ │ R$ 142,00 │ │ R$ 18,50  │ │
│ │  [+ Add]  │ │  [+ Add]  │ │
│ └───────────┘ └───────────┘ │
│ ┌───────────┐ ┌───────────┐ │
│ │  [imagem]  │ │  [imagem]  │ │
│ │  ...       │ │  ...       │ │
│ └───────────┘ └───────────┘ │
├─────────────────────────────┤
│ 🛒 Ver Carrinho (3)  R$480  │  ← botão flutuante fixo
└─────────────────────────────┘
```

---

## Diferenciais vs. E-commerce Comum

| Aspecto | E-commerce B2C | Vitrine FlowB2B |
|---------|---------------|-----------------|
| Preço | Fixo | Personalizado por CNPJ |
| Quantidade | Unidade | Por caixa (itens_por_caixa) |
| Pagamento | Online | Offline (boleto/prazo) |
| Cadastro | Obrigatório | Só CNPJ + telefone no checkout |
| Pedido mínimo | Não tem | Valor mínimo do fornecedor |
| Pós-venda | Tracking | WhatsApp direto |

---

## A Sacada

O fornecedor **já tem os dados no sistema**. Não precisa cadastrar nada do zero. Produtos, preços, política de compra - tudo já tá no FlowB2B via Bling. A vitrine pública é só uma **camada de apresentação** em cima do que já existe.

Pro lojista que já é cliente FlowB2B, quando ele se identifica pelo CNPJ no checkout, o pedido **já entra no workflow** (pedidos_compra), com preço personalizado, política aplicada, tudo automático.
