# FlowB2B Client - Documentação do Projeto

## Visão Geral

Este projeto é uma **refatoração do frontend** do sistema FlowB2B, migrando do Bubble.io para **Next.js 16.1**. O sistema é uma plataforma B2B de gestão de compras e vendas que integra com o ERP Bling.

---

## IMPORTANTE: Arquitetura Multi-Tenant

### `empresa_id` é a chave primária de isolamento de dados

**TODAS as queries ao Supabase DEVEM filtrar por `empresa_id`.**

```typescript
// CORRETO - Sempre filtrar por empresa_id
const { data } = await supabase
  .from('produtos')
  .select('*')
  .eq('empresa_id', empresaId)

// ERRADO - Nunca fazer query sem empresa_id
const { data } = await supabase
  .from('produtos')
  .select('*') // PROIBIDO!
```

### Regras de Ouro:
1. **Nunca** fazer SELECT sem `WHERE empresa_id = ?`
2. **Sempre** incluir `empresa_id` em INSERTs
3. **Nunca** permitir UPDATE/DELETE sem filtro de `empresa_id`
4. O `empresa_id` vem do usuário autenticado (JWT)

---

## Autenticação (Next.js - Própria)

**NÃO usamos Supabase Auth.** A autenticação é implementada no próprio Next.js.

### Fluxo de Autenticação:
```
1. Usuário faz login (email/senha)
2. Backend valida credenciais na tabela `users` (Supabase)
3. Gera JWT com { userId, empresaId, role }
4. JWT armazenado em httpOnly cookie
5. Middleware valida JWT em rotas protegidas
6. empresa_id extraído do JWT para todas as queries
```

### Estrutura do JWT:
```typescript
interface JWTPayload {
  userId: number
  empresaId: number      // CRÍTICO: usado em todas as queries
  email: string
  role: 'admin' | 'user'
  iat: number
  exp: number
}
```

### Tabela `users` (Supabase):
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  empresa_id INTEGER REFERENCES empresas(id),
  role VARCHAR(50) DEFAULT 'user',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      FlowB2B_Client (Next.js)                   │
│                         [Este Projeto]                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌───────────────────┐  ┌───────────────┐  ┌───────────────────────┐
│   flowB2BAPI      │  │   Supabase    │  │  validacao_ean-master │
│   (Node/Express)  │  │  (PostgreSQL) │  │      (FastAPI)        │
│                   │  │               │  │                       │
│ - Sync Bling      │  │ - Database    │  │ - Validação EAN       │
│ - Token Manager   │  │ - Edge Funcs  │  │ - Scraping Cobasi     │
│ - Rate Limiting   │  │ - Auth        │  │ - Scraping Petz       │
└───────────────────┘  └───────────────┘  │ - Cálculo Pedidos     │
        │                     │           └───────────────────────┘
        └──────────┬──────────┘
                   ▼
          ┌───────────────┐
          │   Bling API   │
          │     (v3)      │
          │               │
          │ - Produtos    │
          │ - Pedidos     │
          │ - Estoque     │
          │ - Notas       │
          └───────────────┘
```

## Projetos Relacionados

### 1. flowB2BAPI (Node.js/Express)
**Localização:** `/Users/lucassouza/Projects/Macbook/flowB2BAPI`

API de sincronização entre Bling e Supabase.

#### Endpoints Principais:
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/sync/first-time` | Sincronização inicial completa |
| POST | `/api/sync/daily` | Sincronização incremental diária |
| POST | `/api/sync/inventory` | Sincronização de estoque |
| GET | `/api/sync/status/:empresa_id` | Status da sincronização |
| GET | `/api/sync/active` | Syncs ativas no sistema |
| POST | `/api/sync/cancel/:empresa_id/:syncType` | Cancela sync |

#### Payload padrão:
```json
{
  "empresa_id": 123,
  "accessToken": "bling_access_token",
  "refresh_token": "bling_refresh_token"
}
```

#### Configurações importantes:
- **Rate Limit Bling:** 300 req/min (5 req/s)
- **Delay entre páginas:** 50s (produtos), 10s (estoque)
- **Retry:** 20 tentativas com backoff exponencial
- **Timeout total:** 6 horas (first-time), 30 min (daily)

---

### 2. validacao_ean-master (Python/FastAPI)
**Localização:** `/Users/lucassouza/Projects/Macbook/validacao_ean-master`

