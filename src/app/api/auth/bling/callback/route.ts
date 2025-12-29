import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { exchangeCodeForTokens, getBlingBasicAuth } from '@/lib/bling'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Verificar se houve erro no OAuth
    if (error) {
      console.error('Bling OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard?error=Autorização negada: ${error}`, request.url)
      )
    }

    // Verificar se código foi recebido
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Código de autorização não recebido', request.url)
      )
    }

    // Decodificar e validar state
    if (!state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=State inválido', request.url)
      )
    }

    let stateData: { userId: string; empresaId: number | null; timestamp: number }

    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard?error=State corrompido', request.url)
      )
    }

    // Verificar se state não expirou (10 minutos)
    const stateAge = Date.now() - stateData.timestamp
    if (stateAge > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Sessão expirada, tente novamente', request.url)
      )
    }

    // Verificar usuário autenticado
    const user = await getCurrentUser()
    if (!user || user.userId !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/login?error=Sessão inválida', request.url)
      )
    }

    // Trocar código por tokens
    const tokens = await exchangeCodeForTokens(code)

    // Calcular data de expiração
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const supabase = createServerSupabaseClient()

    // Verificar se usuário tem empresa_id
    let empresaId = user.empresaId

    // Se não tem empresa, buscar ou criar
    if (!empresaId) {
      // TODO: Redirecionar para onboarding de empresa
      return NextResponse.redirect(
        new URL('/onboarding?step=empresa&bling_connected=pending', request.url)
      )
    }

    // Salvar/atualizar tokens no Supabase
    const { error: upsertError } = await supabase
      .from('bling_tokens')
      .upsert(
        {
          empresa_id: empresaId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          Auth_Basic: getBlingBasicAuth(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'empresa_id',
        }
      )

    if (upsertError) {
      console.error('Error saving Bling tokens:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard?error=Erro ao salvar credenciais', request.url)
      )
    }

    // Atualizar flag na empresa
    await supabase
      .from('empresas')
      .update({
        conectadabling: true,
        dataexpirabling: expiresAt.toISOString(),
      })
      .eq('id', empresaId)

    // Redirecionar para dashboard com sucesso
    return NextResponse.redirect(
      new URL('/dashboard?success=Bling conectado com sucesso!', request.url)
    )
  } catch (error) {
    console.error('Bling callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=Erro ao processar autorização', request.url)
    )
  }
}
