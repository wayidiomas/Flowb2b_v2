# FlowB2B - Spec: Super Admin

## Visao Geral

O **Super Admin** eh um novo tipo de usuario (`tipo: 'superadmin'`) com acesso privilegiado a toda a plataforma FlowB2B. Ele nao pertence a nenhuma empresa especifica — ele enxerga e gerencia TODAS as empresas, usuarios, pedidos e integracoes do sistema.

**Objetivo:** Dar a equipe FlowB2B visibilidade total sobre o que cada cliente esta fazendo na plataforma, permitindo suporte tecnico, auditoria e gestao de integracoes.

---

## 1. Autenticacao e Acesso

### 1.1 Tipo de Usuario

```typescript
// Novo tipo no JWT
interface SuperAdminJWTPayload {
  userId: string           // UUID da tabela users
  empresaId: null          // Super admin nao pertence a nenhuma empresa
  email: string
  role: 'superadmin'
  tipo: 'superadmin'
  iat: number
  exp: number
}
```

### 1.2 Login

- Usa a mesma tela de login (`/login`) — nao precisa de tela separada
- Apos autenticar, detectar `tipo: 'superadmin'` e redirecionar para `/admin/dashboard`
- Alternativa: login separado em `/admin/login` (mais seguro, isola completamente)

### 1.3 Middleware

Adicionar ao `src/middleware.ts`:

```typescript
// Novas rotas protegidas
const superAdminRoutes = ['/admin', '/api/admin']

// No middleware: se tipo === 'superadmin', permitir acesso a /admin/*
// Se tipo !== 'superadmin' tentando acessar /admin/*, redirecionar para /dashboard
```

### 1.4 Tabela

Usar a tabela `users` existente com `role: 'superadmin'`. Nao precisa de `empresa_id` nem de registro em `users_empresas`.

---

## 2. Layout e Navegacao

### 2.1 Layout Dedicado

Novo layout `AdminLayout` em `src/components/layout/AdminLayout.tsx`:
- Sidebar com navegacao propria (diferente do lojista)
- Header com indicador "Super Admin" e busca global
- Cor/tema diferenciado (ex: vermelho/cinza escuro) para diferenciar visualmente

### 2.2 Menu de Navegacao

```
/admin
├── /admin/dashboard              # Visao geral da plataforma
├── /admin/usuarios               # Gestao de todos os usuarios
│   ├── /admin/usuarios/lojistas
│   ├── /admin/usuarios/fornecedores
│   └── /admin/usuarios/representantes
├── /admin/empresas               # Todas as empresas
│   └── /admin/empresas/[id]      # Detalhe da empresa (usuarios, bling, pedidos)
├── /admin/pedidos                # Todos os pedidos de compra
│   └── /admin/pedidos/[id]       # Detalhe do pedido (timeline auditada)
├── /admin/bling                  # Gestao de conexoes Bling
│   └── /admin/bling/[empresaId]  # Gestao Bling de uma empresa
└── /admin/relacoes               # Mapa lojista <-> fornecedor <-> representante
```

---

## 3. Modulos e Features

---

### 3.1 Dashboard do Admin (`/admin/dashboard`)

**Metricas globais da plataforma:**

| Metrica | Descricao |
|---------|-----------|
| Total de empresas | Contagem de `empresas` |
| Empresas ativas no Bling | `WHERE conectadabling = true` |
| Total de usuarios | Soma de `users` + `users_fornecedor` + `users_representante` |
| Pedidos de compra (ultimo mes) | `pedidos_compra WHERE created_at > now() - 30 days` |
| Pedidos por status | Agrupado por `status_interno` |
| Sync status | Empresas com `sync_status = 'error'` ou tokens expirados |
| Tokens Bling expirando | `bling_tokens WHERE expires_at < now() + 24h` |

**Cards de alerta:**
- Empresas com token Bling revogado/expirado
- Syncs com erro
- Usuarios inativos

---

