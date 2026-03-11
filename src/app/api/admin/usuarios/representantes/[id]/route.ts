import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    // 1. Fetch user from users_representante
    const { data: user, error: userError } = await supabase
      .from('users_representante')
      .select('id, nome, email, telefone, ativo, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Error fetching user_representante:', userError)
      return NextResponse.json(
        { error: 'Representante nao encontrado' },
        { status: 404 }
      )
    }

    // 2. Fetch representante entities linked to this user
    const { data: repEntities, error: repError } = await supabase
      .from('representantes')
      .select(
        'id, nome, empresa_id, codigo_acesso, ativo, created_at, empresas(id, nome_fantasia, razao_social, cnpj)'
      )
      .eq('user_representante_id', userId)

    if (repError) {
      console.error('Error fetching representante entities:', repError)
    }

    const entities = repEntities || []
    const entityIds = entities.map((e) => e.id)

    // 3. Fetch linked fornecedores via junction table
    let repFornecedores: Array<{
      representante_id: number
      fornecedor_id: number
      fornecedores: { id: number; nome: string; cnpj: string | null } | null
    }> = []

    if (entityIds.length > 0) {
      const { data: rf } = await supabase
        .from('representante_fornecedores')
        .select('representante_id, fornecedor_id, fornecedores(id, nome, cnpj)')
        .in('representante_id', entityIds)

      repFornecedores = (rf || []) as unknown as typeof repFornecedores
    }

    // 4. Build enriched entities with empresa + fornecedores
    const representante_entities = entities.map((entity) => {
      const empresa = entity.empresas as unknown as {
        id: number
        nome_fantasia: string | null
        razao_social: string | null
        cnpj: string | null
      } | null

      const entityFornecedores = repFornecedores
        .filter((rf) => rf.representante_id === entity.id)
        .map((rf) => rf.fornecedores)
        .filter(Boolean) as Array<{ id: number; nome: string; cnpj: string | null }>

      return {
        id: entity.id,
        nome: entity.nome,
        empresa_id: entity.empresa_id,
        codigo_acesso: entity.codigo_acesso,
        ativo: entity.ativo,
        created_at: entity.created_at,
        empresa: empresa
          ? {
              id: empresa.id,
              nome_fantasia: empresa.nome_fantasia,
              razao_social: empresa.razao_social,
              cnpj: empresa.cnpj,
            }
          : null,
        fornecedores: entityFornecedores,
      }
    })

    // 5. Compute stats
    const uniqueEmpresas = new Set(
      representante_entities
        .filter((e) => e.empresa !== null)
        .map((e) => e.empresa!.id)
    )

    const uniqueFornecedores = new Set(
      representante_entities.flatMap((e) => e.fornecedores.map((f) => f.id))
    )

    // Count pedidos_compra where representante_id is in the entity IDs
    let pedidosCount = 0
    if (entityIds.length > 0) {
      const { count } = await supabase
        .from('pedidos_compra')
        .select('id', { count: 'exact', head: true })
        .in('representante_id', entityIds)

      pedidosCount = count ?? 0
    }

    // 6. Fetch 10 most recent pedidos_compra for these representante entities
    let pedidos_recentes: Array<{
      id: number
      numero: string | null
      data: string | null
      total: number | null
      status_interno: string | null
      situacao: string | null
      fornecedor_id: number | null
      fornecedores: { id: number; nome: string } | null
      empresa_id: number | null
      empresas: { id: number; nome_fantasia: string | null } | null
    }> = []

    if (entityIds.length > 0) {
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos_compra')
        .select(
          'id, numero, data, total, status_interno, situacao, fornecedor_id, fornecedores(id, nome), empresa_id, empresas(id, nome_fantasia)'
        )
        .in('representante_id', entityIds)
        .order('data', { ascending: false })
        .limit(10)

      if (pedidosError) {
        console.error('Error fetching pedidos_compra:', pedidosError)
      }

      pedidos_recentes = (pedidos || []) as unknown as typeof pedidos_recentes
    }

    return NextResponse.json({
      user,
      representante_entities,
      stats: {
        empresas_count: uniqueEmpresas.size,
        fornecedores_count: uniqueFornecedores.size,
        pedidos_count: pedidosCount,
      },
      pedidos_recentes,
    })
  } catch (error) {
    console.error('Error in representante detail GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
