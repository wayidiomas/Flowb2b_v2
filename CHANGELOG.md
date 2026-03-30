# FlowB2B - Changelog Semanal

---

## Semana 1 — 13/02 a 20/02/2026

### FEATURES

**1. Modulo Compras por Curva ABC** — 15/02 | FlowB2B_Client
- Pagina `/compras/curva` com visao geral de fornecedores classificados por curva ABC (faturamento e quantidade)
- Pagina `/compras/curva/[fornecedorId]` com detalhes por fornecedor
- Calculo de cobertura de estoque com niveis de urgencia (CRITICA / ALTA / MEDIA / OK)
- Modal de sugestao de compra com filtros e calculo automatico integrado com API de calculo de pedidos
- Modal de aviso para fornecedores com pedido em aberto (ultimos 30 dias)
- Desconto automatico de quantidades ja pedidas na sugestao
- Verificacao de pedido em aberto integrada na pagina gerar-automatico
- 9 componentes novos: `FornecedorCurvaTable`, `ProdutosCurvaTable`, `SugestaoModal`, `PedidoEmAbertoModal`, `AlertasUrgenciaPanel`, `CoberturaBar`, `CurvaBadge`, `CurvaToggle`, `RupturaIndicator`
- 5 APIs novas: `visao-geral`, `fornecedor/[id]`, `sugestao`, `pedido-aberto-itens`, `alertas`

**2. Modulo de Representantes** — 15/02 | FlowB2B_Client
- Autenticacao completa de representantes (login, registro, sessao)
- Dashboard do representante com metricas
- Listagem e detalhes de pedidos para representantes
- Fluxo de contra-proposta e negociacao de pedidos
- CRUD de representantes no admin
- Vinculo representante-fornecedor (N:N)
- Envio de pedido para fornecedor ou representante com modal de selecao de destinatario
- Convite de representante via modal
- Pagina publica de pedido com suporte a representantes
- Componentes: `RepresentanteAuthLayout`, `RepresentanteConviteModal`, `RepresentanteSelectModal`, `TipoDestinatarioModal`, `PageLoader`, `Tooltip`
- 11 APIs novas: auth (login/registro/me), dashboard, pedidos, CRUD representantes, vinculos fornecedor

**3. WhatsApp Inteligente para Representantes** — 18/02 | FlowB2B_Client
- Botao WhatsApp na pagina de representantes com modal para cadastrar telefone na hora se nao existir
- Na pagina de pedidos de compra: verifica se fornecedor tem representante vinculado e envia para ele
- Mensagem personalizada com codigo de acesso (primeiro login) ou mensagem normal (ja cadastrado)
- Tooltip dinamico indicando destino da mensagem

**4. Deteccao de Anomalias no Calculo de Pedidos** — 16/02 | validacao_ean
- Deteccao de anomalias no calculo automatico de pedidos de compra
- Funcao `fetch_penultimo_pedido` para buscar dados do penultimo pedido de compra
- Se a media atual estiver muito acima da media esperada (fator > 3x), corrige automaticamente
- Validacao de intervalo entre 7 e 180 dias para evitar dados invalidos
- Warnings quando anomalias sao detectadas e corrigidas
- Resolve problema de sugestoes inflacionadas quando a data da ultima compra e recente (periodo curto gerando media distorcida)

---

### FIXES

**5. Numeracao de Pedido de Compra (Bling)** — 20/02 | FlowB2B_Client
- Empresas com numeracao manual (ex: Duubpets 2) travavam ao gerar pedido automatico
- Causa: sistema usava banco local para calcular proximo numero, que ficava dessincronizado do Bling
- Correcao: agora consulta a API do Bling para obter o numero real do ultimo pedido, com fallback para o banco local

**6. ID do Fornecedor para API Bling** — 16/02 | FlowB2B_Client
- Corrigido de `id_bling` para `id_contato_bling` no pedido de compra (Bling API espera ID do contato, nao do cadastro)
- Simplificacao de conversao de tipos nas APIs do modulo representante

**7. Tipos TypeScript no Modulo Representante** — 16/02 | FlowB2B_Client
- Supabase pode retornar relacoes como array ou objeto, causando erro de tipo em runtime
- Adicionada verificacao `Array.isArray` antes de fazer cast nos endpoints de representante

---

### REFACTOR

**8. Fator de Deteccao de Anomalia** — 16/02 | validacao_ean
- Ajuste do fator de deteccao de 2.5x para 3.0x baseado em analise de dados reais
- 91% dos casos problematicos tem fator > 3x — fator 3.0x evita falsos positivos sem perder os casos reais

---

### DOCS / CHORE

**9. QA Modulo Representante** — 16/02 | FlowB2B_Client
- 18 cenarios de teste E2E cobrindo autenticacao, pedidos e admin

**10. Gitignore** — 16/02 | FlowB2B_Client
- Arquivos temporarios adicionados ao `.gitignore`

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 8 |
| validacao_ean | 2 |
| flowB2BAPI | 0 |
| **Total** | **10** |

