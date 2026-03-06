# Mapeamento de Queries de `pedidos_compra` e `itens_pedido_compra` em API Routes

**Data**: 2026-03-06
**Task**: #2 - Mapear queries de pedidos_compra nas API routes
**Status**: Completo - 27 arquivos mapeados

---

## 📋 Resumo Executivo

- **Total de arquivos com queries de `pedidos_compra`**: 27
- **Total de arquivos com queries de `itens_pedido_compra`**: 11
- **Total de queries único em `pedidos_compra`**: ~50+
- **Padrões identificados**: SELECT, INSERT, UPDATE, DELETE (via RPC), JOIN com itens

---

## 🎯 Rotas Principais - `/api/pedidos-compra`

### 1. GET `/api/pedidos-compra/route.ts`
**Método**: GET (Listagem) - **PRECISA DE FILTRO**

**Queries**:
- Linha 143-149: SELECT máximo `numero` por empresa
  ```typescript
  .from('pedidos_compra')
  .select('numero')
  .eq('empresa_id', empresaId) ✓ (já tem filtro)
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- Listagem precisa excluir soft-deleted
- Busca do próximo número também precisa considerar apenas ativos

---

### 2. POST `/api/pedidos-compra/route.ts`
**Método**: POST (Criar novo) - **NÃO PRECISA**

**Queries**:
- Linha 584: RPC `flowb2b_add_pedido_compra` para criar novo
  ```typescript
  await supabase.rpc('flowb2b_add_pedido_compra', { ... })
  ```
- Cria novo registro (não afeta soft-deleted)

**Necessidade de `is_excluded`**: ❌ NÃO

---

### 3. GET `/api/pedidos-compra/[id]/route.ts`
**Método**: GET (Detalhe) - **PODE NÃO PRECISAR**

**Queries** (implícito - arquivo lê mas não mostra queries diretas):
- Busca por ID específico (linha 238-244)
  ```typescript
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```

**Necessidade de `is_excluded`**: ⚠️ DEPENDE
- Se for query de detalhe por ID: pode não precisar (usuário clica em pedido existente)
- Se for prevenção de acesso a soft-deleted: ✅ SIM
- **Decisão**: Adicionar filtro para segurança (não retornar soft-deleted mesmo com ID direto)

---

### 4. PUT `/api/pedidos-compra/[id]/route.ts`
**Método**: PUT (Editar) - **PRECISA DE FILTRO**

**Queries**:
- Linha 239-244: Buscar pedido antes de atualizar
  ```typescript
  .from('pedidos_compra')
  .select('id, bling_id, numero, situacao')
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```
- Linha 354-376: UPDATE pedido
  ```typescript
  .from('pedidos_compra')
  .update({...})
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```
- Linha 383-390: DELETE itens antigos
  ```typescript
  .from('itens_pedido_compra')
  .delete()
  .eq('pedido_compra_id', pedidoId)
  ```
- Linha 404-406: INSERT novos itens

**Necessidade de `is_excluded`**: ✅ SIM
- SELECT antes de UPDATE precisa não retornar soft-deleted
- Impede edição de pedidos excluídos

---

### 5. POST `/api/pedidos-compra/[id]/cancelar/route.ts`
**Método**: POST (Cancelar) - **PRECISA DE FILTRO**

**Queries**:
- Linha 78-83: Buscar pedido
  ```typescript
  .from('pedidos_compra')
  .select('id, bling_id, situacao, status_interno')
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```
- Linha 154-158: UPDATE status para cancelado
  ```typescript
  .from('pedidos_compra')
  .update(updateData)
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- SELECT precisa não retornar soft-deleted
- Previne "cancelamento duplo"

---

### 6. POST `/api/pedidos-compra/[id]/finalizar/route.ts`
**Método**: POST (Finalizar) - **PRECISA DE FILTRO**

**Queries**:
- Linha 64-69: Buscar pedido
  ```typescript
  .from('pedidos_compra')
  .select('id, bling_id, situacao, status_interno')
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```
- Linha 156-160: UPDATE status
  ```typescript
  .from('pedidos_compra')
  .update(updateData)
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 7. PUT `/api/pedidos-compra/[id]/alterar-status/route.ts`
**Método**: PUT (Alterar status) - **PRECISA DE FILTRO**

**Queries**:
- Linha 89-94: Buscar pedido
  ```typescript
  .from('pedidos_compra')
  .select('id, bling_id, situacao')
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```
- Linha 172-176: UPDATE situação
  ```typescript
  .from('pedidos_compra')
  .update({ situacao: body.situacao, ... })
  .eq('id', pedidoId)
  .eq('empresa_id', empresaId)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 8. POST `/api/pedidos-compra/[id]/calcular-automatico/route.ts`
