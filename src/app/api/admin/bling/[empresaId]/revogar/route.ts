import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/admin/bling/[empresaId]/revogar
 *
 * Revoga o token Bling de uma empresa, setando is_revoke = true.
 * Isso faz com que o BlingRevokeModal apareça para o lojista,
 * bloqueando o acesso até que ele reautorize no Bling.
 */
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

    // Verificar se existe token para revogar
    const { data: token } = await supabase
      .from('bling_tokens')
      .select('empresa_id, is_revoke')
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
        { error: 'Token já está revogado' },
        { status: 409 }
      )
    }

    // Revogar o token
    const { error: updateError } = await supabase
      .from('bling_tokens')
      .update({ is_revoke: true })
      .eq('empresa_id', empresaId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao revogar token', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(
      `[Admin Bling] Token revogado para empresa ${empresaId} (${empresa.nome_fantasia})`
    )

    return NextResponse.json({
      success: true,
      message: `Token Bling revogado para ${empresa.nome_fantasia}. O usuário será forçado a reautenticar.`,
      empresa_id: empresaId,
    })
  } catch (error) {
    console.error('[Admin Bling Revogar] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