### 3.2 Gestao de Usuarios (`/admin/usuarios`)

#### 3.2.1 Visao Geral

Tres abas: **Lojistas** | **Fornecedores** | **Representantes**

Cada aba lista todos os usuarios do tipo correspondente com:
- Nome, email, status (ativo/inativo), data de criacao
- Busca por nome, email ou CNPJ
- Filtro por status (ativo/inativo)

#### 3.2.2 Lojistas (`/admin/usuarios/lojistas`)

**Fonte:** tabela `users` + `users_empresas`

| Coluna | Descricao |
|--------|-----------|
| Nome | `users.nome` |
| Email | `users.email` |
| Empresas | Lista de empresas vinculadas via `users_empresas` |
| Role | `admin` / `user` / `viewer` (por empresa) |
| Status | `users.ativo` |
| Ultimo acesso | `users.updated_at` |
| Criado em | `users.created_at` |

**Acoes por usuario:**
- **Ver detalhes** → Modal ou pagina com:
  - Empresas vinculadas e permissoes em cada uma (`users_empresas.permissoes`)
  - Pedidos de compra criados por este usuario (`pedidos_compra.created_by_user_id`)
  - Status do trial/assinatura
- **Resetar senha** → Gera token de reset e envia email (usa fluxo existente de `forgot-password`)
- **Gerar link magico** → Gera magic link e copia URL (usa fluxo existente de `magic-link`)
- **Ativar/Desativar** → Toggle `users.ativo`

#### 3.2.3 Fornecedores (`/admin/usuarios/fornecedores`)

**Fonte:** tabela `users_fornecedor` + `fornecedores` (join por CNPJ)

| Coluna | Descricao |
|--------|-----------|
| Nome | `users_fornecedor.nome` |
| Email | `users_fornecedor.email` |
| CNPJ | `users_fornecedor.cnpj` |
| Lojistas vinculados | `fornecedores` com mesmo CNPJ → suas `empresas` |
| Pedidos recebidos | Count de `pedidos_compra` enviados a este fornecedor |
| Status | `users_fornecedor.ativo` |

**Acoes por usuario:**
- **Ver detalhes** → Mostra:
  - Todas as empresas (lojistas) que usam este fornecedor
  - Pedidos recebidos de cada lojista
  - Representantes vinculados via `representante_fornecedores`
  - Sugestoes/contra-propostas feitas
- **Resetar senha** → Gera token de reset (precisa adicionar campos `reset_token` e `reset_token_expires_at` a `users_fornecedor`)
- **Gerar codigo de acesso** → Gera link magico para login sem senha (precisa adicionar campos `magic_link_token` e `magic_link_expires_at` a `users_fornecedor`)
- **Ativar/Desativar** → Toggle `users_fornecedor.ativo`

#### 3.2.4 Representantes (`/admin/usuarios/representantes`)

**Fonte:** tabela `users_representante` + `representantes` + `representante_fornecedores`

| Coluna | Descricao |
|--------|-----------|
| Nome | `users_representante.nome` |
| Email | `users_representante.email` |
| Empresas | `representantes.empresa_id` → empresas que ele representa |
| Fornecedores | Via `representante_fornecedores` |
| Codigo de acesso | `representantes.codigo_acesso` |
| Status | `users_representante.ativo` |

**Acoes por usuario:**
- **Ver detalhes** → Mostra:
  - Empresas e fornecedores vinculados
  - Pedidos que passou pelo representante (`pedidos_compra.representante_id`)
  - Conferencias de estoque realizadas
- **Resetar senha**
- **Gerar novo codigo de acesso** → Regenera `representantes.codigo_acesso`
- **Ativar/Desativar**

---

### 3.3 Relacoes Lojista <-> Fornecedor <-> Representante (`/admin/relacoes`)

#### 3.3.1 Visao em Arvore

Pagina que mostra o mapa de relacionamentos:

