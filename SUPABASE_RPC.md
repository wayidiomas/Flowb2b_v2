# Supabase RPC - Documentação Completa

Este documento detalha todas as **Remote Procedure Calls (RPCs)** disponíveis no Supabase do projeto FlowB2B.

---

## Configuração Base

```bash
# Variáveis de ambiente
SUPABASE_URL="https://asahknimbggpzpoebmej.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYWhrbmltYmdncHpwb2VibWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTcxODQxNjMsImV4cCI6MjAzMjc2MDE2M30.rYChkMDDU-hdsMK_MxT6tQLCTNj_D6U__jQKIaXCP2U"
```

---

## Índice

1. [Pedidos de Compra](#pedidos-de-compra)
2. [Produtos](#produtos)
3. [Fornecedores](#fornecedores)
4. [Políticas de Compra](#políticas-de-compra)
5. [Movimentação de Estoque](#movimentação-de-estoque)
6. [Dashboard e Métricas](#dashboard-e-métricas)
7. [Busca e Pesquisa](#busca-e-pesquisa)
8. [Vendas e Análise](#vendas-e-análise)
9. [Sincronização](#sincronização)
10. [Funções HTTP](#funções-http)
11. [Triggers](#triggers)
12. [Utilitários](#utilitários)

---

## Pedidos de Compra

### `flowb2b_add_pedido_compra`
Cria um novo pedido de compra com todos os itens.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_numero | integer | Não | Número do pedido |
| p_data | date | Não | Data do pedido |
| p_data_prevista | date | Não | Data prevista de entrega |
| p_total_produtos | numeric | Não | Total dos produtos |
| p_total | numeric | Não | Total geral |
| p_fornecedor_id | bigint | Não | ID do fornecedor |
| p_situacao | integer | Não | Código da situação |
| p_ordem_compra | varchar | Não | Número da ordem de compra |
| p_observacoes | text | Não | Observações |
| p_observacoes_internas | text | Não | Observações internas |
| p_desconto | numeric | Não | Valor do desconto |
| p_categoria_id | integer | Não | ID da categoria |
| p_total_icms | numeric | Não | Total ICMS |
| p_total_ipi | numeric | Não | Total IPI |
| p_frete | numeric | Não | Valor do frete |
| p_transportador | varchar | Não | Nome do transportador |
| p_frete_por_conta | varchar | Não | Responsável pelo frete |
| p_peso_bruto | numeric | Não | Peso bruto |
| p_volumes | numeric | Não | Quantidade de volumes |
| p_bling_id | bigint | Não | ID no Bling |
| p_nota_fiscal_id | bigint | Não | ID da nota fiscal |
| p_forma_pagamento | varchar | Não | Forma de pagamento |
| p_bonificacao | text | Não | Bonificação |
| p_empresa_id | integer | Não | ID da empresa |
| p_itens | jsonb | Não | Array de itens do pedido |
| p_politica_compra_id | integer | Não | ID da política de compra |

**Retorno:** `json`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_add_pedido_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_fornecedor_id": 123,
    "p_empresa_id": 1,
    "p_data": "2024-01-15",
    "p_data_prevista": "2024-01-20",
    "p_total_produtos": 1500.00,
    "p_total": 1500.00,
    "p_situacao": 1,
    "p_itens": [
      {"produto_id": 1, "quantidade": 10, "valor": 50.00, "descricao": "Produto A"},
      {"produto_id": 2, "quantidade": 20, "valor": 50.00, "descricao": "Produto B"}
    ],
    "p_politica_compra_id": 1
  }'
```

---

### `flowb2b_edit_pedido_compra`
Edita um pedido de compra existente.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_pedido_id | bigint | Sim | ID do pedido a editar |
| p_numero | integer | Sim | Número do pedido |
| p_data | date | Sim | Data do pedido |
| p_data_prevista | date | Sim | Data prevista |
| p_total_produtos | numeric | Sim | Total produtos |
| p_total | numeric | Sim | Total geral |
| p_fornecedor_id | bigint | Sim | ID do fornecedor |
| p_situacao | integer | Sim | Situação |
| p_ordem_compra | varchar | Sim | Ordem de compra |
| p_observacoes | text | Sim | Observações |
| p_observacoes_internas | text | Sim | Obs. internas |
| p_desconto | numeric | Sim | Desconto |
| p_total_icms | numeric | Sim | Total ICMS |
| p_total_ipi | numeric | Sim | Total IPI |
| p_frete | numeric | Sim | Frete |
| p_transportador | varchar | Sim | Transportador |
| p_frete_por_conta | varchar | Sim | Frete por conta |
| p_peso_bruto | numeric | Sim | Peso bruto |
| p_volumes | numeric | Sim | Volumes |
| p_forma_pagamento | varchar | Sim | Forma pagamento |
| p_valor_minimo | numeric | Sim | Valor mínimo |
| p_bonificacao | text | Sim | Bonificação |
| p_empresa_id | integer | Sim | ID empresa |
| p_itens | jsonb | Não | Itens do pedido |
| p_politica_compra_id | bigint | Não | ID política |

**Retorno:** `jsonb`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_edit_pedido_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_pedido_id": 100,
    "p_numero": 1001,
    "p_data": "2024-01-15",
    "p_data_prevista": "2024-01-22",
    "p_total_produtos": 2000.00,
    "p_total": 2000.00,
    "p_fornecedor_id": 123,
    "p_situacao": 2,
    "p_ordem_compra": "OC-2024-001",
    "p_observacoes": "Pedido atualizado",
    "p_observacoes_internas": "Urgente",
    "p_desconto": 100.00,
    "p_total_icms": 180.00,
    "p_total_ipi": 50.00,
    "p_frete": 150.00,
    "p_transportador": "Transportadora XYZ",
    "p_frete_por_conta": "Destinatário",
    "p_peso_bruto": 50.5,
    "p_volumes": 5,
    "p_forma_pagamento": "30/60/90",
    "p_valor_minimo": 500.00,
    "p_bonificacao": "5% em produtos",
    "p_empresa_id": 1,
    "p_itens": [
      {"produto_id": 1, "quantidade": 15, "valor": 50.00}
    ]
  }'
```

---

### `flowb2b_get_pedido_compra_detalhes`
Retorna detalhes completos de um pedido de compra.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_pedido_id | bigint | Sim | ID do pedido |

**Retorno:** `json` com pedido, fornecedor, itens e parcelas.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_get_pedido_compra_detalhes" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_pedido_id": 100}'
```

---

### `flowb2b_filter_pedidos_compra_detalhados_usernobling`
Filtra pedidos de compra (usuários sem Bling) com paginação.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_fornecedor_id | integer | Sim | ID do fornecedor (pode ser null) |
| p_data_inicio | date | Sim | Data inicial |
| p_data_fim | date | Sim | Data final |
| p_limit | integer | Sim | Limite de registros |
| p_offset | integer | Sim | Offset para paginação |

**Retorno:** `TABLE(pedido_id, numero_pedido, data_pedido, fornecedor_nome, observacoes_internas, valor_total, status, empresa_id, itens_produtos)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_filter_pedidos_compra_detalhados_usernobling" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_fornecedor_id": null,
    "p_data_inicio": "2024-01-01",
    "p_data_fim": "2024-12-31",
    "p_limit": 10,
    "p_offset": 0
  }'
```

---

### `flowb2b_filter_pedidos_compra_emitidos_v2`
Filtra notas fiscais de compra emitidas.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| p_empresa_id | integer | Sim | - | ID da empresa |
| p_fornecedor_id | integer | Não | NULL | ID do fornecedor |
| p_data_inicio | date | Não | NULL | Data inicial |
| p_data_fim | date | Não | NULL | Data final |
| p_limit | integer | Não | 10 | Limite |
| p_offset | integer | Não | 0 | Offset |

**Retorno:** `TABLE(nota_fiscal_id, numero_nota_fiscal, data_emissao_nota_fiscal, fornecedor_id, fornecedor_nome, valor_total_nota)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_filter_pedidos_compra_emitidos_v2" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_fornecedor_id": 50,
    "p_data_inicio": "2024-01-01",
    "p_data_fim": "2024-06-30",
    "p_limit": 20,
    "p_offset": 0
  }'
```

---

### `flowb2b_search_pedido_de_compra_emitidos`
Busca pedidos de compra emitidos por termo.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| p_empresa_id | integer | Sim | - | ID da empresa |
| p_search_query | varchar | Sim | - | Termo de busca |
| p_limit | integer | Não | 10 | Limite |
| p_offset | integer | Não | 0 | Offset |

**Retorno:** `TABLE` com dados completos da NF incluindo itens.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_search_pedido_de_compra_emitidos" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_search_query": "fornecedor abc",
    "p_limit": 10,
    "p_offset": 0
  }'
```

---

### `flowb2b_search_pedidos_compra_detalhados_usernobling`
Busca pedidos de compra por termo (usuários sem Bling).

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_search_term | text | Sim | Termo de busca |
| p_limit | integer | Sim | Limite |
| p_offset | integer | Sim | Offset |

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_search_pedidos_compra_detalhados_usernobling" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_search_term": "ração",
    "p_limit": 10,
    "p_offset": 0
  }'
```

---

### `get_itens_pedido_compra_json`
Retorna itens de um pedido de compra em JSON.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_pedidocompra_id | bigint | Sim | ID do pedido |
| p_empresa_id | integer | Sim | ID da empresa |

**Retorno:** `json`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_itens_pedido_compra_json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_pedidocompra_id": 100,
    "p_empresa_id": 1
  }'
```

---

### `flowb2b_resumo_pd_user_no_bling`
Resumo de pedidos (quantidade e valor total) para usuários sem Bling.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| empresa_id_param | integer | Sim | ID da empresa |

**Retorno:** `TABLE(quantidade_pedidos, valor_total_pedidos)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_resumo_pd_user_no_bling" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"empresa_id_param": 1}'
```

---

### `flowb2b_resumo_emitidos_user_bling`
Resumo de notas fiscais emitidas.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| empresa_id_param | integer | Sim | ID da empresa |

**Retorno:** `TABLE(quantidade_notas, valor_total_notas)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_resumo_emitidos_user_bling" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"empresa_id_param": 1}'
```

---

## Produtos

### `flowb2b_get_produtos_detalhados`
Retorna produtos com dados completos de venda e estoque por fornecedor. **Função principal para sugestão de pedido.**

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(produto_id, codigo_produto, nome_produto, itens_por_caixa, data_ultima_compra, qtd_ultima_compra, data_ultima_venda, estoque_atual, quantidade_vendida, dias_estoque, perc_estoque_atual, periodo_ultima_venda, fornecedor_id, valor_de_compra, precocusto)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_get_produtos_detalhados" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"f_id": 50}'
```

---

### `flowb2b_fetch_product_data`
Busca dados básicos de produtos por fornecedor.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| forneced_id | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(produto_id, valor_de_compra, estoque_atual, nome, codigo, volumes, itens_por_caixa, gtin, unidade)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_fetch_product_data" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"forneced_id": 50}'
```

---

### `flowb2b_fetch_produtos_info`
Similar ao anterior com tipos diferentes.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id | bigint | Sim | ID do fornecedor |

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_fetch_produtos_info" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"f_id": 50}'
```

---

### `flowb2b_search_produto`
Busca produtos por termo (nome, código ou GTIN).

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_search_term | varchar | Sim | Termo de busca |

**Retorno:** `TABLE(produto_id, nome, codigo, gtin, preco, estoque_atual)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_search_produto" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_search_term": "ração golden"
  }'
```

---

### `get_produtos_by_fornecedor`
Retorna todos os produtos de um fornecedor.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_fornecedor_id | integer | Sim | ID do fornecedor |
| p_empresa_id | integer | Sim | ID da empresa |

**Retorno:** `TABLE` com todos os campos da tabela produtos.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_produtos_by_fornecedor" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_fornecedor_id": 50,
    "p_empresa_id": 1
  }'
```

---

### `get_paginated_products`
Retorna produtos paginados.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| start | integer | Sim | Início da página |
| page_end | integer | Sim | Fim da página |

**Retorno:** `TABLE(id, nome, codigo, preco, unidade, estoque_atual)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_paginated_products" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "start": 0,
    "page_end": 50
  }'
```

---

### `filter_produtos`
Filtra produtos por faixa de preço e estoque.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| preco_min | numeric | Sim | Preço mínimo |
| preco_max | numeric | Sim | Preço máximo |
| estoque_min | integer | Sim | Estoque mínimo |
| estoque_max | integer | Sim | Estoque máximo |
| p_empresa_id | integer | Sim | ID da empresa |

**Retorno:** `SETOF produtos_paginados`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/filter_produtos" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "preco_min": 10.00,
    "preco_max": 500.00,
    "estoque_min": 0,
    "estoque_max": 1000,
    "p_empresa_id": 1
  }'
```

---

### `search_produtos`
Busca produtos por termo.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| search_term | text | Sim | Termo de busca |
| p_empresa_id | integer | Sim | ID da empresa |

**Retorno:** `SETOF produtos_paginados`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/search_produtos" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "search_term": "whiskas",
    "p_empresa_id": 1
  }'
```

---

### `search_produtos_curva`
Busca produtos com informações de curva ABC.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_search_term | text | Sim | Termo de busca |

**Retorno:** `TABLE(produto_id, produto_nome, ticket_medio, quantidade_em_estoque, numero_vendas, numero_vendas_este_mes, curva, empresa_id, fornecedores_ids_vinculados, condicao_de_ruptura)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/search_produtos_curva" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_search_term": "ração"
  }'
```

---

### `get_top5_produtos_curva_a`
Retorna os 5 produtos mais vendidos da curva A.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |

**Retorno:** `TABLE(produto_id, produto_nome, numero_vendas)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_top5_produtos_curva_a" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_empresa_id": 1}'
```

---

### `calcular_abc`
Recalcula a curva ABC dos produtos.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | bigint | Sim | ID da empresa |

**Retorno:** `void`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/calcular_abc" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_empresa_id": 1}'
```

---

## Fornecedores

### `filter_fornecedores_by_produtos`
Filtra fornecedores por quantidade de produtos vinculados.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_min_produtos | bigint | Sim | Mínimo de produtos |
| p_max_produtos | bigint | Sim | Máximo de produtos |

**Retorno:** `TABLE(fornecedor_id, fornecedor_nome, fornecedor_cnpj, fornecedor_contato, empresa_id, produtos_vinculados)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/filter_fornecedores_by_produtos" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_min_produtos": 5,
    "p_max_produtos": 100
  }'
```

---

### `search_fornecedores_view`
Busca fornecedores por termo.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_search_term | text | Sim | Termo de busca |

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/search_fornecedores_view" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_search_term": "premier"
  }'
```

---

### `get_fornecedores_by_produto`
Retorna fornecedores que vendem um produto específico.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_produto_id | integer | Sim | ID do produto |

**Retorno:** `TABLE` com todos os campos de fornecedores.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_fornecedores_by_produto" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_produto_id": 100}'
```

---

### `fornecedores_necessidade_compra`
Retorna fornecedores com produtos precisando de reposição.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | bigint | Sim | ID da empresa |

**Retorno:** `TABLE(fornecedor_id, fornecedor_nome, produtos_ids[], produtos_nomes[])`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/fornecedores_necessidade_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_empresa_id": 1}'
```

---

### `add_fornecedor_produto`
Vincula um produto a um fornecedor.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_fornecedor_id | bigint | Sim | ID do fornecedor |
| p_produto_id | integer | Sim | ID do produto |

**Retorno:** `json`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/add_fornecedor_produto" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_fornecedor_id": 50,
    "p_produto_id": 100
  }'
```

---

### `update_produto_id`
Atualiza vínculo produto-fornecedor baseado em notas fiscais.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| fornecedor_id_param | integer | Sim | ID do fornecedor |
| empresa_id_param | integer | Sim | ID da empresa |

**Retorno:** `json`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/update_produto_id" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "fornecedor_id_param": 50,
    "empresa_id_param": 1
  }'
```

---

### `atualizar_produto_id`
Versão alternativa para atualização de vínculo.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| fornecedor_id_param | bigint | Sim | ID do fornecedor |

**Retorno:** `void`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/atualizar_produto_id" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"fornecedor_id_param": 50}'
```

---

## Políticas de Compra

### `flowb2b_fetch_politica_compra`
Busca política de compra de um fornecedor.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(id, fornecedor_id, prazo_estoque, valor_minimo, desconto, bonificacao)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_fetch_politica_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"f_id": 50}'
```

---

### `fetch_politica_compra`
Versão simplificada da busca de política.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| fornecedor_id | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(prazo_entrega, prazo_estoque, valor_minimo, desconto, bonificacao)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/fetch_politica_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"fornecedor_id": 50}'
```

---

### `flowb2b_get_politicas_compra_with_status`
Busca políticas com status de uso em pedido.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_fornecedor_id | integer | Sim | ID do fornecedor |
| p_pedido_id | bigint | Sim | ID do pedido |

**Retorno:** `TABLE(politica_id, forma_pagamento_dias[], prazo_entrega, prazo_estoque, valor_minimo, peso, desconto, bonificacao, status)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_get_politicas_compra_with_status" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_fornecedor_id": 50,
    "p_pedido_id": 100
  }'