| Tipo | Qtd |
|------|-----|
| feat | 4 |
| fix | 3 |
| refactor | 1 |
| docs | 1 |
| chore | 1 |

---

## Semana 2 — 20/02 a 26/02/2026

### FEATURES

**1. Conferencia de Estoque do Fornecedor** — 25/02 | FlowB2B_Client
- Fluxo completo de conferencia de estoque: fornecedor bipa produtos na loja, compara com estoque do sistema, envia sugestao ao lojista
- Tela de bipagem mobile-first com leitor de codigo de barras (EAN/GTIN/codigo), auto-focus, deteccao de duplicados com modal de confirmacao
- Comparacao estoque conferido vs. estoque do sistema com destaque visual de divergencias
- Lojista recebe sugestoes, pode aceitar total, aceitar parcialmente (item a item) ou rejeitar
- Atualizacao automatica do `produtos.estoque_atual` no Supabase ao aceitar
- Novo componente `LojistaSelectorDropdown` para fornecedor selecionar lojista (persiste no localStorage)
- Novos tipos: `ConferenciaEstoque`, `ItemConferenciaEstoque`, `TabelaPreco`, `ItemTabelaPreco`
- 13 APIs novas (7 fornecedor, 5 lojista, 1 shared)
- 10 paginas novas: `/fornecedor/estoque`, `/fornecedor/notas`, `/fornecedor/conferencia-estoque`, `/fornecedor/conferencia-estoque/nova`, `/fornecedor/tabelas-preco`, `/fornecedor/tabelas-preco/nova`, `/estoque/sugestoes`, `/estoque/sugestoes/[id]`, `/compras/tabelas-preco`

**2. Conferencia de Estoque do Representante** — 25/02 | FlowB2B_Client
- Modulo de conferencia de estoque espelhado para o portal do representante
- Validacao de acesso via cadeia representante → fornecedor → lojista
- Modal de nova conferencia: seleciona lojista primeiro, depois fornecedor (representante vai fisicamente a loja)
- Auto-selecao quando ha apenas 1 opcao (pula etapa desnecessaria)
- 4 APIs novas, 3 paginas novas: `/representante/conferencia-estoque`, `nova`, `[id]`

**3. Sincronizacao de Estoque com Bling** — 25/02 | FlowB2B_Client
- Ao aceitar conferencia de estoque, o sistema sincroniza os valores com o Bling via API v3
- Nova lib `src/lib/bling-estoque.ts` com operacao tipo "B" (Balanco) para setar estoque absoluto
- Rate limiting com delay de 350ms entre requisicoes do Bling
- Sincronizacao best-effort: falha no Bling nao bloqueia o aceite no Supabase

**4. Campo Origem em Pedidos de Compra** — 25/02 | FlowB2B_Client
- Pedidos criados pelo FlowB2B agora marcados com `origem: 'flowb2b'`
- Toggle "Apenas pedidos FlowB2B" nos portais do fornecedor e representante (ativado por padrao)
- Filtra pedidos antigos sincronizados do Bling que poluiam a listagem

**5. Responsividade Mobile-First** — 25/02 | FlowB2B_Client
- **Portal Fornecedor:** `FornecedorLayout` redesenhado com barra de tabs fixa no rodape (Inicio, Pedidos, Estoque, Notas) + menu "Mais" com Conferencia, Tabelas e Representantes. Todas as tabelas convertidas para cards no mobile (Dashboard, Pedidos, Estoque, Notas, Conferencia, Tabelas). Safe-area padding para iOS.
- **Portal Representante:** `RepresentanteLayout` com barra de tabs fixa (Inicio, Pedidos, Conferencia). Pedidos com cards agrupados por fornecedor. Detalhe do pedido e conferencias convertidos para cards touch-friendly.

---

### FIXES

**6. Seguranca do Modulo Representante** — 25/02 | FlowB2B_Client
- Prevencao de open redirect no login (valida que redirect comeca com `/representante/`)
- Removido vazamento de telefone no endpoint publico de convite
- Removido auto-link inseguro por telefone (representante → user)
- Guard `.is('user_representante_id', null)` para prevenir race condition no registro
- Validacao de input hardened: nome minimo 2 chars, `fornecedor_ids` deve ser array de numeros

**7. Filtros de Pedido de Compra do Lojista** — 25/02 | FlowB2B_Client
- Substituidas RPCs por query direta no Supabase com joins inline
- Corrigido mapeamento de situacao "Rascunho" (agora inclui 0, 5 e null)
- Filtro de workflow (tab) movido para server-side (antes era client-side pos-paginacao, causando paginas vazias)
- Corrigida busca em coluna bigint (`numero`) que nao suportava `ilike`

**8. WhatsApp para Representante** — 25/02 | FlowB2B_Client
- Corrigido check de variavel errada (`fornecedorCadastrado` → `representanteCadastrado`) que impedia abertura do WhatsApp apos envio de pedido

