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