```

---

### `flowb2b_calculate_suggestions`
Calcula sugestões de compra baseado na política.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id_param | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(politica_compra jsonb)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_calculate_suggestions" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"f_id_param": 50}'
```

---

### `verificação_calculo_pd_compra_auto`
Verificação detalhada do cálculo automático de pedido. **Útil para debug.**

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id_param | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(produto_id, codigo_produto, quantidade_vendida, data_ultima_venda, data_ultima_compra, periodo_ultima_venda, estoque_atual, prazo_estoque, valor_de_compra, sugestao_calculada, multiplicacao_aplicada, valor_minimo, desconto, bonificacao, politica_id)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/verificação_calculo_pd_compra_auto" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"f_id_param": 50}'
```

---

## Movimentação de Estoque

### `flowb2b_lancar_movimentacao_estoque`
Lança uma movimentação de estoque (entrada ou saída).

**Parâmetros:**
| Nome | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| p_empresa_id | integer | Sim | - | ID da empresa |
| p_produto_id | integer | Sim | - | ID do produto |
| p_tipo | varchar | Sim | - | 'Entrada' ou 'Saida' |
| p_quantidade | numeric | Sim | - | Quantidade |
| p_preco_compra | numeric | Sim | - | Preço de compra |
| p_preco_custo | numeric | Sim | - | Preço de custo |
| p_observacao | text | Sim | - | Observação |
| p_origem | varchar | Não | 'Manual' | Origem da movimentação |

**Retorno:** `void`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_lancar_movimentacao_estoque" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_produto_id": 100,
    "p_tipo": "Entrada",
    "p_quantidade": 50,
    "p_preco_compra": 25.50,
    "p_preco_custo": 22.00,
    "p_observacao": "Entrada por NF 12345",
    "p_origem": "Nota Fiscal"
  }'
```

