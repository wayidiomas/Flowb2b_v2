# Plano de Implementacao - Modulo Pedidos de Compra

## Visao Geral

O modulo de Pedidos de Compra e o maior e mais complexo do sistema FlowB2B. Ele permite:
1. Listar e gerenciar pedidos de compra existentes
2. Criar pedidos manualmente com calculadora integrada
3. Gerar pedidos automaticamente via API `validacao_ean`
4. Editar pedidos com tabela de produtos editavel
5. Gerenciar politicas de compra e formas de pagamento

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── compras/
│   │   └── pedidos/
│   │       ├── page.tsx                    # Lista de pedidos (tela principal)
│   │       ├── novo/
│   │       │   └── page.tsx                # Criar pedido manual
│   │       ├── gerar-automatico/
│   │       │   └── page.tsx                # Fluxo de geracao automatica
│   │       └── [id]/
│   │           └── editar/
│   │               └── page.tsx            # Editar/visualizar pedido
│   └── api/
│       └── pedidos-compra/
│           ├── route.ts                    # CRUD principal (POST, PUT)
│           ├── [id]/route.ts               # GET detalhes, DELETE
│           ├── calcular-automatico/
│           │   └── route.ts                # Proxy para validacao_ean API
│           └── sugestoes/
│               └── route.ts                # Buscar sugestoes calculadas
├── components/
│   └── pedidos-compra/
│       ├── SidebarAcoes.tsx                # Sidebar de acoes rapidas
│       ├── TabelaProdutos.tsx              # Tabela editavel de produtos
│       ├── CalculadoraTotais.tsx           # Calculadora de totais
│       ├── ModalAdicionarProduto.tsx       # Modal para adicionar produto
│       ├── ModalSelecionarFornecedor.tsx   # Modal selecao de fornecedor
│       ├── TabPoliticaCompra.tsx           # Aba de politica de compra
│       ├── TabFormasPagamento.tsx          # Aba de formas de pagamento
│       └── ProgressoEstoque.tsx            # Barra de progresso de estoque
└── types/
    └── pedido-compra.ts                    # Tipos TypeScript
```

---

## 1. Tipos TypeScript (`/src/types/pedido-compra.ts`)

```typescript
// Status do pedido
export type SituacaoPedido = 1 | 2 | 3 | 4 | 5
export const SITUACAO_LABELS: Record<SituacaoPedido, string> = {
  1: 'Emitida',
  2: 'Cancelada',
  3: 'Registrada',
  4: 'Aguardando Entrega',
  5: 'Rascunho'
}

export const SITUACAO_COLORS: Record<SituacaoPedido, string> = {
  1: 'green',
  2: 'red',
  3: 'blue',
  4: 'yellow',
  5: 'gray'
}

// Pedido de compra completo
export interface PedidoCompra {
  id: number
  numero: number
  data: string
  data_prevista: string
  total_produtos: number
  total: number
  fornecedor_id: number
  situacao: SituacaoPedido
  ordem_compra?: string
  observacoes?: string
  observacoes_internas?: string
  desconto?: number
  total_icms?: number
  total_ipi?: number
  frete?: number
  transportador?: string
  frete_por_conta?: string
  peso_bruto?: number
  volumes?: number
  bling_id?: number
  nota_fiscal_id?: number
  forma_pagamento?: string
  valor_minimo?: number
  bonificacao?: string
  empresa_id: number
  politica_id?: number
}

// Para listagem na tabela
export interface PedidoCompraListItem {
  pedido_id: number
  numero_pedido: number
  data_pedido: string
  fornecedor_nome: string
  fornecedor_id: number
  observacoes_internas?: string
  valor_total: number
  status: string
  qtd_itens: number
  empresa_id: number
}

// Item do pedido
export interface ItemPedidoCompra {
  id?: number
  pedido_compra_id?: number
  produto_id: number
  codigo_produto?: string
  codigo_fornecedor?: string
  descricao: string
  unidade: string
  quantidade: number
  valor: number
  aliquota_ipi: number
  descricao_detalhada?: string
  // Campos calculados/exibicao
  preco_total?: number
  estoque_atual?: number
  estoque_maximo?: number
  ean?: string
}

