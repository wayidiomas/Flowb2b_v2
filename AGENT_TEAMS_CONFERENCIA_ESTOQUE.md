# Agent Teams - Conferência de Estoque do Fornecedor

## Instrução para iniciar


---

Crie um agent team com 4 teammates para implementar a feature de **Conferência de Estoque do Fornecedor**. Leia o arquivo `AGENT_TEAMS_CONFERENCIA_ESTOQUE.md` na raiz do projeto para o contexto completo. Divida o trabalho assim:

1. **Teammate "SQL + Types"** — Cria as tabelas no Supabase via MCP e define os tipos TypeScript
2. **Teammate "API Routes"** — Implementa todas as API routes (fornecedor + lojista)
3. **Teammate "Fornecedor Pages"** — Implementa as páginas do portal fornecedor (estoque, notas, conferência, tabelas de preço)
4. **Teammate "Lojista Pages"** — Implementa as páginas do portal lojista (sugestões de estoque, tabelas de preço recebidas)

Cada teammate deve ler CLAUDE.md e este arquivo antes de começar. O Teammate 1 deve terminar primeiro pois os outros dependem dos tipos e tabelas.

---

## Contexto Completo do Projeto

### Arquitetura Multi-Tenant — REGRA FUNDAMENTAL

O FlowB2B é multi-tenant. **TODA query ao Supabase DEVE filtrar por `empresa_id`.**

Existem 3 tipos de usuário com autenticação separada:

| Tipo | Tabela de Login | Identificador | empresa_id no JWT |
|------|----------------|---------------|-------------------|
| Lojista | `users` | `empresaId` | SIM |
| Fornecedor | `users_fornecedor` | `cnpj` | NULL |
| Representante | `users_representante` | `representanteUserId` | NULL |

### Como o Fornecedor acessa dados (PADRÃO OBRIGATÓRIO)

A tabela `fornecedores` tem **1 linha POR empresa atendida**. Se o fornecedor CNPJ "12345" atende 3 lojistas, existem 3 linhas:

```
fornecedores:
| id | cnpj    | empresa_id | nome         |
|----|---------|------------|--------------|
| 1  | 12345   | 5          | Fornecedor X |  ← instância para Loja A
| 2  | 12345   | 7          | Fornecedor X |  ← instância para Loja B
| 3  | 12345   | 12         | Fornecedor X |  ← instância para Loja C
```

**Padrão de query do fornecedor (usado em TODAS as rotas):**

```typescript
// 1. Pega CNPJ do JWT (via header x-user-cnpj no middleware)
const cnpj = request.headers.get('x-user-cnpj')

// 2. Busca TODAS as instâncias desse fornecedor
const { data: fornecedores } = await supabase
  .from('fornecedores')
  .select('id, empresa_id, empresas!inner(id, razao_social, nome_fantasia)')
  .eq('cnpj', cnpj)

// 3. Para queries de 1 lojista específico:
const fornecedor = fornecedores.find(f => f.empresa_id === Number(empresaId))

// 4. Para queries multi-lojista:
const fornecedorIds = fornecedores.map(f => f.id)
const { data } = await supabase
  .from('pedidos_compra')
  .select('*')
  .in('fornecedor_id', fornecedorIds)
```

### Tabelas existentes relevantes

```
produtos (empresa_id) — Cada empresa tem seus próprios produtos
fornecedores_produtos (fornecedor_id, produto_id, empresa_id, valor_de_compra, precocusto)
pedidos_compra (empresa_id, fornecedor_id, status_interno)
notas_fiscais (empresa_id, fornecedor_id, tipo E/S, numero, chave_acesso)
movimentacao_estoque (produto_id, empresa_id, tipo Entrada/Saida, quantidade, origem)
empresas (id, razao_social, nome_fantasia, cnpj)
```

### Middleware — headers injetados nas API routes

O middleware em `src/middleware.ts` decodifica o JWT e injeta:
- `x-user-id` — ID do usuário
- `x-empresa-id` — empresa_id (null para fornecedor)
- `x-user-role` — role
- `x-user-tipo` — 'lojista' | 'fornecedor' | 'representante'
- `x-user-cnpj` — CNPJ (apenas para fornecedor)