**9. Deteccao de Duplicado na Bipagem** — 25/02 | FlowB2B_Client
- Resposta HTTP 200 com `{ duplicado: true }` era ignorada por estar dentro do bloco `if (!res.ok)`
- Check de duplicado movido para antes da verificacao de status HTTP

**10. Agrupamento de Fornecedores por CNPJ** — 25/02 | FlowB2B_Client
- No painel do representante, mesmo fornecedor (mesmo CNPJ) aparecia duplicado em empresas distintas
- Agrupamento por CNPJ com contagem de lojas e sub-opcoes no filtro de pedidos

---

### UI/UX

**11. Tema Auth do Representante** — 25/02 | FlowB2B_Client
- Telas de login, registro e convite alteradas de roxo/violeta para laranja/amber
- Alinhamento visual com o portal do fornecedor, diferenciando do portal do lojista (azul)

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 13 |
| validacao_ean | 0 |
| flowB2BAPI | 0 |
| **Total** | **13** |

| Tipo | Qtd |
|------|-----|
| feat | 6 |
| fix | 6 |
| ui/ux | 1 |

---

## Semana 3 — 26/02 a 04/03/2026

### FEATURES

**1. Sistema de Permissoes do Lojista** — 27/02 | FlowB2B_Client
- Enforcement do sistema de permissoes em todas as paginas e APIs do portal do lojista
- Paginas protegidas redirecionam ou exibem mensagem de acesso negado conforme permissoes do usuario

**2. Responsividade Mobile do Portal Lojista** — 04/03 | FlowB2B_Client
- Refatoracao completa em 9 etapas para tornar todo o portal do lojista responsivo (mobile-first)
- **Etapa 1:** Navegacao mobile com menu hamburger e sidebar colapsavel
- **Etapa 2:** Dashboard com cards empilhados e graficos adaptados para telas pequenas
- **Etapa 3:** Lista de pedidos de compra com cards em vez de tabela no mobile
- **Etapa 4:** Detalhe e edicao de pedido responsivos com layout empilhado
- **Etapa 5:** Curva ABC responsiva com tabelas convertidas para cards
- **Etapa 6:** Modulo de estoque responsivo
- **Etapa 7:** Cadastros (fornecedores, clientes, produtos) responsivos
- **Etapa 8:** Fiscal, suprimentos e configuracoes responsivos
- **Etapa 9:** Componentes UI base (`Button`, `Input`, `Modal`, `Table`) com variantes responsivas
- Code review final com correcoes de inconsistencias restantes

---

### FIXES

**3. Portal do Representante — Pedidos Nao Apareciam** — 26/02 | FlowB2B_Client
- Pedidos enviados ao representante nao apareciam por filtro de `origem` incorreto
- Botao "Adicionar Representante" nao funcionava na listagem de fornecedores

**4. Filtro Rascunhos com Status Incorretos** — 26/02 | FlowB2B_Client
- Pedidos com status Registrada/Emitida do Bling eram exibidos erroneamente na aba de rascunhos

**5. Bipagem de Conferencia do Representante** — 26/02 | FlowB2B_Client
- Representante so conseguia bipar produtos de um fornecedor; agora permite todos os fornecedores vinculados

**6. Verificacao de Pedidos em Aberto** — 27/02 | FlowB2B_Client
- Pedidos cancelados e recusados eram contabilizados como "em aberto", gerando falsos avisos ao criar novo pedido

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 16 |
| validacao_ean | 0 |
| flowB2BAPI | 0 |
| **Total** | **16** |

| Tipo | Qtd |
|------|-----|
| feat | 8 |
| fix | 6 |
| refactor | 3 |

---

## Semana 4 — 04/03 a 11/03/2026

### FEATURES

**1. Soft Delete de Pedidos de Compra** — 06/03 | FlowB2B_Client
- Pedidos de compra agora usam exclusao logica (`is_excluded`) em vez de DELETE fisico
- Permite recuperar pedidos excluidos por engano e manter historico

**2. Permissoes por Empresa na Edicao de Colaborador** — 06/03 | FlowB2B_Client
- Edicao de colaborador agora respeita permissoes por empresa
- Correcoes no fluxo de colaboradores: telefone, foto de perfil e seguranca no modal de empresa

**3. Sync de Estoque Pre-Pedido Automatico** — 06/03 | FlowB2B_Client
- Antes de calcular pedido automatico, sistema agora sincroniza estoque do Bling para o fornecedor
- Garante que a sugestao de compra usa estoque atualizado, nao dados potencialmente defasados
- Nova funcao `syncEstoqueFornecedor()` em `src/lib/bling-estoque-sync.ts`