// Parcela de pagamento
export interface ParcelaPedidoCompra {
  id?: number
  pedido_compra_id?: number
  valor: number
  data_vencimento: string
  observacao?: string
  forma_pagamento_id?: number
  empresa_id?: number
}

// Politica de compra
export interface PoliticaCompra {
  id: number
  empresa_id: number
  fornecedor_id: number
  valor_minimo?: number
  desconto?: number
  bonificacao?: number
  prazo_entrega?: number
  prazo_estoque?: number
  estoque_eficiente?: boolean
  forma_pagamento_dias?: number[]
  observacao?: string
  status?: string
}

// Forma de pagamento
export interface FormaPagamento {
  id: number
  id_forma_de_pagamento_bling?: number
  descricao: string
  tipo_pagamento?: number
  situacao?: number
  empresa_id: number
}

// Sugestao de compra (do validacao_ean)
export interface SugestaoCompra {
  produto_id: number
  nome: string
  codigo: string
  ean?: string
  unidade: string
  estoque_atual: number
  media_venda_dia: number
  dias_estoque_atual: number
  quantidade_sugerida: number
  valor_unitario: number
  valor_total: number
  itens_por_caixa?: number
  volumes?: number
}

// Formulario de criacao/edicao
export interface PedidoCompraFormData {
  fornecedor_id: number
  data: string
  data_prevista: string
  ordem_compra?: string
  observacoes?: string
  observacoes_internas?: string
  desconto: number
  frete: number
  total_icms_st: number
  transportador?: string
  frete_por_conta: string
  politica_id?: number
  itens: ItemPedidoCompra[]
}

// Filtros da listagem
export interface FiltrosPedidoCompra {
  fornecedor_id?: number
  data_inicio?: string
  data_fim?: string
  situacao?: SituacaoPedido
  search?: string
}
```

---

## 2. Tela Principal - Lista de Pedidos (`/src/app/compras/pedidos/page.tsx`)

### Layout
- Header com titulo "Pedido de compras" e contador "X pedidos realizados"
- Seletor de empresa (direita)
- Card principal com:
  - Titulo "Pedidos de compras"
  - Subtitulo "Gerencie seus pedidos de compras"
  - Botao "Filtros" (amarelo #FFAA11)
  - Campo de busca
  - Tabela de pedidos
  - Paginacao
- Sidebar de acoes rapidas (direita, colapsavel)

### Colunas da Tabela
| Coluna | Campo | Largura | Alinhamento |
|--------|-------|---------|-------------|
| Checkbox | selecao | 49px | center |
| Numero | numero_pedido | 66px | center |
| Data | data_pedido | 69px | center |
| Fornecedor | fornecedor_nome | flex | left |
| Obs. internas | observacoes_internas | 142px | left |
| Itens | qtd_itens (icon) | 33px | center |
| Valor (R$) | valor_total | 123px | right |
| Status | status (badge) | 102px | center |
| Email | acao | 29px | center |
| WhatsApp | acao | 35px | center |
| Menu | acoes | 47px | center |

### Estados
```typescript
const [pedidos, setPedidos] = useState<PedidoCompraListItem[]>([])
const [loading, setLoading] = useState(true)
const [searchTerm, setSearchTerm] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')
const [currentPage, setCurrentPage] = useState(1)
const [totalCount, setTotalCount] = useState(0)
const [selectedIds, setSelectedIds] = useState<number[]>([])
const [showFilters, setShowFilters] = useState(false)
const [showSidebar, setShowSidebar] = useState(true)

// Filtros
const [fornecedorFilter, setFornecedorFilter] = useState<number | null>(null)
const [dataInicioFilter, setDataInicioFilter] = useState('')
const [dataFimFilter, setDataFimFilter] = useState('')
const [situacaoFilter, setSituacaoFilter] = useState<SituacaoPedido | null>(null)