### Rotas públicas no middleware (já configuradas)

```typescript
// Padrões que NÃO precisam de auth:
'/fornecedor/login', '/fornecedor/registro'
'/api/auth/fornecedor/login', '/api/auth/fornecedor/registro'
```

As novas rotas `/fornecedor/*` já estão protegidas pelo middleware (requer tipo='fornecedor').
As novas rotas `/estoque/*` já estão protegidas (requer tipo='lojista').

---

## O QUE IMPLEMENTAR

### Feature 1: Aba de Estoque do Fornecedor
- Página onde o fornecedor seleciona um lojista e vê os produtos vinculados a ele com estoque atual
- Só mostra produtos que estão em `fornecedores_produtos` para aquele `fornecedor_id`

### Feature 2: Aba de Notas Fiscais do Fornecedor
- Página onde o fornecedor seleciona um lojista e vê as notas fiscais vinculadas

### Feature 3: Conferência de Estoque (PRINCIPAL)
- Fornecedor seleciona um lojista, inicia uma conferência
- Bipa produtos (input de EAN/código com autofocus, leitores enviam keystrokes + Enter)
- Registra quantidade encontrada de cada produto
- Vê resumo com divergências (estoque_conferido vs estoque_sistema)
- Botão "Sugerir Atualização de Estoque ao Lojista"
- Lojista recebe a sugestão em tela própria
- Lojista pode aceitar/rejeitar por item (parcial) ou tudo de uma vez
- Se aceito, `produtos.estoque_atual` é atualizado e `movimentacao_estoque` registrada

### Feature 4: Tabela de Preços
- Fornecedor cadastra tabela de preços para cada lojista
- Lojista visualiza tabelas recebidas

---

## TABELAS SQL PARA CRIAR

### Teammate 1 deve executar via MCP Supabase (`apply_migration`):

```sql
-- Migration: conferencia_estoque_e_tabelas_preco

-- 1. Conferência de Estoque (cabeçalho)
CREATE TABLE conferencias_estoque (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id),
  fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
  user_fornecedor_id INTEGER,
  status VARCHAR(30) DEFAULT 'em_andamento',
  data_inicio TIMESTAMP DEFAULT NOW(),
  data_envio TIMESTAMP,
  data_resposta TIMESTAMP,
  observacao_fornecedor TEXT,
  observacao_lojista TEXT,
  total_itens INTEGER DEFAULT 0,
  total_divergencias INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conf_estoque_empresa ON conferencias_estoque(empresa_id);
CREATE INDEX idx_conf_estoque_fornecedor ON conferencias_estoque(fornecedor_id);
CREATE INDEX idx_conf_estoque_status ON conferencias_estoque(status);

-- 2. Itens da Conferência
CREATE TABLE itens_conferencia_estoque (
  id SERIAL PRIMARY KEY,
  conferencia_id INTEGER NOT NULL REFERENCES conferencias_estoque(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  codigo VARCHAR(255),
  gtin VARCHAR(255),
  nome VARCHAR(500),
  estoque_conferido INTEGER NOT NULL,
  estoque_sistema INTEGER,
  aceito BOOLEAN,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_itens_conf_conferencia ON itens_conferencia_estoque(conferencia_id);
CREATE INDEX idx_itens_conf_produto ON itens_conferencia_estoque(produto_id);

-- 3. Tabela de Preços (cabeçalho)
CREATE TABLE tabelas_preco (
  id SERIAL PRIMARY KEY,
  fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
  empresa_id INTEGER NOT NULL REFERENCES empresas(id),
  nome VARCHAR(255) NOT NULL,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  status VARCHAR(20) DEFAULT 'ativa',
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tab_preco_fornecedor ON tabelas_preco(fornecedor_id);
CREATE INDEX idx_tab_preco_empresa ON tabelas_preco(empresa_id);

-- 4. Itens da Tabela de Preços
CREATE TABLE itens_tabela_preco (
  id SERIAL PRIMARY KEY,
  tabela_preco_id INTEGER NOT NULL REFERENCES tabelas_preco(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  codigo VARCHAR(255),
  nome VARCHAR(500),
  unidade VARCHAR(50),
  itens_por_caixa INTEGER,
  preco_original DECIMAL(15,2),
  preco_tabela DECIMAL(15,2) NOT NULL,
  desconto_percentual DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_itens_tab_preco ON itens_tabela_preco(tabela_preco_id);
```