**4. Cron de Sync Estoque via Next.js (Nova Arquitetura)** — 10/03 | FlowB2B_Client
- Novo endpoint `/api/cron/sync-estoque` chamado diretamente pelo pg_cron do Supabase
- Elimina cadeia intermediaria: ~~pg_cron → Edge Function → flowb2bapi → Edge Function → Bling~~ → agora pg_cron → Next.js → Bling
- Nova funcao `syncEstoqueEmpresa()` que sincroniza TODOS os produtos de uma empresa (nao apenas por fornecedor)
- Batching de 100 produtos por chamada, delay 400ms entre lotes, retry com backoff exponencial (5 tentativas)
- Resiliente a 429 (rate limit): respeita header `Retry-After`, aborta lotes restantes se esgotou retries
- Endpoint de diagnostico `/api/diagnostico/estoque` para comparacao em tempo real Bling vs Supabase
- pg_cron job 8 atualizado para chamar Next.js a cada hora
- Resultado: 16.772 produtos sincronizados em 3 empresas, 0 erros, 99.94% de precisao

---

### FIXES

**5. Sync de Estoque Bling que Nunca Atualizava** — 09/03 | FlowB2B_Client
- **Root cause:** Empresas 2 e 5 tinham `sync_status = 'error'` na tabela `empresas`, e a Edge Function `cron-inventory-sync` filtrava por `sync_status = 'completed'` — resultado: 2 de 3 empresas ignoradas pela cron
- Correcao: `sync_status` corrigido para `'completed'` e limpeza de 4.882 registros legados na tabela `cron_jobs`

**6. Resiliencia ao Rate Limit do Bling (429)** — 06/03 | FlowB2B_Client
- Nova lib `src/lib/bling-fetch.ts` com `blingFetch()`: wrapper de fetch com retry exponencial, jitter ±20%, suporte ao header `Retry-After`
- Classe `BlingRateLimitError` para tratamento especifico quando todos os retries se esgotam
- Retries em 429 (rate limit) e 5xx (server error), abort inteligente para nao desperdicar requisicoes

**7. Middleware Auth Bloqueando Cron** — 10/03 | FlowB2B_Client
- Rotas `/api/cron/` e `/api/diagnostico/` eram interceptadas pelo middleware de autenticacao e redirecionadas para `/login`
- Adicionadas como rotas publicas (usam autenticacao propria via `CRON_SECRET`)

**8. Paginacao do Diagnostico de Estoque** — 10/03 | FlowB2B_Client
- Endpoint de diagnostico so checava 1.000 produtos (limite padrao do Supabase)
- Corrigido para paginar e checar todos os produtos da empresa

**9. ESLint Warnings na Listagem de Pedidos** — 06/03 | FlowB2B_Client
- Correcao de warnings de lint na pagina de listagem de pedidos de compra

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 10 |
| validacao_ean | 0 |
| flowB2BAPI | 0 |
| **Total** | **10** |

| Tipo | Qtd |
|------|-----|
| feat | 4 |
| fix | 5 |
| refactor | 0 |
| chore | 1 |

---

## Semana 5 — 11/03 a 18/03/2026

### FEATURES

**1. Modulo Super Admin** — 11/03 | FlowB2B_Client
- Novo tipo de usuario `superadmin` com acesso a toda a plataforma
- 28 arquivos criados (10 paginas, 13 APIs, 5 infra)
- **Dashboard:** metricas globais (empresas, usuarios, pedidos, alertas Bling)
- **Gestao de Usuarios:** 3 abas (lojistas, fornecedores, representantes) com busca, paginacao, reset senha, ativar/desativar
- **Auditoria de Pedidos:** lista global de pedidos sem filtro de empresa, timeline visual completa com todas as rodadas de negociacao (sugestao, contra-proposta, aceite)
- **Gestao do Bling:** status de todas as conexoes, revogar token (dispara BlingRevokeModal bloqueante pro lojista), forcar re-sync de estoque
- **Mapa de Relacoes:** arvore visual lojista → fornecedor → representante com contagem de produtos e pedidos
- **Empresas:** lista e detalhe com usuarios vinculados, fornecedores, status Bling
- Layout dedicado com sidebar escura (gray-900) e acentos em vermelho (red-600)
- Middleware protege `/admin/*` e `/api/admin/*` — apenas superadmin acessa
- Login via tela padrao `/login` com deteccao automatica de tipo

**Credenciais Super Admin:**
- Email: `superadmin@flowb2b.com`
- Senha: `DuubPets@00112233`
- ID: `bf201f0f-a8c9-49d0-adc0-48adcabf733b`

