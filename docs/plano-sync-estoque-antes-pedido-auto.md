# Plano: Sincronizar Estoque do Bling Antes do Pedido Automatico

## Status: PENDENTE

---

## Objetivo

Antes de calcular o pedido de compra automatico, buscar o estoque atualizado no Bling para os produtos do fornecedor. Se houver diferenca com o banco de dados, atualizar o Supabase primeiro. Isso garante que a sugestao de compra use dados reais de estoque.

---

## Fluxo Atual (sem sync)

```
Frontend chama POST /api/pedidos-compra/calcular-automatico
  -> Chama API Python (validacao_ean) com fornecedor_id + empresa_id
  -> Python consulta Supabase (estoque pode estar desatualizado)
  -> Retorna sugestoes baseadas em estoque potencialmente defasado
```

## Fluxo Proposto (com sync)

```
Frontend chama POST /api/pedidos-compra/calcular-automatico
  -> [NOVO] Buscar produtos do fornecedor no Supabase (id_produto_bling + estoque_atual)
  -> [NOVO] Consultar GET /Api/v3/estoques/saldos no Bling (em lotes de 100)
  -> [NOVO] Comparar e atualizar Supabase se diferente
  -> Chama API Python (agora com estoque atualizado)
  -> Retorna sugestoes precisas
```

---

## API do Bling - Endpoint de Saldos

### Endpoint

```
GET https://api.bling.com.br/Api/v3/estoques/saldos
```

### Parametros de query

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `idsProdutos[]` | array de int | IDs dos produtos Bling para filtrar |
| `pagina` | int | Pagina (default: 1) |
| `limite` | int | Itens por pagina (default/max: 100) |

### Exemplo de requisicao

```bash
GET /Api/v3/estoques/saldos?idsProdutos[]=789&idsProdutos[]=790&idsProdutos[]=791
Authorization: Bearer {access_token}
```

### Resposta esperada

```json
{
  "data": [
    {
      "produto": { "id": 789 },
      "depositos": [
        {
          "id": 1234,
          "nome": "Deposito Padrao",
          "saldo": 45.0,
          "desconsiderar": false
        }
      ]
    }
  ]
}
```

O saldo total do produto eh a soma dos `depositos[].saldo` onde `desconsiderar = false`.

---

## Implementacao

### Arquivo a modificar

`src/app/api/pedidos-compra/calcular-automatico/route.ts`

### Novo utilitario a criar

`src/lib/bling-estoque-sync.ts` — funcao reutilizavel de sync pontual

### Logica da funcao de sync

```typescript
// src/lib/bling-estoque-sync.ts

interface SyncEstoqueResult {
  total_produtos: number
  atualizados: number
  sem_alteracao: number
  erros: number
}

/**
 * Sincroniza estoque do Bling para produtos de um fornecedor.
 * Busca saldos atuais no Bling e atualiza Supabase se diferente.
 *
 * @param supabase - Cliente Supabase
 * @param accessToken - Token de acesso do Bling
 * @param fornecedorId - ID do fornecedor
 * @param empresaId - ID da empresa
 */
async function syncEstoqueFornecedor(
  supabase: SupabaseClient,
  accessToken: string,
  fornecedorId: number,
  empresaId: number
): Promise<SyncEstoqueResult>
```

### Passo a passo da funcao

1. **Buscar produtos do fornecedor no Supabase**
   ```sql
   SELECT p.id, p.id_produto_bling, p.estoque_atual
   FROM produtos p
   JOIN fornecedores_produtos fp ON fp.produto_id = p.id
   WHERE fp.fornecedor_id = {fornecedorId}
   AND p.empresa_id = {empresaId}
   AND p.id_produto_bling IS NOT NULL
   ```

2. **Dividir em lotes de 100** (limite da API Bling)
   ```typescript
   const lotes = chunk(produtos, 100)
   ```

