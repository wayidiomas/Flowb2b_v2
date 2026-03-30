# Backlog de Tarefas

## Pendente

### Task 1: Validação IA de espelho para fornecedor e representante
**Prioridade:** Alta
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Contexto:** Hoje a validação IA do espelho só existe para o lojista. A cliente quer que fornecedor e representante também possam validar o espelho que enviaram contra o pedido original, como um auto-check antes do lojista revisar.

**Momento no fluxo:** Logo após o fornecedor/representante enviar o espelho, quando o status é "pendente". O botão "Validar com IA" aparece ao lado de "Visualizar" e "Download" na seção de espelho enviado.

**Abordagem recomendada:** API compartilhada que aceita os 3 tipos de usuário (lojista, fornecedor, representante) em vez de 3 APIs separadas. A lógica de IA é idêntica (mesmo prompt, mesmo matching por GTIN/código). Só muda a camada de auth.

**O que fazer:**
1. Criar API `/api/fornecedor/pedidos/[id]/espelho/validar` - mesma lógica da do lojista, auth via CNPJ + fornecedorIds
2. Criar API `/api/representante/pedidos/[id]/espelho/validar` - auth via representanteUserId + fornecedorIds
3. Adicionar botão "Validar com IA" + modal de resultado em `src/app/fornecedor/pedidos/[id]/page.tsx` (na seção de espelho, quando espelho_url existe)
4. Idem em `src/app/representante/pedidos/[id]/page.tsx`
5. O modal mostra o mesmo relatório editável do lojista (status IA, dropdown manual, observações)
6. Opcionalmente: APIs de validação manual (GET/POST `/espelho/validacao`) para fornecedor/representante persistirem revisão

**Alternativa mais simples:** Reutilizar a lógica core de extração + comparação via lib compartilhada (`src/lib/espelho-validacao.ts`) e cada API route só faz auth + chama a lib.

**Arquivos envolvidos:**
- `src/app/api/fornecedor/pedidos/[id]/espelho/validar/route.ts` (novo)
- `src/app/api/representante/pedidos/[id]/espelho/validar/route.ts` (novo)
- `src/app/fornecedor/pedidos/[id]/page.tsx` (botão + modal + state)
- `src/app/representante/pedidos/[id]/page.tsx` (botão + modal + state)
- `src/app/api/pedidos-compra/[id]/espelho/validar/route.ts` (referência da lógica existente)

**Complexidade:** Média-alta (~3-4h de implementação com agents)

---

### Task 3: Excluir produto da lista de itens do pedido de compra (lojista)
**Prioridade:** Alta
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Contexto:** Na página `/compras/pedidos/[id]`, o lojista consegue adicionar produtos (botão "Adicionar Produto", handler `handleAdicionarProduto` linha 661, chama `POST /api/pedidos-compra/[id]/itens`). Mas NÃO consegue remover um item da lista. A tabela de itens (linhas 1273-1299) renderiza cada item com `pedido.itens.map()` sem nenhum botão de ação/exclusão.

**Estado atual do código:**
- API de itens: `src/app/api/pedidos-compra/[id]/itens/route.ts` - só tem POST (adicionar). Não existe DELETE.
- A API de POST já valida status (linhas 53-58): bloqueia se `cancelado` ou `finalizado`, e verifica `situacao` do Bling (linhas 61-66). O DELETE deve seguir a mesma lógica.
- O recalculo de total já existe no POST (linhas 124-157) - reusar mesma lógica no DELETE.
- O botão "Adicionar Produto" só aparece quando `!['cancelado', 'finalizado'].includes(statusInterno)` (linha 1325). O botão de excluir deve seguir a mesma condição.
- A tabela desktop está nas linhas 1273-1299, mobile nas linhas 1302-1321.

