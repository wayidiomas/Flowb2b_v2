/**
 * Normalizacao de precos de sugestao do fornecedor.
 *
 * Problema: o fornecedor as vezes envia o preco_unitario com o preco da CAIXA
 * em vez de por unidade. Quando o sistema multiplica pela quantidade (que esta
 * em unidades), o subtotal fica inflado por itens_por_caixa.
 *
 * Solucao emergencial: detectar pela RAZAO (preco_sug / preco_orig). Se a razao
 * estiver proxima de itens_por_caixa (dentro de uma margem), assumimos que o
 * fornecedor digitou o preco da caixa e dividimos.
 *
 * Margem padrao: 30% (configurable). Casos legitimos (descontos/aumentos ate
 * 30% sobre o esperado de preco_caixa) ainda disparam — vamos calibrar via
 * telemetria conforme os dados aparecerem.
 */

const MARGEM_DEFAULT = 0.3

export interface NormalizacaoPreco {
  precoCorrigido: number          // preco por unidade (a ser usado em todo calculo)
  foiConvertido: boolean           // true se detectamos que o preco veio como caixa
  ratio: number | null             // preco_sug / preco_orig (para tooltip/log)
  itensPorCaixa: number            // normalizado para >= 1
}

/**
 * Normaliza o preco sugerido pelo fornecedor caso ele tenha vindo como caixa.
 *
 * @param precoSug Preco unitario enviado na sugestao (pode ser preco de caixa por engano)
 * @param precoOrig Preco unitario do catalogo (base de comparacao)
 * @param itensPorCaixa Quantidade de itens por caixa do produto
 * @param margem Tolerancia para detectar "ratio proxima de itens_por_caixa" (default 0.3 = 30%)
 */
export function normalizarPrecoSugerido(
  precoSug: number | null | undefined,
  precoOrig: number | null | undefined,
  itensPorCaixa: number | null | undefined,
  margem: number = MARGEM_DEFAULT,
): NormalizacaoPreco {
  const cx = itensPorCaixa && itensPorCaixa > 1 ? itensPorCaixa : 1
  const sug = precoSug ?? 0
  const orig = precoOrig ?? 0

  if (cx === 1 || sug <= 0 || orig <= 0) {
    return { precoCorrigido: sug, foiConvertido: false, ratio: null, itensPorCaixa: cx }
  }

  const ratio = sug / orig
  // Detecta se a razao esta dentro de margem ao redor de itens_por_caixa
  const ehPrecoDeCaixa = Math.abs(ratio - cx) / cx < margem

  return {
    precoCorrigido: ehPrecoDeCaixa ? sug / cx : sug,
    foiConvertido: ehPrecoDeCaixa,
    ratio,
    itensPorCaixa: cx,
  }
}
