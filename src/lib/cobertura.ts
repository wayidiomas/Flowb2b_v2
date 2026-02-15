/**
 * Utilitarios para calculo de cobertura de estoque
 *
 * A cobertura de estoque indica quantos dias de vendas o estoque atual suporta.
 * dias_cobertura = estoque_atual / media_diaria
 *
 * A urgencia eh calculada comparando a cobertura com o prazo de entrega do fornecedor,
 * mais uma margem de seguranca que varia conforme a curva ABC do produto.
 */

export type Urgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK'

export interface CoberturaParams {
  estoque_atual: number
  quantidade_90d: number
  prazo_entrega: number | null
  curva_fat: string
  curva_qtd: string
}

export interface CoberturaResult {
  media_diaria: number
  dias_cobertura: number | null  // null se sem vendas
  dias_necessarios: number
  urgencia: Urgencia
  em_ruptura: boolean  // true se CRITICA ou ALTA
}

/**
 * Margem de seguranca por curva ABC
 * - Curva A: +50% (produtos mais importantes precisam de mais margem)
 * - Curva B: +30%
 * - Curva C: +20%
 * - Curva D: +10%
 */
const MARGENS_POR_CURVA: Record<string, number> = {
  A: 0.50,
  B: 0.30,
  C: 0.20,
  D: 0.10,
}

/**
 * Prazo de entrega padrao quando nao ha politica de compra configurada
 */
const PRAZO_ENTREGA_DEFAULT = 15

/**
 * Retorna a margem de seguranca para uma curva
 */
export function getMargemPorCurva(curva: string): number {
  return MARGENS_POR_CURVA[curva] || MARGENS_POR_CURVA.D
}

/**
 * Retorna a curva mais critica (A > B > C > D)
 * Ex: se curva_fat = 'C' e curva_qtd = 'A', retorna 'A'
 */
export function getMaiorCurva(curva_fat: string, curva_qtd: string): string {
  const ordem = ['A', 'B', 'C', 'D']
  const idxFat = ordem.indexOf(curva_fat || 'D')
  const idxQtd = ordem.indexOf(curva_qtd || 'D')

  // Menor indice = curva mais importante
  return idxFat <= idxQtd ? (curva_fat || 'D') : (curva_qtd || 'D')
}

/**
 * Calcula a cobertura de estoque e urgencia
 *
 * @param params Parametros para calculo
 * @returns Resultado com media_diaria, dias_cobertura, dias_necessarios, urgencia e em_ruptura
 *
 * @example
 * // Produto curva A, estoque 50, vende 10/dia, prazo 10 dias
 * calcularCobertura({
 *   estoque_atual: 50,
 *   quantidade_90d: 900, // 10/dia * 90
 *   prazo_entrega: 10,
 *   curva_fat: 'A',
 *   curva_qtd: 'B'
 * })
 * // Retorna: { media_diaria: 10, dias_cobertura: 5, dias_necessarios: 15, urgencia: 'CRITICA', em_ruptura: true }
 */
export function calcularCobertura(params: CoberturaParams): CoberturaResult {
  const { estoque_atual, quantidade_90d, prazo_entrega, curva_fat, curva_qtd } = params

  // Calcular media diaria de vendas
  const media_diaria = quantidade_90d / 90

  // Prazo de entrega (usa default se nao configurado)
  const prazo = prazo_entrega ?? PRAZO_ENTREGA_DEFAULT

  // Determinar curva mais critica e margem
  const curva = getMaiorCurva(curva_fat, curva_qtd)
  const margem = getMargemPorCurva(curva)

  // Dias necessarios = prazo + margem de seguranca
  const dias_necessarios = prazo * (1 + margem)

  // Tratar estoque negativo como 0 (edge case de inconsistencia no ERP)
  const estoque_efetivo = Math.max(0, estoque_atual)

  // Caso especial: sem vendas nos ultimos 90 dias
  if (media_diaria === 0) {
    // Sem vendas e sem estoque (ou estoque negativo) = possivelmente obsoleto
    if (estoque_efetivo === 0) {
      return {
        media_diaria: 0,
        dias_cobertura: null,
        dias_necessarios,
        urgencia: 'MEDIA',  // Pode estar obsoleto, mas nao eh critico
        em_ruptura: false,
      }
    }

    // Tem estoque mas nao vende = OK (nao ha urgencia)
    return {
      media_diaria: 0,
      dias_cobertura: null,  // Infinito tecnicamente
      dias_necessarios,
      urgencia: 'OK',
      em_ruptura: false,
    }
  }

  // Calcular dias de cobertura (usando estoque efetivo para evitar valores negativos)
  const dias_cobertura = estoque_efetivo / media_diaria

  // Determinar urgencia
  let urgencia: Urgencia

  if (dias_cobertura < prazo) {
    // Estoque acaba ANTES do pedido chegar - CRITICO!
    urgencia = 'CRITICA'
  } else if (dias_cobertura < dias_necessarios) {
    // Estoque no limite, sem margem de seguranca
    urgencia = 'ALTA'
  } else if (dias_cobertura < dias_necessarios * 1.5) {
    // Precisa pedir logo
    urgencia = 'MEDIA'
  } else {
    // Estoque saudavel
    urgencia = 'OK'
  }

  return {
    media_diaria: Math.round(media_diaria * 100) / 100,  // Arredondar para 2 casas
    dias_cobertura: Math.round(dias_cobertura * 10) / 10,  // Arredondar para 1 casa
    dias_necessarios: Math.round(dias_necessarios * 10) / 10,
    urgencia,
    em_ruptura: urgencia === 'CRITICA' || urgencia === 'ALTA',
  }
}

/**
 * Calcula urgencia para varios produtos de uma vez
 * Util para processar listas de produtos
 */
export function calcularCoberturaLote(
  produtos: Array<{
    produto_id: number
    estoque_atual: number
    quantidade_90d: number
    curva_fat: string
    curva_qtd: string
  }>,
  prazo_entrega: number | null
): Map<number, CoberturaResult> {
  const resultados = new Map<number, CoberturaResult>()

  for (const produto of produtos) {
    const resultado = calcularCobertura({
      estoque_atual: produto.estoque_atual,
      quantidade_90d: produto.quantidade_90d,
      prazo_entrega,
      curva_fat: produto.curva_fat,
      curva_qtd: produto.curva_qtd,
    })

    resultados.set(produto.produto_id, resultado)
  }

  return resultados
}