**O que fazer:**
1. Adicionar handler `DELETE` em `src/app/api/pedidos-compra/[id]/itens/route.ts` (mesmo arquivo, exportar DELETE):
   - Receber `item_id` no body ou query param
   - Validar pedido (empresa_id, is_excluded, não cancelado/finalizado)
   - Validar que o item pertence ao pedido (`itens_pedido_compra.pedido_compra_id`)
   - Deletar de `itens_pedido_compra`
   - Recalcular total (copiar lógica das linhas 124-157 do POST)
   - Registrar na timeline
2. No frontend (`src/app/compras/pedidos/[id]/page.tsx`):
   - Adicionar handler `handleRemoverItem(itemId)`
   - Adicionar coluna "Ações" no header da tabela (th) e botão lixeira em cada row (td)
   - Condição: só mostrar quando `!['cancelado', 'finalizado'].includes(statusInterno)`
   - Confirm antes de excluir
   - Após sucesso: `window.location.reload()` (mesmo pattern do adicionar, linha 678)
   - Aplicar no desktop (tabela) e mobile (cards)

**Arquivos envolvidos:**
- `src/app/api/pedidos-compra/[id]/itens/route.ts` (adicionar export DELETE)
- `src/app/compras/pedidos/[id]/page.tsx` (handler + botão lixeira na tabela e cards)

**Complexidade:** Baixa (~1h)

---

### Task 4: Editar quantidade de itens no pedido de compra (lojista)
**Prioridade:** Alta
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Contexto:** Na mesma tabela de itens do pedido (`/compras/pedidos/[id]`), a coluna Qtd (linha 1293) renderiza `{item.quantidade}` como texto estático. O lojista não consegue alterar a quantidade. O Total por linha (linha 1295) calcula `quantidade * valor`, então ao mudar a quantidade precisa recalcular linha + total do pedido.

**Estado atual do código:**
- A API `src/app/api/pedidos-compra/[id]/itens/route.ts` só tem POST. Não existe PUT/PATCH.
- O recalculo de total do pedido já existe no POST (linhas 124-157) - reusar.
- A mesma condição de status editável se aplica: `!['cancelado', 'finalizado'].includes(statusInterno)`

**O que fazer:**
1. Adicionar handler `PUT` em `src/app/api/pedidos-compra/[id]/itens/route.ts`:
   - Body: `{ item_id: number, quantidade: number }`
   - Validar pedido (empresa_id, is_excluded, status editável)
   - Validar que o item pertence ao pedido
   - Validar quantidade > 0
   - Update `itens_pedido_compra` set `quantidade = X` where `id = item_id`
   - Recalcular total do pedido (mesma lógica do POST linhas 124-157)
   - Registrar na timeline
2. No frontend (`src/app/compras/pedidos/[id]/page.tsx`):
   - Trocar `{item.quantidade}` por um input editável inline (ou click-to-edit)
   - Ao alterar e fazer blur/enter: chamar API PUT
   - Atualizar `pedido.itens` no state local (optimistic update) + recalcular total exibido
   - Mesmo padrão do `InlinePriceEditor` no catálogo: click no número → input → blur salva
   - Condição: só editável quando status permite
   - Aplicar no desktop (td) e mobile (card)

**NOTA:** Tasks 3 e 4 podem ser implementadas juntas pois mexem nos mesmos arquivos e na mesma tabela. A coluna "Ações" da Task 3 (lixeira) e a Qtd editável da Task 4 podem entrar no mesmo PR.

**Arquivos envolvidos:**
- `src/app/api/pedidos-compra/[id]/itens/route.ts` (adicionar export PUT)
- `src/app/compras/pedidos/[id]/page.tsx` (input editável na coluna Qtd + handler)

**Complexidade:** Baixa (~1h, ou junto com Task 3 ~2h total)

---

### Task 5: IA do espelho deve entender fardo/caixa vs unidade
**Prioridade:** Alta
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Problema:** O lojista pede "4 unidades". O fornecedor responde no espelho "1 fardo com 4 unidades" (Qtd=1, UN=FD). A IA compara 4 vs 1 e marca divergência. Mas está correto - 1 fardo = 4 unidades. O mesmo vale para caixa (CX), pack, etc.