---

### `flowb2b_get_movimentacoes_estoque` (4 parâmetros)
Busca movimentações de estoque por período.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_produto_id | integer | Sim | ID do produto |
| p_empresa_id | integer | Sim | ID da empresa |
| p_data_inicio | timestamp | Sim | Data inicial |
| p_data_fim | timestamp | Sim | Data final |

**Retorno:** `TABLE(data, tipo, quantidade, origem, observacao)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_get_movimentacoes_estoque" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_produto_id": 100,
    "p_empresa_id": 1,
    "p_data_inicio": "2024-01-01T00:00:00",
    "p_data_fim": "2024-12-31T23:59:59"
  }'
```

---

### `flowb2b_get_estoque_por_periodo`
Retorna estoque agregado por período.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_produto_id | integer | Sim | ID do produto |
| p_data_inicio | date | Sim | Data inicial |
| p_data_fim | date | Sim | Data final |

**Retorno:** `TABLE(empresa_id, data, quantidade, tipo)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_get_estoque_por_periodo" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_produto_id": 100,
    "p_data_inicio": "2024-01-01",
    "p_data_fim": "2024-06-30"
  }'
```

---

### `flowb2b_get_resumo_movimentacao`
Resumo geral de movimentação de estoque.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |

**Retorno:** `TABLE(quantidade_entradas, quantidade_saidas, valor_total_produtos)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_get_resumo_movimentacao" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_empresa_id": 1}'
```