API de validação de EAN e cálculo automático de pedidos.

#### Endpoints Principais:
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/validacao_ean/validar_ean/?ean={ean}` | Valida código EAN-13 |
| POST | `/cobasi_api/uploadfile/?webhook_url={url}` | Scraping Cobasi (Excel) |
| GET | `/cobasi_ean/produto/{ean}` | Busca produto Cobasi por EAN |
| GET | `/petz_ean/produto/{nome}?ean={ean}` | Busca produto Petz |
| POST | `/calculo_pedido_auto_otimizado/calcular` | Calcula sugestão de pedido |
| GET | `/calculo_pedido_auto_otimizado/monitoramento/{fornecedor_id}` | Monitoramento detalhado |

#### Regras de Cálculo de Pedido:
1. Descartar produtos sem demanda (nunca vendeu + estoque = 0)
2. Ajustar data para produtos com estoque (assume venda recente)
3. Corrigir inconsistências de data
4. Calcular média diária de vendas
5. Sugestão base = (média × prazo) - estoque
6. Margem de segurança 25% (quando estoque = 0)
7. Arredondar por embalagem (sempre para cima)
8. Proteção de 1 caixa mínima
9. Cálculo de valores com desconto

---

## Supabase

**Project Ref:** `asahknimbggpzpoebmej`
**URL:** `https://asahknimbggpzpoebmej.supabase.co`

### Visão Geral das Tabelas

| Tabela | Registros | RLS | Descrição |
|--------|-----------|-----|-----------|
| `empresas` | 1 | Não | Cadastro de empresas (multi-tenant) |
| `users` | 0 | **Sim** | Usuários vinculados a empresas |
| `bling_tokens` | 1 | Não | Tokens OAuth do Bling por empresa |
| `produtos` | 3.563 | Não | Catálogo de produtos sincronizados |
| `fornecedores` | 104 | Não | Cadastro de fornecedores |
| `fornecedores_produtos` | 3.918 | Não | Relação N:N produto-fornecedor com preços |
| `clientes` | 869 | Não | Cadastro de clientes |
| `pedidos_venda` | 23.238 | Não | Pedidos de venda do Bling |
| `itens_pedido_venda` | 42.481 | Não | Itens dos pedidos de venda |
| `parcelas_pedido_venda` | 23.304 | Não | Parcelas/pagamentos de vendas |
| `pedidos_compra` | 294 | Não | Pedidos de compra |
| `itens_pedido_compra` | 6.016 | Não | Itens dos pedidos de compra |
| `parcelas_pedido_compra` | 42 | Não | Parcelas de compras |
| `notas_fiscais` | 837 | Não | Notas fiscais (entrada/saída) |
| `detalhes_nota_fiscal` | 720 | Não | Cabeçalho detalhado da NF |
| `produtos_detalhes_nota_fiscal` | 10.820 | Não | Itens da NF com impostos |
| `movimentacao_estoque` | 6.586 | Não | Histórico de entrada/saída |
| `formas_de_pagamento` | 43 | Não | Formas de pagamento do Bling |
| `politica_compra` | 5 | Não | Políticas comerciais por fornecedor |
| `cron_jobs` | 4.016 | **Sim** | Fila de jobs de sincronização |
| `analise_vendas_estoque` | 0 | Não | Análise para sugestão de compra |
| `sugestoes_pedido_compra` | 0 | Não | Sugestões calculadas de pedidos |
| `impostos_produto` | 0 | Não | Configurações fiscais por produto |
| `prazos_entrega` | 0 | Não | Prazos de entrega por empresa |

---

### Estrutura Detalhada das Tabelas Principais

#### `empresas` (Central - Multi-tenant)
```
id (PK), cnpj (UNIQUE), razao_social, nome_fantasia,
inscricao_estadual, inscricao_municipal, cd_regime_tributario,
conectadabling, dataexpirabling, authtoken, refreshtoken,
logotipo, endereco_dado, segmento[], lista_colaboradores[]
```
**Relaciona com:** produtos, fornecedores, clientes, pedidos_*, notas_fiscais, users

#### `produtos`
```
id (PK), id_produto_bling, codigo, nome, preco, tipo, situacao,
formato, unidade, marca, ncm, cest, gtin, gtin_embalagem,
estoque_atual, estoque_minimo, estoque_maximo, curva (A/B/C),
peso_liquido, peso_bruto, volumes, itens_por_caixa,
empresa_id (FK→empresas), fornecedor_id (FK→fornecedores)
```
**Índice de Performance:** curva (classificação ABC de produtos)

