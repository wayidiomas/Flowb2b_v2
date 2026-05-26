# Backlog — Cadastro de produto novo durante substituição

**Status:** Backlog (planejado, não implementado)
**Origem:** Solicitação de Juliana Conti (Duubpets) em 26/05/2026
**Estimativa:** ~1 dia útil

---

## Contexto

Hoje, quando o fornecedor vai trocar um produto no pedido (modal "Substituir Produto"), só aparecem produtos **já cadastrados** no catálogo dele (tabela `fornecedores_produtos` + `produtos`). Se o produto é completamente novo — ex.: "o 7kg saiu de linha, agora só vendemos o 10kg" — ele **não tem como adicionar**.

A cliente pediu um formulário pra o fornecedor preencher os dados mínimos e o sistema cadastrar o produto no Bling do lojista + Supabase.

## Princípio guia

> O fornecedor pode não saber todos os campos. **Só o nome é bloqueante.** Sistema valida apenas o mínimo do Bling + EAN (se preenchido). Resto é opcional, lojista pode editar depois.

## Mínimo absoluto do Bling

A API Bling v3 (`POST /produtos`) exige 4 campos. Apenas 1 será visível ao fornecedor:

| Campo | Valor | Visível? |
|---|---|---|
| `nome` | preenchido pelo fornecedor | **Sim** — único campo obrigatório |
| `tipo` | `'P'` (Produto) | Não — fixo no backend |
| `situacao` | `'A'` (Ativo) | Não — fixo no backend |
| `formato` | `'S'` (Simples) | Não — fixo no backend |

## Form do sub-modal

**Seção 1 — Identificação** (visível)
| Campo | Obrigatório? | Validação |
|---|---|---|
| Nome do produto | Sim (≥3 chars) | Pré-populado com o nome do item sendo substituído |
| EAN/GTIN | Não | Se preenchido: checksum EAN-13 client-side |
| Código do fornecedor | Não | Texto livre |

**Seção 2 — Comercial** (visível)
| Campo | Obrigatório? | Default |
|---|---|---|
| Preço unitário | Não | 0 (lojista ajusta depois) |
| Unidade | Não | `UN` |

**Seção 3 — "Mais detalhes (opcional)"** (collapse fechado por padrão)
| Campo | Obrigatório? | Default |
|---|---|---|
| Marca | Não | em branco |
| Itens por caixa | Não | 1 |
| Peso líquido (kg) | Não | em branco |
| Peso bruto (kg) | Não | em branco |
| NCM | Não | em branco. Se preenchido: 8 dígitos numéricos |

## Validações client-side

- **Nome**: obrigatório, ≥3 chars
- **GTIN** (se preenchido): EAN-13 checksum → *"EAN/GTIN inválido — confira ou deixe em branco"*
- **NCM** (se preenchido): 8 dígitos numéricos
- **Preço** (se preenchido): ≥ 0

Tudo o mais: livre.

## Fluxo

```
Modal "Trocar produto"
        ↓
[Botão "Cadastrar novo produto"] (rodapé do modal, sempre visível)
        ↓
Sub-modal: form acima
        ↓
Validação client-side (apenas bloqueantes)
        ↓
"Confirmar" → atualiza item da sugestão local:
    is_substituicao=true
    produto_id=null
    dados_produto_novo={ nome, gtin, codigo, preco, unidade, ... }
        ↓
Fornecedor envia sugestão
        ↓
POST /api/fornecedor/.../sugestao → grava em coluna JSONB
        ↓
Lojista aceita sugestão
        ↓
vincularProdutoBling(dados_produto_novo)
   → POST /produtos no Bling DA EMPRESA DO PEDIDO
   → INSERT produtos (1 linha)
   → INSERT fornecedores_produtos
   → UPDATE item do pedido com produto_id
```

## Comportamentos por cenário

| Cenário | O que acontece |
|---|---|
| Fornecedor preenche só o nome | Bling cria produto com nome + defaults. Funciona. Lojista edita depois. |
| Fornecedor informa GTIN | Antes de criar, busca no Bling se já existe — se sim, **reusa** (lógica já em `catalogo-bling-sync.ts`) |
| GTIN com checksum errado | Form bloqueia. |
| Lojista tem N empresas (Duubpets 1/2/3) | **Cria apenas na empresa do pedido**. Outras empresas: resolvido sob demanda em pedido futuro. |
| Token Bling expirado | `getBlingAccessToken` faz refresh. Se falhar, erro claro no aceite. |
| Fornecedor sem `id_bling` | Bloqueia vínculo, pede sincronização do fornecedor. |

## Arquivos a tocar (na implementação)

| Arquivo | Mudança |
|---|---|
| `src/components/pedido/ProductSearchModal.tsx` | + botão "Cadastrar novo" + sub-form |
| `src/lib/validacao-ean.ts` (novo) | função `validarEAN13(gtin)` |
| `src/app/fornecedor/pedidos/[id]/page.tsx` | extender `handleProdutoSelecionado` |
| `src/app/api/fornecedor/pedidos/[id]/sugestao/route.ts` | persistir `dados_produto_novo` |
| `src/app/api/pedidos-compra/[id]/sugestoes/route.ts` | passar `dados_produto_novo` para `vincularProdutoBling` (já existe e cria no Bling) |
| Migration Supabase | coluna `dados_produto_novo jsonb` em `sugestoes_fornecedor_itens` |

## Fora de escopo (pra mais tarde)

- Replicação do produto novo em outras empresas (Duubpets 1/2/3) — cria só na empresa do pedido
- Aprovação dedicada do lojista antes do aceite do produto novo (revisão extra)
- UI de "produtos novos pendentes" no lado lojista

## Esforço

- Frontend (sub-modal + validação EAN): ~6-8h
- Backend (passar campos + migration): ~2-3h
- **Total**: 1 dia útil

## Por que está em backlog

Prioridade atual está em corrigir o **problema da IA não detectar "extras"** no espelho (problema correlato, em produção, afeta mais pedidos no dia a dia). O cadastro de produto novo é uma feature focada que pode ser feita depois sem dependências bloqueantes.
