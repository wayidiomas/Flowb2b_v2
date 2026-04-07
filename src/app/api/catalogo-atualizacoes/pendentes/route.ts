import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch all pending updates for this empresa, grouped by catalogo_id
    const { data: pendentes, error } = await supabase
      .from('catalogo_atualizacoes')
      .select('id, catalogo_id, tipo')
      .eq('empresa_id', user.empresaId)
      .eq('status', 'pendente')

    if (error) {
      console.error('Erro ao buscar atualizacoes pendentes:', error)
      return NextResponse.json({ error: 'Erro ao buscar atualizacoes' }, { status: 500 })
    }

    if (!pendentes || pendentes.length === 0) {
      return NextResponse.json({
        tem_pendentes: false,
        total: 0,
        catalogos: [],
      })
    }

    // Group by catalogo_id and count by tipo
    const porCatalogo = new Map<number, { total: number; tipos: Record<string, number> }>()

    for (const item of pendentes) {
      const catalogoId = item.catalogo_id
      if (!catalogoId) continue

      if (!porCatalogo.has(catalogoId)) {
        porCatalogo.set(catalogoId, { total: 0, tipos: { novo: 0, removido: 0, preco: 0, dados: 0 } })
      }

      const grupo = porCatalogo.get(catalogoId)!
      grupo.total++
      if (item.tipo in grupo.tipos) {
        grupo.tipos[item.tipo]++
      }
    }

    // Fetch catalogo names
    const catalogoIds = Array.from(porCatalogo.keys())
    const { data: catalogos } = await supabase
      .from('catalogo_fornecedor')
      .select('id, nome')
      .in('id', catalogoIds)

    const nomeMap = new Map<number, string>()
    for (const cat of catalogos || []) {
      nomeMap.set(cat.id, cat.nome || '')
    }

    // Build response
    const catalogosResponse = catalogoIds.map(catalogoId => {
      const grupo = porCatalogo.get(catalogoId)!
      return {
        catalogo_id: catalogoId,
        nome: nomeMap.get(catalogoId) || '',
        total_pendentes: grupo.total,
        tipos: grupo.tipos,
      }
    })

    return NextResponse.json({
      tem_pendentes: true,
      total: pendentes.length,
      catalogos: catalogosResponse,
    })
  } catch (error) {
    console.error('Erro ao buscar pendentes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