#### `fornecedores`
```
id (PK), id_bling, id_contato_bling, cnpj, cpf, nome, nome_fantasia,
razao_social, tipo_pessoa, contribuinte, inscricao_estadual,
telefone, celular, email, endereco (JSON), empresa_id (FK→empresas)
```

#### `fornecedores_produtos` (Tabela de Junção)
```
fornecedor_id (PK, FK→fornecedores), produto_id (PK, FK→produtos),
valor_de_compra, precocusto, qtd_ultima_compra, empresa_id
```
**Importante:** Guarda preço de compra por fornecedor para cada produto

#### `pedidos_venda`
```
id (PK), bling_id (UNIQUE), numero, data, data_saida, data_prevista,
total_produtos, total, desconto, frete, outras_despesas,
situacao, cliente_id (FK→clientes), vendedor_id, transportador_id,
nota_fiscal_id, empresa_id (FK→empresas)
```
**Situações:** IDs numéricos do Bling (consultar API para mapeamento)

#### `itens_pedido_venda`
```
id (PK), pedido_venda_id (FK), produto_id (FK→produtos),
codigo, descricao, unidade, quantidade, valor, desconto,
aliquota_ipi, comissao_base, comissao_aliquota, comissao_valor
```

#### `pedidos_compra`
```
id (PK), bling_id (UNIQUE), numero, data, data_prevista,
total_produtos, total, desconto, frete, situacao,
fornecedor_id (FK→fornecedores), nota_fiscal_id (FK→notas_fiscais),
politica_id (FK→politica_compra), empresa_id (FK→empresas),
valor_minimo, bonificacao, forma_pagamento
```

#### `notas_fiscais`
```
id (PK), bling_id, numero, serie, tipo (E/S), situacao,
data_emissao, data_operacao, chave_acesso (44 dígitos),
xml_url, link_danfe, link_pdf,
contato_id, contato_nome, contato_numero_documento,
fornecedor_id (FK→fornecedores), empresa_id (FK→empresas)
```

#### `produtos_detalhes_nota_fiscal` (Impostos da NF)
```
id (PK), detalhes_nota_fiscal_id (FK), fornecedor_id (FK),
c_prod (código), x_prod (descrição), ncm, cest, cfop,
q_com (quantidade), v_un_com (valor unitário), v_prod (valor total),
icms_orig, icms_csosn, icms_v_bc, icms_p_icms, icms_v_icms,
pis_cst, pis_v_pis, cofins_cst, cofins_v_cofins
```

#### `politica_compra`
```
id (PK), empresa_id (FK), fornecedor_id (FK),
valor_minimo, desconto, bonificacao, peso,
prazo_entrega, prazo_estoque, estoque_eficiente,
forma_pagamento_dias[] (array de inteiros), observacao, status
```

#### `movimentacao_estoque`
```
id (PK), produto_id (FK), empresa_id (FK),
data, tipo ('Entrada'|'Saida'), quantidade, origem, observacao
```

#### `cron_jobs` (Fila de Sincronização)
```
id (PK), id_empresa, status ('pending'|'processing'|'completed'|'error'),
step, parameters (JSONB), result (JSONB),
error_count, created_at, updated_at
```
**RLS ativo:** Filtra por empresa automaticamente

---

### Diagrama de Relacionamentos (Simplificado)

```
                            ┌──────────────┐
                            │   empresas   │
                            └──────┬───────┘
           ┌──────────┬───────────┼───────────┬──────────┐
           ▼          ▼           ▼           ▼          ▼
     ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌───────┐
     │ produtos │ │fornecedo-│ │clientes│ │ users  │ │bling_ │
     │          │ │   res    │ │        │ │        │ │tokens │
     └────┬─────┘ └────┬─────┘ └───┬────┘ └────────┘ └───────┘
          │            │           │
          │  ┌─────────┴───────┐   │
          │  │ fornecedores_   │   │
          └──│    produtos     │   │
             └─────────────────┘   │
                                   │
     ┌─────────────────────────────┼─────────────────────────┐
     │                             │                         │
     ▼                             ▼                         ▼
┌──────────────┐           ┌──────────────┐          ┌──────────────┐
│pedidos_compra│           │pedidos_venda │          │notas_fiscais │
└──────┬───────┘           └──────┬───────┘          └──────┬───────┘
       │                          │                         │
       ▼                          ▼                         ▼
┌──────────────┐           ┌──────────────┐          ┌──────────────┐
│itens_pedido_ │           │itens_pedido_ │          │produtos_deta-│
│   compra     │           │    venda     │          │lhes_nota_fis │
└──────────────┘           └──────────────┘          └──────────────┘
```

