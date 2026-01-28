import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { exchangeCodeForTokens, getBlingBasicAuth } from '@/lib/bling'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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

    let stateData: { userId: string; empresaId: number | null; timestamp: number; mode?: string }

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

    // Usar o empresaId do state (pode ser diferente do user.empresaId)
    // Isso permite conectar uma empresa recém-criada que ainda não está no JWT
    let empresaId = stateData.empresaId

    // Se não tem empresa no state, usar do usuário
    if (!empresaId) {
      empresaId = user.empresaId
    }

    // Se ainda não tem empresa, redirecionar para onboarding
    if (!empresaId) {
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

    const isUpdate = stateData.mode === 'update'

    if (!isUpdate) {
      // Disparar sync first-time em background (fire and forget) — apenas para conexão nova
      console.log(`[Bling Callback] Disparando sync first-time para empresa ${empresaId}`)
      fetch(`${APP_URL}/api/sync/first-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: empresaId }),
      }).catch((err) => {
        console.error('[Bling Callback] Erro ao disparar sync:', err)
      })

      // Redirecionar para página de sync status
      return NextResponse.redirect(
        new URL(`/configuracoes/sync?empresa_id=${empresaId}&success=Bling conectado! Sincronização iniciada.`, request.url)
      )
    }

    // Mode update: tokens atualizados, redirecionar de volta para edição da empresa
    console.log(`[Bling Callback] Tokens atualizados para empresa ${empresaId}`)
    return NextResponse.redirect(
      new URL(`/cadastros/empresas/${empresaId}/editar?success=Tokens do Bling atualizados com sucesso!`, request.url)
    )
  } catch (error) {
    console.error('Bling callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=Erro ao processar autorização', request.url)
    )
  }
}
