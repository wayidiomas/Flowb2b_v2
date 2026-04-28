import * as XLSX from 'xlsx'
import { isValidCnpj, stripCnpj, isValidEmail, isValidCelular } from './cnpj'

export interface LojistaImportRow {
  linha: number
  cnpj: string
  razao_social: string
  email: string
  celular: string
  nome_fantasia?: string
  nome_admin?: string
}

export interface LojistasImportResult {
  validos: LojistaImportRow[]
  erros: Array<{ linha: number; campo: string; mensagem: string }>
}

const HEADERS = ['cnpj', 'razao_social', 'nome_fantasia', 'email', 'celular', 'nome_admin'] as const
type HeaderKey = (typeof HEADERS)[number]

/**
 * Gera um buffer XLSX template pra importacao em massa de lojistas.
 */
export function generateLojistasTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS as unknown as string[],
    [
      '11.444.777/0001-61',
      'Pet Shop Exemplo LTDA',
      'Pet Shop Exemplo',
      'contato@petshop.com.br',
      '11999998888',
      'Joao Silva',
    ],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Lojistas')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function normalizeKey(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

const KEY_ALIASES: Record<string, HeaderKey> = {
  cnpj: 'cnpj',
  razao_social: 'razao_social',
  razaosocial: 'razao_social',
  razao: 'razao_social',
  nome_fantasia: 'nome_fantasia',
  nomefantasia: 'nome_fantasia',
  fantasia: 'nome_fantasia',
  email: 'email',
  email_admin: 'email',
  e_mail: 'email',
  celular: 'celular',
  telefone: 'celular',
  telefone_celular: 'celular',
  whatsapp: 'celular',
  nome_admin: 'nome_admin',
  responsavel: 'nome_admin',
  contato: 'nome_admin',
}

/**
 * Parse buffer XLSX/CSV de lojistas. Retorna validos + erros.
 */
export function parseLojistasImport(buffer: Buffer): LojistasImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) {
    return { validos: [], erros: [{ linha: 0, campo: '_planilha', mensagem: 'Planilha vazia' }] }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false })
  const validos: LojistaImportRow[] = []
  const erros: LojistasImportResult['erros'] = []

  rows.forEach((row, idx) => {
    const linha = idx + 2 // +1 header, +1 base 0
    // Normaliza chaves
    const norm: Partial<Record<HeaderKey, string>> = {}
    for (const [k, v] of Object.entries(row)) {
      const key = normalizeKey(k)
      const aliased = KEY_ALIASES[key]
      if (aliased) {
        norm[aliased] = String(v ?? '').trim()
      }
    }

    const cnpjRaw = norm.cnpj || ''
    const razao = norm.razao_social || ''
    const email = norm.email || ''
    const celular = norm.celular || ''

    // Validacoes basicas
    if (!cnpjRaw && !razao && !email) return // linha vazia, pula

    if (!cnpjRaw || !isValidCnpj(cnpjRaw)) {
      erros.push({ linha, campo: 'cnpj', mensagem: 'CNPJ invalido ou vazio' })
      return
    }
    if (!razao) {
      erros.push({ linha, campo: 'razao_social', mensagem: 'Razao social vazia' })
      return
    }
    if (!email || !isValidEmail(email)) {
      erros.push({ linha, campo: 'email', mensagem: 'Email invalido' })
      return
    }
    if (!celular || !isValidCelular(celular)) {
      erros.push({ linha, campo: 'celular', mensagem: 'Celular invalido (DDD + numero)' })
      return
    }

    validos.push({
      linha,
      cnpj: stripCnpj(cnpjRaw),
      razao_social: razao,
      nome_fantasia: norm.nome_fantasia || undefined,
      email: email.toLowerCase(),
      celular: celular.replace(/\D/g, ''),
      nome_admin: norm.nome_admin || undefined,
    })
  })

  return { validos, erros }
}
