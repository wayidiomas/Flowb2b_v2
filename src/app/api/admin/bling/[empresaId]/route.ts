import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/bling/[empresaId]
 *
 * Retorna informações detalhadas do Bling para uma empresa específica.
 * O access_token é mascarado por segurança (primeiros 10 + *** + últimos 5 caracteres).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  const authError = requireSuperAdmin(request)
  if (authError) return authError

  try {
    const { empresaId: empresaIdStr } = await params
    const empresaId = Number(empresaIdStr)

    if (isNaN(empresaId) || empresaId <= 0) {
      return NextResponse.json(
        { error: 'empresa_id inválido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar empresa
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj, conectadabling, sync_status')
      .eq('id', empresaId)
      .single()

    if (empError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Buscar token
    const { data: token } = await supabase
      .from('bling_tokens')
      .select('access_token, refresh_token, expires_at, is_revoke, updated_at')
      .eq('empresa_id', empresaId)
      .single()

    // Calcular token_status
    let token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'
    let masked_access_token: string | null = null
    let masked_refresh_token: string | null = null

    if (!token) {
      token_status = 'no_token'
    } else {
      // Mascarar tokens
      if (token.access_token) {
        masked_access_token = maskToken(token.access_token)
      }
      if (token.refresh_token) {
        masked_refresh_token = maskToken(token.refresh_token)
      }

      if (token.is_revoke === true) {
        token_status = 'revoked'
      } else {
        const now = new Date()
        const nowPlus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const expiresAt = new Date(token.expires_at)

        if (expiresAt < now) {
          token_status = 'expired'
        } else if (expiresAt < nowPlus24h) {
          token_status = 'expiring'
        } else {
          token_status = 'valid'
        }
      }
    }

    // Buscar último cron_job de sync para esta empresa
    const { data: lastSync } = await supabase
      .from('cron_jobs')
      .select('id, status, step, created_at, updated_at, result, error_count')
      .eq('id_empresa', empresaId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      empresa: {
        id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        conectadabling: empresa.conectadabling,
        sync_status: empresa.sync_status,
      },
      token: token
        ? {
            token_status,
            masked_access_token,
            masked_refresh_token,
            expires_at: token.expires_at,
            is_revoke: token.is_revoke,
            updated_at: token.updated_at,
          }
        : {
            token_status: 'no_token' as const,
            masked_access_token: null,
            masked_refresh_token: null,
            expires_at: null,
            is_revoke: null,
            updated_at: null,
          },
      sync_history: lastSync || [],
    })
  } catch (error) {
    console.error('[Admin Bling Detail] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * Mascara um token mostrando apenas os primeiros 10 e últimos 5 caracteres.
 */
function maskToken(token: string): string {
  if (token.length <= 15) {
    return '***'
  }
  return `${token.slice(0, 10)}***${token.slice(-5)}`
}