```
Empresa: Duubpets 1 (id: 6)
├── Fornecedor: Marca X (CNPJ: 12.345.678/0001-00)
│   ├── User Fornecedor: joao@marcax.com.br (ativo)
│   ├── Representante: Carlos Silva (codigo: REP-ABC123)
│   │   └── User: carlos@rep.com.br (ativo)
│   ├── Produtos vinculados: 342
│   └── Pedidos: 15 (3 rascunho, 8 enviados, 4 finalizados)
├── Fornecedor: Marca Y (CNPJ: 98.765.432/0001-00)
│   ├── User Fornecedor: (nao cadastrado)
│   ├── Representante: (nenhum)
│   ├── Produtos vinculados: 89
│   └── Pedidos: 2 (1 rascunho, 1 finalizado)
...
```

**Filtros:**
- Por empresa (dropdown)
- Por fornecedor (busca)
- Por representante (busca)
- Apenas com pedidos ativos
- Apenas com divergencias

#### 3.3.2 Detalhe de Relacao

Ao clicar em um fornecedor dentro de uma empresa:
- Produtos vinculados (`fornecedores_produtos`)
- Historico de pedidos de compra
- Politica de compra (`politica_compra`)
- Tabelas de preco
- Conferencias de estoque

---

### 3.4 Auditoria de Pedidos de Compra (`/admin/pedidos`)

#### 3.4.1 Lista Global de Pedidos

**Fonte:** `pedidos_compra` (SEM filtro de `empresa_id` — ve TUDO)

| Coluna | Descricao |
|--------|-----------|
| Numero | `pedidos_compra.numero` |
| Empresa | `empresas.nome_fantasia` |
| Fornecedor | `fornecedores.nome` |
| Representante | `representantes.nome` (se houver) |
| Data | `pedidos_compra.data` |
| Total | `pedidos_compra.total` |
| Status Interno | `status_interno` (badge colorido) |
| Situacao Bling | `situacao` (0/1/2/3) |
| Origem | `origem` (flowb2b / bling) |

**Filtros:**
- Por empresa (dropdown multi-select)
- Por fornecedor
- Por status_interno (multi-select)
- Por data (range)
- Por origem
- Apenas excluidos (`is_excluded = true`)

#### 3.4.2 Detalhe do Pedido com Timeline Auditada (`/admin/pedidos/[id]`)

Pagina que mostra o pedido completo com todo o processo auditado:

**Secao 1: Cabecalho**
- Numero, data, empresa, fornecedor, representante
- Status atual (status_interno + situacao Bling)
- Totais (produtos, desconto, frete, total)

**Secao 2: Itens do Pedido**
- Tabela com: codigo, descricao, quantidade, valor unitario, total
- Se houve sugestao aceita: mostrar valores originais vs. finais (diff)

**Secao 3: Timeline Completa (AUDITORIA)**

Renderizar toda a `pedido_timeline` com visual de timeline vertical:

```
[11/03 09:00] LOJISTA criou o pedido
    └── "Pedido #1234 criado com 15 itens, total R$ 5.430,00"

[11/03 09:05] LOJISTA enviou para fornecedor
    └── "Pedido enviado ao fornecedor Marca X para analise"

[11/03 14:30] FORNECEDOR enviou sugestao
    └── "Sugestao com desconto 5%, prazo 7 dias, bonificacao 2 unidades"
    └── [Expandir] Ver itens da sugestao

[11/03 15:00] LOJISTA enviou contra-proposta
    └── "Contra-proposta: desconto 8%, prazo 5 dias"
    └── [Expandir] Ver itens da contra-proposta

[11/03 16:00] FORNECEDOR aceitou contra-proposta
    └── "Sugestao aceita, pedido movido para Em Andamento"
    └── "Bling sincronizado: situacao = 3"

[12/03 10:00] LOJISTA finalizou pedido
    └── "Pedido finalizado. Bling: situacao = 1 (Atendido)"
```

**Secao 4: Sugestoes e Contra-Propostas**