**2. Tracking de Atividade de Usuarios** — 11/03 | FlowB2B_Client
- Tabela `user_activity_log` no Supabase com indexes em `created_at`, `user_id`, `action`, `user_type`
- Coluna `last_login_at` adicionada em `users`, `users_fornecedor`, `users_representante`
- Utilitario `logActivity()` fire-and-forget (nunca bloqueia o fluxo principal)
- **Login** instrumentado nos 3 tipos de usuario (lojista/superadmin, fornecedor, representante)
- **Logout** instrumentado com captura de dados antes de remover cookie
- **Registro** instrumentado nos 3 endpoints de cadastro
- **Acoes do lojista:** `pedido_criado`, `pedido_enviado`, `sugestao_aceita`, `sugestao_rejeitada`, `contra_proposta_enviada`
- **Acoes do fornecedor:** `sugestao_enviada`, `sugestao_aceita`/`rejeitada` (resposta a contra-proposta)
- **Acoes do representante:** `sugestao_enviada`, `sugestao_aceita`/`rejeitada` (resposta a contra-proposta)
- `empresa_id` armazenado como campo top-level para filtragem multi-tenant
- Dashboard admin exibe: usuarios ativos (24h/7d/30d), logins recentes, feed de atividades, novos cadastros

**3. Paginas de Detalhe de Usuarios no Admin** — 11/03 | FlowB2B_Client
- Detalhe de lojista: empresa vinculada, pedidos, colaboradores, stats
- Detalhe de fornecedor: empresas atendidas, pedidos, total movimentado
- Detalhe de representante: fornecedores vinculados, pedidos, empresas atendidas
- APIs otimizadas com queries paralelas via `Promise.all`

**4. Negociacoes no Admin** — 11/03 | FlowB2B_Client
- Pagina dedicada `/admin/negociacoes/[id]` com timeline visual rica e barra de progresso
- Comparativo lado-a-lado: quantidade original vs sugerida, desconto, bonificacao
- Comparativo de condicoes comerciais entre rodadas de negociacao
- Secao de comparativo adicionada tambem em `/admin/pedidos/[id]`

---

### FIXES

**5. Mismatch de Campos na API de Activity do Dashboard** — 11/03 | FlowB2B_Client
- Frontend usava nomes errados (`user_name`, `new_registrations`, `logged_at`) que nao batiam com a API (`user_nome`, `registrations_recent`, `created_at`)
- Toda a secao de atividade do dashboard estava quebrada/vazia
- Corrigidas interfaces TypeScript e JSX para alinhar com resposta real da API

**6. Queries de Active Users Truncadas em 1000 Rows** — 11/03 | FlowB2B_Client
- Supabase retorna no maximo 1000 rows por padrao; queries de usuarios ativos (24h/7d/30d) nao tinham `.limit()`
- Contagens ficavam silenciosamente erradas quando havia mais de 1000 logins no periodo
- Adicionado `.limit(10000)` nas 3 queries

**7. Bugs na Tabela de Comparativo de Negociacao** — 11/03 | FlowB2B_Client
- Cor do ternario sempre amber em ambos os branches (aumento e diminuicao) → verde para aumento, vermelho para diminuicao
- Coluna "Final" mostrava quantidade original em vez da quantidade da sugestao aceita
- Footer de totais nao aplicava `desconto_geral` do fornecedor
- Badge de status `enviado_fornecedor` era amber em pedidos mas azul em negociacoes → padronizado para azul

**8. Error Handlers Silenciosos nos Endpoints Lojista** — 11/03 | FlowB2B_Client
- `.catch(() => {})` em 7 locais silenciava erros do activity log
- Trocado por `.catch(console.error)` para manter visibilidade

**9. getCurrentUser() Nao Retornava Nome** — 11/03 | FlowB2B_Client
- Funcao sempre retornava `nome: ''`, fazendo logs de atividade perderem o nome do usuario
- Agora busca `nome` do banco na tabela correta por tipo (users/users_fornecedor/users_representante)
- Query leve (apenas coluna `nome`, `.single()`) com fallback para `''`

**10. userId Sem String() no Login Lojista** — 11/03 | FlowB2B_Client
- `logActivity` esperava `userId: string` mas login do lojista passava `user.id` sem conversao
- Fornecedor e representante ja usavam `String(user.id)` — padronizado

**5. Botao Recolher Envio** — 19/03 | FlowB2B_Client
- Lojista pode recolher pedido enviado ao fornecedor, voltando para rascunho
- Pedido desaparece do portal fornecedor/representante (filtro != 'rascunho')
- Botao principal com estilo secondary (laranja) nos estados enviado/sugestao/contra-proposta
- Timeline registra "Envio recolhido pelo lojista"

**6. Troca e Adicao de Produtos na Sugestao** — 19/03 | FlowB2B_Client
- Fornecedor e representante podem trocar itens do pedido por outros do catalogo
- Podem adicionar produtos novos que nao estavam no pedido original
- Modal de busca premium (ProductSearchModal) com deduplicacao por EAN > SKU > nome
- Badge "Novo para este cliente" quando produto nao existe na empresa do lojista
- Resolucao automatica: EAN > SKU fornecedor > criar produto no Bling (cenarios A/B/C)
- Lojista tambem pode adicionar produtos ao pedido via catalogo do fornecedor
- Colunas separadas: Preco Original (read-only) e Preco Sugerido (editavel) com delta %
- Subtotal mostra custo efetivo por unidade quando ha bonificacao
- Subtotal Original agrupado com dados do pedido, Subtotal Sugerido no final

