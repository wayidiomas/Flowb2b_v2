import OpenAI from 'openai'
import { PDFDocument } from 'pdf-lib'
import { PDFParse } from 'pdf-parse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProdutoExtraido {
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
  categoria: string | null
  _curacao?: 'corrigido' | 'nao_encontrado' | null
}

export interface ExtractionResult {
  success: boolean
  produtos: ProdutoExtraido[]
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function contarPaginasPdf(pdfBuffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
  return doc.getPageCount()
}

async function extrairChunkPdf(pdfBuffer: Buffer, startPage: number, endPage: number): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()

  const actualEnd = Math.min(endPage, totalPages - 1)
  if (startPage > actualEnd) {
    throw new Error(`startPage ${startPage} > totalPages ${totalPages}`)
  }

  const newDoc = await PDFDocument.create()
  const pageIndices = Array.from({ length: actualEnd - startPage + 1 }, (_, i) => startPage + i)
  const pages = await newDoc.copyPages(srcDoc, pageIndices)
  for (const page of pages) {
    newDoc.addPage(page)
  }

  const bytes = await newDoc.save()
  return Buffer.from(bytes)
}

// ---------------------------------------------------------------------------
// Core: extract products from a chunk of PDF pages
// ---------------------------------------------------------------------------

const PROMPT = `Voce e um OCR especializado em catalogos e cotacoes B2B de fornecedores pet.
O sistema armazena produtos com estes campos: codigo_fornecedor, codigo_fabricante, nome, ean (13 digitos), marca, ncm, unidade, itens_por_caixa, preco_base, preco_com_impostos, bonificacao, categoria.

Extraia TODOS os produtos de TODAS as paginas deste trecho de PDF.

Mapeamento de campos (o PDF pode usar nomes diferentes):
- "Cod. Barras" ou "EAN" = ean (13 digitos)
- Codigo entre parenteses no titulo ex "(4035002)" = codigo_fornecedor
- "Cod. Prod. Fabric." = codigo_fabricante
- "Vl Liq" ou "Preco" ou "Preco Unit" = preco_base (decimal com ponto, ex: 12.97)
- "Vl Liq + Imp" ou "Preco + Imp" = preco_com_impostos
- "Emb" tipo "UN C/ 4" = unidade "UN", itens_por_caixa 4
- "Bonif" ou "Bonificacao" = bonificacao (quantidade bonificada, geralmente 0)
- "(P)PREMIER PET" = marca "PREMIER PET"

ATENCAO CRITICA com precos:
- O layout do PDF pode ter labels de colunas misturados com valores. Procure sempre o VALOR MONETARIO associado ao produto.
- "Bonif" NUNCA e preco — e quantidade bonificada, geralmente 0
- "Qtde" NUNCA e preco — e quantidade pedida, geralmente 1
- Se ver um produto com multiplos valores (35.58, 35.58, 35.58), o "preco_base" deve ser o MAIOR valor nao-zero, NAO o zero ou 1
- Se voce estiver em duvida entre varios valores, pegue o que aparece repetido (em cotacoes, Vl Liq, Vl Liq + Imp e Vl Liq Tot costumam ser iguais)
- preco_base NUNCA deve ser 0 se o produto tem um valor visivel no PDF. Se nao achar valor claro, use null (nao 0)

Para o campo "categoria", classifique cada produto em UMA destas categorias baseado no nome/tipo:
- "Racoes Caes" (racao, formula, form, golden form, premier caes)
- "Racoes Gatos" (racao gato, golden gato, premier gato)
- "Petiscos e Snacks" (cookie, biscoito, snack, petisco, sachê)
- "Acessorios e Brinquedos" (brinquedo, pelucia, osso vinil, corda, bola)
- "Ossos e Mordedores" (osso natural, orelha bovina, palito, mordedor)
- "Medicamentos e Saude" (nutricao clinica, nutr clin)
- "Suplementos e Vitaminas" (suplemento, vitamina)
- "Higiene e Banho" (shampoo, condicionador, banho)
- "Outros" (se nao se encaixar em nenhuma)

IMPORTANTE:
- Extraia TODOS os itens, nao pule nenhum
- Valores monetarios no formato brasileiro (1.234,56) devem ser convertidos para decimal (1234.56)
- Se um campo nao e visivel, use null
- Retorne APENAS um JSON array, sem markdown, sem explicacoes`