---

## TIPOS TYPESCRIPT

### Teammate 1 deve criar `src/types/conferencia-estoque.ts`:

```typescript
// Status da conferência
export type ConferenciaStatus =
  | 'em_andamento'
  | 'enviada'
  | 'aceita'
  | 'rejeitada'
  | 'parcialmente_aceita'

// Conferência de Estoque (cabeçalho)
export interface ConferenciaEstoque {
  id: number
  empresa_id: number
  fornecedor_id: number
  user_fornecedor_id: number | null
  status: ConferenciaStatus
  data_inicio: string
  data_envio: string | null
  data_resposta: string | null
  observacao_fornecedor: string | null
  observacao_lojista: string | null
  total_itens: number
  total_divergencias: number
  created_at: string
  updated_at: string
  // Joins
  empresa_nome?: string
  fornecedor_nome?: string
}

// Item da conferência (produto bipado)
export interface ItemConferenciaEstoque {
  id: number
  conferencia_id: number
  produto_id: number
  codigo: string | null
  gtin: string | null
  nome: string | null
  estoque_conferido: number
  estoque_sistema: number | null
  aceito: boolean | null  // null = pendente
  observacao: string | null
  created_at: string
}

// Payload para bipar produto
export interface BiparProdutoPayload {
  gtin: string  // EAN ou código do produto
  quantidade: number
}

// Payload para aceitar sugestão
export interface AceitarSugestaoPayload {
  aceitar_todos?: boolean
  itens_aceitos?: number[]  // IDs dos itens aceitos
  observacao?: string
}
```

### Teammate 1 deve criar `src/types/tabela-preco.ts`:

```typescript
export interface TabelaPreco {
  id: number
  fornecedor_id: number
  empresa_id: number
  nome: string
  vigencia_inicio: string | null
  vigencia_fim: string | null
  status: 'ativa' | 'inativa' | 'expirada'
  observacao: string | null
  created_at: string
  updated_at: string
  // Joins
  fornecedor_nome?: string
  empresa_nome?: string
  total_itens?: number
}

export interface ItemTabelaPreco {
  id: number
  tabela_preco_id: number
  produto_id: number | null
  codigo: string | null
  nome: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_original: number | null
  preco_tabela: number
  desconto_percentual: number | null
  created_at: string
}
```

---

## API ROUTES — ESPECIFICAÇÃO DETALHADA

### Teammate 2: Portal Fornecedor

#### `GET /api/fornecedor/estoque?empresa_id=X`
```typescript
// 1. Validar tipo = 'fornecedor', pegar cnpj do header
// 2. Buscar fornecedor específico: fornecedores WHERE cnpj = X AND empresa_id = Y
// 3. Buscar produtos via fornecedores_produtos:
const { data } = await supabase
  .from('fornecedores_produtos')
  .select(`
    valor_de_compra, precocusto,
    produtos!inner(
      id, codigo, nome, gtin, gtin_embalagem,
      estoque_atual, estoque_minimo, unidade,
      itens_por_caixa, marca, curva
    )
  `)
  .eq('fornecedor_id', fornecedor.id)
  .eq('empresa_id', empresaId)
// 4. Retornar lista de produtos com estoque
```

#### `GET /api/fornecedor/notas?empresa_id=X`
```typescript
// 1. Validar tipo = 'fornecedor', pegar cnpj do header
// 2. Buscar fornecedor específico
// 3. Buscar notas:
const { data } = await supabase
  .from('notas_fiscais')
  .select('id, numero, serie, tipo, situacao, data_emissao, data_operacao, chave_acesso')
  .eq('fornecedor_id', fornecedor.id)
  .eq('empresa_id', empresaId)
  .order('data_emissao', { ascending: false })
```