Tabela comparativa mostrando todas as rodadas de negociacao:

| Rodada | Autor | Tipo | Desconto | Bonificacao | Prazo | Status |
|--------|-------|------|----------|-------------|-------|--------|
| 1 | Fornecedor | Sugestao | 5% | 2 un. | 7 dias | Rejeitada |
| 2 | Lojista | Contra-proposta | 8% | 2 un. | 5 dias | Aceita |

Com detalhamento item a item (expansivel):
- Quantidade original vs. sugerida
- Preco original vs. com desconto
- Bonificacao por item

**Secao 5: Parcelas**
- Tabela de parcelas com datas e valores
- Status de lancamento no Bling

---

### 3.5 Gestao do Bling (`/admin/bling`)

#### 3.5.1 Visao Geral

Lista todas as empresas e seu status de conexao com o Bling:

| Coluna | Descricao |
|--------|-----------|
| Empresa | `empresas.nome_fantasia` |
| Conectado | `empresas.conectadabling` |
| Token Status | `bling_tokens.is_revoke` + `expires_at` |
| Expira em | `bling_tokens.expires_at` (highlight se < 24h) |
| Ultimo sync | `bling_tokens.updated_at` |
| Sync Status | `empresas.sync_status` |
| Acoes | [Revogar] [Ver detalhes] |

**Indicadores visuais:**
- Verde: conectado, token valido
- Amarelo: token expirando em < 24h
- Vermelho: token expirado ou revogado (`is_revoke = true`)
- Cinza: nao conectado ao Bling

#### 3.5.2 Detalhe por Empresa (`/admin/bling/[empresaId]`)

**Informacoes do Token:**
- `access_token` (mascarado, ex: `eyJ...***...P2U`)
- `refresh_token` (mascarado)
- `expires_at` (data/hora)
- `is_revoke` (boolean)
- `updated_at` (ultimo refresh)

**Acoes Privilegiadas:**

1. **Revogar Token** (botao vermelho)
   - Executa: `UPDATE bling_tokens SET is_revoke = true WHERE empresa_id = ?`
   - Efeito: na proxima vez que o lojista acessar o sistema, o `BlingRevokeModal` vai aparecer bloqueando a navegacao e pedindo para reautenticar
   - Confirmacao: modal de confirmacao "Tem certeza? O usuario sera forcado a reautenticar no Bling."

2. **Forcar Re-sync**
   - Dispara `POST /api/cron/sync-estoque?secret=...&empresa_id=X` apenas para esta empresa
   - Exibe resultado em tempo real

3. **Ver Historico de Syncs**
   - Consultar `cron.job_run_details` para jobs relacionados a esta empresa

#### 3.5.3 Comportamento do Modal de Reautenticacao

O componente `BlingRevokeModal` (`src/components/bling/BlingRevokeModal.tsx`) ja existe e:
- Eh renderizado no `DashboardLayout` via `createPortal`
- Bloqueia TODA a navegacao (z-index: 100, backdrop escuro)
- Nao tem botao de fechar (nao eh dismissivel)
- Mostra botao "Reautorizar Bling" que redireciona para `/api/auth/bling/connect?revoke=true`
- Apos reautenticacao, `is_revoke` volta a `false` e o modal some

**Para o Super Admin:** quando ele setar `is_revoke = true`, o lojista vera este modal na proxima vez que abrir o sistema. O admin pode usar isso para:
- Forcar atualizacao de permissoes OAuth
- Resolver problemas de token corrompido
- Migrar integracoes

---

## 4. APIs do Super Admin

### 4.1 Estrutura de Rotas