export async function extrairProdutosDeChunk(
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number,
): Promise<ExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, produtos: [], error: 'Servico de extracao nao configurado.' }
  }

  try {
    const chunkBuffer = await extrairChunkPdf(pdfBuffer, startPage, endPage)
    const base64 = chunkBuffer.toString('base64')

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const resp = await openai.responses.create({
      model: 'gpt-5.4-mini',
      max_output_tokens: 200000,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: PROMPT },
          { type: 'input_file' as const, file_data: `data:application/pdf;base64,${base64}`, filename: `chunk_${startPage}_${endPage}.pdf` },
        ],
      }],
    })

    const text = (resp.output_text || '').trim()
    if (!text) throw new Error('IA retornou resposta vazia')

    let json = text
    const cb = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cb) json = cb[1].trim()
    else {
      const am = text.match(/\[[\s\S]*\]/)
      if (am) json = am[0]
    }

    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) throw new Error('Resposta nao e um array')

    return { success: true, produtos: parsed as ProdutoExtraido[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Erro ao extrair chunk ${startPage}-${endPage}:`, err)
    return { success: false, produtos: [], error: msg }
  }
}

// ---------------------------------------------------------------------------
// Curator: reflexive self-correction loop
// ---------------------------------------------------------------------------

export async function extrairTextoPdf(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

function precisaCuracao(p: ProdutoExtraido): boolean {
  return p.preco_base == null || p.preco_base === 0
}

function localizarProdutoNoTexto(texto: string, produto: ProdutoExtraido): string | null {
  const candidatos: string[] = []
  if (produto.ean) candidatos.push(produto.ean)
  if (produto.codigo_fornecedor) candidatos.push(produto.codigo_fornecedor)
  if (produto.codigo_fabricante) candidatos.push(produto.codigo_fabricante)

  for (const needle of candidatos) {
    const idx = texto.indexOf(needle)
    if (idx !== -1) {
      const start = Math.max(0, idx - 300)
      const end = Math.min(texto.length, idx + 700)
      return texto.slice(start, end)
    }
  }

  if (produto.nome) {
    const primeiras = produto.nome.slice(0, 40)
    const idx = texto.indexOf(primeiras)
    if (idx !== -1) {
      const start = Math.max(0, idx - 200)
      const end = Math.min(texto.length, idx + 700)
      return texto.slice(start, end)
    }
  }

  return null
}

const CURADOR_PROMPT = `Voce recebe um trecho de texto extraido de uma cotacao B2B de fornecedor pet.
Sua tarefa: identificar o PRECO UNITARIO BASE (Vl Liq, Preco, Preco Unit ou similar) do produto indicado.

Regras criticas:
- NAO confunda "Bonif" (bonificacao, quantidade) com preco — quase sempre e 0
- NAO confunda "Qtde" (quantidade pedida) com preco
- O preco costuma aparecer como "Vl Liq", "Vl Liq Tot" ou "Vl Liq + Imp" — todos devem ser iguais ao preco unitario numa cotacao padrao
- Formato brasileiro (1.234,56) deve virar 1234.56
- Se nao conseguir identificar com certeza, retorne null

Retorne APENAS um JSON no formato:
{"preco_base": 35.58}
ou
{"preco_base": null}

Sem markdown, sem explicacao.`

async function recuperarPrecoProduto(
  openai: OpenAI,
  janela: string,
  produto: ProdutoExtraido,
): Promise<number | null> {
  const userMsg = `Produto alvo:
- Nome: ${produto.nome}
- Codigo fornecedor: ${produto.codigo_fornecedor || '(sem)'}
- EAN: ${produto.ean || '(sem)'}
- Codigo fabricante: ${produto.codigo_fabricante || '(sem)'}

Trecho da cotacao:
"""
${janela}
"""`

  const resp = await openai.responses.create({
    model: 'gpt-5.4-mini',
    reasoning: { effort: 'medium' },
    max_output_tokens: 2000,
    input: [
      { role: 'system', content: CURADOR_PROMPT },
      { role: 'user', content: userMsg },
    ],
  })

  const text = (resp.output_text || '').trim()
  if (!text) return null

  let json = text
  const cb = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (cb) json = cb[1].trim()
  else {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) json = m[0]
  }

  try {
    const parsed = JSON.parse(json) as { preco_base: number | null }
    const v = parsed.preco_base
    if (typeof v === 'number' && v > 0) return v
    return null
  } catch {
    return null
  }
}

export async function curarProdutos(
  pdfBuffer: Buffer,
  produtos: ProdutoExtraido[],
): Promise<{ produtos: ProdutoExtraido[]; corrigidos: number; naoCorrigidos: number; flagados: number }> {
  if (!process.env.OPENAI_API_KEY) {
    return { produtos, corrigidos: 0, naoCorrigidos: 0, flagados: 0 }
  }

  const flagados = produtos
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => precisaCuracao(p))

  if (flagados.length === 0) {
    return { produtos, corrigidos: 0, naoCorrigidos: 0, flagados: 0 }
  }

  let texto: string
  try {
    texto = await extrairTextoPdf(pdfBuffer)
  } catch (err) {
    console.error('Curador: falha pdf-parse:', err)
    return { produtos, corrigidos: 0, naoCorrigidos: flagados.length, flagados: flagados.length }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const corrigidos: ProdutoExtraido[] = [...produtos]
  let countCorrigidos = 0
  let countNaoCorrigidos = 0

  const BATCH_SIZE = 10
  const DELAY_MS = 350

  for (let i = 0; i < flagados.length; i += BATCH_SIZE) {
    const batch = flagados.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map(async ({ p, idx }) => {
        const janela = localizarProdutoNoTexto(texto, p)
        if (!janela) return { idx, preco: null as number | null }
        try {
          const preco = await recuperarPrecoProduto(openai, janela, p)
          return { idx, preco }
        } catch (err) {
          console.error('Curador: falha recuperar preco:', err)
          return { idx, preco: null as number | null }
        }
      }),
    )

    for (const { idx, preco } of results) {
      if (preco != null) {
        corrigidos[idx] = { ...corrigidos[idx], preco_base: preco, _curacao: 'corrigido' }
        countCorrigidos++
      } else {
        corrigidos[idx] = { ...corrigidos[idx], _curacao: 'nao_encontrado' }
        countNaoCorrigidos++
      }
    }

    if (i + BATCH_SIZE < flagados.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`[CURADOR] flagados=${flagados.length} corrigidos=${countCorrigidos} nao_encontrados=${countNaoCorrigidos}`)

  return {
    produtos: corrigidos,
    corrigidos: countCorrigidos,
    naoCorrigidos: countNaoCorrigidos,
    flagados: flagados.length,
  }
}