---

### Edge Functions
| Função | Descrição |
|--------|-----------|
| `sync_prod_2` | Sincroniza produtos (ativos/inativos) |
| `sync_fornecedores` | Sincroniza fornecedores |
| `sync_pedidos_venda` | Sincroniza pedidos de venda |
| `sync_pedidos_compra` | Sincroniza pedidos de compra |
| `sync_notas_fiscais` | Sincroniza notas fiscais |
| `sync_estoque` | Sincroniza estoque |
| `sync_detalhes_prod` | Sincroniza detalhes dos produtos |

### Funções RPC
| Função | Descrição |
|--------|-----------|
| `flowb2b_fetch_politica_compra` | Busca políticas por fornecedor |
| `flowb2b_get_produtos_detalhados` | Busca produtos com dados de venda |
| `get_max_data_saida` | Data última venda por produto |
| `get_max_data_compra` | Data última compra por produto |
| `detalhes_nota_fiscal_chave_acesso` | Processa nota fiscal |
| `update_produto_id` | Atualiza vínculo produto-fornecedor |

### Queries Úteis

```sql
-- Produtos com estoque baixo
SELECT p.codigo, p.nome, p.estoque_atual, p.estoque_minimo
FROM produtos p
WHERE p.estoque_atual < p.estoque_minimo AND p.empresa_id = ?;

-- Vendas por período com cliente
SELECT pv.numero, pv.data, pv.total, c.nome as cliente
FROM pedidos_venda pv
JOIN clientes c ON pv.cliente_id = c.id
WHERE pv.data BETWEEN ? AND ? AND pv.empresa_id = ?;

-- Produtos de um fornecedor com preço de compra
SELECT p.codigo, p.nome, fp.valor_de_compra, fp.precocusto
FROM produtos p
JOIN fornecedores_produtos fp ON p.id = fp.produto_id
WHERE fp.fornecedor_id = ?;

-- Movimentação de estoque recente
SELECT p.nome, m.tipo, m.quantidade, m.data, m.origem
FROM movimentacao_estoque m
JOIN produtos p ON m.produto_id = p.id
WHERE m.data > NOW() - INTERVAL '30 days'
ORDER BY m.data DESC;
```

---

## Bling API v3

**Base URL:** `https://api.bling.com.br/Api/v3`
**Autenticação:** OAuth 2.0 (Bearer Token)

### OAuth Flow:
```
1. Redirecionar usuário para autorização:
   https://www.bling.com.br/Api/v3/oauth/authorize?
     response_type=code&
     client_id=2abf4c9c9645a7a08016d39c71f0b5d458b799d9&
     state=CalculateRandomString

2. Receber authorization_code via callback

3. Trocar code por tokens:
   POST /Api/v3/oauth/token

4. Usar access_token em requisições:
   Authorization: Bearer {access_token}
```