#### `GET /api/fornecedor/conferencia-estoque`
- Lista conferências do fornecedor (todos os lojistas)
- Filtro opcional por `?empresa_id=X` e `?status=Y`
- Join com empresas para nome do lojista

#### `POST /api/fornecedor/conferencia-estoque`
```typescript
// Body: { empresa_id: number }
// 1. Validar fornecedor tem vínculo com essa empresa
// 2. Criar:
const { data } = await supabase
  .from('conferencias_estoque')
  .insert({
    empresa_id: body.empresa_id,
    fornecedor_id: fornecedor.id,  // instância específica
    user_fornecedor_id: userId,
    status: 'em_andamento'
  })
  .select()
  .single()
```

#### `GET /api/fornecedor/conferencia-estoque/[id]`
- Retorna conferência + todos os itens
- Validar que a conferência pertence ao fornecedor (via cnpj)

#### `POST /api/fornecedor/conferencia-estoque/[id]/itens`
```typescript
// Body: { gtin: string, quantidade: number }
// 1. Buscar conferência, validar ownership
// 2. Buscar produto na empresa do lojista:
const { data: produto } = await supabase
  .from('produtos')
  .select('id, codigo, nome, gtin, gtin_embalagem, estoque_atual')
  .eq('empresa_id', conferencia.empresa_id)
  .or(`gtin.eq.${gtin},gtin_embalagem.eq.${gtin},codigo.eq.${gtin}`)
  .single()

// 3. Verificar produto é do fornecedor:
const { data: vinculo } = await supabase
  .from('fornecedores_produtos')
  .select('produto_id')
  .eq('produto_id', produto.id)
  .eq('fornecedor_id', conferencia.fornecedor_id)
  .single()

// 4. Se já bipado, atualizar quantidade. Senão, inserir com snapshot do estoque_sistema
// 5. Atualizar contadores da conferência (total_itens)
```

#### `DELETE /api/fornecedor/conferencia-estoque/[id]/itens?item_id=X`
- Remove item da conferência
- Atualizar contadores

#### `POST /api/fornecedor/conferencia-estoque/[id]/enviar`
```typescript
// 1. Validar ownership e status = 'em_andamento'
// 2. Calcular total_divergencias (itens onde estoque_conferido != estoque_sistema)
// 3. Atualizar:
await supabase
  .from('conferencias_estoque')
  .update({
    status: 'enviada',
    data_envio: new Date().toISOString(),
    total_itens: totalItens,
    total_divergencias: totalDivergencias
  })
  .eq('id', conferenciaId)
```

#### `GET/POST/PUT/DELETE /api/fornecedor/tabelas-preco[/[id]]`
- CRUD padrão para tabelas de preço
- Sempre validar vínculo fornecedor-empresa
- POST cria tabela + itens em uma transação
- GET lista por empresa_id ou todas

### Teammate 2: Portal Lojista

#### `GET /api/estoque/sugestoes`
```typescript
// empresa_id vem do JWT (header x-empresa-id)
const { data } = await supabase
  .from('conferencias_estoque')
  .select(`
    id, status, data_inicio, data_envio, data_resposta,
    total_itens, total_divergencias, observacao_fornecedor,
    fornecedores!inner(id, nome, nome_fantasia)
  `)
  .eq('empresa_id', empresaId)
  .in('status', ['enviada', 'aceita', 'rejeitada', 'parcialmente_aceita'])
  .order('data_envio', { ascending: false })
```

#### `GET /api/estoque/sugestoes/[id]`
- Retorna conferência + itens com detalhes
- Filtrar por empresa_id OBRIGATORIAMENTE

