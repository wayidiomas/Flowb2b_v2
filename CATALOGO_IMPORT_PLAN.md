# Catálogo Import — Plano de Implementação

## Visão Geral

Sistema completo para importação, atualização e sincronização de catálogos de fornecedores via PDF, com extração de dados por IA, busca automatizada de imagens por EAN (via projeto `validacao_ean-master`), e sincronização bidirecional com Bling.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                   FlowB2B_Client (Next.js)                       │
│                                                                  │
│  Fornecedor sobe PDF ──► IA OCR (GPT-5.4-mini Vision)           │
│  Extrai produtos      ──► Salva em catalogo_itens               │
│  Para cada produto    ──► Chama validacao_ean API                │
│  Recebe image_url     ──► Download + Upload Supabase Storage    │
│  Diff (re-upload)     ──► Notifica lojistas                     │
│  Lojista aceita       ──► Sync Bling API v3                     │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                   HTTP (fetch server-side)
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│             validacao_ean-master (Python/FastAPI)                 │
│             Render: validacao-ean-cwrd.onrender.com              │
│                                                                  │
│  JÁ EXISTE:                                                      │
│  ├─ GET /cobasi_ean/produto/{ean}     (requests + BS4)           │
│  ├─ GET /petz_ean/produto/{nome}      (Selenium + validação EAN) │
│  ├─ GET /validacao_ean/validar_ean/   (dígito verificador)       │
│  └─ POST /cobasi_api/uploadfile/      (batch Excel→Cobasi)       │
│                                                                  │
│  NOVOS ENDPOINTS:                                                │
│  ├─ GET /petlove_ean/produto/{ean}    (requests + BS4)           │
│  ├─ GET /amazon_ean/produto/{ean}     (requests + BS4)           │
│  ├─ GET /ml_ean/produto/{ean}         (requests + BS4)           │
│  ├─ GET /magalu_ean/produto/{ean}     (requests + BS4)           │
│  └─ POST /scraper/buscar_imagem       (orquestrador cascata)     │
│     Body: { ean, nome }                                          │
│     Retorna: { image_url, source, titulo, confiavel }            │
│     Cascata interna: Cobasi→Petlove→Amazon→ML→Magalu→Petz       │
│     Rate limiting: 3-10s entre sites, pausa 60s a cada 100 req   │
└──────────────────────────────────────────────────────────────────┘
```

### Por que usar validacao_ean-master?

1. **Já roda em Python** — BeautifulSoup e Selenium são padrão de mercado para scraping
2. **Já deploy no Render** — infraestrutura separada, não sobrecarrega Next.js
3. **Cobasi e Petz já implementados** — só precisam atualizar seletores
4. **Petz precisa Selenium** — renderiza com JS, impossível com `fetch` puro
5. **Padrão BackgroundTasks** — já usa `FastAPI.BackgroundTasks` para processamento (ver `Detalhamento_de_produtos_flowb2b.py`)
6. **Batch processing existe** — `cobasi_api.py` já processa lista de EANs e envia resultado via webhook

---

## SPRINT 1 — Extração de Dados do PDF via IA

### Objetivo
Extrair todos os produtos de um PDF de catálogo/cotação usando IA Vision, independente do formato.

### Dados extraídos (baseado na Cotação CDA Nº 722)
Cada produto contém:
- **Código fornecedor**: `(4035002)` — entre parênteses no título
- **Cód. Prod. Fabricante**: `3035-002`
- **Nome**: `GOLDEN COOKIE CÃES AD 350G`
- **Marca/Fabricante**: `(P)PREMIER PET`
- **EAN**: `7897348207566` (13 dígitos)
- **NCM**: `2309.90.30`
- **Embalagem**: `UN C/ 1`
- **Valor Líquido**: `12,97`
- **Vl Líq + Imp**: `12,97`
- **Bonificação**: `0`

### Schema padronizado
```typescript
interface ProdutoExtraido {
  codigo_fornecedor: string | null
  codigo_fabricante: string | null
  nome: string
  ean: string | null
  marca: string | null
  ncm: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_base: number
  preco_com_impostos: number | null
  bonificacao: number | null
}
```

### Implementação

#### 1.1 — UI: Modal de Upload
**Arquivo**: `src/app/fornecedor/catalogo/page.tsx` (alterar)

Botão "Importar Catálogo" abre modal com:
- **"Enviar PDF"** — ativo, drag & drop, aceita `.pdf` até 50MB
- **"Enviar Excel"** — desabilitado, badge "Em breve"
- Progress bar durante processamento
- Preview dos produtos extraídos antes de confirmar

#### 1.2 — API: Upload + Start Job
**Arquivo**: `src/app/api/fornecedor/catalogo/importar-pdf/route.ts`

```
POST /api/fornecedor/catalogo/importar-pdf
Content-Type: multipart/form-data
Body: { file: PDF }
Response: { job_id, total_pages, status: 'processing' }
```

1. Valida user é fornecedor
2. Salva PDF no Supabase Storage (`catalogo-pdfs/{catalogo_id}/{timestamp}.pdf`)
3. Cria registro em `catalogo_import_jobs`
4. Inicia processamento em background (Edge Function ou API route com streaming)
5. Retorna `job_id`

#### 1.3 — Extractor IA
**Arquivo**: `src/lib/catalogo-pdf-extractor.ts`

Para cada página do PDF:
1. Converte página em imagem (via `pdf2pic` ou `sharp`)
2. Envia para GPT-5.4-mini Vision

**Prompt (com contexto do banco):**
```
Você é um OCR especializado em catálogos e cotações B2B de fornecedores.
O sistema FlowB2B armazena produtos com estes campos:
- codigo (código do fornecedor)
- nome (descrição do produto)
- ean/gtin (código de barras, 13 dígitos)
- marca
- unidade (UN, CX, FD, PCT)
- itens_por_caixa
- preco_base (valor líquido sem impostos)
- ncm

