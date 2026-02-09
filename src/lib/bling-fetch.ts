/**
 * Utilitário de fetch para API do Bling com retry inteligente
 *
 * Características:
 * - Trata erro 429 (rate limit) automaticamente
 * - Backoff exponencial com jitter
 * - Respeita header Retry-After do Bling
 * - Trata erros 5xx (server errors)
 * - Trata erros 400 "não existe" (transientes)
 * - Logs detalhados para debug
 */

export interface BlingFetchOptions {
  /** Número máximo de retries (default: 5) */
  maxRetries?: number
  /** Delay base em ms para backoff exponencial (default: 2000) */
  baseDelayMs?: number
  /** Delay máximo em ms (default: 30000) */
  maxDelayMs?: number
  /** Contexto para logs (ex: "criar pedido", "alterar status") */
  context?: string
}

export interface BlingFetchResult {
  response: Response
  /** Número de retries que foram necessários */
  retriesUsed: number
  /** Se houve rate limit durante a requisição */
  hadRateLimit: boolean
}

/** Erro customizado para quando todos os retries falharam */
export class BlingRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retriesAttempted: number,
    public readonly lastStatus: number
  ) {
    super(message)
    this.name = 'BlingRateLimitError'
  }
}

/**
 * Calcula delay com backoff exponencial e jitter
 * @param attempt Número da tentativa (0-indexed)
 * @param baseDelayMs Delay base em ms
 * @param maxDelayMs Delay máximo em ms
 * @returns Delay em ms com jitter de ±20%
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Backoff exponencial: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)

  // Limitar ao máximo
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Adicionar jitter de ±20% para evitar thundering herd
  const jitterFactor = 0.8 + Math.random() * 0.4 // 0.8 a 1.2

  return Math.round(cappedDelay * jitterFactor)
}

/**
 * Verifica se o erro é transiente e deve fazer retry
 */
function isTransientError(status: number, bodyText: string): boolean {
  // Rate limit - sempre fazer retry
  if (status === 429) {
    return true
  }

  // Server errors (5xx) - fazer retry
  if (status >= 500 && status < 600) {
    return true
  }

  // Erro 400 com "não existe" - transiente do Bling
  if (status === 400) {
    const isNotFoundTransient =
      bodyText.includes('n\\u00e3o existe') ||
      bodyText.includes('não existe') ||
      bodyText.includes('nao existe')

    if (isNotFoundTransient) {
      return true
    }
  }

  return false
}

/**
 * Extrai o tempo de espera do header Retry-After
 * @returns Tempo em ms ou null se não especificado
 */
function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After')

  if (!retryAfter) {
    return null
  }

  // Retry-After pode ser segundos ou uma data HTTP
  const seconds = parseInt(retryAfter, 10)

  if (!isNaN(seconds)) {
    return seconds * 1000
  }

  // Tentar parsear como data
  const date = new Date(retryAfter)
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now()
    return delayMs > 0 ? delayMs : null
  }

  return null
}

/**
 * Fetch com retry inteligente para API do Bling
 *
 * @example
 * ```typescript
 * const { response, retriesUsed, hadRateLimit } = await blingFetch(
 *   `${BLING_CONFIG.apiUrl}/pedidos/compras`,
 *   {
 *     method: 'POST',
 *     headers: { 'Authorization': `Bearer ${token}` },
 *     body: JSON.stringify(payload)
 *   },
 *   { context: 'criar pedido de compra' }
 * )
 * ```
 */
export async function blingFetch(
  url: string,
  options: RequestInit,
  fetchOptions: BlingFetchOptions = {}
): Promise<BlingFetchResult> {
  const {
    maxRetries = 5,
    baseDelayMs = 2000,
    maxDelayMs = 30000,
    context = 'requisição Bling'
  } = fetchOptions

  let lastResponse: Response
  let lastBodyText: string = ''
  let retriesUsed = 0
  let hadRateLimit = false

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      lastResponse = await fetch(url, options)

      // Sucesso - retornar imediatamente
      if (lastResponse.ok) {
        return {
          response: lastResponse,
          retriesUsed,
          hadRateLimit
        }
      }

      // Ler body para análise
      lastBodyText = await lastResponse.text()

      // Verificar se é erro transiente
      const isTransient = isTransientError(lastResponse.status, lastBodyText)

      if (!isTransient) {
        // Erro não transiente - retornar sem retry
        console.log(`[Bling] ${context}: erro não transiente (${lastResponse.status}), não fazendo retry`)

        // Recriar response com body
        return {
          response: new Response(lastBodyText, {
            status: lastResponse.status,
            statusText: lastResponse.statusText,
            headers: lastResponse.headers,
          }),
          retriesUsed,
          hadRateLimit
        }
      }

      // Marcar se houve rate limit
      if (lastResponse.status === 429) {
        hadRateLimit = true
      }

      // Se é a última tentativa, não fazer retry
      if (attempt === maxRetries) {
        console.log(`[Bling] ${context}: máximo de retries (${maxRetries}) atingido`)
        break
      }

      // Calcular delay
      let delayMs: number

      // Priorizar Retry-After do servidor para 429
      if (lastResponse.status === 429) {
        const retryAfterMs = parseRetryAfter(lastResponse)
        if (retryAfterMs) {
          // Adicionar pequeno jitter ao Retry-After
          delayMs = retryAfterMs + Math.round(Math.random() * 1000)
          console.log(`[Bling] ${context}: rate limit (429), usando Retry-After: ${delayMs}ms`)
        } else {
          delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs)
          console.log(`[Bling] ${context}: rate limit (429), backoff: ${delayMs}ms`)
        }
      } else {
        delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs)
        console.log(`[Bling] ${context}: erro transiente (${lastResponse.status}), retry ${attempt + 1}/${maxRetries} em ${delayMs}ms`)
      }

      // Aguardar antes do retry
      await new Promise(resolve => setTimeout(resolve, delayMs))
      retriesUsed++

    } catch (networkError) {
      // Erro de rede (timeout, DNS, etc)
      console.error(`[Bling] ${context}: erro de rede na tentativa ${attempt + 1}:`, networkError)

      if (attempt === maxRetries) {
        throw new Error(`Erro de conexão com Bling após ${maxRetries} tentativas: ${networkError}`)
      }

      const delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs)
      console.log(`[Bling] ${context}: retry de erro de rede em ${delayMs}ms`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      retriesUsed++
    }
  }

  // Todos os retries falharam
  if (hadRateLimit) {
    throw new BlingRateLimitError(
      'Sistema em alta demanda. Por favor, aguarde alguns segundos e tente novamente.',
      retriesUsed,
      lastResponse!.status
    )
  }

  // Retornar última resposta com body
  return {
    response: new Response(lastBodyText, {
      status: lastResponse!.status,
      statusText: lastResponse!.statusText,
      headers: lastResponse!.headers,
    }),
    retriesUsed,
    hadRateLimit
  }
}

/**
 * Versão simplificada que retorna apenas a Response
 * Compatível com o padrão anterior de uso
 */
export async function blingFetchSimple(
  url: string,
  options: RequestInit,
  fetchOptions: BlingFetchOptions = {}
): Promise<Response> {
  const result = await blingFetch(url, options, fetchOptions)
  return result.response
}
