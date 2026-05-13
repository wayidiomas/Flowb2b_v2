import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    console.log('[Representante Pedidos] User:', JSON.stringify({
      tipo: user?.tipo,
      representanteUserId: user?.representanteUserId,
      email: user?.email,
    }))

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      console.log('[Representante Pedidos] Auth failed - user:', !!user, 'tipo:', user?.tipo, 'representanteUserId:', user?.representanteUserId)
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const searchQuery = searchParams.get('search')?.toLowerCase().trim()
    const origemFilter = searchParams.get('origem') || 'plataforma'

    // Buscar representantes vinculados a este usuario (um por empresa)
    const { data: representantes, error: repError } = await supabase
      .from('representantes')
      .select('id, empresa_id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    console.log('[Representante Pedidos] user_representante_id:', user.representanteUserId, '- Found:', representantes?.length || 0, 'representantes', repError ? `Error: ${repError.message}` : '')

    if (!representantes || representantes.length === 0) {
      return NextResponse.json({ pedidos: [] })
    }

    const representanteIds = representantes.map(r => r.id)
    const empresaIds = [...new Set(representantes.map(r => r.empresa_id))]

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

    // Buscar pedidos: filtro CHAVE — representante_id IN (representanteIds)
    let query = supabase
      .from('pedidos_compra')
      .select('id, numero, data, data_prevista, total, total_produtos, status_interno, empresa_id, fornecedor_id, representante_id')
      .in('representante_id', representanteIds)
      .eq('is_excluded', false)
      .neq('status_interno', 'rascunho')
      .neq('status_interno', 'cancelado')
      .order('data', { ascending: false })

    if (origemFilter === 'plataforma') {
      query = query.in('origem', ['flowb2b', 'catalogo'])
    } else if (origemFilter !== 'todos') {
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

    // Buscar fornecedores vinculados aos pedidos
    const fornecedorIdsSet = [...new Set((pedidos || []).map(p => p.fornecedor_id).filter(Boolean))]
    const fornecedorMap = new Map<number, { id: number; nome: string; nome_fantasia: string | null; cnpj: string | null }>()

    if (fornecedorIdsSet.length > 0) {
      const { data: fornecedores } = await supabase
        .from('fornecedores')
        .select('id, nome, nome_fantasia, cnpj')
        .in('id', fornecedorIdsSet)

      ;(fornecedores || []).forEach(f => {
        fornecedorMap.set(f.id, { id: f.id, nome: f.nome, nome_fantasia: f.nome_fantasia, cnpj: f.cnpj })
      })
    }

    // Buscar representantes vinculados aos pedidos (mostrar info do rep)
    const representanteIdsDosPedidos = [...new Set((pedidos || []).map(p => p.representante_id).filter(Boolean))]
    const representanteMap = new Map<number, { id: number; nome: string }>()

    if (representanteIdsDosPedidos.length > 0) {
      const { data: reps } = await supabase
        .from('representantes')
        .select('id, nome')
        .in('id', representanteIdsDosPedidos)

      ;(reps || []).forEach(r => {
        representanteMap.set(r.id, { id: r.id, nome: r.nome })
      })
    }

    const pedidosFormatted = (pedidos || []).map(p => {
      const empresa = empresaMap.get(p.empresa_id)
      const fornecedor = p.fornecedor_id ? fornecedorMap.get(p.fornecedor_id) : null
      const representante = p.representante_id ? representanteMap.get(p.representante_id) : null
      return {
        ...p,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
        empresa_cnpj: empresa?.cnpj || '',
        fornecedor_nome: fornecedor?.nome_fantasia || fornecedor?.nome || '',
        fornecedor_cnpj: fornecedor?.cnpj || '',
        itens_count: itensCountMap.get(p.id) || 0,
        representante: representante || null,
      }
    })

    return NextResponse.json({ pedidos: pedidosFormatted })
  } catch (error) {
    console.error('Erro ao listar pedidos representante:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
