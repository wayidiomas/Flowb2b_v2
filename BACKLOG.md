# Backlog de Tarefas

## Pendente

### Multi-Loja na Tabela de Preco
**Prioridade:** Media
**Contexto:** Cliente pediu que fornecedor possa criar UMA tabela de preco e aplicar em MULTIPLOS lojistas de uma vez, em vez de criar uma tabela separada para cada loja.

**Abordagem planejada:** Duplicacao via GTIN (sem mudanca de schema)
1. Botao "Duplicar para outros lojistas" na listagem de tabelas
2. Modal para selecionar lojas destino (mostra empresas vinculadas)
3. Backend copia tabela + itens, mapeando produtos pelo GTIN/EAN em cada loja
4. Se produto nao existe na loja destino, cria item so com GTIN (sem produto_id)

**Arquivos envolvidos:**
- `src/app/api/fornecedor/tabelas-preco/[id]/duplicar/route.ts` (novo)
- `src/app/fornecedor/tabelas-preco/page.tsx` (botao + modal)
- Tabelas: `tabelas_preco`, `itens_tabela_preco`, `produtos` (gtin)

**Futuro (v2):** Criar tabela `tabelas_preco_lojas` (N:N) e itens baseados em GTIN em vez de produto_id.
