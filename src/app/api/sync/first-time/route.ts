import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

const FLOWB2BAPI_URL = process.env.FLOWB2BAPI_URL

// Verifica se o usuario tem acesso a empresa
async function userHasAccessToEmpresa(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  empresaId: number,
  userRole: string
): Promise<boolean> {
  // Admin tem acesso a todas as empresas
  if (userRole === 'admin') {
    return true
  }

  // Verificar se o usuario eh o dono da empresa (empresa_id no users)
  const { data: user } = await supabase
    .from('users')
    .select('empresa_id')
    .eq('id', userId)
    .single()

  if (user?.empresa_id === empresaId) {
    return true
  }

  // Verificar se o usuario eh colaborador da empresa (lista_colaboradores)
  const { data: empresa } = await supabase
    .from('empresas')
    .select('lista_colaboradores')
    .eq('id', empresaId)
    .single()

  if (empresa?.lista_colaboradores?.includes(userId)) {
    return true
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado' },
        { status: 401 }
      )
    }

    const permCheck = await requirePermission(user, 'configuracoes')
    if (!permCheck.allowed) return permCheck.response

    const body = await request.json()
    const { empresa_id } = body

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: 'empresa_id e obrigatorio' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Validar se o usuario tem permissao para essa empresa
    const hasAccess = await userHasAccessToEmpresa(
      supabase,
      user.userId,
      empresa_id,
      user.role
    )

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Sem permissao para essa empresa' },
        { status: 403 }
      )
    }

    // Buscar tokens do Bling
    const { data: tokens, error: tokensError } = await supabase
      .from('bling_tokens')
      .select('access_token, refresh_token')
      .eq('empresa_id', empresa_id)
      .single()

    if (tokensError || !tokens) {
      return NextResponse.json(
        { success: false, error: 'Tokens do Bling nao encontrados. Conecte o Bling primeiro.' },
        { status: 404 }
      )
    }

    // Verificar se a API esta configurada
    if (!FLOWB2BAPI_URL) {
      console.error('FLOWB2BAPI_URL nao configurada')
      return NextResponse.json(
        { success: false, error: 'Servico de sincronizacao nao configurado' },
        { status: 500 }
      )
    }

    // Chamar flowb2bapi para iniciar sincronizacao
    console.log(`[Sync] Iniciando first-time sync para empresa ${empresa_id}`)

    const response = await fetch(`${FLOWB2BAPI_URL}/api/sync/first-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        empresa_id: empresa_id,
        accessToken: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Sync] Erro ao iniciar sync:', errorText)
      return NextResponse.json(
        { success: false, error: 'Erro ao iniciar sincronizacao' },
        { status: response.status }
      )
    }

    const result = await response.json()

    console.log(`[Sync] Sync iniciada com sucesso para empresa ${empresa_id}`)

    return NextResponse.json({
      success: true,
      message: 'Sincronizacao iniciada com sucesso',
      data: result,
    })
  } catch (error) {
    console.error('[Sync] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao iniciar sincronizacao' },
      { status: 500 }
    )
  }
}