#### `POST /api/estoque/sugestoes/[id]/aceitar`
```typescript
// Body: { aceitar_todos?: boolean, itens_aceitos?: number[], observacao?: string }
// 1. Buscar conferência + itens WHERE empresa_id = X AND status = 'enviada'
// 2. Para cada item aceito:
//    a. UPDATE produtos SET estoque_atual = item.estoque_conferido
//       WHERE id = item.produto_id AND empresa_id = empresaId
//    b. INSERT movimentacao_estoque:
//       { produto_id, empresa_id, data: now,
//         tipo: conferido > sistema ? 'Entrada' : 'Saida',
//         quantidade: abs(conferido - sistema),
//         origem: 'Conferência de Estoque',
//         observacao: 'Conferência #X - Fornecedor Y' }
//    c. UPDATE itens_conferencia_estoque SET aceito = true WHERE id = item.id
// 3. Itens não aceitos: SET aceito = false
// 4. Status: todos aceitos → 'aceita', parcial → 'parcialmente_aceita'
// 5. Setar data_resposta e observacao_lojista
```

#### `POST /api/estoque/sugestoes/[id]/rejeitar`
```typescript
// 1. Buscar conferência WHERE empresa_id = X AND status = 'enviada'
// 2. UPDATE todos itens SET aceito = false
// 3. UPDATE conferência SET status = 'rejeitada', data_resposta = now
```

#### `GET /api/compras/tabelas-preco`
```typescript
// Lojista vê tabelas que fornecedores criaram para ele
const { data } = await supabase
  .from('tabelas_preco')
  .select(`
    *,
    fornecedores!inner(id, nome, nome_fantasia),
    itens_tabela_preco(count)
  `)
  .eq('empresa_id', empresaId)
  .order('created_at', { ascending: false })
```

---

## PÁGINAS E COMPONENTES

### Teammate 3: Portal Fornecedor

Todos usam `<FornecedorLayout>` como wrapper. Seguir estilo existente em `src/app/fornecedor/pedidos/page.tsx`.

**Cores do portal fornecedor:**
- Header: `#336FB6`
- Badge/accent: `#FFAA11`
- Active nav: `#2660a5`
- Hover: `bg-[#336FB6]/5`
- Table header: `bg-[#336FB6]/5`

