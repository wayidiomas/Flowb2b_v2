import OpenAI from 'openai'
import { PDFDocument } from 'pdf-lib'

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
- "Vl Liq" ou "Preco" = preco_base (decimal com ponto, ex: 12.97)
- "Vl Liq + Imp" = preco_com_impostos
- "Emb" tipo "UN C/ 4" = unidade "UN", itens_por_caixa 4
- "Bonif" = bonificacao
- "(P)PREMIER PET" = marca "PREMIER PET"

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