**Exemplo concreto:**
```
Pedido lojista:    Qtd=4  UN=UN  Preço=R$15,44 (unitário)  Total=R$61,76
Espelho fornecedor: Qtd=1  UN=FD  Preço=R$61,76 (fardo)    Total=R$61,76
→ IA marca como divergência (4≠1) quando deveria ser OK (mesmo total)
```

**Dados disponíveis no banco:**
- `produtos.itens_por_caixa` (integer) - ex: 4, 6, 12 - existe e está preenchido para muitos produtos
- `produtos.unidade` - UN, CX, FD, etc.
- Extração da IA 1 já captura campo "Emb" do espelho (ex: "UN C/ 4", "FD C/ 12")

**O que fazer:**
1. **IA 1 (Extração)** - Prompt em `src/app/api/pedidos-compra/[id]/espelho/validar/route.ts` linha 120:
   - Adicionar campo `embalagem` na extração (ex: "UN C/ 4", "FD", "CX C/ 12")
   - Adicionar campo `unidade` (UN, CX, FD, PCT, etc.)

2. **Dados do pedido** - Enriquecer texto enviado à IA 2 (linha 191):
   - Incluir `itens_por_caixa` do produto no texto do pedido
   - Já é fetchado em `produtos` mas não é usado - adicionar no join

3. **IA 2 (Comparação)** - Prompt em linha 203:
   - Adicionar regra: "Se a quantidade difere mas o TOTAL DA LINHA é igual (ou dentro de 2% de tolerância), considere OK - provavelmente é diferença de unidade/embalagem (ex: 4 UN = 1 fardo de 4)"
   - Adicionar regra: "Se itens_por_caixa está informado e Qtd_pedido = Qtd_espelho × itens_por_caixa, considere OK"
   - Adicionar regra: "Priorize comparar o VALOR TOTAL da linha, não apenas quantidade × preço unitário"

**Arquivo envolvido:**
- `src/app/api/pedidos-compra/[id]/espelho/validar/route.ts` (melhorar os 2 prompts + enriquecer dados)

**Complexidade:** Baixa (~30min - só ajuste de prompts e dados enviados)

---

### Task 8: Validação de espelho em tela inteira (página dedicada)
**Prioridade:** Média
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Problema:** O modal de validação do espelho fica limitado a `max-w-5xl max-h-[90vh]`. Com muitos itens, fica apertado. A cliente quer um botão para abrir a validação em tela inteira, como uma página dedicada.

**Abordagem:**
- Botão "Abrir em tela inteira" (ícone expand) no header do modal
- Abre rota `/compras/pedidos/[id]/validacao-espelho` (nova página)
- A página usa os mesmos dados (carrega de `espelho_validacoes` + `espelho_validacao_itens` via GET `/api/pedidos-compra/[id]/espelho/validacao`)
- Se não tem validação salva, mostra botão "Rodar validação IA" que chama POST `/api/pedidos-compra/[id]/espelho/validar`
- Mesma tabela editável do modal (dropdowns, obs por item, obs geral, salvar)
- Mas em fullscreen com mais espaço: tabela larga, colunas sem truncate
- Botão "Voltar ao pedido" para retornar

**O que fazer:**
1. Criar página `src/app/compras/pedidos/[id]/validacao-espelho/page.tsx` (nova) - layout fullscreen com a mesma tabela editável
2. Adicionar botão expand no header do modal atual em `src/app/compras/pedidos/[id]/page.tsx`
3. A página lê dados salvos via GET, permite rodar IA, permite editar e salvar - reutiliza mesmas APIs

**Arquivos envolvidos:**
- `src/app/compras/pedidos/[id]/validacao-espelho/page.tsx` (novo)
- `src/app/compras/pedidos/[id]/page.tsx` (botão expand no modal)

**Complexidade:** Média (~2-3h)

---

