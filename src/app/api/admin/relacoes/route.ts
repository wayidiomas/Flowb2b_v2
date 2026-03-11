import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/relacoes?empresa_id=X
 *
 * Monta a arvore de relacoes de uma empresa:
 * Empresa
 *   -> Fornecedores (com contagem de produtos e pedidos)
 *       -> User Fornecedor (match por CNPJ)
 *       -> Representantes (via representante_fornecedores)
 *           -> User Representante
 */
export async function GET(request: NextRequest) {
  const authError = requireSuperAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const empresaIdStr = searchParams.get('empresa_id')

    if (!empresaIdStr) {
      return NextResponse.json(
        { error: 'Parametro empresa_id e obrigatorio' },
        { status: 400 }
      )
    }

    const empresaId = Number(empresaIdStr)
    if (isNaN(empresaId) || empresaId <= 0) {
      return NextResponse.json(
        { error: 'empresa_id invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar empresa
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj')
      .eq('id', empresaId)
      .single()

    if (empError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa nao encontrada' },
        { status: 404 }
      )
    }

    // Buscar fornecedores da empresa
    const { data: fornecedores, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia, cnpj')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })

    if (fornError) {
      console.error('[Admin Relacoes] Erro ao buscar fornecedores:', fornError)
      return NextResponse.json(
        { error: 'Erro ao buscar fornecedores' },
        { status: 500 }
      )
    }

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({
        empresa: {
          id: empresa.id,
          nome: empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`,
          cnpj: empresa.cnpj,
        },
        fornecedores: [],
      })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar dados em paralelo
    const [
      produtosVinculadosResult,
      pedidosResult,
      representantesResult,
      usersFornecedorResult,
    ] = await Promise.all([
      // Produtos vinculados por fornecedor (via fornecedores_produtos)
      supabase
        .from('fornecedores_produtos')
        .select('fornecedor_id')
        .in('fornecedor_id', fornecedorIds)
        .eq('empresa_id', empresaId),

      // Pedidos de compra por fornecedor
      supabase
        .from('pedidos_compra')
        .select('id, fornecedor_id')
        .in('fornecedor_id', fornecedorIds)
        .eq('empresa_id', empresaId),

      // Representantes da empresa vinculados a fornecedores
      supabase
        .from('representantes')
        .select('id, nome, ativo, user_representante_id, codigo_acesso, representante_fornecedores(fornecedor_id)')
        .eq('empresa_id', empresaId),

      // Users fornecedor (buscar todos para match por CNPJ)
      supabase
        .from('users_fornecedor')
        .select('id, email, nome, cnpj, ativo'),
    ])

    // Contagens por fornecedor
    const produtosByFornecedor = new Map<number, number>()
    if (produtosVinculadosResult.data) {
      for (const item of produtosVinculadosResult.data) {
        produtosByFornecedor.set(
          item.fornecedor_id,
          (produtosByFornecedor.get(item.fornecedor_id) || 0) + 1
        )
      }
    }

    const pedidosByFornecedor = new Map<number, number>()
    if (pedidosResult.data) {
      for (const item of pedidosResult.data) {
        if (item.fornecedor_id) {
          pedidosByFornecedor.set(
            item.fornecedor_id,
            (pedidosByFornecedor.get(item.fornecedor_id) || 0) + 1
          )
        }
      }
    }

    // Indexar users_fornecedor por cnpj
    const usersFornecedorByCnpj = new Map<string, {
      id: number
      email: string
      nome: string | null
      ativo: boolean
    }>()
    if (usersFornecedorResult.data) {
      for (const uf of usersFornecedorResult.data) {
        if (uf.cnpj) {
          // Normalizar CNPJ (remover formatacao)
          const cnpjNorm = uf.cnpj.replace(/\D/g, '')
          usersFornecedorByCnpj.set(cnpjNorm, {
            id: uf.id,
            email: uf.email,
            nome: uf.nome,
            ativo: uf.ativo,
          })
        }
      }
    }

    // Indexar representantes por fornecedor_id
    const representantesByFornecedor = new Map<number, Array<{
      id: number
      nome: string | null
      ativo: boolean
      codigo_acesso: string | null
      user_representante_id: number | null
    }>>()

    if (representantesResult.data) {
      for (const rep of representantesResult.data) {
        const fornecedorLinks = rep.representante_fornecedores as unknown as Array<{
          fornecedor_id: number
        }> | null

        if (fornecedorLinks) {
          for (const link of fornecedorLinks) {
            if (!representantesByFornecedor.has(link.fornecedor_id)) {
              representantesByFornecedor.set(link.fornecedor_id, [])
            }
            representantesByFornecedor.get(link.fornecedor_id)!.push({
              id: rep.id,
              nome: rep.nome,
              ativo: rep.ativo,
              codigo_acesso: rep.codigo_acesso,
              user_representante_id: rep.user_representante_id,
            })
          }
        }
      }
    }

    // Buscar users_representante para os IDs encontrados
    const allRepUserIds = new Set<number>()
    if (representantesResult.data) {
      for (const rep of representantesResult.data) {
        if (rep.user_representante_id) {
          allRepUserIds.add(rep.user_representante_id)
        }
      }
    }

    const usersRepresentanteMap = new Map<number, {
      id: number
      email: string
      nome: string | null
      ativo: boolean
    }>()

    if (allRepUserIds.size > 0) {
      const { data: usersRep } = await supabase
        .from('users_representante')
        .select('id, email, nome, ativo')
        .in('id', Array.from(allRepUserIds))

      if (usersRep) {
        for (const ur of usersRep) {
          usersRepresentanteMap.set(ur.id, {
            id: ur.id,
            email: ur.email,
            nome: ur.nome,
            ativo: ur.ativo,
          })
        }
      }
    }

    // Montar arvore
    const tree = fornecedores.map(fornecedor => {
      // Match user_fornecedor por CNPJ
      const cnpjNorm = fornecedor.cnpj ? fornecedor.cnpj.replace(/\D/g, '') : ''
      const userFornecedor = cnpjNorm ? usersFornecedorByCnpj.get(cnpjNorm) || null : null

      // Representantes deste fornecedor
      const reps = representantesByFornecedor.get(fornecedor.id) || []
      const representantes = reps.map(rep => {
        const userRep = rep.user_representante_id
          ? usersRepresentanteMap.get(rep.user_representante_id) || null
          : null

        return {
          id: rep.id,
          nome: rep.nome,
          ativo: rep.ativo,
          codigo_acesso: rep.codigo_acesso,
          user_representante: userRep,
        }
      })

      return {
        id: fornecedor.id,
        nome: fornecedor.nome_fantasia || fornecedor.nome || `Fornecedor #${fornecedor.id}`,
        cnpj: fornecedor.cnpj,
        produtos_count: produtosByFornecedor.get(fornecedor.id) || 0,
        pedidos_count: pedidosByFornecedor.get(fornecedor.id) || 0,
        user_fornecedor: userFornecedor,
        representantes,
      }
    })

    return NextResponse.json({
      empresa: {
        id: empresa.id,
        nome: empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`,
        cnpj: empresa.cnpj,
      },
      fornecedores: tree,
    })
  } catch (error) {
    console.error('[Admin Relacoes] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
