import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/usuarios/fornecedores/[id]
 *
 * Retorna detalhes completos de um usuario fornecedor:
 * - Dados do user (users_fornecedor)
 * - Entidades fornecedor vinculadas por CNPJ (fornecedores table)
 * - Lojistas (empresas) vinculados
 * - Pedidos de compra recentes
 * - Estatisticas agregadas
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const { id: idParam } = await params
    const userId = parseInt(idParam, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch the user from users_fornecedor
    const { data: user, error: userError } = await supabase
      .from('users_fornecedor')
      .select('id, nome, email, cnpj, telefone, ativo, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Fornecedor nao encontrado' },
        { status: 404 }
      )
    }

    // If the user has a CNPJ, find matching fornecedor entities across empresas
    interface FornecedorEntity {
      id: number
      nome: string
      nome_fantasia: string | null
      cnpj: string | null
      empresa_id: number
      empresas: { id: number; nome_fantasia: string | null } | null
    }

    let fornecedorEntities: FornecedorEntity[] = []

    if (user.cnpj) {
      const { data: entities } = await supabase
        .from('fornecedores')
        .select('id, nome, nome_fantasia, cnpj, empresa_id, empresas(id, nome_fantasia)')
        .eq('cnpj', user.cnpj)

      fornecedorEntities = (entities || []) as unknown as FornecedorEntity[]
    }

    const fornecedorIds = fornecedorEntities.map((f) => f.id)

    // Count pedidos_compra per fornecedor entity and get total movimentado
    let pedidosCounts: Record<number, number> = {}
    let totalMovimentado = 0
    let totalPedidos = 0

    if (fornecedorIds.length > 0) {
      const { data: pedidosAgg } = await supabase
        .from('pedidos_compra')
        .select('fornecedor_id, total')
        .in('fornecedor_id', fornecedorIds)

      if (pedidosAgg) {
        for (const p of pedidosAgg) {
          pedidosCounts[p.fornecedor_id] = (pedidosCounts[p.fornecedor_id] || 0) + 1
          totalMovimentado += Number(p.total) || 0
          totalPedidos += 1
        }
      }
    }

    // Get the 10 most recent pedidos_compra for this fornecedor
    let pedidosRecentes: Array<{
      id: number
      numero: string | null
      data: string | null
      total: number | null
      status_interno: string | null
      situacao: string | null
      empresa_id: number | null
      empresa_nome: string | null
    }> = []

    if (fornecedorIds.length > 0) {
      const { data: pedidos } = await supabase
        .from('pedidos_compra')
        .select('id, numero, data, total, status_interno, situacao, empresa_id, empresas(id, nome_fantasia)')
        .in('fornecedor_id', fornecedorIds)
        .order('data', { ascending: false })
        .limit(10)

      if (pedidos) {
        pedidosRecentes = pedidos.map((p) => {
          const empresa = p.empresas as unknown as { id: number; nome_fantasia: string | null } | null
          return {
            id: p.id,
            numero: p.numero,
            data: p.data,
            total: p.total,
            status_interno: p.status_interno,
            situacao: p.situacao,
            empresa_id: p.empresa_id,
            empresa_nome: empresa?.nome_fantasia || `Empresa #${p.empresa_id}`,
          }
        })
      }
    }

    // Build unique lojistas list from fornecedor entities
    const lojistasMap = new Map<number, { id: number; nome_fantasia: string | null; cnpj: string | null }>()
    for (const entity of fornecedorEntities) {
      const empresa = entity.empresas as { id: number; nome_fantasia: string | null } | null
      if (empresa && !lojistasMap.has(empresa.id)) {
        lojistasMap.set(empresa.id, {
          id: empresa.id,
          nome_fantasia: empresa.nome_fantasia,
          cnpj: null,
        })
      }
    }

    // Fetch CNPJ for each lojista empresa
    const lojistaIds = Array.from(lojistasMap.keys())
    if (lojistaIds.length > 0) {
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, cnpj')
        .in('id', lojistaIds)

      if (empresasData) {
        for (const e of empresasData) {
          const existing = lojistasMap.get(e.id)
          if (existing) {
            existing.cnpj = e.cnpj
          }
        }
      }
    }

    const lojistas = Array.from(lojistasMap.values())

    // Build fornecedor_entities response
    const fornecedorEntitiesResponse = fornecedorEntities.map((entity) => {
      const empresa = entity.empresas as { id: number; nome_fantasia: string | null } | null
      return {
        id: entity.id,
        nome: entity.nome_fantasia || entity.nome || `Fornecedor #${entity.id}`,
        empresa_id: entity.empresa_id,
        empresa_nome: empresa?.nome_fantasia || `Empresa #${entity.empresa_id}`,
        pedidos_count: pedidosCounts[entity.id] || 0,
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cnpj: user.cnpj,
        telefone: user.telefone,
        ativo: user.ativo,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      fornecedor_entities: fornecedorEntitiesResponse,
      lojistas,
      pedidos_recentes: pedidosRecentes,
      stats: {
        lojistas_vinculados: lojistas.length,
        pedidos_recebidos: totalPedidos,
        total_movimentado: totalMovimentado,
      },
    })
  } catch (error) {
    console.error('[Admin Fornecedor Detail] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