// Resumo (sidebar)
const [resumo, setResumo] = useState({ qtd: 0, valorTotal: 0 })
```

### Fetch com RPCs existentes
```typescript
// Busca com filtros
const { data, error } = await supabase.rpc('flowb2b_filter_pedidos_compra_detalhados_usernobling', {
  p_empresa_id: empresaId,
  p_fornecedor_id: fornecedorFilter || null,
  p_data_inicio: dataInicioFilter || null,
  p_data_fim: dataFimFilter || null,
  p_limit: itemsPerPage,
  p_offset: (currentPage - 1) * itemsPerPage
})

// OU busca por texto
const { data, error } = await supabase.rpc('flowb2b_search_pedidos_compra_detalhados_usernobling', {
  p_empresa_id: empresaId,
  p_search_term: debouncedSearch,
  p_limit: itemsPerPage,
  p_offset: (currentPage - 1) * itemsPerPage
})
```

### Sidebar de Acoes Rapidas
```typescript
<SidebarAcoes
  isOpen={showSidebar}
  onToggle={() => setShowSidebar(!showSidebar)}
  resumo={resumo}
  onNovoPedido={() => router.push('/compras/pedidos/novo')}
  onGerarAutomatico={() => router.push('/compras/pedidos/gerar-automatico')}
  onImprimir={() => handleImprimir()}
/>
```

---

## 3. Sidebar de Acoes (`/src/components/pedidos-compra/SidebarAcoes.tsx`)

### Props
```typescript
interface SidebarAcoesProps {
  isOpen: boolean
  onToggle: () => void
  resumo: { qtd: number; valorTotal: number }
  onNovoPedido: () => void
  onGerarAutomatico: () => void
  onImprimir: () => void
}
```

### Estrutura
- Header colapsavel com seta
- Titulo "Acoes rapidas"
- Subtitulo "Explore mais acoes na plataforma"
- Lista de acoes:
  1. **Novo pedido** (icone +, verde #009E3F) -> `/compras/pedidos/novo`
  2. **Gerar pedido automaticamente** (icone varinha, azul #4684CD) -> `/compras/pedidos/gerar-automatico`
  3. **Imprimir pedidos** (icone impressora, cinza #5C5C5C)
- Secao "Resumo":
  - Quantidade de pedidos: {resumo.qtd}
  - Valor total dos pedidos: R$ {resumo.valorTotal}

---

## 4. Criar Pedido Manual (`/src/app/compras/pedidos/novo/page.tsx`)

### Fluxo
1. Usuario clica "Novo pedido" na sidebar
2. Abre modal para selecionar fornecedor
3. Apos selecionar, redireciona para `/compras/pedidos/novo?fornecedor_id=X`
4. Carrega politica de compra automaticamente (se existir)
5. Usuario preenche dados e adiciona produtos
6. Salva pedido (POST /api/pedidos-compra)

### Secoes do Formulario

#### 4.1 Dados Gerais do Pedido
- **Fornecedor**: Campo readonly mostrando nome do fornecedor selecionado
- **Alerta**: Banner amarelo sobre politica de compra automatica

#### 4.2 Detalhe da Compra
| Campo | Tipo | Editavel |
|-------|------|----------|
| Numero do pedido | text | readonly (auto) |
| Ordem de compra | text | sim |
| Data de compra | date | readonly (hoje) |
| Data prevista | date | sim |

#### 4.3 Totais da Compra (Calculadora)
| Campo | Tipo | Editavel | Calculo |
|-------|------|----------|---------|
| Total dos produtos | currency | readonly | SUM(itens.preco_total) |
| Total ICMS ST | currency | sim | - |
| Total ICMS ST (calc) | currency | readonly | - |
| Total do pedido | currency | readonly | total_produtos + icms + frete - desconto |
| No de itens | number | readonly | itens.length |
| Soma das qtds | number | readonly | SUM(itens.quantidade) |
| Desconto (%) | number | sim | - |
| Frete | currency | sim | - |

#### 4.4 Transportador
| Campo | Tipo | Editavel |
|-------|------|----------|
| Nome | text | readonly |
| Frete por conta | select | sim |
| Quantidade | number | readonly |
| Peso Bruto | number | readonly |

Opcoes de Frete por conta:
- 0 - Contratacao do Frete por conta do Remetente (CIF)
- 1 - Contratacao do Frete por conta do Destinatario (FOB)
- 2 - Contratacao do Frete por conta de Terceiros
- 9 - Sem Ocorrencia de Transporte

### Abas (Tabs)
1. **Produtos** (ativa) - Tabela editavel de produtos
2. **Politicas de compras** - Exibe politica aplicada
3. ~~Dados adicionais~~ (nao implementar ainda)
4. ~~Historico~~ (nao implementar ainda)

### Tabela de Produtos
| Coluna | Campo | Editavel |
|--------|-------|----------|
| No | numero sequencial | - |
| Nome do produto | descricao | - |
| EAN | ean | - |
| Codigo SKU | codigo_produto | - |
| Un | unidade | - |
| Qtde | quantidade | **sim** |
| Preco un | valor | **sim** |
| IPI % | aliquota_ipi | **sim** |
| Preco total | preco_total | calculado |
| Estoque Loja atual | estoque_atual | - (barra progresso) |
| Editar | acao | - |
| Historico | acao | - |
| Excluir | acao | - |

### Botao "+ Adicionar produto"
Abre modal para buscar e adicionar produtos:
1. Campo de busca (nome, codigo, EAN)
2. Lista de produtos do fornecedor
3. Campo quantidade
4. Botao "Adicionar"

---

## 5. Gerar Pedido Automatico (`/src/app/compras/pedidos/gerar-automatico/page.tsx`)

### Fluxo
1. Usuario clica "Gerar pedido automaticamente" na sidebar
2. Abre modal para selecionar fornecedor
3. Apos selecionar, chama API `validacao_ean`:
   ```
   POST /calculo_pedido_auto_otimizado/calcular
   Body: { fornecedor_id: X, empresa_id: Y }
   ```
4. Mostra loading com progresso
5. Redireciona para tela de edicao com produtos sugeridos

### Regras de Calculo (validacao_ean)
1. Descarta produtos sem demanda (nunca vendeu + estoque = 0)
2. Ajusta data para produtos com estoque (assume venda recente)
3. Corrige inconsistencias de data
4. Calcula media diaria de vendas
5. Sugestao base = (media x prazo) - estoque
6. Margem de seguranca 25% (quando estoque = 0)
7. Arredonda por embalagem (sempre para cima)
8. Protecao de 1 caixa minima
9. Calculo de valores com desconto

### API Proxy (`/src/app/api/pedidos-compra/calcular-automatico/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.empresaId) return 401

  const { fornecedor_id } = await request.json()

  // Chamar validacao_ean API
  const response = await fetch(
    `${process.env.VALIDACAO_EAN_URL}/calculo_pedido_auto_otimizado/calcular`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fornecedor_id,
        empresa_id: user.empresaId
      })
    }
  )

  const sugestoes = await response.json()
  return NextResponse.json(sugestoes)
}
```

---

## 6. Editar Pedido (`/src/app/compras/pedidos/[id]/editar/page.tsx`)

### Carregamento
```typescript
// Usar RPC existente
const { data: pedido } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
  p_pedido_id: pedidoId
})