```
src/app/api/admin/
├── dashboard/
│   └── route.ts                    # GET - Metricas globais
├── usuarios/
│   ├── lojistas/
│   │   ├── route.ts               # GET - Listar lojistas
│   │   └── [id]/
│   │       ├── route.ts           # GET - Detalhe do lojista
│   │       ├── reset-senha/route.ts    # POST - Resetar senha
│   │       ├── magic-link/route.ts     # POST - Gerar magic link
│   │       └── toggle-ativo/route.ts   # POST - Ativar/desativar
│   ├── fornecedores/
│   │   ├── route.ts               # GET - Listar fornecedores
│   │   └── [id]/
│   │       ├── route.ts           # GET - Detalhe do fornecedor
│   │       ├── reset-senha/route.ts
│   │       ├── magic-link/route.ts     # POST - Gerar link magico
│   │       └── toggle-ativo/route.ts
│   └── representantes/
│       ├── route.ts               # GET - Listar representantes
│       └── [id]/
│           ├── route.ts           # GET - Detalhe
│           ├── reset-senha/route.ts
│           ├── novo-codigo/route.ts    # POST - Regenerar codigo_acesso
│           └── toggle-ativo/route.ts
├── empresas/
│   ├── route.ts                   # GET - Listar todas as empresas
│   └── [id]/
│       ├── route.ts               # GET - Detalhe da empresa
│       └── usuarios/route.ts     # GET - Usuarios vinculados
├── pedidos/
│   ├── route.ts                   # GET - Listar todos os pedidos (paginado)
│   └── [id]/
│       ├── route.ts               # GET - Detalhe completo + timeline
│       └── sugestoes/route.ts    # GET - Sugestoes/contra-propostas
├── bling/
│   ├── route.ts                   # GET - Status de todas as conexoes
│   └── [empresaId]/
│       ├── route.ts               # GET - Detalhe do token
│       ├── revogar/route.ts       # POST - Setar is_revoke = true
│       └── sync/route.ts          # POST - Forcar re-sync
└── relacoes/
    └── route.ts                   # GET - Mapa de relacoes (filtrado)
```

### 4.2 Middleware de Protecao

Todas as rotas `/api/admin/*` devem verificar:

```typescript
// Em cada route handler do admin
const headers = request.headers
const userTipo = headers.get('x-user-tipo')

if (userTipo !== 'superadmin') {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
}
```

Ou criar um helper reutilizavel:

```typescript
// src/lib/admin-auth.ts
export function requireSuperAdmin(request: NextRequest): boolean {
  return request.headers.get('x-user-tipo') === 'superadmin'
}
```

### 4.3 Queries sem empresa_id

**IMPORTANTE:** O super admin eh a UNICA excecao a regra de filtrar por `empresa_id`. Todas as queries do admin buscam dados de TODAS as empresas. Usar `createServerSupabaseClient()` (service role) para bypassar RLS.

---

## 5. Componentes Reutilizaveis

### 5.1 Existentes (reaproveitar)

| Componente | Localizacao | Uso no Admin |
|------------|-------------|-------------|
| `BlingRevokeModal` | `src/components/bling/BlingRevokeModal.tsx` | Referencia — o admin seta `is_revoke`, o modal aparece pro lojista |
| `BlingConnectionCard` | `src/components/bling/BlingConnectionCard.tsx` | Base para card de status Bling |
| `BlingConnectModal` | `src/components/bling/BlingConnectModal.tsx` | Referencia para entender fluxo |
| `PageHeader` | `src/components/layout/PageHeader.tsx` | Usar em todas as paginas admin |
| `Badge`, `Button`, `Input`, `Modal` | `src/components/ui/` | Componentes UI base |

### 5.2 Novos (criar)

| Componente | Descricao |
|------------|-----------|
| `AdminLayout` | Layout com sidebar e header do admin |
| `AdminSidebar` | Navegacao lateral do admin |
| `UserDetailModal` | Modal com detalhes do usuario (qualquer tipo) |
| `PedidoTimeline` | Visualizacao da timeline auditada do pedido |
| `RelacaoTree` | Arvore visual lojista → fornecedor → representante |
| `BlingStatusBadge` | Badge com status do Bling (verde/amarelo/vermelho) |
| `AdminSearchBar` | Busca global (usuarios, empresas, pedidos) |
| `ConfirmRevokeModal` | Confirmacao antes de revogar token Bling |