**Componentes UI disponíveis (importar de `@/components/ui`):**
`Button`, `Input`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Skeleton`, `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter`, `Tooltip`, `PageLoader`

#### Componente: `LojistaSelectorDropdown`
- Criar em `src/components/fornecedor/LojistaSelectorDropdown.tsx`
- Usa `useFornecedorAuth()` que já retorna `empresasVinculadas: EmpresaVinculada[]`
- `EmpresaVinculada = { fornecedorId, empresaId, razaoSocial, nomeFantasia }`
- Dropdown no topo da página para selecionar lojista ativo
- Armazenar seleção em localStorage para persistir entre páginas
- Retorna `{ empresaId, fornecedorId }` selecionado

#### Sidebar do Fornecedor — ATUALIZAR
Editar `src/components/layout/FornecedorLayout.tsx` para adicionar novos itens no menu:
- Dashboard (existente)
- Pedidos (existente)
- **Estoque** (NOVO) → `/fornecedor/estoque`
- **Notas Fiscais** (NOVO) → `/fornecedor/notas`
- **Conferência de Estoque** (NOVO) → `/fornecedor/conferencia-estoque`
- **Tabelas de Preço** (NOVO) → `/fornecedor/tabelas-preco`
- Representantes (existente)

#### Página: `/fornecedor/estoque/page.tsx`
- LojistaSelectorDropdown no topo
- Tabela de produtos com colunas: Código, Nome, Marca, EAN, Estoque Atual, Estoque Mín, Curva, Preço Compra
- Busca por nome/código
- Dados vêm de `GET /api/fornecedor/estoque?empresa_id=X`

#### Página: `/fornecedor/notas/page.tsx`
- LojistaSelectorDropdown no topo
- Tabela de NFs: Número, Série, Tipo (E/S), Situação, Data Emissão, Chave de Acesso
- Filtro por tipo (Entrada/Saída)
- Dados vêm de `GET /api/fornecedor/notas?empresa_id=X`

#### Página: `/fornecedor/conferencia-estoque/page.tsx`
- Lista de conferências (todas ou filtrada por lojista)
- Colunas: Lojista, Status, Data Início, Data Envio, Itens, Divergências
- Botão "Nova Conferência" → abre modal para selecionar lojista → redireciona para `/fornecedor/conferencia-estoque/nova?empresa_id=X`
- Status badges coloridas (mesmo padrão de pedidos)

#### Página: `/fornecedor/conferencia-estoque/nova/page.tsx` (TELA PRINCIPAL)
- **MOBILE-FRIENDLY** — fornecedor vai usar na loja com celular ou leitor de código de barras
- Recebe `empresa_id` como query param
- Cria conferência ao carregar (POST)
- Input EAN com `autoFocus` permanente (leitores USB/BT simulam digitação + Enter)
- Ao detectar Enter: busca produto, exibe nome/código, pede quantidade (default 1)
- Se produto já bipado: pergunta se quer SOMAR ou SUBSTITUIR quantidade
- Lista de itens bipados com: Nome, Código, Conferido, Sistema, Diferença
- Diferenças destacadas com cor (vermelho = menos, verde = mais, cinza = igual)
- Resumo: Total itens, Com divergência, Sem divergência
- Botão grande: **"Sugerir Atualização ao Lojista"** → POST enviar
- Confirmar com modal antes de enviar

#### Página: `/fornecedor/conferencia-estoque/[id]/page.tsx`
- Visualização de conferência existente
- Se status 'em_andamento': permite continuar bipando (mesmo scanner)
- Se status 'enviada/aceita/rejeitada': modo visualização apenas
- Mostra resposta do lojista por item (aceito/rejeitado)

#### Página: `/fornecedor/tabelas-preco/page.tsx`
- Lista de tabelas de preço criadas
- Filtro por lojista
- Colunas: Nome, Lojista, Vigência, Status, Itens

#### Página: `/fornecedor/tabelas-preco/nova/page.tsx`
- LojistaSelectorDropdown
- Form: nome, vigência início/fim, observação
- Tabela editável para adicionar itens (buscar produtos do lojista)
- Colunas: Código, Nome, Preço Original, Preço Tabela, Desconto %

### Teammate 4: Portal Lojista

Todos usam o layout padrão do lojista (não precisa criar). Seguir estilo de `src/app/estoque/produtos/page.tsx`.

#### Sidebar do Lojista — ATUALIZAR
Verificar se precisa adicionar link no menu do lojista para:
- **Sugestões de Estoque** → `/estoque/sugestoes`
- **Tabelas de Preço** → `/compras/tabelas-preco`

#### Página: `/estoque/sugestoes/page.tsx`
- Lista de sugestões recebidas de fornecedores
- Cards ou tabela: Fornecedor, Data Envio, Itens, Divergências, Status
- Badge de status com cores
- Destaque para sugestões pendentes (status 'enviada')
- Botão "Revisar" → navega para detalhe

#### Página: `/estoque/sugestoes/[id]/page.tsx`
- Cabeçalho: Fornecedor, Data da conferência, Observação do fornecedor
- Tabela de itens com checkbox individual:
  - ☑ | Produto | Código | Conferido | Sistema | Diferença
- Diferenças destacadas com cor
- Selectall / deselect all
- Área de observação do lojista (textarea)
- Botões: "Rejeitar Tudo" (outline vermelho) e "Aceitar Selecionados" (verde)
- Modal de confirmação antes de aceitar
- Após aceitar: mostra resumo do que foi atualizado

#### Página: `/compras/tabelas-preco/page.tsx`
- Lista de tabelas de preço recebidas
- Expandir para ver itens
- Filtro por fornecedor
- Colunas: Fornecedor, Nome da Tabela, Vigência, Itens, Status

---

## ESTRUTURA DE ARQUIVOS FINAL

```
src/
├── types/
│   ├── conferencia-estoque.ts          ← Teammate 1
│   └── tabela-preco.ts                 ← Teammate 1
│
├── components/
│   ├── layout/
│   │   └── FornecedorLayout.tsx        ← Teammate 3 EDITA (add menu items)
│   └── fornecedor/
│       └── LojistaSelectorDropdown.tsx ← Teammate 3
│
├── app/
│   ├── fornecedor/
│   │   ├── estoque/
│   │   │   └── page.tsx               ← Teammate 3
│   │   ├── notas/
│   │   │   └── page.tsx               ← Teammate 3
│   │   ├── conferencia-estoque/
│   │   │   ├── page.tsx               ← Teammate 3
│   │   │   ├── nova/
│   │   │   │   └── page.tsx           ← Teammate 3
│   │   │   └── [id]/
│   │   │       └── page.tsx           ← Teammate 3
│   │   └── tabelas-preco/
│   │       ├── page.tsx               ← Teammate 3
│   │       └── nova/
│   │           └── page.tsx           ← Teammate 3
│   │
│   ├── estoque/
│   │   └── sugestoes/
│   │       ├── page.tsx               ← Teammate 4
│   │       └── [id]/
│   │           └── page.tsx           ← Teammate 4
│   │
│   ├── compras/
│   │   └── tabelas-preco/
│   │       └── page.tsx               ← Teammate 4
│   │
│   └── api/
│       ├── fornecedor/
│       │   ├── estoque/
│       │   │   └── route.ts           ← Teammate 2
│       │   ├── notas/
│       │   │   └── route.ts           ← Teammate 2
│       │   ├── conferencia-estoque/
│       │   │   ├── route.ts           ← Teammate 2
│       │   │   └── [id]/
│       │   │       ├── route.ts       ← Teammate 2
│       │   │       ├── itens/
│       │   │       │   └── route.ts   ← Teammate 2
│       │   │       └── enviar/
│       │   │           └── route.ts   ← Teammate 2
│       │   └── tabelas-preco/
│       │       ├── route.ts           ← Teammate 2
│       │       └── [id]/
│       │           └── route.ts       ← Teammate 2
│       │
│       ├── estoque/
│       │   └── sugestoes/
│       │       ├── route.ts           ← Teammate 2
│       │       └── [id]/
│       │           ├── route.ts       ← Teammate 2
│       │           ├── aceitar/
│       │           │   └── route.ts   ← Teammate 2
│       │           └── rejeitar/
│       │               └── route.ts   ← Teammate 2
│       │
│       └── compras/
│           └── tabelas-preco/
│               └── route.ts           ← Teammate 2
```

---

## REFERÊNCIAS DE CÓDIGO EXISTENTE

Para seguir os padrões, cada teammate deve LER estes arquivos como referência:

| Arquivo | Por quê |
|---------|---------|
| `src/app/fornecedor/pedidos/page.tsx` | Padrão de página do portal fornecedor |
| `src/app/api/fornecedor/pedidos/route.ts` | Padrão de API route do fornecedor (query por CNPJ) |
| `src/app/api/auth/fornecedor/me/route.ts` | Como buscar empresas vinculadas |
| `src/components/layout/FornecedorLayout.tsx` | Layout e menu do fornecedor |
| `src/contexts/FornecedorAuthContext.tsx` | Auth context e tipos |
| `src/app/estoque/produtos/page.tsx` | Padrão de página do lojista (estoque) |
| `src/components/ui/index.ts` | Componentes UI disponíveis |
| `src/middleware.ts` | Como headers são injetados |

---

## ORDEM DE EXECUÇÃO

```
Teammate 1 (SQL + Types)     → PRIMEIRO (outros dependem)
    ↓ quando terminar
Teammate 2 (API Routes)      → SEGUNDO (páginas dependem das APIs)
Teammate 3 (Fornecedor Pages) → PODE COMEÇAR JUNTO COM 2 (mockando dados)
Teammate 4 (Lojista Pages)    → PODE COMEÇAR JUNTO COM 2 (mockando dados)
```

Teammate 3 e 4 podem começar a estrutura das páginas enquanto Teammate 2 implementa as APIs, mas devem revisitar para conectar os endpoints reais.