// Carregar politicas disponiveis
const { data: politicas } = await supabase.rpc('flowb2b_get_politicas_compra_with_status', {
  p_empresa_id: empresaId,
  p_fornecedor_id: pedido.fornecedor_id,
  p_pedido_id: pedidoId
})

// Carregar formas de pagamento
const { data: formasPagamento } = await supabase
  .from('formas_de_pagamento')
  .select('*')
  .eq('empresa_id', empresaId)
```

### Abas
1. **Produtos** - Tabela editavel (mesma do criar)
2. **Politicas de compras** - Lista de politicas com status de aplicabilidade
3. **Formas de pagamento** - Parcelas geradas automaticamente

### Tab Politica de Compra
- Lista politicas do fornecedor
- Mostra se cada politica e aplicavel (baseado no valor minimo)
- Permite selecionar politica
- Exibe detalhes:
  - Valor minimo
  - Desconto (%)
  - Bonificacao
  - Prazo de entrega
  - Prazo de estoque
  - Dias de pagamento

### Tab Formas de Pagamento
- Exibe parcelas geradas automaticamente baseado na politica
- Campos por parcela:
  - Numero da parcela
  - Valor
  - Data de vencimento
  - Forma de pagamento (dropdown)
- Permite editar valores e datas

---

## 7. API Routes

### 7.1 POST /api/pedidos-compra (Criar)
```typescript
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.empresaId) return 401

  const body: PedidoCompraFormData = await request.json()

  // Validacoes
  if (!body.fornecedor_id) return 400
  if (!body.itens?.length) return 400

  // Usar RPC existente
  const { data, error } = await supabase.rpc('flowb2b_add_pedido_compra', {
    p_empresa_id: user.empresaId,
    p_fornecedor_id: body.fornecedor_id,
    p_data: body.data,
    p_data_prevista: body.data_prevista,
    p_ordem_compra: body.ordem_compra,
    p_observacoes: body.observacoes,
    p_observacoes_internas: body.observacoes_internas,
    p_desconto: body.desconto,
    p_frete: body.frete,
    p_total_icms: body.total_icms_st,
    p_transportador: body.transportador,
    p_frete_por_conta: body.frete_por_conta,
    p_politica_compra_id: body.politica_id,
    p_itens: JSON.stringify(body.itens),
    // ... outros parametros
  })

  if (error) throw error

  return NextResponse.json({ success: true, id: data.pedido_id })
}
```

### 7.2 PUT /api/pedidos-compra (Atualizar)
```typescript
export async function PUT(request: NextRequest) {
  // Similar ao POST, usando flowb2b_edit_pedido_compra
}
```

### 7.3 GET /api/pedidos-compra/[id] (Detalhes)
```typescript
export async function GET(request: NextRequest, { params }) {
  const user = await getCurrentUser()

  const { data } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
    p_pedido_id: params.id
  })

  // Verificar empresa_id
  if (data.empresa_id !== user.empresaId) return 403

  return NextResponse.json(data)
}
```

---

## 8. Componentes Reutilizaveis

### 8.1 TabelaProdutos
```typescript
interface TabelaProdutosProps {
  itens: ItemPedidoCompra[]
  onUpdateItem: (index: number, item: ItemPedidoCompra) => void
  onRemoveItem: (index: number) => void
  onAddItem: () => void
  readOnly?: boolean
}
```

### 8.2 CalculadoraTotais
```typescript
interface CalculadoraTotaisProps {
  totalProdutos: number
  totalIcmsSt: number
  desconto: number
  frete: number
  onDescontoChange: (value: number) => void
  onFreteChange: (value: number) => void
  onIcmsStChange: (value: number) => void
  qtdItens: number
  somaQtds: number
}
```

### 8.3 ProgressoEstoque
```typescript
interface ProgressoEstoqueProps {
  atual: number
  maximo: number
}
// Exibe: "90% (90/100)" com barra verde
```

### 8.4 ModalSelecionarFornecedor
```typescript
interface ModalSelecionarFornecedorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (fornecedor: Fornecedor) => void
}
```

### 8.5 ModalAdicionarProduto
```typescript
interface ModalAdicionarProdutoProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (produto: ItemPedidoCompra) => void
  fornecedorId: number
}
```

---

## 9. Integracao com validacao_ean

### Endpoint Principal
```
POST /calculo_pedido_auto_otimizado/calcular
```

### Request
```json
{
  "fornecedor_id": 123,
  "empresa_id": 456
}
```

### Response
```json
{
  "sugestoes": [
    {
      "produto_id": 1,
      "nome": "Racao Premium",
      "codigo": "RAC001",
      "ean": "7891234567890",
      "unidade": "UN",
      "estoque_atual": 10,
      "media_venda_dia": 2.5,
      "dias_estoque_atual": 4,
      "quantidade_sugerida": 48,
      "valor_unitario": 89.90,
      "valor_total": 4315.20,
      "itens_por_caixa": 12
    }
  ],
  "resumo": {
    "total_itens": 15,
    "valor_total": 12500.00,
    "prazo_entrega_dias": 7
  }
}
```

### Monitoramento (opcional)
```
GET /calculo_pedido_auto_otimizado/monitoramento/{fornecedor_id}
```

---

## 10. Ordem de Implementacao

### Fase 1 - Infraestrutura (1-2 dias)
- [ ] Criar tipos TypeScript (`/src/types/pedido-compra.ts`)
- [ ] Criar estrutura de pastas
- [ ] Configurar rotas no Sidebar

### Fase 2 - Listagem (2-3 dias)
- [ ] Pagina principal (`/compras/pedidos/page.tsx`)
- [ ] Sidebar de acoes rapidas
- [ ] Filtros e busca (usando RPCs existentes)
- [ ] Paginacao server-side
- [ ] Acoes em massa (selecao, exclusao)

### Fase 3 - Criacao Manual (3-4 dias)
- [ ] Modal selecionar fornecedor
- [ ] Pagina de criacao (`/compras/pedidos/novo/page.tsx`)
- [ ] Formulario com secoes (dados gerais, detalhes, totais, transportador)
- [ ] Calculadora de totais
- [ ] Tabela de produtos editavel
- [ ] Modal adicionar produto
- [ ] API POST `/api/pedidos-compra`

### Fase 4 - Geracao Automatica (2-3 dias)
- [ ] Pagina de geracao (`/compras/pedidos/gerar-automatico/page.tsx`)
- [ ] API proxy para validacao_ean
- [ ] Loading com progresso
- [ ] Conversao de sugestoes para itens do pedido

### Fase 5 - Edicao (2-3 dias)
- [ ] Pagina de edicao (`/compras/pedidos/[id]/editar/page.tsx`)
- [ ] Tab Produtos (reutilizar componentes)
- [ ] Tab Politicas de compra
- [ ] Tab Formas de pagamento
- [ ] API PUT `/api/pedidos-compra`

### Fase 6 - Polimento (1-2 dias)
- [ ] Testes de integracao
- [ ] Tratamento de erros
- [ ] Loading states e skeletons
- [ ] Responsividade
- [ ] Acoes de email/WhatsApp

---

## 11. Dependencias Existentes

### Supabase (ja configurado)
- Views: `view_pedidos_compra_detalhados`, `view_pedidos_compra_emitidos`
- RPCs: `flowb2b_filter_pedidos_compra_*`, `flowb2b_search_*`, `flowb2b_add_pedido_compra`, `flowb2b_edit_pedido_compra`
- Tabelas: `pedidos_compra`, `itens_pedido_compra`, `parcelas_pedido_compra`, `politica_compra`, `formas_de_pagamento`

### validacao_ean API
- Endpoint: `/calculo_pedido_auto_otimizado/calcular`
- Requer: `VALIDACAO_EAN_URL` no .env

### Componentes Existentes
- `DashboardLayout`, `PageHeader`
- `Modal`, `Button`, `Input`, `TableSkeleton`
- Patterns de filtros e paginacao (copiar de produtos/fornecedores)

---

## 12. Consideracoes Importantes

1. **Multi-tenant**: TODAS as queries devem filtrar por `empresa_id`
2. **Bling**: Este modulo NAO integra diretamente com Bling (pedidos sao locais)
3. **Politica automatica**: Ao selecionar fornecedor, carregar politica automaticamente
4. **Parcelas automaticas**: Gerar parcelas baseado em `forma_pagamento_dias` da politica
5. **Calculos em tempo real**: Atualizar totais ao editar quantidade/preco/desconto
6. **Estoque visual**: Barra de progresso verde mostrando nivel de estoque

---

## 13. Cores e Estilos (Design System)

| Elemento | Cor |
|----------|-----|
| Primary Blue | #336FB6 |
| Secondary Blue | #4684CD |
| Yellow (filtros) | #FFAA11 |
| Green (novo) | #009E3F |
| Gray (acoes) | #5C5C5C |
| Text Primary | #344054 |
| Text Secondary | #838383 |
| Border | #EDEDED |
| Background | #F9FAFC |
| Card Header | #FBFBFB |
| Progress Green | #24FF20 |

### Status Badges
| Status | Cor Texto | Cor Fundo |
|--------|-----------|-----------|
| Emitida | green | light-green |
| Cancelada | red | light-red |
| Registrada | blue | light-blue |
| Aguardando | yellow | light-yellow |
| Rascunho | gray | light-gray |
