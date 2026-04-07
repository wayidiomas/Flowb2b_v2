import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ catalogoId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { catalogoId: catalogoIdStr } = await params
    const catalogoId = parseInt(catalogoIdStr, 10)

    if (isNaN(catalogoId)) {
      return NextResponse.json({ error: 'catalogoId invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch pending updates for this catalog and empresa
    const { data: atualizacoes, error } = await supabase
      .from('catalogo_atualizacoes')
      .select('id, tipo, catalogo_item_id, dados_antigos, dados_novos, created_at')
      .eq('catalogo_id', catalogoId)
      .eq('empresa_id', user.empresaId)
      .eq('status', 'pendente')
      .order('tipo')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar atualizacoes do catalogo:', error)
      return NextResponse.json({ error: 'Erro ao buscar atualizacoes' }, { status: 500 })
    }

    if (!atualizacoes || atualizacoes.length === 0) {
      return NextResponse.json({ atualizacoes: [] })
    }

    // Collect all catalogo_item_ids to fetch item details
    const itemIds = atualizacoes
      .map(a => a.catalogo_item_id)
      .filter((id): id is number => id !== null)

    const uniqueItemIds = [...new Set(itemIds)]

    // Fetch item details (nome, codigo, ean) in batches
    const itemMap = new Map<number, { nome: string | null; codigo: string | null; ean: string | null }>()

    if (uniqueItemIds.length > 0) {
      for (let i = 0; i < uniqueItemIds.length; i += 500) {
        const batch = uniqueItemIds.slice(i, i + 500)
        const { data: itens } = await supabase
          .from('catalogo_itens')
          .select('id, nome, codigo, ean')
          .in('id', batch)

        for (const item of itens || []) {
          itemMap.set(item.id, {
            nome: item.nome,
            codigo: item.codigo,
            ean: item.ean,
          })
        }
      }
    }

    // Enrich updates with item data
    const resultado = atualizacoes.map(a => {
      const itemData = a.catalogo_item_id ? itemMap.get(a.catalogo_item_id) : null

      // For "novo" type, item might not have been linked yet -- use dados_novos
      const itemNome = itemData?.nome
        || (a.dados_novos as Record<string, any> | null)?.nome
        || (a.dados_antigos as Record<string, any> | null)?.nome
        || null
      const itemCodigo = itemData?.codigo || null
      const itemEan = itemData?.ean
        || (a.dados_novos as Record<string, any> | null)?.ean
        || null

      return {
        id: a.id,
        tipo: a.tipo,
        catalogo_item_id: a.catalogo_item_id,
        dados_antigos: a.dados_antigos,
        dados_novos: a.dados_novos,
        item_nome: itemNome,
        item_codigo: itemCodigo,
        item_ean: itemEan,
      }
    })

    return NextResponse.json({ atualizacoes: resultado })
  } catch (error) {
    console.error('Erro ao buscar atualizacoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
