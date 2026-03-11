import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/empresas/[id]
 *
 * Retorna detalhes completos de uma empresa:
 * - Dados da empresa
 * - Usuarios vinculados (via users_empresas)
 * - Fornecedores
 * - Bling token info
 * - Contagens: produtos, pedidos, fornecedores
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireSuperAdmin(request)
  if (authError) return authError

  try {
    const { id: idStr } = await params
    const empresaId = Number(idStr)

    if (isNaN(empresaId) || empresaId <= 0) {
      return NextResponse.json(
        { error: 'ID de empresa invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar empresa
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj, conectadabling, sync_status, created_date')
      .eq('id', empresaId)
      .single()

    if (empError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa nao encontrada' },
        { status: 404 }
      )
    }

    // Buscar dados em paralelo
    const [
      usersEmpresasResult,
      fornecedoresResult,
      tokenResult,
      produtosCountResult,
      pedidosCountResult,
    ] = await Promise.all([
      // Usuarios vinculados via users_empresas + join users
      supabase
        .from('users_empresas')
        .select('user_id, role, empresa_id, users(id, nome, email, ativo, created_at)')
        .eq('empresa_id', empresaId),

      // Fornecedores da empresa
      supabase
        .from('fornecedores')
        .select('id, nome, nome_fantasia, cnpj, empresa_id')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true }),

      // Token Bling
      supabase
        .from('bling_tokens')
        .select('empresa_id, expires_at, is_revoke, updated_at')
        .eq('empresa_id', empresaId)
        .single(),

      // Contagem de produtos
      supabase
        .from('produtos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId),

      // Contagem de pedidos
      supabase
        .from('pedidos_compra')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId),
    ])

    // Montar lista de usuarios
    const users = (usersEmpresasResult.data || []).map(ue => {
      const user = ue.users as unknown as {
        id: number
        nome: string | null
        email: string
        ativo: boolean
        created_at: string
      } | null

      return {
        id: user?.id ?? ue.user_id,
        nome: user?.nome ?? null,
        email: user?.email ?? 'Email indisponivel',
        role: ue.role || 'user',
        ativo: user?.ativo ?? true,
        created_at: user?.created_at ?? null,
      }
    })

    // Fornecedores
    const fornecedores = (fornecedoresResult.data || []).map(f => ({
      id: f.id,
      nome: f.nome_fantasia || f.nome || `Fornecedor #${f.id}`,
      cnpj: f.cnpj,
    }))

    // Token status
    const token = tokenResult.data
    let token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'

    if (!token) {
      token_status = 'no_token'
    } else if (token.is_revoke === true) {
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

    return NextResponse.json({
      empresa: {
        id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        conectadabling: empresa.conectadabling,
        sync_status: empresa.sync_status,
        created_date: empresa.created_date,
      },
      users,
      fornecedores,
      bling: {
        token_status,
        expires_at: token?.expires_at ?? null,
        is_revoke: token?.is_revoke ?? null,
        updated_at: token?.updated_at ?? null,
      },
      counts: {
        users: users.length,
        fornecedores: fornecedores.length,
        produtos: produtosCountResult.count || 0,
        pedidos: pedidosCountResult.count || 0,
      },
    })
  } catch (error) {
    console.error('[Admin Empresa Detail] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
