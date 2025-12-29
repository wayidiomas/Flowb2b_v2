import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBlingAuthUrl } from '@/lib/bling'

export async function GET(request: NextRequest) {
  try {
    // Verificar se usuário está autenticado
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=Faça login primeiro', request.url)
      )
    }

    // Gerar state com userId para validar no callback
    // State contém: { userId, timestamp, random }
    const stateData = {
      userId: user.userId,
      empresaId: user.empresaId,
      timestamp: Date.now(),
      random: crypto.randomUUID(),
    }

    // Codificar state em base64
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

    // Redirecionar para OAuth do Bling
    const authUrl = getBlingAuthUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Bling connect error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=Erro ao conectar com Bling', request.url)
    )
  }
}
