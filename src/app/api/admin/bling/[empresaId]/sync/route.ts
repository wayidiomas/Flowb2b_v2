import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { syncEstoqueEmpresa } from '@/lib/bling-estoque-sync'

/**
 * POST /api/admin/bling/[empresaId]/sync
 *
 * Força uma sincronização de estoque completa para a empresa.
 * Verifica token válido antes de executar.
 * Pode demorar alguns minutos dependendo da quantidade de produtos.
 */
export const maxDuration = 300 // 5 minutos

export async function POST(
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

    // Verificar se a empresa existe
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia')
      .eq('id', empresaId)
      .single()

    if (empError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Buscar token válido
    const { data: token } = await supabase
      .from('bling_tokens')
      .select('access_token, expires_at, is_revoke')
      .eq('empresa_id', empresaId)
      .single()

    if (!token) {
      return NextResponse.json(
        { error: 'Nenhum token Bling encontrado para esta empresa' },
        { status: 404 }
      )
    }

    if (token.is_revoke === true) {
      return NextResponse.json(
        { error: 'Token Bling está revogado. O usuário precisa reautorizar antes de sincronizar.' },
        { status: 409 }
      )
    }

    const expiresAt = new Date(token.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token Bling expirado. O usuário precisa reautorizar.' },
        { status: 409 }
      )
    }

    console.log(
      `[Admin Bling Sync] Iniciando sync de estoque para empresa ${empresaId} (${empresa.nome_fantasia})`
    )

    const startTime = Date.now()

    // Executar sincronização
    const result = await syncEstoqueEmpresa(
      supabase,
      token.access_token,
      empresaId
    )

    const durationMs = Date.now() - startTime

    console.log(
      `[Admin Bling Sync] Empresa ${empresaId} concluído em ${(durationMs / 1000).toFixed(1)}s: ` +
      `${result.atualizados} atualizados, ${result.sem_alteracao} ok, ${result.erros} erros`
    )

    return NextResponse.json({
      success: true,
      empresa_id: empresaId,
      nome_fantasia: empresa.nome_fantasia,
      resultado: result,
      duracao_ms: durationMs,
      duracao_legivel: `${(durationMs / 1000).toFixed(1)}s`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[Admin Bling Sync] Erro:', errorMsg)
    return NextResponse.json(
      { error: 'Erro ao executar sincronização', details: errorMsg },
      { status: 500 }
    )
  }
}