### Task 10: Botão "Alterar espelho" para fornecedor e representante
**Prioridade:** Alta
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Problema:** Quando o fornecedor envia o espelho errado, não tem como trocar. Só aparece "Visualizar" e "Download". Precisa de um botão para remover o atual e subir outro.

**Estado atual do código:**
- API DELETE já existe: `src/app/api/fornecedor/pedidos/[id]/espelho/route.ts` (linha 218) - remove espelho quando `status = 'pendente'`
- API DELETE representante também existe: `src/app/api/representante/pedidos/[id]/espelho/route.ts`
- Frontend NÃO tem botão que chame esse DELETE
- Após DELETE, a seção de upload voltaria a aparecer (porque `espelhoInfo.espelho_url` seria null)

**O que fazer:**
1. Em `src/app/fornecedor/pedidos/[id]/page.tsx` (linha ~958-970, seção do espelho com status pendente):
   - Adicionar botão "Alterar" ao lado de "Visualizar" e "Download"
   - Só mostrar quando `espelhoInfo.espelho_status === 'pendente'` (espelho ainda não aprovado/rejeitado)
   - Ao clicar: `confirm("Deseja remover o espelho atual e enviar outro?")` → chama `DELETE /api/fornecedor/pedidos/${id}/espelho` → reload
   - Após delete, a seção de upload reaparece automaticamente (pois espelho_url fica null)
2. Idem em `src/app/representante/pedidos/[id]/page.tsx`

**Arquivos envolvidos:**
- `src/app/fornecedor/pedidos/[id]/page.tsx` (botão + handler)
- `src/app/representante/pedidos/[id]/page.tsx` (botão + handler)
- APIs já existem, não precisa criar

**Complexidade:** Baixa (~30min)

---

### Task 9: Botão "Finalizar Pedido" na listagem de pedidos de compra
**Prioridade:** Alta
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Contexto:** Na listagem `/compras/pedidos`, cada pedido tem ícone de visualizar (olho) e excluir (lixeira) na coluna de ações (linhas 1370-1377). Falta um botão de **finalizar** ao lado.

**O que significa "finalizar":**
- API já existe: `POST /api/pedidos-compra/[id]/finalizar/route.ts`
- Muda `status_interno` para `finalizado`
- Sincroniza com Bling (situação 1 = Atendido)
- Registra na timeline
- Status permitidos para finalizar: `aceito`, `sugestao_pendente`, `enviado_fornecedor`, `rascunho`
- Já tem handler no detalhe do pedido (`handleFinalizar` linha 735 de `page.tsx`) com `confirm()` antes

**O que falta na listagem:**
- Handler `handleFinalizar` NÃO existe em `src/app/compras/pedidos/page.tsx`
- Botão na coluna de ações da tabela (ao lado da lixeira)

**O que fazer:**
1. Em `src/app/compras/pedidos/page.tsx`:
   - Adicionar `handleFinalizar(pedidoId)` que chama `POST /api/pedidos-compra/${id}/finalizar` com confirm
   - Adicionar botão checkmark (✓) verde ao lado da lixeira, visível apenas quando `status_interno` permite (`aceito`, `sugestao_pendente`, `enviado_fornecedor`, `rascunho`)
   - Não mostrar para pedidos já `finalizado` ou `cancelado`
   - Após sucesso: `fetchPedidos()` para atualizar lista

**Arquivos envolvidos:**
- `src/app/compras/pedidos/page.tsx` (handler + botão na coluna ações)
- API já existe, não precisa criar

**Complexidade:** Baixa (~30min)

---

### Task 11: Catálogo unificado do fornecedor na visão do lojista
**Prioridade:** Média
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Contexto:** Hoje existem duas telas separadas no lojista:
- `/compras/catalogo` - mostra produtos do catálogo do fornecedor (API `compras/catalogo/route.ts`). Já tem busca, filtro por marca, paginação, preço base + preço customizado. NÃO mostra `imagem_url` nem tabelas de preço.
- `/compras/tabelas-preco` - mostra tabelas de preço recebidas de fornecedores (API `compras/tabelas-preco/route.ts`).

