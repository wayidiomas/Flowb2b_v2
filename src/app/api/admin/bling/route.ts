import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/bling
 *
 * Lista todas as empresas com seu status de integração Bling.
 * Left join empresas com bling_tokens para incluir empresas sem token.
 */
export async function GET(request: NextRequest) {
  const authError = requireSuperAdmin(request)
  if (authError) return authError

  try {
    const supabase = createServerSupabaseClient()

    // Buscar todas as empresas
    const { data: empresas, error: empError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj, conectadabling, sync_status')
      .order('id', { ascending: true })

    if (empError) {
      return NextResponse.json(
        { error: 'Erro ao buscar empresas', details: empError.message },
        { status: 500 }
      )
    }

    if (!empresas || empresas.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Buscar todos os tokens
    const empresaIds = empresas.map(e => e.id)
    const { data: tokens, error: tokError } = await supabase
      .from('bling_tokens')
      .select('empresa_id, expires_at, updated_at, is_revoke')
      .in('empresa_id', empresaIds)

    if (tokError) {
      return NextResponse.json(
        { error: 'Erro ao buscar tokens', details: tokError.message },
        { status: 500 }
      )
    }

    // Indexar tokens por empresa_id
    const tokensMap = new Map(
      (tokens || []).map(t => [t.empresa_id, t])
    )

    const now = new Date()
    const nowPlus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const data = empresas.map(empresa => {
      const token = tokensMap.get(empresa.id)

      let token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'

      if (!token) {
        token_status = 'no_token'
      } else if (token.is_revoke === true) {
        token_status = 'revoked'
      } else {
        const expiresAt = new Date(token.expires_at)
        if (expiresAt < now) {
          token_status = 'expired'
        } else if (expiresAt < nowPlus24h) {
          token_status = 'expiring'
        } else {
          token_status = 'valid'
        }
      }

      return {
        empresa_id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        conectadabling: empresa.conectadabling,
        sync_status: empresa.sync_status,
        token_status,
        expires_at: token?.expires_at ?? null,
        updated_at: token?.updated_at ?? null,
        is_revoke: token?.is_revoke ?? null,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[Admin Bling] Erro ao listar:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