---

## 6. Migracao de Banco de Dados

### 6.1 Alteracoes Necessarias

```sql
-- 1. Permitir role 'superadmin' na tabela users
-- (Nao precisa de ALTER TABLE se role eh varchar — basta inserir com 'superadmin')

-- 2. Adicionar campos de reset/magic-link a users_fornecedor
ALTER TABLE users_fornecedor
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS magic_link_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS magic_link_expires_at TIMESTAMP;

-- 3. Adicionar campos de reset a users_representante
ALTER TABLE users_representante
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS magic_link_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS magic_link_expires_at TIMESTAMP;

-- 4. Criar usuario super admin
INSERT INTO users (email, password_hash, nome, role, ativo, tipo)
VALUES ('admin@flowb2b.com.br', '$2b$12$HASH_AQUI', 'FlowB2B Admin', 'superadmin', true, 'superadmin');
-- Nota: tipo eh um campo novo ou usar role para ambos
```

### 6.2 Verificacoes

- `users.role` aceita 'superadmin'? Se eh `VARCHAR`, sim. Se eh `ENUM`, precisa de `ALTER TYPE`.
- Campo `tipo` no JWT — precisa verificar se o middleware aceita `'superadmin'` ou se precisa adicionar.

---

## 7. Fluxos Detalhados

### 7.1 Resetar Senha de um Usuario

```
Admin clica "Resetar Senha" no usuario
  → POST /api/admin/usuarios/[tipo]/[id]/reset-senha
  → Backend gera reset_token (crypto.randomUUID x2)
  → Salva token + expiracao (1 hora) na tabela do usuario
  → Envia email com link /reset-password?token=xxx
  → Retorna { success: true, message: 'Email enviado' }
```

### 7.2 Gerar Link Magico para Fornecedor

```
Admin clica "Gerar Link de Acesso" no fornecedor
  → POST /api/admin/usuarios/fornecedores/[id]/magic-link
  → Backend gera magic_link_token (crypto.randomUUID x2)
  → Salva token + expiracao (15 min) em users_fornecedor
  → Retorna { success: true, url: '/api/auth/fornecedor/verify-magic-link?token=xxx' }
  → Admin pode:
    a) Copiar link e enviar manualmente (WhatsApp, email)
    b) Enviar email automaticamente (como faz hoje para lojista)
```

**Nota:** Hoje o magic link so existe para lojistas. Sera necessario criar:
- `POST /api/auth/fornecedor/magic-link` (gera token)
- `GET /api/auth/fornecedor/verify-magic-link` (valida e loga)

### 7.3 Revogar Token Bling

```
Admin clica "Revogar Token" na empresa
  → Modal de confirmacao: "O usuario sera forcado a reautenticar. Continuar?"
  → POST /api/admin/bling/[empresaId]/revogar
  → UPDATE bling_tokens SET is_revoke = true WHERE empresa_id = ?
  → Retorna { success: true }

Proximo acesso do lojista:
  → DashboardLayout checa /api/auth/bling/status
  → Retorna isRevoked = true
  → BlingRevokeModal aparece (BLOQUEANTE)
  → Lojista clica "Reautorizar Bling"
  → Redirecionado para Bling OAuth
  → Callback seta is_revoke = false
  → Modal desaparece, sync reinicia
```

---

## 8. Prioridade de Implementacao

### Fase 1 — MVP (Essencial)

1. **Autenticacao superadmin** (middleware + JWT)
2. **Layout e navegacao** (AdminLayout, sidebar)
3. **Dashboard** (metricas basicas)
4. **Lista de usuarios** (3 tipos com busca/filtro)
5. **Gestao do Bling** (lista de empresas + revogar token)

### Fase 2 — Auditoria

6. **Detalhe do usuario** (o que esta fazendo no sistema)
7. **Lista global de pedidos** (com filtros)
8. **Timeline auditada do pedido** (negociacao completa)
9. **Resetar senha** (3 tipos de usuario)