A cliente quer uma visão **unificada estilo vitrine** onde o lojista vê o catálogo do fornecedor com:
- Produtos cadastrados (do `catalogo_itens`)
- Imagem do produto (`imagem_url` - recém adicionado)
- Preço da tabela selecionada pelo fornecedor para aquele lojista
- Tudo em **modo somente leitura** (sem edição)

**O que fazer:**
1. Melhorar a página existente `/compras/catalogo`:
   - Adicionar `imagem_url` no retorno da API `src/app/api/compras/catalogo/route.ts` (hoje faz `select('*')` que já inclui, mas o frontend não usa)
   - Mostrar thumbnail da imagem ao lado de cada produto
   - Integrar tabela de preço ativa do fornecedor: se existe `tabelas_preco` ativa para este fornecedor+empresa, mostrar o preço da tabela em vez do preço base
   - Layout estilo vitrine/grid (cards com imagem + nome + preço) além da tabela

2. Layout de **VITRINE** (obrigatório): grid de cards estilo e-commerce
   - Card: imagem (ou placeholder) + nome + marca + código + preço (destaque) + unidade/embalagem
   - Grid responsivo: 2 cols mobile, 3 cols tablet, 4-5 cols desktop
   - Toggle para alternar entre vitrine (grid) e tabela (listagem)
   - Filtros: busca, marca, faixa de preço

**Arquivos envolvidos:**
- `src/app/api/compras/catalogo/route.ts` (integrar preços de tabela ativa)
- `src/app/compras/catalogo/page.tsx` (UI vitrine com imagens)

**Complexidade:** Média-alta (~3-4h)

---

### Task 7: Mover coluna Status para a direita na tabela de validação IA
**Prioridade:** Baixa
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Problema:** A coluna Status (dropdown OK/Diverge/Faltando/Extra/Ignorar) está na primeira coluna da esquerda. Deveria estar mais à direita, depois das colunas de dados do produto.

**Fix:** Reordenar colunas no header e nas rows. Ordem sugerida: Produto (Pedido) | Produto (Espelho) | Qtd Ped. | Qtd Esp. | Preço Ped. | Preço Esp. | Diferenças | **Status** | Obs.

**Arquivo:** `src/app/compras/pedidos/[id]/page.tsx` (header da tabela + rows no modal de validação)
**Complexidade:** 10 min

---

### Task 6: Nome do produto visível inteiro na tabela de validação IA
**Prioridade:** Baixa
**Solicitado por:** Cliente (Emilly) em 30/03/2026

**Problema:** Na tabela de validação do espelho (modal IA), os nomes dos produtos estão truncados com `truncate max-w-[180px]` (linhas 1819, 1827 de `compras/pedidos/[id]/page.tsx`). O lojista não consegue ler o nome completo.

**Fix:** Remover `truncate max-w-[180px]` e usar `line-clamp-2` ou simplesmente deixar quebrar linha. Aumentar `max-w` do modal de `max-w-5xl` para `max-w-6xl` se necessário.

**Arquivo:** `src/app/compras/pedidos/[id]/page.tsx` (linhas 1819, 1827)
**Complexidade:** 5 min

---

### Task 12: Upload de produtos em massa via Excel (fornecedor/representante)
**Prioridade:** Alta
**Solicitado por:** Lucas em 30/03/2026

**Contexto:** Hoje o fornecedor só popula o catálogo via sincronização do Bling (que puxa de `fornecedores_produtos`). Não existe forma de subir produtos manualmente em massa. O fornecedor quer importar uma planilha Excel/CSV com seus produtos e preços.

**Onde colocar na UI:**

1. **Catálogo do fornecedor** (`/fornecedor/catalogo`) - botão **"Importar Excel"** ao lado de "Sincronizar" no header (linha ~1931-1944 de `page.tsx`). Layout:
   ```
   [Sincronizar]  [📥 Importar Excel]  135 produtos
   ```

