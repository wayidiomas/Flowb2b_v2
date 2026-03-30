import * as XLSX from 'xlsx'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportRow {
  linha: number
  codigo_fornecedor: string | null
  ean: string | null
  nome: string | null
  marca: string | null
  unidade: string | null
  tipo_embalagem: string | null
  itens_por_caixa: number | null
  preco: number | null
  imagem_url: string | null
}

export interface ImportValidationResult {
  validos: ImportRow[]
  erros: Array<{ linha: number; campo: string; mensagem: string }>
}

// ---------------------------------------------------------------------------
// Template Generator
// ---------------------------------------------------------------------------

const HEADERS = [
  'codigo_fornecedor',
  'ean',
  'nome',
  'marca',
  'unidade',
  'tipo_embalagem',
  'itens_por_caixa',
  'preco',
  'imagem_url',
] as const

/**
 * Generates an .xlsx template file with example rows for bulk product import.
 * Returns a Buffer suitable for sending as a download response.
 */
export function generateTemplate(): Buffer {
  const wb = XLSX.utils.book_new()

  const data: (string | number)[][] = [
    [...HEADERS],
    ['6001', '7898652420405', 'PET WORKS RASQUEADEIRA N2', 'PET WORKS', 'UN', 'UN', 1, 10.45, ''],
    ['4006089', '7897348205258', 'GOLDEN CARNE MB 1KG', 'GOLDEN', 'UN', 'FD', 4, 15.44, 'https://exemplo.com/foto.jpg'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)

  ws['!cols'] = [
    { wch: 18 }, // codigo_fornecedor
    { wch: 16 }, // ean
    { wch: 40 }, // nome
    { wch: 15 }, // marca
    { wch: 8 },  // unidade
    { wch: 16 }, // tipo_embalagem
    { wch: 16 }, // itens_por_caixa
    { wch: 10 }, // preco
    { wch: 40 }, // imagem_url
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trim a value to a string or return null when empty. */
function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s.length > 0 ? s : null
}

/**
 * Parse a price value that may come as a number, or a string in either
 * international (1234.56) or Brazilian (1.234,56 / R$ 1.234,56) format.
 */
function parsePreco(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val

  // Strip currency symbol, spaces, and non-breaking spaces
  const str = String(val)
    .replace(/[R$\s\u00a0]/g, '')
    .trim()

  if (str.length === 0) return null

  // Detect Brazilian format: if there is a comma after the last dot, treat
  // dots as thousand separators and comma as decimal separator.
  // Examples: "1.234,56" -> "1234.56", "10,45" -> "10.45"
  const lastComma = str.lastIndexOf(',')
  const lastDot = str.lastIndexOf('.')

  let normalised: string
  if (lastComma > lastDot) {
    // Brazilian format – dots are thousands, comma is decimal
    normalised = str.replace(/\./g, '').replace(',', '.')
  } else {
    // International format or no comma
    normalised = str.replace(/,/g, '')
  }

  const num = parseFloat(normalised)
  return isNaN(num) ? null : num
}

/** Parse integer value (itens_por_caixa). */
function parseInteiro(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return Math.round(val)
  const num = parseInt(String(val).trim(), 10)
  return isNaN(num) ? null : num
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses an uploaded .xlsx or .csv buffer and validates each row.
 *
 * Validation rules:
 * - At least `codigo_fornecedor` OR `ean` must be present.
 * - `nome` is required.
 * - `preco` is required and must be > 0.
 * - `imagem_url`, when provided, must start with http:// or https://.
 */
export function parseImportFile(buffer: Buffer, filename: string): ImportValidationResult {
  // 1. Detect format from filename
  const ext = filename.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx'

  // 2. Parse workbook
  const wb = XLSX.read(buffer, {
    type: 'buffer',
    codepage: ext === 'csv' ? 65001 : undefined, // UTF-8 for CSV
  })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    return { validos: [], erros: [{ linha: 0, campo: 'arquivo', mensagem: 'Nenhuma planilha encontrada no arquivo.' }] }
  }

  const ws = wb.Sheets[sheetName]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // 3. Skip header row – the first row is always expected to be column names
  if (rows.length <= 1) {
    return { validos: [], erros: [{ linha: 0, campo: 'arquivo', mensagem: 'O arquivo nao contem linhas de dados alem do cabecalho.' }] }
  }

  const validos: ImportRow[] = []
  const erros: Array<{ linha: number; campo: string; mensagem: string }> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const linha = i + 1 // 1-based, accounting for header

    // Skip completely empty rows
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue
    }

    const codigoFornecedor = toStr(row[0])
    const ean = toStr(row[1])
    const nome = toStr(row[2])
    const marca = toStr(row[3])
    const unidade = toStr(row[4])
    const tipoEmbalagem = toStr(row[5])
    const itensPorCaixa = parseInteiro(row[6])
    const preco = parsePreco(row[7])
    const imagemUrl = toStr(row[8])

    let rowHasError = false

    // Validate: at least codigo_fornecedor or ean
    if (!codigoFornecedor && !ean) {
      erros.push({ linha, campo: 'codigo_fornecedor / ean', mensagem: 'Informe ao menos o codigo do fornecedor ou o EAN.' })
      rowHasError = true
    }

    // Validate: nome required
    if (!nome) {
      erros.push({ linha, campo: 'nome', mensagem: 'O nome do produto e obrigatorio.' })
      rowHasError = true
    }

    // Validate: preco required and > 0
    if (preco === null) {
      erros.push({ linha, campo: 'preco', mensagem: 'O preco e obrigatorio.' })
      rowHasError = true
    } else if (preco <= 0) {
      erros.push({ linha, campo: 'preco', mensagem: 'O preco deve ser maior que zero.' })
      rowHasError = true
    }

    // Validate: imagem_url format
    if (imagemUrl && !/^https?:\/\//i.test(imagemUrl)) {
      erros.push({ linha, campo: 'imagem_url', mensagem: 'A URL da imagem deve comecar com http:// ou https://.' })
      rowHasError = true
    }

    if (!rowHasError) {
      validos.push({
        linha,
        codigo_fornecedor: codigoFornecedor,
        ean,
        nome,
        marca,
        unidade,
        tipo_embalagem: tipoEmbalagem,
        itens_por_caixa: itensPorCaixa,
        preco,
        imagem_url: imagemUrl,
      })
    }
  }

  return { validos, erros }
}