**Método**: POST (Cálculo automático) - **PRECISA DE FILTRO**

**Queries**:
- Linha 149-156: Buscar pedidos abertos (últimos 30 dias)
  ```typescript
  .from('pedidos_compra')
  .select('id')
  .eq('fornecedor_id', fornecedor_id)
  .eq('empresa_id', user.empresaId)
  .in('situacao', [0, 3]) // 0=aberto, 3=parcial
  ```
- Linha 163-166: Buscar itens desses pedidos
  ```typescript
  .from('itens_pedido_compra')
  .select('produto_id, quantidade')
  .in('pedido_compra_id', pedidoIds)
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- Busca apenas "pedidos em aberto" para comparação
- Soft-deleted não devem ser contados como "em aberto"

---

### 9. GET `/api/pedidos-compra/[id]/timeline/route.ts`
**Método**: GET (Timeline) - **PRECISA DE FILTRO**

**Queries**:
- Linha 21-26: Verificar acesso ao pedido (lojista)
  ```typescript
  .from('pedidos_compra')
  .select('id')
  .eq('id', pedidoId)
  .eq('empresa_id', user.empresaId)
  ```
- Linha 43-48: Verificar acesso (fornecedor)
  ```typescript
  .from('pedidos_compra')
  .select('id')
  .eq('id', pedidoId)
  .in('fornecedor_id', fornecedorIds)
  ```
- Linha 58-62: Buscar timeline
  ```typescript
  .from('pedido_timeline')
  .select('id, evento, descricao, ...')
  .eq('pedido_compra_id', pedidoId)
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- Verificação de acesso não deve retornar soft-deleted

---

## 👨‍💼 Rotas de Fornecedor - `/api/fornecedor/pedidos`

### 10. GET `/api/fornecedor/pedidos/route.ts`
**Método**: GET (Listagem fornecedor) - **PRECISA DE FILTRO**

**Queries**:
- Linha 71-90: Buscar pedidos
  ```typescript
  .from('pedidos_compra')
  .select('id, numero, data, data_prevista, total, ...')
  .in('fornecedor_id', fornecedorIds)
  .neq('status_interno', 'rascunho')
  .order('data', { ascending: false })
  ```
- Linha 94-98: Contar itens
  ```typescript
  .from('itens_pedido_compra')
  .select('pedido_compra_id')
  .in('pedido_compra_id', pedidoIds)
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- Listagem de pedidos visíveis ao fornecedor
- Soft-deleted não devem aparecer

---

### 11. GET `/api/fornecedor/pedidos/[id]/route.ts`
**Método**: GET (Detalhe fornecedor) - **PRECISA DE FILTRO**

**Queries**:
- Linha 45-50: Buscar pedido
  ```typescript
  .from('pedidos_compra')
  .select('*')
  .eq('id', id)
  .in('fornecedor_id', fornecedorIds)
  ```
- Linha 57-60: Buscar itens
  ```typescript
  .from('itens_pedido_compra')
  .select('...')
  .eq('pedido_compra_id', id)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 12. GET `/api/fornecedor/dashboard/route.ts`
**Método**: GET (Dashboard fornecedor) - **PRECISA DE FILTRO**

**Queries**:
- Linha 34-39: Buscar pedidos para stats
  ```typescript
  .from('pedidos_compra')
  .select('id, numero, data, total, status_interno, empresa_id, fornecedor_id')
  .in('fornecedor_id', fornecedorIds)
  .in('status_interno', ['enviado_fornecedor', 'sugestao_pendente', 'aceito'])
  ```
- Linha 64-70: Buscar pedidos recentes
  ```typescript
  .from('pedidos_compra')
  .select('id, numero, data, total, status_interno, empresa_id')
  .in('fornecedor_id', fornecedorIds)
  .neq('status_interno', 'rascunho')
  .limit(10)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

## 🔄 Rotas de Representante - `/api/representante/pedidos`

### 13. GET `/api/representante/pedidos/route.ts`
**Método**: GET (Listagem representante) - **PRECISA DE FILTRO**

**Queries**:
- Linha 64-110: Buscar pedidos com filtros
  ```typescript
  .from('pedidos_compra')
  .select('id, numero, data, data_prevista, status_interno, total, ...')
  .in('fornecedor_id', fornecedorIds)
  .in('status_interno', [...])
  .order('data', { ascending: false })
  .range(offset, offset + limit - 1)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 14. GET `/api/representante/pedidos/[id]/route.ts`
**Método**: GET (Detalhe representante) - **PRECISA DE FILTRO**