### Endpoints Principais:
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/produtos?pagina=X&limite=100` | Lista produtos |
| GET | `/fornecedores?pagina=X` | Lista fornecedores |
| GET | `/pedidos/venda?pagina=X` | Lista pedidos de venda |
| GET | `/pedidos/compra?pagina=X` | Lista pedidos de compra |
| GET | `/notasfiscais?pagina=X` | Lista notas fiscais |
| GET | `/estoque` | Dados de inventário |

### Rate Limits:
- **Limite:** 300 requisições/minuto (5 req/s)
- **Recomendação:** Implementar backoff exponencial

---

## Stack Tecnológica

### Frontend (Este Projeto)
- **Framework:** Next.js 16.1
- **Linguagem:** TypeScript
- **Estilização:** (a definir - provavelmente Tailwind)

### Backend (flowB2BAPI)
- **Runtime:** Node.js
- **Framework:** Express.js 4.21.2
- **Database Client:** @supabase/supabase-js 2.48.1
- **HTTP Client:** Axios 1.7.9
- **Logging:** Winston 3.17.0

### Backend (validacao_ean)
- **Runtime:** Python 3.11+
- **Framework:** FastAPI 0.110.1
- **Scraping:** BeautifulSoup4, Selenium
- **Data:** Pandas, NumPy

### Infraestrutura
- **Database:** Supabase (PostgreSQL)
- **Edge Functions:** Supabase (Deno)
- **Deploy API:** Render.com
- **Frontend atual:** Bubble.io (sendo migrado)

---

## Autenticação

O sistema usa autenticação do Bling via OAuth 2.0. Os tokens são gerenciados:

1. **Armazenamento:** Tabela `bling_tokens` no Supabase
2. **Renovação:** Automática pelo `blingTokenService.js`
3. **Mutex:** Previne renovações concorrentes
4. **Buffer:** Renova 10 min antes de expirar

---

## Fluxo de Dados Principal

```
1. Usuário autoriza app no Bling (OAuth)
2. Frontend recebe tokens e armazena no Supabase
3. Frontend chama flowB2BAPI para sincronização
4. flowB2BAPI:
   a. Valida/renova tokens
   b. Busca dados do Bling (paginado)
   c. Chama Edge Functions do Supabase
   d. Edge Functions fazem UPSERT no banco
5. Frontend consulta Supabase para exibir dados
6. Para pedidos automáticos:
   a. Frontend chama validacao_ean-master
   b. API calcula sugestão baseada em regras
   c. Retorna pedido otimizado
```

---

## Variáveis de Ambiente Necessárias

```env
# ===========================================
# Supabase
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://asahknimbggpzpoebmej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ===========================================
# Bling OAuth 2.0
# ===========================================
BLING_CLIENT_ID=2abf4c9c9645a7a08016d39c71f0b5d458b799d9
BLING_CLIENT_SECRET=your_client_secret
BLING_REDIRECT_URI=https://flowb2b-v2.onrender.com/api/auth/bling/callback
BLING_API_URL=https://api.bling.com.br/Api/v3

# ===========================================
# APIs Internas
# ===========================================
FLOWB2BAPI_URL=https://flowb2bapi-ymtn.onrender.com
VALIDACAO_EAN_URL=https://validacao-ean-cwrd.onrender.com

# ===========================================
# Next.js & Auth
# ===========================================
NEXT_PUBLIC_APP_URL=https://flowb2b-v2.onrender.com
JWT_SECRET=your_jwt_secret
```

---

## Convenções de Código

### Nomenclatura
- **Componentes:** PascalCase (`ProductList.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useProducts.ts`)
- **Utils:** camelCase (`formatDate.ts`)
- **API Routes:** kebab-case (`/api/sync-products`)

### Estrutura de Pastas (Sugerida)
```
src/
├── app/                    # App Router (Next.js 16)
│   ├── (auth)/            # Rotas de autenticação
│   ├── (dashboard)/       # Rotas do dashboard
│   └── api/               # API Routes
├── components/
│   ├── ui/                # Componentes base (buttons, inputs)
│   └── features/          # Componentes de features
├── hooks/                 # Custom hooks
├── lib/
│   ├── supabase/         # Cliente Supabase
│   ├── bling/            # Integração Bling
│   └── utils/            # Utilitários
├── types/                 # TypeScript types
└── styles/               # Estilos globais
```

---

## MCPs Configurados

| MCP | Status | Descrição |
|-----|--------|-----------|
| `supabase` | ✓ Conectado | Acesso ao banco e edge functions |
| `figma` | ✓ Conectado | Extrair designs para implementação |
| `playwright` | ✓ Conectado | Testes E2E |
| `context7` | ✓ Conectado | Documentação de libs |

---

## Links Úteis

- [Bling API Docs](https://developer.bling.com.br/referencia)
- [Bling OAuth](https://developer.bling.com.br/bling-api)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## Notas Importantes

1. **Rate Limiting:** Sempre respeitar limite de 300 req/min do Bling
2. **Tokens:** Nunca expor tokens no frontend, usar Server Components/API Routes
3. **Sincronização:** Processos longos devem rodar em background (202 Accepted)
4. **Cálculo de Pedidos:** Seguir as 9 regras documentadas rigorosamente
5. **Scraping:** Cobasi usa BeautifulSoup, Petz requer Selenium (JS rendering)
