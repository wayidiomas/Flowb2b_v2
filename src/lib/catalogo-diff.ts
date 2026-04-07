import type { ProdutoExtraido } from './catalogo-pdf-extractor'

export interface CatalogoItem {
  id: number
  codigo: string | null
  nome: string | null
  ean: string | null
  marca: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_base: number | null
  ativo: boolean
}

export interface ItemPrecoAlterado {
  item: CatalogoItem
  preco_antigo: number
  preco_novo: number
  variacao_percentual: number
}

export interface ItemDadosAlterado {
  item: CatalogoItem
  mudancas: { campo: string; antigo: any; novo: any }[]
}

export interface CatalogoDiff {
  novos: ProdutoExtraido[]
  removidos: CatalogoItem[]
  preco_alterado: ItemPrecoAlterado[]
  dados_alterados: ItemDadosAlterado[]
  sem_mudanca: number
}

const PRECO_TOLERANCE = 0.01

function isValidEan(ean: string | null | undefined): ean is string {
  return !!ean && /^\d{13}$/.test(ean)
}

function normalizeStr(val: string | null | undefined): string {
  return (val || '').trim().toUpperCase()
}

export function calcularDiff(existentes: CatalogoItem[], novos: ProdutoExtraido[]): CatalogoDiff {
  const existentesByEan = new Map<string, CatalogoItem>()
  const existentesByCodigo = new Map<string, CatalogoItem>()

  for (const item of existentes) {
    if (isValidEan(item.ean)) {
      existentesByEan.set(item.ean, item)
    }
    if (item.codigo) {
      existentesByCodigo.set(item.codigo.trim(), item)
    }
  }

  const matchedExistenteIds = new Set<number>()
  const resultado: CatalogoDiff = {
    novos: [],
    removidos: [],
    preco_alterado: [],
    dados_alterados: [],
    sem_mudanca: 0,
  }

  for (const novo of novos) {
    let matched: CatalogoItem | undefined

    if (isValidEan(novo.ean)) {
      matched = existentesByEan.get(novo.ean)
    }

    if (!matched && novo.codigo_fornecedor) {
      matched = existentesByCodigo.get(novo.codigo_fornecedor.trim())
    }

    if (!matched) {
      resultado.novos.push(novo)
      continue
    }

    matchedExistenteIds.add(matched.id)

    const precoAntigo = Number(matched.preco_base) || 0
    const precoNovo = Number(novo.preco_base) || 0
    const precoMudou = Math.abs(precoAntigo - precoNovo) > PRECO_TOLERANCE

    const mudancasDados: { campo: string; antigo: any; novo: any }[] = []

    if (normalizeStr(matched.nome) !== normalizeStr(novo.nome)) {
      mudancasDados.push({ campo: 'nome', antigo: matched.nome, novo: novo.nome })
    }
    if (normalizeStr(matched.marca) !== normalizeStr(novo.marca)) {
      mudancasDados.push({ campo: 'marca', antigo: matched.marca, novo: novo.marca })
    }
    if (normalizeStr(matched.unidade) !== normalizeStr(novo.unidade)) {
      mudancasDados.push({ campo: 'unidade', antigo: matched.unidade, novo: novo.unidade })
    }
    if (
      novo.itens_por_caixa !== null &&
      novo.itens_por_caixa !== undefined &&
      matched.itens_por_caixa !== novo.itens_por_caixa
    ) {
      mudancasDados.push({ campo: 'itens_por_caixa', antigo: matched.itens_por_caixa, novo: novo.itens_por_caixa })
    }

    if (precoMudou) {
      const variacao = precoAntigo > 0
        ? ((precoNovo - precoAntigo) / precoAntigo) * 100
        : 0
      resultado.preco_alterado.push({
        item: matched,
        preco_antigo: precoAntigo,
        preco_novo: precoNovo,
        variacao_percentual: Math.round(variacao * 100) / 100,
      })
    }

    if (mudancasDados.length > 0) {
      resultado.dados_alterados.push({ item: matched, mudancas: mudancasDados })
    }

    if (!precoMudou && mudancasDados.length === 0) {
      resultado.sem_mudanca++
    }
  }

  for (const item of existentes) {
    if (!matchedExistenteIds.has(item.id)) {
      resultado.removidos.push(item)
    }
  }

  return resultado
}