Extraia TODOS os produtos desta página.
O formato do PDF pode variar entre fornecedores.
Identifique os campos mesmo que estejam com nomes diferentes:
- "Cód. Barras" = ean
- "Cód. Prod. Fabric." = codigo_fabricante
- "Vl Líq" = preco_base
- "Emb" UN C/ X = unidade UN, itens_por_caixa X
- Código entre parênteses no título = codigo_fornecedor

Retorne APENAS JSON array. Valores monetários como decimais com ponto (12.97).
Se um campo não é visível, use null.
```

3. Parse JSON, acumula produtos
4. Atualiza progresso no job a cada página

#### 1.4 — API: Polling Status
**Arquivo**: `src/app/api/fornecedor/catalogo/importar-pdf/[jobId]/route.ts`

```
GET /api/fornecedor/catalogo/importar-pdf/{jobId}
Response: {
  status: 'processing' | 'extracted' | 'completed' | 'error',
  progress: { current_page, total_pages, products_found },
  produtos?: ProdutoExtraido[]  // quando status = 'extracted'
}
```

#### 1.5 — Tela de Revisão
Após extração, fornecedor vê tabela com todos os produtos extraídos:
- Pode editar campos antes de confirmar
- Pode remover produtos incorretos
- Botão "Confirmar e Criar Catálogo"

#### 1.6 — Migration

```sql
CREATE TABLE catalogo_import_jobs (
  id SERIAL PRIMARY KEY,
  catalogo_id INTEGER REFERENCES catalogo_fornecedor(id),
  fornecedor_user_id INTEGER REFERENCES users_fornecedor(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, extracted, saving, completed, error
  pdf_url TEXT,
  total_pages INTEGER,
  current_page INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  produtos_json JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tasks Sprint 1
```
1.1  Modal de upload com drag & drop (UI)
1.2  API upload PDF + salvar Storage + criar job
1.3  Lib extrator IA (pdf → imagens → GPT Vision → JSON)
1.4  API polling status do job
1.5  Tela de revisão (tabela editável dos produtos extraídos)
1.6  Migration catalogo_import_jobs
1.7  Botão "Confirmar" → salva em catalogo_itens
1.8  Testes com PDF da CDA (146 páginas)
```

---

## SPRINT 2 — Scraping de Imagens (validacao_ean-master)

### Objetivo
Adicionar 4 novos scrapers ao projeto Python e criar endpoint orquestrador que faz a cascata dos 6 sites.

### Projeto: `validacao_ean-master` (Python/FastAPI)
**Repo**: `/Users/lucassouza/Projects/Macbook/validacao_ean-master`
**Deploy**: Render (`validacao-ean-cwrd.onrender.com`)

### Código existente a reaproveitar

| Arquivo | O que faz | Status |
|---------|----------|--------|
| `cobasi_ean_api.py` | Busca Cobasi por EAN, extrai nome/preço/imagem/ficha | **Atualizar seletores** (classes CSS mudaram) |
| `petz_ean_api.py` | Busca Petz por nome via Selenium, valida EAN na ficha | **Atualizar seletores** |
| `cobasi_api.py` | Batch: recebe Excel de EANs, busca todos na Cobasi | **Modelo para batch** |
| `validacao_ean.py` | Valida dígito verificador EAN-13 | **Usar como está** |
| `scrapping_cobasi.py` | Script standalone de scraping Cobasi | Referência |

### Novos arquivos no validacao_ean-master

```
validacao_ean-master/
├── main.py                          # Atualizar: incluir novos routers
├── cobasi_ean_api.py                # ATUALIZAR: seletores CSS
├── petz_ean_api.py                  # ATUALIZAR: seletores CSS
├── petlove_ean_api.py               # NOVO
├── amazon_ean_api.py                # NOVO
├── mercadolivre_ean_api.py          # NOVO
├── magalu_ean_api.py                # NOVO
├── scraper_orquestrador.py          # NOVO: cascata + rate limiting
└── requirements.txt                 # Atualizar
```

### 2.1 — Atualizar Cobasi (`cobasi_ean_api.py`)

Seletores atuais estão desatualizados (Cobasi migrou para VTEX).

**Mapeamento atualizado (testado via Playwright abril/2026):**
```python
# Busca
url = f"https://www.cobasi.com.br/pesquisa?terms={ean}"

# Resultado de busca — imagem direto do card (sem precisar clicar no produto)
# A Cobasi retorna imagens como: cobasi.vtexassets.com/arquivos/ids/{id}/{slug}.jpg
# Seletor: primeiro <a> com link de produto, dentro dele <img>
produto_link = soup.select_one('a[href*="/p?idsku="]')
img = produto_link.select_one('img') if produto_link else None
image_url = img['src'] if img else None
titulo = soup.select_one('h3').text if soup.select_one('h3') else None
```

### 2.2 — Novo: Petlove (`petlove_ean_api.py`)

```python
# Busca por EAN
url = f"https://www.petlove.com.br/busca?q={ean}"

# Resultado: 1 produto exato
# Seletor imagem: img[alt*="nome_do_produto"] no card
# URL imagem: petlove.com.br/images/products/{id}/small/{slug}.jpg
# Requests + BS4 funciona (não precisa Selenium)
```

### 2.3 — Novo: Amazon (`amazon_ean_api.py`)

```python
# Busca por EAN
url = f"https://www.amazon.com.br/s?k={ean}"

# Resultado: 1 produto exato
# Seletor imagem: .s-result-item img.s-image
# URL imagem: m.media-amazon.com/images/I/{id}._AC_UL320_.jpg
# IMPORTANTE: Amazon pode bloquear sem headers adequados
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    'Accept-Language': 'pt-BR,pt;q=0.9'
}
```

### 2.4 — Novo: Mercado Livre (`mercadolivre_ean_api.py`)

```python
# Busca por EAN
url = f"https://lista.mercadolivre.com.br/{ean}"

# Resultado: vários produtos (mesmo EAN = mesmo produto, sellers diferentes)
# Seletor imagem: .poly-card img[src*="mlstatic.com/D_"]
# URL imagem: http2.mlstatic.com/D_NQ_NP_{id}.webp (alta res)
# IMPORTANTE: limpar cookies/session antes, rate limiting agressivo
# Padrão URLs ML:
#   D_Q_NP_2X_ = thumbnail busca
#   D_NQ_NP_   = imagem produto original
#   Sufixo: -E = thumb, -O = original, -F = zoom
```

### 2.5 — Novo: Magazine Luiza (`magalu_ean_api.py`)

```python
# Busca por EAN
url = f"https://www.magazineluiza.com.br/busca/{ean}"

# Resultado: vários sellers do mesmo produto
# Seletor imagem: li a[href*="/p/"] img com alt contendo nome do produto
# URL imagem: a-static.mlcdn.com.br/280x210/{slug}/{id}.jpeg
# Requests + BS4 funciona
```

### 2.6 — Atualizar Petz (`petz_ean_api.py`)

**Já funciona** — busca por nome via Selenium, valida EAN na ficha técnica.
Atualizar seletores CSS (testado abril/2026):
```python
# Busca por NOME (não EAN)
url = f"https://www.petz.com.br/busca?q={nome_produto}"

# Seletores atualizados:
# Imagem: images.petz.com.br/fotos/{id}_mini.jpg
# Validação: entrar na página do produto, buscar EAN na ficha técnica
# Se EAN bate → confiável. Se não bate → rejeitar.
```

### 2.7 — Orquestrador (`scraper_orquestrador.py`)

Endpoint principal que o Next.js chama:

```python
from fastapi import APIRouter
from pydantic import BaseModel
import time
import random

router = APIRouter()

# Contadores de rate limiting
request_count = 0
last_reset = time.time()

class BuscarImagemRequest(BaseModel):
    ean: str
    nome: str

class BuscarImagemResponse(BaseModel):
    success: bool
    ean: str
    image_url: str | None
    source: str | None        # 'cobasi', 'petlove', 'amazon', 'ml', 'magalu', 'petz'
    titulo: str | None        # nome encontrado no site
    confiavel: bool           # True se match por EAN exato
    error: str | None

@router.post("/buscar_imagem")
async def buscar_imagem(req: BuscarImagemRequest) -> BuscarImagemResponse:
    """
    Cascata de busca de imagem por EAN em 6 sites.
    Prioridade: Cobasi → Petlove → Amazon → ML → Magalu → Petz
    """
    global request_count, last_reset

    # Rate limiting: pausa 60s a cada 100 requests
    if request_count >= 100:
        elapsed = time.time() - last_reset
        if elapsed < 60:
            time.sleep(60 - elapsed)
        request_count = 0
        last_reset = time.time()

    # Validar EAN
    if not req.ean or len(req.ean) != 13 or not req.ean.isdigit():
        # Sem EAN válido: tentar apenas Petz por nome
        resultado = buscar_petz(req.nome, req.ean)
        if resultado:
            return BuscarImagemResponse(success=True, confiavel=False, **resultado)
        return BuscarImagemResponse(success=False, ean=req.ean, error="EAN inválido e busca por nome falhou")

    # Cascata por EAN
    sites = [
        ("cobasi", buscar_cobasi),
        ("petlove", buscar_petlove),
        ("amazon", buscar_amazon),
        ("ml", buscar_mercadolivre),
        ("magalu", buscar_magalu),
    ]

    for source, buscar_fn in sites:
        try:
            # Delay entre requests: 3-10 segundos
            delay = random.uniform(3, 10)
            time.sleep(delay)
            request_count += 1

            resultado = buscar_fn(req.ean)
            if resultado and resultado.get("image_url"):
                return BuscarImagemResponse(
                    success=True,
                    ean=req.ean,
                    image_url=resultado["image_url"],
                    source=source,
                    titulo=resultado.get("titulo"),
                    confiavel=True,  # EAN exato
                    error=None
                )
        except Exception as e:
            continue  # Próximo site

    # Fallback: Petz por nome
    try:
        time.sleep(random.uniform(3, 10))
        request_count += 1
        resultado = buscar_petz(req.nome, req.ean)
        if resultado and resultado.get("image_url"):
            return BuscarImagemResponse(
                success=True,
                ean=req.ean,
                image_url=resultado["image_url"],
                source="petz",
                titulo=resultado.get("titulo"),
                confiavel=resultado.get("ean_correto", False),
                error=None
            )
    except Exception:
        pass

    return BuscarImagemResponse(
        success=False, ean=req.ean,
        image_url=None, source=None, titulo=None,
        confiavel=False, error="Imagem não encontrada em nenhum site"
    )
```

### 2.8 — Endpoint Batch

```python
@router.post("/buscar_imagens_batch")
async def buscar_imagens_batch(
    request: BatchRequest,
    background_tasks: BackgroundTasks
):
    """
    Processa lista de EANs em background.
    Envia resultado via webhook quando terminar.
    """
    background_tasks.add_task(
        processar_batch_imagens,
        produtos=request.produtos,
        webhook_url=request.webhook_url,
        catalogo_id=request.catalogo_id
    )
    return {"message": "Processamento iniciado", "total": len(request.produtos)}
```

### 2.9 — Integração no Next.js

**Arquivo**: `src/lib/catalogo-image-scraper.ts`

```typescript
const SCRAPER_API = process.env.VALIDACAO_EAN_URL // https://validacao-ean-cwrd.onrender.com

export async function buscarImagemProduto(ean: string, nome: string) {
  const res = await fetch(`${SCRAPER_API}/scraper/buscar_imagem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ean, nome }),
  })
  return res.json()
}
```

Após receber `image_url`:
1. Download da imagem via `fetch`
2. Upload para Supabase Storage: `catalogo-imagens/{catalogo_id}/{ean}.jpg`
3. Atualiza `catalogo_itens.imagem_url` com URL do Storage

### Tasks Sprint 2
```
2.1  Atualizar cobasi_ean_api.py (seletores CSS)
2.2  Criar petlove_ean_api.py
2.3  Criar amazon_ean_api.py
2.4  Criar mercadolivre_ean_api.py
2.5  Criar magalu_ean_api.py
2.6  Atualizar petz_ean_api.py (seletores CSS)
2.7  Criar scraper_orquestrador.py (cascata + rate limiting)
2.8  Endpoint batch com webhook (background)
2.9  Integração Next.js: chamar API + upload Supabase Storage
2.10 Atualizar main.py com novos routers
2.11 Atualizar requirements.txt
2.12 Deploy no Render
2.13 Progress bar na UI do fornecedor (imagens sendo buscadas)
2.14 Testar com 50 EANs do catálogo CDA
```

---

## SPRINT 3 — Diff & Atualização de Catálogo

### Objetivo
Quando fornecedor re-sobe PDF, detectar o que mudou e atualizar o catálogo.

### Tipos de Mudança

| Tipo | Detecção | Ação |
|------|----------|------|
| **Produto novo** | EAN/código não existe no catálogo | Adicionar + buscar imagem |
| **Produto removido** | Existe no catálogo mas não no PDF | Marcar `ativo = false` |
| **Preço alterado** | Mesmo EAN/código, preço diferente | Atualizar `preco_base` |
| **Dados alterados** | Nome, marca, embalagem mudou | Atualizar campos |
| **Sem mudança** | Tudo igual | Ignorar |

### Algoritmo de Matching
```
1. Match por EAN (exato, 13 dígitos)
2. Fallback: match por codigo_fornecedor
3. Fallback: match por nome (similaridade > 90%)
4. Sem match: produto novo
```

### Diff Engine
**Arquivo**: `src/lib/catalogo-diff.ts`

```typescript
interface CatalogoDiff {
  novos: ProdutoExtraido[]
  removidos: CatalogoItem[]
  preco_alterado: Array<{
    item: CatalogoItem
    preco_antigo: number
    preco_novo: number
    variacao_percentual: number
  }>
  dados_alterados: Array<{
    item: CatalogoItem
    mudancas: { campo: string; antigo: any; novo: any }[]
  }>
  sem_mudanca: number
}
```

### Tela de Review (Fornecedor)
- Seções colapsáveis: Novos (X), Removidos (X), Preço Alterado (X), Dados Alterados (X)
- Fornecedor pode ajustar antes de confirmar
- Botão "Aplicar Mudanças e Notificar Lojistas"

### Ao confirmar:
1. Atualiza `catalogo_itens` (novos, removidos, alterados)
2. Busca imagem para produtos NOVOS e SEM imagem (Sprint 2)
3. Cria registros em `catalogo_atualizacoes` para cada lojista vinculado
4. Envia notificação

### Migration

```sql
CREATE TABLE catalogo_atualizacoes (
  id SERIAL PRIMARY KEY,
  catalogo_id INTEGER REFERENCES catalogo_fornecedor(id),
  empresa_id INTEGER REFERENCES empresas(id),
  tipo VARCHAR(20) NOT NULL,   -- 'novo', 'removido', 'preco', 'dados'
  catalogo_item_id INTEGER REFERENCES catalogo_itens(id),
  dados_antigos JSONB,
  dados_novos JSONB,
  status VARCHAR(20) DEFAULT 'pendente',  -- 'pendente', 'aceito', 'rejeitado'
  respondido_por INTEGER REFERENCES users(id),
  respondido_em TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_catalogo_atualizacoes_empresa ON catalogo_atualizacoes(empresa_id, status);
CREATE INDEX idx_catalogo_atualizacoes_catalogo ON catalogo_atualizacoes(catalogo_id, status);
```

### Tasks Sprint 3
```
3.1  Diff engine (lib)
3.2  Tela review fornecedor (UI diff com seções)
3.3  API aplicar mudanças (atualiza catalogo_itens + cria notificações)
3.4  Migration catalogo_atualizacoes
3.5  Trigger busca imagem para produtos novos (reusa Sprint 2)
3.6  Testes: re-upload PDF com mudanças simuladas
```

---

## SPRINT 4 — Modal de Validação (Lojista)

### Objetivo
Lojista recebe modal quando fornecedor atualiza catálogo. Pode aceitar tudo ou item a item. Itens rejeitados voltam pro fornecedor.

### Modal de Atualização

```
┌──────────────────────────────────────────────────────────────┐
│  🔔 Atualização de Catálogo — PREMIER :: GOLDEN              │
│  O fornecedor atualizou 23 itens. Revise as mudanças.        │
│                                                              │
│  [✓ Aceitar Tudo]                                            │
│                                                              │
│  ── Novos (12) ──────────────────────────────────────────    │
│  ☑ GOLDEN FORM CAES AD CARNE 15KG         R$ 131,94         │
│  ☑ GOLDEN FORM CAES AD FRANGO 20KG        R$ 150,05         │
│                                                              │
│  ── Preço Alterado (8) ──────────────────────────────────    │
│  ☑ GOLDEN COOKIE AD 350G    R$ 11,52 → R$ 12,97  (+12.6%)  │
│  ☑ GOLDEN COOKIE FIL 350G   R$ 11,52 → R$ 12,97  (+12.6%)  │
│  ☐ GOLDEN FORM AD 10KG      R$ 107,43 → R$ 125,00 (+16.3%) │
│                                                              │
│  ── Removidos (3) ───────────────────────────────────────    │
│  ☑ GOLDEN COOKIE AD KRYPTO 350G   (será inativado)          │
│                                                              │
│  [Aplicar Selecionados]  [Rejeitar Não-Selecionados]        │
└──────────────────────────────────────────────────────────────┘
```

### Fluxos

**Aceitar tudo:**
- Marca todos como `aceito` em `catalogo_atualizacoes`
- Trigger Bling sync (Sprint 5) se lojista usa Bling

**Aceitar item a item:**
- Checkboxes por item
- Aceitos → aplicar mudanças + Bling sync
- Não-selecionados → `status = 'rejeitado'`

**Item rejeitado:**
- Aparece na tela do fornecedor/representante: "Lojista X rejeitou alteração do produto Y"
- Fornecedor pode ajustar preço e reenviar

### Detecção de Pendentes
No `DashboardLayout`, checar periodicamente (a cada 5 min ou on focus):
```
GET /api/catalogo-atualizacoes/pendentes
→ { tem_pendentes: true, total: 23, fornecedor: "PREMIER :: GOLDEN" }
```

### Implementação

#### Componente
**Arquivo**: `src/components/catalogo/CatalogoUpdateModal.tsx`

#### APIs
```
GET  /api/catalogo-atualizacoes/pendentes         (tem updates?)
GET  /api/catalogo-atualizacoes/{catalogoId}       (lista mudanças)
POST /api/catalogo-atualizacoes/responder          (aceitar/rejeitar)
     Body: { ids: [1,2,3], acao: 'aceitar' | 'rejeitar' }
```

#### Fornecedor: Tela de Respostas
Na página do catálogo do fornecedor, seção "Respostas dos Lojistas":
- Quais lojistas aceitaram/rejeitaram
- Itens rejeitados com motivo
- Botão "Reenviar com novo preço"

### Tasks Sprint 4
```
4.1  API: GET pendentes
4.2  API: GET lista mudanças por catálogo
4.3  API: POST aceitar/rejeitar (batch)
4.4  Component: CatalogoUpdateModal
4.5  Integrar modal no DashboardLayout (detecta pendentes)
4.6  Tela fornecedor: respostas dos lojistas
4.7  Notificação de rejeição pro fornecedor
4.8  Testes E2E: fluxo completo update → validação → aceite/rejeição
```

---

## SPRINT 5 — Bling Sync (API v3)

### Objetivo
Sincronizar mudanças aceitas pelo lojista com o ERP Bling.

### Bling API v3 — Endpoints (pesquisar com context7)

| Ação | Endpoint | Método |
|------|----------|--------|
| Buscar produto por GTIN | `GET /produtos?gtin={ean}` | GET |
| Criar produto | `POST /produtos` | POST |
| Atualizar produto | `PUT /produtos/{id}` | PUT |
| Inativar produto | `PUT /produtos/{id}` com `situacao: 'I'` | PUT |
| Listar fornecedores do produto | `GET /produtos/{id}/fornecedores` | GET |
| Vincular fornecedor | `POST /produtos/{id}/fornecedores` | POST |

### Mapeamento FlowB2B → Bling

| FlowB2B (catalogo_itens) | Bling (produto) |
|--------------------------|-----------------|
| nome | nome |
| codigo | codigo |
| ean | gtin |
| marca | marca |
| unidade | unidade |
| ncm | tributacao.ncm |
| preco_base | precoCusto (via fornecedor) |

### Fluxo

```
Lojista aceita atualização em catalogo_atualizacoes
    ↓
Verificar: lojista tem Bling conectado? (empresas.conectadabling = true)
    ↓ Sim
Para cada item aceito:
    ↓
1. Buscar produto no Bling por GTIN
   GET /produtos?gtin={ean}
    ↓
2a. Se existe → atualizar preço de custo
    PUT /produtos/{bling_id}
    ↓
2b. Se não existe → criar produto
    POST /produtos { nome, gtin, codigo, preco, unidade, marca }
    ↓
3. Se removido → inativar
   PUT /produtos/{bling_id} { situacao: 'I' }
    ↓
4. Atualizar fornecedores_produtos no Supabase
   (valor_de_compra = novo preco_base)
```

### Rate Limiting Bling
- 300 req/min (5 req/s)
- Delay de 200ms entre requests
- Retry com backoff exponencial (já existe em `flowB2BAPI`)

### Tasks Sprint 5
```
5.1  Pesquisar Bling API v3: endpoints produtos + fornecedores (context7)
5.2  Lib: catalogo-bling-sync.ts (create/update/inactivate)
5.3  API: trigger sync após aceite do lojista
5.4  Fila com rate limiting (200ms delay)
5.5  Log de sync: sucesso/erro por item
5.6  UI: status do sync na tela do lojista
5.7  Atualizar fornecedores_produtos no Supabase
5.8  Testes com Bling sandbox
```

---

## Resumo de Arquivos

### FlowB2B_Client (Next.js)
```
# APIs
src/app/api/fornecedor/catalogo/importar-pdf/route.ts
src/app/api/fornecedor/catalogo/importar-pdf/[jobId]/route.ts
src/app/api/fornecedor/catalogo/processar-imagens/route.ts
src/app/api/fornecedor/catalogo/aplicar-diff/route.ts
src/app/api/catalogo-atualizacoes/pendentes/route.ts
src/app/api/catalogo-atualizacoes/[catalogoId]/route.ts
src/app/api/catalogo-atualizacoes/responder/route.ts
src/app/api/catalogo-atualizacoes/sync-bling/route.ts

# Libs
src/lib/catalogo-pdf-extractor.ts
src/lib/catalogo-image-scraper.ts   (chama validacao_ean API)
src/lib/catalogo-diff.ts
src/lib/catalogo-bling-sync.ts

# Components
src/components/catalogo/ImportPdfModal.tsx
src/components/catalogo/ImportProgress.tsx
src/components/catalogo/CatalogoDiffView.tsx
src/components/catalogo/CatalogoUpdateModal.tsx
```

### validacao_ean-master (Python/FastAPI)
```
# Atualizar
cobasi_ean_api.py        (seletores CSS)
petz_ean_api.py          (seletores CSS)
main.py                  (novos routers)
requirements.txt

# Criar
petlove_ean_api.py
amazon_ean_api.py
mercadolivre_ean_api.py
magalu_ean_api.py
scraper_orquestrador.py  (cascata + rate limiting + batch)
```

### Migrations
```
catalogo_import_jobs
catalogo_atualizacoes
+ catalogo_itens.ean (se não existe)
+ catalogo_itens.ncm (se não existe)
```

---

## Ordem de Execução

| Sprint | Dep. | Esforço | Valor |
|--------|------|---------|-------|
| **1** PDF → IA | Nenhuma | Alto | Crítico |
| **2** Imagens (Python) | Sprint 1 | Médio | Alto |
| **3** Diff/Update | Sprint 1 | Médio | Alto |
| **4** Modal lojista | Sprint 3 | Médio | Alto |
| **5** Bling sync | Sprint 4 | Alto | Médio |

Sprint 2 e 3 podem rodar em paralelo após Sprint 1.