**7. Edicao de Preco pelo Fornecedor com Sync Bling** — 19/03 | FlowB2B_Client
- Fornecedor edita preco no catalogo ou na sugestao do pedido
- Sync automatico em fornecedores_produtos de todas as empresas (por EAN)
- Sync Bling multi-empresa com retry 429 e delay 400ms entre empresas
- InlinePriceEditor no catalogo com spinner de sync e toast de resultado
- Toggle "Sincronizar precos com Bling" no catalogo

**8. Espelho do Pedido** — 19/03 | FlowB2B_Client
- Fornecedor/representante anexa PDF/imagem do espelho de confirmacao + prazo de entrega
- Upload via Supabase Storage (bucket espelhos-pedido, max 10MB, PDF/JPG/PNG)
- Lojista visualiza (signed URL 1h), aprova ou rejeita o espelho
- Se rejeitado, fornecedor pode re-enviar novo espelho
- Timeline: espelho_enviado, aprovado, rejeitado

**9. StatusActionCard Premium** — 19/03 | FlowB2B_Client
- Redesign completo com visual premium: gradients, sombras, rounded-2xl
- ShimmerButton com animacao de onda nos CTAs principais
- Estado "Enviado" muda para paleta secondary (laranja) diferenciando do rascunho (azul)
- Cada estado tem icone gradient, borda e fundo unicos

---

### FIXES

**10. Sync Estoque Bling na Conferencia** — 19/03 | FlowB2B_Client
- Bug critico: conferencia de estoque aceita nao sincronizava com Bling
- Causa 1: deposito id: 0 invalido no Bling v3 (exige ID real do deposito)
- Causa 2: getBlingToken nao renovava token expirado (retornava null silenciosamente)
- Fix: busca deposito padrao via GET /depositos (cacheado em memoria) + auto-refresh de token
- Testado: produto AVERT OGRAX-3 atualizado de 0 para 2 no Bling com sucesso

**11. Catalogo do Fornecedor Deduplicado** — 19/03 | FlowB2B_Client
- Mesmo produto aparecia 3x no catalogo (1 por empresa atendida)
- Fix: deduplicacao por codigo/nome na API, paginacao apos dedup

**12. Criacao Cross-Empresa de Produtos** — 19/03 | FlowB2B_Client
- Quando fornecedor sugere produto que nao existe na empresa do lojista:
  - Cenario A: existe na empresa → vincula ao fornecedor
  - Cenario B: existe em outra empresa → copia dados, cria no Bling, vincula
  - Cenario C: nao existe em lugar nenhum → cria do zero no Bling, vincula
- Fix campo codigo NOT NULL que impedia cenario C

**13. Preco Sugerido Atualiza Base do Fornecedor** — 19/03 | FlowB2B_Client
- Quando lojista aceita sugestao com preco diferente, atualiza fornecedores_produtos em todas as empresas

**14. Catalogo Vazio ao Criar** — 19/03 | FlowB2B_Client
- POST do catalogo retornava 409 quando ja existia (mesmo vazio)
- Fix: popula itens se catalogo existe mas esta vazio

**15. Auto-Cadastro de Representante via CNPJ** — 23/03 | FlowB2B_Client
- Representante pode se cadastrar informando CNPJ de um fornecedor que representa
- Validacao de CNPJ em tempo real mostra nome do fornecedor (badge verde)
- Dashboard: botao "Adicionar Fornecedor" para vincular mais CNPJs apos cadastro
- Login: link "Cadastre-se" substitui texto de convite
- Compativel com fluxo antigo (codigo de convite)

---

### FIXES (continuacao)

**16. Representante Agora Usa sugestoes_fornecedor** — 20/03 | FlowB2B_Client
- Bug critico: representante inseria sugestoes em tabela errada (sugestoes_pedido_compra) que ninguem lia
- Refatorado para usar sugestoes_fornecedor + sugestoes_fornecedor_itens (mesma do fornecedor)
- Sugestoes do representante agora chegam ao lojista no fluxo de aceite
- Timeline unificada em pedido_timeline
- Contra-proposta do lojista agora aceita autor_tipo 'representante'
- Join !inner removido para nao excluir sugestoes sem fornecedor_user_id

**17. API Representante Sugestao — Mismatch de Payload** — 20/03 | FlowB2B_Client
- Frontend enviava { itens, observacao } mas API esperava { sugestoes, observacao_geral }
- Causava erro "Sugestoes sao obrigatorias" bloqueando o representante
- API agora aceita ambos formatos + mapeia campos (item_pedido_compra_id → item_id)

**18. Sanitizar Nome do Arquivo no Upload do Espelho** — 20/03 | FlowB2B_Client
- Nomes com espacos e acentos ("Listagem de Pecas - Cozinha Emily.pdf") causavam Invalid key no Supabase Storage
- Remove acentos e substitui caracteres especiais por underscore