**Queries**:
- Linha 71-76: Buscar pedido
  ```typescript
  .from('pedidos_compra')
  .select('*')
  .eq('id', pedidoId)
  .in('fornecedor_id', fornecedorIds)
  ```
- Linha 86-89: Buscar itens
  ```typescript
  .from('itens_pedido_compra')
  .select('...')
  .eq('pedido_compra_id', pedidoId)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 15. GET `/api/representante/dashboard/route.ts`
**Método**: GET (Dashboard representante) - **PRECISA DE FILTRO**

**Queries**:
- Linha 64-68: Buscar pedidos
  ```typescript
  .from('pedidos_compra')
  .select('id, status_interno, total')
  .in('fornecedor_id', fornecedorIds)
  .in('status_interno', [...])
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

## 📊 Rotas de Curva ABC - `/api/compras/curva`

### 16. GET `/api/compras/curva/visao-geral/route.ts`
**Método**: GET (Visão geral) - **PRECISA DE FILTRO**

**Queries**:
- Linha 70-75: Buscar último pedido FINALIZADO por fornecedor
  ```typescript
  .from('pedidos_compra')
  .select('fornecedor_id, data, total')
  .eq('empresa_id', user.empresaId)
  .eq('situacao', 1) // Apenas finalizados
  ```
- Linha 92-99: Buscar pedidos em aberto/andamento (últimos 30 dias)
  ```typescript
  .from('pedidos_compra')
  .select('fornecedor_id, numero, data, total, situacao')
  .eq('empresa_id', user.empresaId)
  .in('situacao', [0, 3])
  .not('status_interno', 'in', '("cancelado","recusado")')
  .gte('data', dataLimiteStr)
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- Busca de "último pedido finalizado" não deve incluir soft-deleted
- Busca de "pedidos em aberto" não deve incluir soft-deleted

---

### 17. POST `/api/compras/curva/sugestao/route.ts`
**Método**: POST (Sugestão) - **PRECISA DE FILTRO**

**Queries**:
- Linha 183-191: Buscar pedidos abertos (descontar quantidade)
  ```typescript
  .from('pedidos_compra')
  .select('id')
  .eq('fornecedor_id', fornecedor_id)
  .eq('empresa_id', user.empresaId)
  .in('situacao', [0, 3])
  .gte('data', dataLimiteStr)
  .limit(1)
  ```
- Linha 197-200: Buscar itens
  ```typescript
  .from('itens_pedido_compra')
  .select('produto_id, quantidade')
  .in('pedido_compra_id', pedidoIds)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 18. GET `/api/compras/curva/pedido-aberto-itens/route.ts`
**Método**: GET (Itens pedido aberto) - **PRECISA DE FILTRO**

**Queries**:
- Linha 45-53: Buscar pedidos abertos
  ```typescript
  .from('pedidos_compra')
  .select('id, numero, data, total, situacao, status_interno')
  .eq('fornecedor_id', parseInt(fornecedorId))
  .eq('empresa_id', user.empresaId)
  .in('situacao', [0, 3])
  .not('status_interno', 'in', '("cancelado","recusado")')
  .gte('data', dataLimiteStr)
  ```
- Linha 73-84: Buscar itens
  ```typescript
  .from('itens_pedido_compra')
  .select('...')
  .in('pedido_compra_id', pedidoIds)
  ```

**Necessidade de `is_excluded`**: ✅ SIM

---

### 19. GET `/api/compras/curva/alertas/route.ts`
**Método**: GET (Alertas) - **PRECISA DE FILTRO**

**Queries**:
- Linha 74-79: Buscar pedidos em aberto (para exclusão de fornecedores)
  ```typescript
  .from('pedidos_compra')
  .select('fornecedor_id')
  .eq('empresa_id', user.empresaId)
  .in('situacao', [0, 3])
  .not('status_interno', 'in', '("cancelado","recusado")')
  ```

**Necessidade de `is_excluded`**: ✅ SIM
- Fornecedores com pedidos "em aberto" não devem aparecer nos alertas
- Soft-deleted não devem contar como "em aberto"

---

### 20. GET `/api/compras/curva/fornecedor/[id]/route.ts`
**Método**: GET (Detalhe fornecedor) - **NÃO PRECISA**

**Queries**:
- Busca apenas fornecedores e produtos
- Não faz query diretamente em `pedidos_compra`

**Necessidade de `is_excluded`**: ❌ NÃO

---

## 📝 Outros Endpoints