3. **Para cada lote, chamar Bling API**
   ```typescript
   // Montar query string com idsProdutos[]
   const params = new URLSearchParams()
   lote.forEach(p => params.append('idsProdutos[]', p.id_produto_bling.toString()))

   const url = `${BLING_CONFIG.apiUrl}/estoques/saldos?${params.toString()}`

   const { response } = await blingFetch(url, {
     headers: { Authorization: `Bearer ${accessToken}` }
   }, { context: 'sync estoque pre-pedido', maxRetries: 3 })
   ```

4. **Comparar e atualizar**
   ```typescript
   for (const item of blingData) {
     const saldoTotal = item.depositos
       .filter(d => !d.desconsiderar)
       .reduce((sum, d) => sum + d.saldo, 0)

     const produtoLocal = produtosMap.get(item.produto.id)
     if (produtoLocal && produtoLocal.estoque_atual !== saldoTotal) {
       await supabase
         .from('produtos')
         .update({ estoque_atual: saldoTotal })
         .eq('id', produtoLocal.id)
         .eq('empresa_id', empresaId)
     }
   }
   ```

5. **Delay entre lotes** (350ms para respeitar rate limit)

### Integracao na rota calcular-automatico

```typescript
// src/app/api/pedidos-compra/calcular-automatico/route.ts

// ANTES de chamar a API Python, sincronizar estoque
const blingToken = await getBlingToken(supabase, user.empresaId)
if (blingToken) {
  const syncResult = await syncEstoqueFornecedor(
    supabase, blingToken, fornecedor_id, user.empresaId
  )
  console.log(`[Sync Estoque] ${syncResult.atualizados} produtos atualizados de ${syncResult.total_produtos}`)
}
// Se nao tem token Bling, continua sem sync (graceful degradation)

// Chamar API Python normalmente...
const response = await fetch(`${validacaoEanUrl}/calculo_pedido_auto_otimizado/calcular`, ...)
```

---

## Consideracoes

### Performance
- Um fornecedor tipico tem ~50-200 produtos -> 1-2 chamadas ao Bling
- Cada chamada ~200-500ms + 350ms delay entre lotes
- Total estimado: 1-3 segundos extras antes do calculo
- Aceitavel dado que o calculo Python ja leva 10-60s

### Rate Limit
- Usar `blingFetch` que ja tem retry inteligente para 429
- Delay de 350ms entre lotes
- Maximo de ~3 requests por sync (tipico)

### Graceful Degradation
- Se empresa nao tem Bling conectado -> pular sync, usar estoque do banco
- Se token expirado -> pular sync (ja existe `getBlingToken` que retorna null)
- Se API Bling fora do ar -> pular sync apos retries, logar warning

### Nao atualizar movimentacao_estoque
- Essa sync pontual NAO deve inserir registros em `movimentacao_estoque`
- Eh apenas uma correcao de saldo, nao uma movimentacao real
- Evita poluir o historico de movimentacoes

---

## Dependencias existentes (ja implementadas)

| Arquivo | O que faz |
|---------|-----------|
| `src/lib/bling-estoque.ts` | `getBlingToken()` - busca token valido |
| `src/lib/bling-fetch.ts` | `blingFetch()` - fetch com retry e rate limit |
| `src/lib/bling.ts` | `BLING_CONFIG.apiUrl` - URL base da API |

---

## Checklist de implementacao

- [ ] Criar `src/lib/bling-estoque-sync.ts` com funcao `syncEstoqueFornecedor`
- [ ] Modificar `src/app/api/pedidos-compra/calcular-automatico/route.ts`:
  - Importar `syncEstoqueFornecedor` e `getBlingToken`
  - Adicionar chamada de sync ANTES do fetch para API Python
  - Logar resultado do sync
- [ ] Testar com fornecedor que tem poucos produtos
- [ ] Testar sem conexao Bling (graceful degradation)
- [ ] Testar com fornecedor com +100 produtos (paginacao)