**19. Politicas de Compra Excluidas Apareciam no Pedido Automatico** — 23/03 | FlowB2B_Client
- Soft delete (isdeleted: true) nao era filtrado em 8 queries de 7 arquivos
- Politicas deletadas apareciam no pedido automatico, novo pedido, edicao e curva ABC
- Adicionado filtro .or('isdeleted.is.null,isdeleted.eq.false') em todas as queries

**20. Ajuste de Crons — Rate Limit Bling** — 23/03 | FlowB2B_Client / Supabase
- Empresas Duubpets 1 e 2 atingiram limite diario de 120.000 req/dia do Bling
- Causa: cron corrigir_produtos_nulos rodava a cada MINUTO (1.440 exec/dia)
- Causa: daily_sync rodava a cada 3h (8 exec/dia) com milhares de chamadas
- Fix: corrigir_produtos_nulos de 1min para 6h (4 exec/dia)
- Fix: daily_sync de 3h para 6h (4 exec/dia)
- Fix: sync-estoque mantido em 1h (ja usa lotes de 100 IDs, ~169 chamadas/exec)

**21. Null Safety em f.nome no Filtro de Fornecedores** — 24/03 | FlowB2B_Client
- f.nome.toLowerCase() crashava quando fornecedor tinha nome null
- Fix: (f.nome || '').toLowerCase()

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 28 |
| validacao_ean | 0 |
| flowB2BAPI | 0 |
| **Total** | **28** |

| Tipo | Qtd |
|------|-----|
| feat | 12 |
| fix | 16 |
| docs | 1 |

---

## Semana 6 — 24/03 a 26/03/2026

### FEATURES

**1. Validacao Inteligente de Espelho via IA** — 26/03 | FlowB2B_Client
- Pipeline de 2 IAs: IA 1 extrai itens do PDF via GPT-5.4-mini Vision, IA 2 compara com pedido original
- Comparacao item a item: quantidade, preco, codigo (GTIN/SKU)
- Status por item: OK, divergencia, faltando, extra
- Validacao manual editavel: lojista pode sobrescrever status da IA com dropdown
- Observacao por item e geral, salvar validacao com persistencia
- Tabelas `espelho_validacoes` e `espelho_validacao_itens` no Supabase
- Botoes "Ver espelho" e "Download" no modal de validacao
- Modal fecha automaticamente apos salvar

**2. Upload de Imagem no Catalogo do Fornecedor** — 26/03 | FlowB2B_Client
- Fornecedor pode subir foto do produto via arquivo ou URL externa
- Popover de imagem com preview no catalogo
- Secao de imagem no modal "Personalizar Precos"
- Upload para Supabase Storage com preview em tempo real
- Compatibilidade cross-browser para file picker (input inset-0 opacity-0)

**3. Refatoracao de Tabela de Preco com Ponto de Margem** — 26/03 | FlowB2B_Client
- Criacao de tabela de preco reformulada com calculo de margem
- Personalizacao multi-produto por lojista no catalogo

**4. Excluir Cotacao/Sugestao** — 26/03 | FlowB2B_Client
- Fornecedor e representante podem excluir cotacoes/sugestoes enviadas
- Acao disponivel antes do lojista aceitar

**5. Espelho Viewer Inline** — 26/03 | FlowB2B_Client
- Visualizacao inline do PDF do espelho (sem abrir em nova aba)
- Download funcional para fornecedor, representante e lojista

**6. Edicao de Email/Senha no Admin** — 25/03 | FlowB2B_Client
- Super admin pode editar email e senha de qualquer usuario diretamente
- Reativacao de conta de fornecedor desativada
- Edicao de nome no modal de admin usuarios

---

### FIXES

**7. Pedidos Cancelados Visíveis para Fornecedor** — 25/03 | FlowB2B_Client
- Pedidos cancelados apareciam para fornecedor e representante
- Filtro adicionado para ocultar

**8. Catalogo Vazio para Fornecedores** — 26/03 | FlowB2B_Client
- Fornecedores com produto sem preco geravam catalogo vazio

**9. Textos Dinamicos no Botao de Sugestao** — 26/03 | FlowB2B_Client
- Botao de sugestao do fornecedor/representante com textos dinamicos conforme contexto

**10. Seguranca nas APIs** — 26/03 | FlowB2B_Client
- Correcao de issues criticos de seguranca e integridade nas APIs

**11. Validacao de Espelho — Extracao e Matching** — 26/03 | FlowB2B_Client
- Melhorias na extracao de dados do PDF e matching com pedido
- Detalhes de erro mantidos na resposta da validacao

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 28 |
| validacao_ean | 0 |
| flowB2BAPI | 0 |
| **Total** | **28** |

| Tipo | Qtd |
|------|-----|
| feat | 11 |
| fix | 15 |
| refactor | 2 |

---