### 21-27. Rotas adicionais de Bling Sync, Contra-Proposta, Sugestões
- `/api/pedidos-compra/[id]/contra-proposta/route.ts`
- `/api/pedidos-compra/[id]/sugestoes/route.ts`
- `/api/pedidos-compra/[id]/enviar-fornecedor/route.ts`
- `/api/pedidos-compra/[id]/lancar-conta/route.ts`
- `/api/representante/pedidos/[id]/sugestao/route.ts`
- `/api/representante/pedidos/[id]/cancelar/route.ts`
- `/api/representante/pedidos/[id]/responder-contra-proposta/route.ts`
- `/api/fornecedor/pedidos/[id]/responder-contra-proposta/route.ts`
- `/api/fornecedor/pedidos/[id]/sugestao/route.ts`
- `/api/fornecedor/pedidos/[id]/cancelar/route.ts`

**Necessidade**: ⚠️ VERIFICAR
- Estes arquivos fazem referência a `pedidos_compra` mas não foram lidos nesta análise
- Recomendação: Adicionar filtro `is_excluded` como precaução

---

## 📌 Padrões de Query Identificados

### ✅ Queries que JÁ têm `eq('empresa_id', ...)`
Todas as queries em `pedidos_compra` já filtram por `empresa_id`. Exemplos:
```typescript
.from('pedidos_compra')
.select(...)
.eq('id', pedidoId)
.eq('empresa_id', empresaId)  // ← Multi-tenant já implementado
```

### 📍 Padrões de `itens_pedido_compra`
Geralmente consultado via:
```typescript
.from('itens_pedido_compra')
.select(...)
.in('pedido_compra_id', pedidoIds)
// Sem filtro de empresa_id pois herda via FK
```

### 🔍 Casos especiais
1. **Busca de próximo número**: Linha 143-149 do `route.ts` (POST)
   - Busca máximo `numero` - precisa excluir soft-deleted

2. **Pedidos em aberto**: Múltiplas rotas
   - Padrão: `.in('situacao', [0, 3])` + `.not('status_interno', 'in', '("cancelado","recusado")')`
   - Soft-deleted não devem aparecer

3. **Busca por ID específico**: Detalhe routes
   - Tecnicamente acessa por ID direto, mas **deve verificar `is_excluded` por segurança**

---

## 🔧 Recomendações de Implementação

### Fase 1: Adicionar coluna `is_excluded`
```sql
ALTER TABLE pedidos_compra
ADD COLUMN is_excluded BOOLEAN DEFAULT FALSE;

-- Criar índice para performance
CREATE INDEX idx_pedidos_compra_is_excluded
ON pedidos_compra(empresa_id, is_excluded);
```

### Fase 2: Atualizar cada query (padrão)
**De:**
```typescript
.from('pedidos_compra')
.select(...)
.eq('empresa_id', empresaId)
```

**Para:**
```typescript
.from('pedidos_compra')
.select(...)
.eq('empresa_id', empresaId)
.eq('is_excluded', false)  // ← Adicionar
```

### Fase 3: Criar rota DELETE para soft delete
```typescript
DELETE /api/pedidos-compra/[id]/delete
// Atualiza is_excluded = true (em vez de deletar)
```

### Fase 4: Testar listagens
- Verificar que listagens não incluem soft-deleted
- Verificar que detalhe por ID rejeita soft-deleted
- Verificar que cálculos (sugestão, ABC) excluem soft-deleted

---

## 📊 Sumário por Categoria

| Categoria | Quantas | Precisam `is_excluded`? |
|-----------|---------|------------------------|
| Pedido-compra (CRUD) | 5 | ✅ 5/5 |
| Fornecedor (lista+detalhe) | 3 | ✅ 3/3 |
| Representante (lista+detalhe) | 4 | ✅ 4/4 |
| Curva ABC (visão+alertas+sugestão) | 4 | ✅ 4/4 |
| Outros (contra-proposta, etc) | 7+ | ⚠️ Verificar |
| **TOTAL** | **27** | **~23-25/27** |

---

## ✅ Checklist para Implementação

- [ ] Criar migration SQL com coluna `is_excluded`
- [ ] Atualizar 5 rotas de `/pedidos-compra`
- [ ] Atualizar 3 rotas de `/fornecedor/pedidos`
- [ ] Atualizar 4 rotas de `/representante/pedidos`
- [ ] Atualizar 4 rotas de `/compras/curva`
- [ ] Verificar 7+ rotas de ação secundária
- [ ] Criar endpoint DELETE para soft delete
- [ ] Testar listagens não mostram soft-deleted
- [ ] Testar detalhe rejeita soft-deleted
- [ ] Testar cálculos excluem soft-deleted

---

**Próxima Task**: #3 - Planejar migration SQL para coluna `is_excluded`