### Fase 3 — Avancado

10. **Mapa de relacoes** (arvore lojista-fornecedor-representante)
11. **Magic link para fornecedor** (novo fluxo)
12. **Forcar re-sync** (estoque, produtos)
13. **Busca global** (cross-entity search)

---

## 9. Referencia de Codigo Existente

### Arquivos-chave para consulta durante implementacao

| Area | Arquivo | O que tem |
|------|---------|-----------|
| Auth JWT | `src/lib/auth.ts` | `signJWT()`, `verifyJWT()` |
| Middleware | `src/middleware.ts` | Routing por tipo de usuario, headers |
| Auth Context | `src/contexts/AuthContext.tsx` | `useAuth()`, `switchEmpresa()` |
| Login API | `src/app/api/auth/login/route.ts` | Fluxo de login + JWT |
| Magic Link | `src/app/api/auth/magic-link/route.ts` | Geracao de magic link (lojista) |
| Verify Magic | `src/app/api/auth/verify-magic-link/route.ts` | Validacao + auto-login |
| Reset Senha | `src/app/api/auth/forgot-password/route.ts` | Geracao de token reset |
| Bling OAuth | `src/app/api/auth/bling/connect/route.ts` | Inicio do OAuth |
| Bling Callback | `src/app/api/auth/bling/callback/route.ts` | Token exchange + storage |
| Bling Status | `src/app/api/auth/bling/status/route.ts` | Check token valido/revogado |
| Bling Revoke Modal | `src/components/bling/BlingRevokeModal.tsx` | Modal bloqueante de reauth |
| Dashboard Layout | `src/components/layout/DashboardLayout.tsx` | Onde o BlingRevokeModal eh montado |
| Sidebar | `src/components/layout/Sidebar.tsx` | Navegacao lateral do lojista |
| Permissoes | `src/lib/permissions.ts` | `requirePermission()`, roles |
| Permissoes tipos | `src/types/permissions.ts` | Interface de permissoes |
| Pedido Timeline | `pedido_timeline` (tabela) | Eventos auditados do pedido |
| Sugestoes | `sugestoes_fornecedor` + `sugestoes_fornecedor_itens` (tabelas) | Negociacao |
| Fornecedor Auth | `src/app/api/auth/fornecedor/login/route.ts` | Login do fornecedor |
| Representante Auth | `src/app/api/auth/representante/registro/route.ts` | Registro com codigo |
| Conferencia | `conferencias_estoque` + `itens_conferencia_estoque` (tabelas) | Bipagem |
| Cron Estoque | `src/app/api/cron/sync-estoque/route.ts` | Sync automatico |
| Bling Fetch | `src/lib/bling-fetch.ts` | Retry com rate limit |

### Tabelas relevantes

| Tabela | Descricao |
|--------|-----------|
| `users` | Usuarios lojistas (+ superadmin) |
| `users_empresas` | Vinculo usuario-empresa com permissoes |
| `users_fornecedor` | Usuarios do portal fornecedor |
| `users_representante` | Usuarios do portal representante |
| `representantes` | Entidade representante (com codigo_acesso) |
| `representante_fornecedores` | N:N representante-fornecedor |
| `empresas` | Empresas (multi-tenant) |
| `bling_tokens` | Tokens OAuth do Bling por empresa |
| `pedidos_compra` | Pedidos de compra |
| `itens_pedido_compra` | Itens dos pedidos |
| `sugestoes_fornecedor` | Sugestoes/contra-propostas |
| `sugestoes_fornecedor_itens` | Itens das sugestoes |
| `pedido_timeline` | Audit trail dos pedidos |
| `conferencias_estoque` | Conferencias de estoque |
| `fornecedores` | Cadastro de fornecedores |
| `fornecedores_produtos` | Vinculo fornecedor-produto com precos |
| `politica_compra` | Politicas comerciais |