## Semana 7 — 30/03/2026

### FEATURES

**1. Backlog Sprint 1 — Tasks 3, 4, 5, 6, 7, 9, 10** — 30/03 | FlowB2B_Client
- **Task 3:** Excluir item do pedido de compra (lojista) — botao lixeira + API DELETE
- **Task 4:** Editar quantidade inline no pedido — click-to-edit com recalculo automatico
- **Task 5:** IA do espelho entende fardo/caixa vs unidade — prompts melhorados com itens_por_caixa
- **Task 6:** Nome do produto visivel inteiro na tabela de validacao IA
- **Task 7:** Coluna Status movida para direita na tabela de validacao
- **Task 9:** Botao "Finalizar Pedido" na listagem de pedidos
- **Task 10:** Botao "Alterar espelho" para fornecedor e representante

**2. Backlog Sprint 2 — Tasks 1, 8, 11** — 30/03 | FlowB2B_Client
- **Task 1:** Validacao IA de espelho para fornecedor e representante (API compartilhada)
- **Task 8:** Validacao de espelho em tela inteira (pagina dedicada `/compras/pedidos/[id]/validacao-espelho`)
- **Task 11:** Catalogo unificado do fornecedor na visao do lojista (layout vitrine com imagens)

**3. Task 2 — Multi-Loja na Tabela de Preco** — 30/03 | FlowB2B_Client
- Duplicacao de tabela de preco para multiplos lojistas via GTIN
- API `POST /api/fornecedor/tabelas-preco/[id]/duplicar` com matching por EAN
- Botoes de duplicar e excluir na listagem de tabelas
- Relatorio de itens copiados vs sem match por loja

**4. Task 12 — Upload de Produtos em Massa via Excel** — 30/03 | FlowB2B_Client
- Import de planilha Excel/CSV no catalogo do fornecedor
- Template .xlsx com colunas: codigo_fornecedor, ean, nome, marca, unidade, tipo_embalagem, itens_por_caixa, preco, imagem_url
- Preview com contagem de novos/atualizados/erros antes de confirmar
- Matching por EAN ou codigo do fornecedor

**5. Landing Page Completa** — 30/03 | FlowB2B_Client
- Landing page principal (/) com 11 secoes: hero azul FlowB2B, banner BETA, problema (4 pain points), features sticky scroll (6 features com screenshots reais), como funciona (timeline), pricing (Essencial R$49,90 + Pro R$99,90 com 3 meses gratis), FAQ, CTA fornecedor, CTA final, footer
- 17 componentes marketing reutilizaveis: DoubleBezel, ButtonPrimary, ScrollReveal, MagneticButton, Eyebrow, SectionContainer, GrainOverlay, etc.
- Design system separado (marketing-tokens.css) com cores FlowB2B (azul + laranja/amber)
- Fonte Satoshi para headlines, Geist para corpo
- Screenshots reais capturados via Playwright (7 telas do sistema)
- Navbar flutuante com scroll behavior + hamburger mobile
- Scroll reveals com framer-motion, cubic-bezier customizado
- Acessibilidade: skip-to-content, alt text, semantic HTML, focus rings

**6. Pagina Para Fornecedores** — 30/03 | FlowB2B_Client
- Pagina dedicada `/fornecedores` com 10 secoes em tema laranja/amber
- Programa de indicacao: fornecedor ganha 10% da mensalidade de cada lojista indicado
- Simulador interativo de receita (slider 1-50 lojistas + toggle Essencial/Pro)
- 6 features do portal fornecedor com sticky scroll e mockups
- FAQ especifico para fornecedores (8 perguntas)
- CTA na landing principal "Voce eh fornecedor? O portal eh gratis"
- Link "Fornecedores" adicionado na navbar

**7. Reestruturacao de Rotas** — 30/03 | FlowB2B_Client
- Dashboard do lojista movido de `/` para `/dashboard`
- `/` agora eh a landing page publica
- `/fornecedores` eh a pagina para fornecedores (publica)
- Middleware atualizado: rotas publicas incluem `/` e `/fornecedores`
- Login redireciona para `/dashboard` ao inves de `/`
- 8 arquivos atualizados (sidebar, header, bottom tab, breadcrumbs)

---

### FIXES

**8. Code Review Sprint 1+2** — 30/03 | FlowB2B_Client
- Correcoes de issues criticos identificados no code review das sprints do backlog

---

### REFACTOR

**9. Import Modal Seguindo FlowB2B Patterns** — 30/03 | FlowB2B_Client
- Modal de importacao Excel refatorado para seguir padroes visuais do FlowB2B

---

### Resumo da Semana

| Projeto | Commits |
|---------|---------|
| FlowB2B_Client | 9 |
| validacao_ean | 0 |
| flowB2BAPI | 0 |
| **Total** | **9** |

| Tipo | Qtd |
|------|-----|
| feat | 6 |
| fix | 1 |
| refactor | 1 |
| docs | 1 |
