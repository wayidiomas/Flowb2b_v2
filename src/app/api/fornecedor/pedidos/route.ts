import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    console.log('[Fornecedor Pedidos] User:', JSON.stringify({
      tipo: user?.tipo,
      cnpj: user?.cnpj,
      fornecedorUserId: user?.fornecedorUserId,
      email: user?.email
    }))

    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      console.log('[Fornecedor Pedidos] Auth failed - user:', !!user, 'tipo:', user?.tipo, 'cnpj:', user?.cnpj)
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const searchQuery = searchParams.get('search')?.toLowerCase().trim()
    const origemFilter = searchParams.get('origem') || 'flowb2b'

    // Buscar fornecedores vinculados ao CNPJ
    const { data: fornecedores, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    console.log('[Fornecedor Pedidos] CNPJ search:', user.cnpj, '- Found:', fornecedores?.length || 0, 'fornecedores', fornError ? `Error: ${fornError.message}` : '')

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ pedidos: [] })
    }

    const fornecedorIds = fornecedores.map(f => f.id)
    const empresaIds = [...new Set(fornecedores.map(f => f.empresa_id))]

    // Buscar empresas para nomes e CNPJ
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj')
      .in('id', empresaIds)

    const empresaMap = new Map((empresas || []).map(e => [e.id, e]))

    // Se tiver busca, filtrar empresas primeiro
    let empresaIdsFiltered = empresaIds
    if (searchQuery) {
      empresaIdsFiltered = (empresas || [])
        .filter(e => {
          const nomeFantasia = (e.nome_fantasia || '').toLowerCase()
          const razaoSocial = (e.razao_social || '').toLowerCase()
          const cnpj = (e.cnpj || '').replace(/\D/g, '')
          const searchClean = searchQuery.replace(/\D/g, '')

          return nomeFantasia.includes(searchQuery) ||
                 razaoSocial.includes(searchQuery) ||
                 (searchClean && cnpj.includes(searchClean))
        })
        .map(e => e.id)

      if (empresaIdsFiltered.length === 0) {
        return NextResponse.json({ pedidos: [] })
      }
    }

    // Buscar pedidos
    let query = supabase
      .from('pedidos_compra')
      .select('id, numero, data, data_prevista, total, total_produtos, status_interno, empresa_id, fornecedor_id, representante_id')
      .in('fornecedor_id', fornecedorIds)
      .neq('status_interno', 'rascunho')
      .order('data', { ascending: false })

    if (origemFilter !== 'todos') {
      query = query.eq('origem', origemFilter)
    }

    if (statusFilter) {
      query = query.eq('status_interno', statusFilter)
    }

    if (searchQuery) {
      query = query.in('empresa_id', empresaIdsFiltered)
    }

    const { data: pedidos } = await query

    // Contar itens por pedido
    const pedidoIds = (pedidos || []).map(p => p.id)
    const { data: itensCounts } = await supabase
      .from('itens_pedido_compra')
      .select('pedido_compra_id')
      .in('pedido_compra_id', pedidoIds.length > 0 ? pedidoIds : [0])

    const itensCountMap = new Map<number, number>()
    ;(itensCounts || []).forEach(item => {
      itensCountMap.set(item.pedido_compra_id, (itensCountMap.get(item.pedido_compra_id) || 0) + 1)
    })

    // Buscar representantes vinculados aos pedidos
    const representanteIds = [...new Set((pedidos || []).map(p => p.representante_id).filter(Boolean))]
    const representanteMap = new Map<number, { id: number; nome: string }>()

    if (representanteIds.length > 0) {
      const { data: representantes } = await supabase
        .from('representantes')
        .select('id, nome')
        .in('id', representanteIds)

      ;(representantes || []).forEach(r => {
        representanteMap.set(r.id, { id: r.id, nome: r.nome })
      })
    }

    const pedidosFormatted = (pedidos || []).map(p => {
      const empresa = empresaMap.get(p.empresa_id)
      const representante = p.representante_id ? representanteMap.get(p.representante_id) : null
      return {
        ...p,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
        empresa_cnpj: empresa?.cnpj || '',
        itens_count: itensCountMap.get(p.id) || 0,
        representante: representante || null,
      }
    })

    return NextResponse.json({ pedidos: pedidosFormatted })
  } catch (error) {
    console.error('Erro ao listar pedidos fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
