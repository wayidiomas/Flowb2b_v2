// Configurações do Bling OAuth
export const BLING_CONFIG = {
  clientId: process.env.BLING_CLIENT_ID!,
  clientSecret: process.env.BLING_CLIENT_SECRET!,
  authUrl: 'https://www.bling.com.br/Api/v3/oauth/authorize',
  tokenUrl: 'https://www.bling.com.br/Api/v3/oauth/token',
  apiUrl: process.env.BLING_API_URL || 'https://api.bling.com.br/Api/v3',
}

// Gerar URL de autorização
export function getBlingAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: BLING_CONFIG.clientId,
    state,
  })

  return `${BLING_CONFIG.authUrl}?${params.toString()}`
}

// Gerar Basic Auth header
export function getBlingBasicAuth(): string {
  const credentials = `${BLING_CONFIG.clientId}:${BLING_CONFIG.clientSecret}`
  return Buffer.from(credentials).toString('base64')
}

// Trocar código por tokens
export async function exchangeCodeForTokens(code: string): Promise<BlingTokenResponse> {
  const response = await fetch(BLING_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${getBlingBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Bling token exchange error:', error)
    throw new Error(`Erro ao obter tokens do Bling: ${response.status}`)
  }

  return response.json()
}

// Renovar tokens
export async function refreshBlingTokens(refreshToken: string): Promise<BlingTokenResponse> {
  const response = await fetch(BLING_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${getBlingBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Bling token refresh error:', error)
    throw new Error(`Erro ao renovar tokens do Bling: ${response.status}`)
  }

  return response.json()
}

// Types
export interface BlingTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface BlingTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}
