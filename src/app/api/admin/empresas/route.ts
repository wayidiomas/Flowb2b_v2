import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/empresas
 *
 * Lista todas as empresas com contagens agregadas e status Bling.
 * Suporta ?search= para filtrar por nome_fantasia ou cnpj.
 */
export async function GET(request: NextRequest) {
  const authError = requireSuperAdmin(request)
  if (authError) return authError

  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Buscar empresas
    let empresaQuery = supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj, conectadabling, sync_status, created_date')
      .order('id', { ascending: true })

    if (search) {
      empresaQuery = empresaQuery.or(
        `nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`
      )
    }

    const { data: empresas, error: empError } = await empresaQuery

    if (empError) {
      console.error('[Admin Empresas] Erro ao buscar empresas:', empError)
      return NextResponse.json(
        { error: 'Erro ao buscar empresas', details: empError.message },
        { status: 500 }
      )
    }

    if (!empresas || empresas.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const empresaIds = empresas.map(e => e.id)

    // Buscar contagens em paralelo
    const [
      usersEmpresasResult,
      fornecedoresResult,
      pedidosResult,
      produtosResult,
      tokensResult,
    ] = await Promise.all([
      // Users vinculados via users_empresas
      supabase
        .from('users_empresas')
        .select('empresa_id')
        .in('empresa_id', empresaIds),

      // Fornecedores por empresa
      supabase
        .from('fornecedores')
        .select('id, empresa_id')
        .in('empresa_id', empresaIds),

      // Pedidos de compra por empresa
      supabase
        .from('pedidos_compra')
        .select('id, empresa_id')
        .in('empresa_id', empresaIds),

      // Produtos por empresa
      supabase
        .from('produtos')
        .select('id, empresa_id')
        .in('empresa_id', empresaIds),

      // Tokens Bling
      supabase
        .from('bling_tokens')
        .select('empresa_id, expires_at, is_revoke')
        .in('empresa_id', empresaIds),
    ])

    // Indexar contagens por empresa_id
    const countByEmpresa = (
      items: Array<{ empresa_id: number }> | null
    ): Map<number, number> => {
      const map = new Map<number, number>()
      if (items) {
        for (const item of items) {
          map.set(item.empresa_id, (map.get(item.empresa_id) || 0) + 1)
        }
      }
      return map
    }

    const usersCount = countByEmpresa(usersEmpresasResult.data)
    const fornecedoresCount = countByEmpresa(fornecedoresResult.data)
    const pedidosCount = countByEmpresa(pedidosResult.data)
    const produtosCount = countByEmpresa(produtosResult.data)

    // Indexar tokens
    const tokensMap = new Map(
      (tokensResult.data || []).map(t => [t.empresa_id, t])
    )

    const now = new Date()

    const data = empresas.map(empresa => {
      const token = tokensMap.get(empresa.id)

      let token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'
      if (!token) {
        token_status = 'no_token'
      } else if (token.is_revoke === true) {
        token_status = 'revoked'
      } else {
        const expiresAt = new Date(token.expires_at)
        const nowPlus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        if (expiresAt < now) {
          token_status = 'expired'
        } else if (expiresAt < nowPlus24h) {
          token_status = 'expiring'
        } else {
          token_status = 'valid'
        }
      }

      return {
        id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        conectadabling: empresa.conectadabling,
        sync_status: empresa.sync_status,
        created_date: empresa.created_date,
        token_status,
        counts: {
          users: usersCount.get(empresa.id) || 0,
          fornecedores: fornecedoresCount.get(empresa.id) || 0,
          pedidos: pedidosCount.get(empresa.id) || 0,
          produtos: produtosCount.get(empresa.id) || 0,
        },
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[Admin Empresas] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
