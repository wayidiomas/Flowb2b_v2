import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { exchangeCodeForTokens, getBlingBasicAuth } from '@/lib/bling'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FLOWB2BAPI_URL = process.env.FLOWB2BAPI_URL

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
        new URL(`/dashboard?error=Autorização negada: ${error}`, APP_URL)
      )
    }

    // Verificar se código foi recebido
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Código de autorização não recebido', APP_URL)
      )
    }

    // Decodificar e validar state
    if (!state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=State inválido', APP_URL)
      )
    }

    let stateData: { userId: string; empresaId: number | null; timestamp: number; mode?: string; revoke?: boolean }

    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard?error=State corrompido', APP_URL)
      )
    }

    // Verificar se state não expirou (10 minutos)
    const stateAge = Date.now() - stateData.timestamp
    if (stateAge > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Sessão expirada, tente novamente', APP_URL)
      )
    }

    // Verificar usuário autenticado
    const user = await getCurrentUser()
    if (!user || user.userId !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/login?error=Sessão inválida', APP_URL)
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
        new URL('/onboarding?step=empresa&bling_connected=pending', APP_URL)
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
          is_revoke: false, // Reset flag ao reautorizar
        },
        {
          onConflict: 'empresa_id',
        }
      )

    if (upsertError) {
      console.error('Error saving Bling tokens:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard?error=Erro ao salvar credenciais', APP_URL)
      )
    }

    const isUpdate = stateData.mode === 'update'
    const isRevoke = stateData.revoke === true

    // Consultar sync_status atual do banco para decisão robusta
    // Se sync_status != 'completed', forçar first-time sync independente dos params
    const { data: empresaData } = await supabase
      .from('empresas')
      .select('sync_status')
      .eq('id', empresaId)
      .single()

    const syncNotCompleted = empresaData?.sync_status !== 'completed'
    const willFirstTimeSync = !isUpdate || isRevoke || syncNotCompleted

    // Atualizar flag na empresa (sync_status = 'syncing' se vai rodar first-time)
    await supabase
      .from('empresas')
      .update({
        conectadabling: true,
        dataexpirabling: expiresAt.toISOString(),
        ...(willFirstTimeSync && { sync_status: 'syncing' }),
      })
      .eq('id', empresaId)

    // Se é revoke, nova conexão, ou sync_status não está completed, fazer first-time sync
    if (willFirstTimeSync) {
      // Disparar sync first-time direto na flowB2BAPI (fire and forget)
      // Não usa a rota interna /api/sync/first-time porque fetch server-side não envia cookies
      if (FLOWB2BAPI_URL) {
        const reason = isRevoke ? 'Revoke mode' : syncNotCompleted ? `sync_status=${empresaData?.sync_status}` : 'Connect mode'
        console.log(`[Bling Callback] ${reason}: disparando sync first-time para empresa ${empresaId}`)
        fetch(`${FLOWB2BAPI_URL}/api/sync/first-time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: empresaId,
            accessToken: tokens.access_token,
            refresh_token: tokens.refresh_token,
          }),
        }).catch((err) => {
          console.error('[Bling Callback] Erro ao disparar sync:', err)
        })
      } else {
        console.error('[Bling Callback] FLOWB2BAPI_URL nao configurada, sync nao disparado')
      }

      // Redirecionar para página de sync status
      const successMsg = isRevoke
        ? 'Bling reautorizado! Sincronização completa iniciada.'
        : syncNotCompleted
          ? 'Sincronização iniciada para completar a importação.'
          : 'Bling conectado! Sincronização iniciada.'
      return NextResponse.redirect(
        new URL(`/configuracoes/sync?empresa_id=${empresaId}&success=${encodeURIComponent(successMsg)}`, APP_URL)
      )
    }

    // Mode update (sem revoke): verificar se precisa sincronizar
    if (FLOWB2BAPI_URL) {
      // Contar produtos da empresa para decidir tipo de sync
      const { count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)

      const produtosCount = count ?? 0

      if (produtosCount === 0) {
        // Sem produtos = first-time sync (importação completa)
        console.log(`[Bling Callback] Update mode: 0 produtos, disparando first-time sync para empresa ${empresaId}`)

        // Marcar empresa como syncing antes de disparar first-time
        await supabase
          .from('empresas')
          .update({ sync_status: 'syncing' })
          .eq('id', empresaId)

        fetch(`${FLOWB2BAPI_URL}/api/sync/first-time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: empresaId,
            accessToken: tokens.access_token,
            refresh_token: tokens.refresh_token,
          }),
        }).catch((err) => {
          console.error('[Bling Callback] Erro ao disparar first-time sync:', err)
        })

        // Redirecionar para página de sync status (aguarde a sincronização)
        return NextResponse.redirect(
          new URL(`/configuracoes/sync?empresa_id=${empresaId}&success=Tokens atualizados! Sincronização iniciada.`, APP_URL)
        )
      }

      // Com produtos = daily sync (incremental, roda em background)
      console.log(`[Bling Callback] Update mode: ${produtosCount} produtos, disparando daily sync para empresa ${empresaId}`)
      fetch(`${FLOWB2BAPI_URL}/api/sync/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          accessToken: tokens.access_token,
          refresh_token: tokens.refresh_token,
        }),
      }).catch((err) => {
        console.error('[Bling Callback] Erro ao disparar daily sync:', err)
      })

      // Daily sync roda em background, voltar para edição da empresa
      return NextResponse.redirect(
        new URL(`/cadastros/empresas/${empresaId}/editar?success=Tokens atualizados! Sincronização diária iniciada em background.`, APP_URL)
      )
    }

    // Fallback: se FLOWB2BAPI_URL não existe, redirecionar para edição
    console.log(`[Bling Callback] FLOWB2BAPI_URL não configurada, tokens atualizados para empresa ${empresaId}`)
    return NextResponse.redirect(
      new URL(`/cadastros/empresas/${empresaId}/editar?success=Tokens do Bling atualizados com sucesso!`, APP_URL)
    )
  } catch (error) {
    console.error('Bling callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=Erro ao processar autorização', APP_URL)
    )
  }
}
