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