---

### `search_produto_movimentacao`
Busca movimentações por termo do produto.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_search_term | varchar | Sim | Termo de busca |

**Retorno:** `TABLE(movimentacao_id, produto_id, produto_nome, produto_codigo, produto_gtin, data, tipo, quantidade, preco_venda, valor_de_compra, preco_custo, observacao, origem)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/search_produto_movimentacao" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_search_term": "ração"
  }'
```

---

## Dashboard e Métricas

### `get_dashboard_metrics`
Retorna métricas gerais do dashboard.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_user_bling | boolean | Sim | Se usuário usa Bling |

**Retorno:** `json` com KPIs principais.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_dashboard_metrics" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_user_bling": true
  }'
```

---

### `get_pedidos_compra_por_periodo`
Retorna pedidos de compra agrupados por período.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_user_bling | boolean | Sim | Se usuário usa Bling |
| p_intervalo | text | Sim | 'dia', 'semana', 'mes' |

**Retorno:** `TABLE(periodo, total_pedidos)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_pedidos_compra_por_periodo" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_user_bling": true,
    "p_intervalo": "mes"
  }'
```

---

### `get_principais_fornecedores`
Retorna ranking de fornecedores por volume de compras.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_empresa_id | integer | Sim | ID da empresa |
| p_user_bling | boolean | Sim | Se usuário usa Bling |

**Retorno:** `TABLE(fornecedor_nome, total_compras, percentual)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_principais_fornecedores" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_empresa_id": 1,
    "p_user_bling": true
  }'
