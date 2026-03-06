# Webhook Bling - Estoque (Plano de Implementacao)

## Status: PENDENTE

---

## 1. Configuracao no Portal Bling

### 1.1 Adicionar escopo `stock` ao app

1. Acessar https://developer.bling.com.br/aplicativos
2. Abrir o app customizado de integracao
3. Aba **"Dados Basicos"** > secao de **escopos**
4. Adicionar escopo **`stock`**
5. Salvar

> Sem esse escopo, a opcao de webhook de estoque nao aparece na aba Webhooks.

### 1.2 Configurar servidor (URL de destino)

1. No app, ir para aba **"Webhooks"**
2. Secao **Servidores** > adicionar novo servidor
3. Informar a URL do endpoint receptor:
   ```
   https://flowb2bapi-ymtn.onrender.com/api/webhook/bling/estoque
   ```
4. Salvar

### 1.3 Configurar recurso de Estoque

1. Aba **"Webhooks"** > secao **Recursos**
2. Adicionar recurso **"Estoque"**
3. Selecionar o servidor criado no passo anterior
4. Marcar acoes:
   - `created` — novo lancamento de estoque
   - `updated` — alteracao de saldo
   - `deleted` — remocao (opcional)
5. Versao: **V1**
6. Salvar

> O webhook de Estoque Virtual (`virtual_stock`) e ativado automaticamente junto com o de Estoque.

### 1.4 Reautorizar OAuth

Apos adicionar novo escopo, o usuario Bling precisa **reautorizar o app** (refazer fluxo OAuth). O token antigo nao tera permissao de `stock`.

---

## 2. Como funciona o Webhook

### Eventos disponiveis

| Evento | Gatilho |
|--------|---------|
| `stock.created` | Novo lancamento de estoque |
| `stock.updated` | Alteracao de saldo |
| `stock.deleted` | Remocao de registro |

### Gatilhos

- Disparados apenas por **lancamentos fisicos**: vendas, NF-es, tela de estoque, etc.
- **NAO** disparados por reservas de vendas (isso e estoque virtual).

### Payload recebido (POST)

```json
{
  "eventId": "uuid-unico",
  "date": "2026-03-06T12:00:00Z",
  "version": "1",
  "event": "stock.updated",
  "companyId": 123456,
  "data": {
    "produto": { "id": 789 },
    "deposito": { "id": 123 },
    "operacao": "B",
    "quantidade": 50,
    "preco": 15.75,
    "custo": 15.75,
    "observacoes": "..."
  }
}
```

- `operacao`: B = balanco, E = entrada, S = saida
- O payload e **minimo** (IDs). Para dados completos, chamar a API do Bling.

### Autenticacao do webhook

O Bling envia o header `X-Bling-Signature-256` com HMAC-SHA256:

```
hash = HMAC-SHA256(payload_json, client_secret)
header: "sha256=<hash_hexadecimal>"
```

Validar no endpoint antes de processar.

---

## 3. Plano de Implementacao do Endpoint

### Fluxo proposto

```
Bling (evento estoque)
  |
  POST --> flowB2BAPI /api/webhook/bling/estoque
            |
            1. Validar X-Bling-Signature-256
            2. Extrair produto.id do payload
            3. Chamar GET /estoques/saldos na API Bling (com produto.id)
            4. Atualizar tabela `produtos` no Supabase (estoque_atual)
            5. Inserir registro em `movimentacao_estoque`
            6. Responder 200 OK
```

### Onde implementar

- **Opcao A**: No `flowB2BAPI` (Node/Express) — ja tem integracao com Bling e Supabase
- **Opcao B**: Neste projeto (Next.js API Route) — mais simples, menos separacao

Recomendado: **Opcao A** (flowB2BAPI), pois ja gerencia tokens e rate limiting do Bling.

### Tabelas afetadas no Supabase

- `produtos` — atualizar campo `estoque_atual`
- `movimentacao_estoque` — inserir novo registro com tipo, quantidade, origem "webhook_bling"

---

## 4. Consideracoes

- **Rate Limit Bling**: 300 req/min. O webhook pode gerar muitos eventos em lote.
- **Idempotencia**: Usar `eventId` para evitar processamento duplicado.
- **Retry**: O Bling pode reenviar eventos se nao receber 200 OK.
- **vinculoComplexo**: Se produto tem +200 vinculos, buscar saldos via API.
- **Timeout**: Responder rapido (< 5s) para o Bling nao considerar falha.

---

## Referencias

- [Bling API - Webhooks (doc oficial)](https://developer.bling.com.br/webhooks)
- [Bling - Aplicativos](https://developer.bling.com.br/aplicativos)
- [Callback de alteracao de estoque](https://ajuda.bling.com.br/hc/pt-br/articles/360046387754)