2. **Tabela de preço** (`/fornecedor/tabelas-preco/nova`) - opção **"Importar preços da planilha"** como alternativa ao carregamento automático do catálogo.

**Fluxo principal (catálogo):**
1. Fornecedor clica "Importar Excel"
2. Modal abre com:
   - Área de upload (drag & drop ou click)
   - Link para baixar **modelo/template** da planilha
   - Selector de lojista (para qual empresa importar)
3. Fornecedor sobe o arquivo (.xlsx ou .csv)
4. Backend parseia a planilha e retorna preview:
   - Produtos encontrados, novos, atualizados
   - Erros de validação (campos faltando, formato errado)
5. Fornecedor confirma → backend insere/atualiza `catalogo_itens`
6. Resultado: "150 importados, 5 atualizados, 2 erros"

**Template da planilha (colunas):**
| codigo | codigo_barras (EAN) | nome | marca | unidade | itens_por_caixa | preco |
|--------|-------------------|------|-------|---------|----------------|-------|
| 4006089 | 7897348205258 | Golden Carne MB 1kg | GOLDEN | UN | 1 | 15.44 |

**Matching na importação:**
- Se produto já existe no catálogo (por codigo OU EAN): **atualiza** preço/nome
- Se não existe: **cria** novo item em `catalogo_itens`
- O `produto_id` é resolvido por GTIN na tabela `produtos` da empresa selecionada

**O que implementar:**
1. **Lib** `src/lib/excel-parser.ts` - parser de .xlsx e .csv (usar lib `xlsx` ou `papaparse`)
2. **API** `POST /api/fornecedor/catalogo/importar` - recebe FormData com arquivo + empresa_id, retorna preview
3. **API** `POST /api/fornecedor/catalogo/importar/confirmar` - confirma a importação e efetua insert/update
4. **Frontend** botão + modal de upload em `src/app/fornecedor/catalogo/page.tsx`
5. **Template** `.xlsx` estático em `public/templates/catalogo-template.xlsx`

**Dependências:** Lib `xlsx` (SheetJS) para parse de Excel, ou `papaparse` para CSV

**Complexidade:** Média-alta (~4h)

---

### Task 2: Multi-Loja na Tabela de Preco + Ações na listagem
**Prioridade:** Media
**Status:** EM IMPLEMENTAÇÃO

**Contexto:** Fornecedor CDA serve 3 lojas (Duubpets 1, 2, 3). Precisa criar 3 tabelas separadas com mesmos preços. Quer criar 1 e duplicar para as outras.

**Desafio técnico:** `produto_id` é empresa-specific. Mesmo produto físico tem IDs diferentes por loja. Ponte: GTIN/EAN na tabela `produtos`.

**Achados do code review da listagem (`fornecedor/tabelas-preco/page.tsx`):**
- NÃO tem botão de editar tabela existente
- NÃO tem botão de excluir tabela
- NÃO tem botão de duplicar
- Só tem "Ver detalhes" (expand) e "Nova Tabela"

**O que implementar:**
1. API `POST /api/fornecedor/tabelas-preco/[id]/duplicar` (nova):
   - Body: `{ target_empresa_ids: [5, 6] }`
   - Para cada empresa: busca fornecedor_id por CNPJ, cria tabela, mapeia itens por GTIN
   - Se produto não existe na loja destino: cria item sem produto_id
   - Retorna relatório por loja (copiados, sem match)
2. Frontend `fornecedor/tabelas-preco/page.tsx`:
   - Botão "Duplicar" (ícone copiar) → modal para selecionar lojas destino
   - Botão "Excluir" (ícone lixeira) → confirm + DELETE API (já existe)
   - Ambos na coluna de ações de cada tabela

**Arquivos:**
- `src/app/api/fornecedor/tabelas-preco/[id]/duplicar/route.ts` (novo)
- `src/app/fornecedor/tabelas-preco/page.tsx` (botões + modal duplicação)