```

---

## Vendas e Análise

### `fetch_ultima_venda`
Retorna data da última venda de um produto.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| produto_id | bigint | Sim | ID do produto |

**Retorno:** `TABLE(data_ultima_venda)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/fetch_ultima_venda" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"produto_id": 100}'
```

---

### `get_max_data_saida`
Retorna data máxima de saída para múltiplos produtos. **Otimizado para batch.**

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| produto_ids | bigint[] | Sim | Array de IDs de produtos |

**Retorno:** `TABLE(produto_id, max_data_saida)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_max_data_saida" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"produto_ids": [100, 101, 102, 103, 104]}'
```

---

### `get_max_data_compra`
Retorna data máxima de compra para múltiplos produtos. **Otimizado para batch.**

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| produto_ids | bigint[] | Sim | Array de IDs de produtos |

**Retorno:** `TABLE(produto_id, max_data_compra)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_max_data_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"produto_ids": [100, 101, 102, 103, 104]}'
```

---

### `fetch_ultima_compra`
Retorna data da última compra de um fornecedor/produto.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| fornecedor_id | bigint | Sim | - | ID do fornecedor |
| produto_id | bigint | Não | NULL | ID do produto |

**Retorno:** `TABLE(dh_emi)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/fetch_ultima_compra" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "fornecedor_id": 50,
    "produto_id": 100
  }'
```

---

### `fetch_ultima_compra_detalhes`
Retorna detalhes da última compra.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| fornecedor_id | integer | Sim | ID do fornecedor |
| produto_id | integer | Sim | ID do produto |

**Retorno:** `TABLE(dh_emi, q_com, v_un_com)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/fetch_ultima_compra_detalhes" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "fornecedor_id": 50,
    "produto_id": 100
  }'
```

---

### `flowb2b_fetch_ultima_compra_detalhes`
Versão para todos os produtos de um fornecedor.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id | bigint | Sim | ID do fornecedor |

**Retorno:** `TABLE(produto_id, dh_emi, q_com, v_un_com)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_fetch_ultima_compra_detalhes" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"f_id": 50}'
```

---

### `fetch_venda_periodo`
Retorna quantidade vendida no período desde última compra.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| produto_id | integer | Sim | ID do produto |
| data_ultima_compra | timestamp | Sim | Data da última compra |

**Retorno:** `TABLE(quantidade_vendida)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/fetch_venda_periodo" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 100,
    "data_ultima_compra": "2024-01-15T00:00:00"
  }'
```

---

### `flowb2b_fetch_venda_periodo`
Versão para todos os produtos de um fornecedor.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| f_id | bigint | Sim | ID do fornecedor |
| data_ultima_compra | date | Sim | Data da última compra |

**Retorno:** `TABLE(produto_id, quantidade_vendida)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/flowb2b_fetch_venda_periodo" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "f_id": 50,
    "data_ultima_compra": "2024-01-15"
  }'
```

---

### `get_quantidade_vendida`
Retorna quantidade vendida em um período específico.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_produto_id | bigint | Sim | ID do produto |
| data_inicio | date | Sim | Data inicial |
| data_fim | date | Sim | Data final |

**Retorno:** `TABLE(produto_id, quantidade_vendida)`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_quantidade_vendida" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_produto_id": 100,
    "data_inicio": "2024-01-01",
    "data_fim": "2024-06-30"
  }'
```

---

## Sincronização

### `sync_bling_products`
Sincroniza produtos do Bling.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| access_token | text | Sim | Token de acesso Bling |
| data_inicial | date | Sim | Data inicial |
| data_final | date | Sim | Data final |

**Retorno:** `void`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/sync_bling_products" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "seu_access_token_bling",
    "data_inicial": "2024-01-01",
    "data_final": "2024-12-31"
  }'
```

---

### `call_orquestradora`
Chama a API orquestradora de sincronização.

**Versão com parâmetro:**

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/call_orquestradora" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_json_body": "{\"empresa_id\": 1, \"action\": \"sync_all\"}"
  }'
```

**Versão sem parâmetros:**

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/call_orquestradora" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### `clean_error_jobs`
Limpa jobs de sincronização com erro.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/clean_error_jobs" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### `unschedule_job`
Remove um job agendado.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| job_name | text | Sim | Nome do job |

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/unschedule_job" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"job_name": "sync_daily_empresa_1"}'
```

---

## Funções HTTP

Funções para fazer requisições HTTP diretamente do banco.

### `http_get`

```bash
# Versão simples
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/http_get" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"uri": "https://api.exemplo.com/dados"}'

# Versão com data
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/http_get" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "https://api.exemplo.com/dados",
    "data": {"param1": "valor1"}
  }'
```

### `http_post`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/http_post" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "https://api.exemplo.com/endpoint",
    "content": "{\"key\": \"value\"}",
    "content_type": "application/json"
  }'
```

### `http_put`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/http_put" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "https://api.exemplo.com/resource/1",
    "content": "{\"updated\": true}",
    "content_type": "application/json"
  }'
```

### `http_delete`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/http_delete" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"uri": "https://api.exemplo.com/resource/1"}'
```

---

## Triggers

Funções executadas automaticamente por triggers (não chamadas diretamente via RPC).

| Função | Descrição |
|--------|-----------|
| `sync_users` | Sincroniza usuários do auth.users para public.users |
| `update_updated_at_column` | Atualiza coluna updated_at automaticamente |
| `update_movimentacao_estoque` | Atualiza estoque após movimentação |
| `update_pedido_compra_status` | Atualiza status do pedido de compra |
| `update_fornecedores_produtos_empresa_id` | Preenche empresa_id na tabela de junção |
| `calcular_prazo_estoque` | Recalcula prazo de estoque após mudanças |

---

## Utilitários

### `get_empresa_from_produto_detalhe`
Retorna empresa_id a partir de detalhes de nota fiscal.

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| p_detalhes_nota_fiscal_id | bigint | Sim | ID do detalhe da NF |
| p_c_prod | varchar | Sim | Código do produto |

**Retorno:** `bigint`

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_empresa_from_produto_detalhe" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "p_detalhes_nota_fiscal_id": 500,
    "p_c_prod": "PROD-001"
  }'
```

---

### `urlencode`
Codifica string para URL.

```bash
# Com varchar
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/urlencode" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"string": "texto com espaços"}'

# Com jsonb
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/urlencode" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"data": {"key": "value", "other": "data"}}'
```

---

### `bytea_to_text` / `text_to_bytea`
Conversão entre bytea e text.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/bytea_to_text" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"data": "\\x48656c6c6f"}'
```

---

## Referência Rápida - RPCs mais usadas

| RPC | Uso Principal |
|-----|---------------|
| `flowb2b_get_produtos_detalhados` | Sugestão de pedido de compra |
| `flowb2b_add_pedido_compra` | Criar pedido de compra |
| `flowb2b_fetch_politica_compra` | Buscar política do fornecedor |
| `flowb2b_lancar_movimentacao_estoque` | Lançar entrada/saída |
| `get_dashboard_metrics` | Métricas do dashboard |
| `flowb2b_search_produto` | Busca de produtos |
| `calcular_abc` | Recalcular curva ABC |
| `get_max_data_saida` | Última venda (batch) |
| `get_max_data_compra` | Última compra (batch) |

---

## Notas Importantes

1. **Prefixo `flowb2b_`:** Funções principais do sistema
2. **Prefixo `fetch_`:** Funções de busca simples
3. **Prefixo `get_`:** Funções de busca com mais lógica
4. **Prefixo `search_`:** Funções de busca textual
5. **Prefixo `update_`:** Funções de atualização (geralmente triggers)

### Performance
- Use `get_max_data_saida` e `get_max_data_compra` com arrays para evitar múltiplas chamadas
- Funções `flowb2b_*` são otimizadas para o fluxo principal do sistema
- Sempre passe `empresa_id` para garantir filtragem multi-tenant
