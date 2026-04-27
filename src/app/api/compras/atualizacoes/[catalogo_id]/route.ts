import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/compras/atualizacoes/[catalogo_id]?page=1&per_page=20
 *
 * Lista paginada de mudanças do catálogo (catalogo_atualizacoes) que estão
 * pendentes para o lojista logado. Inclui dados do item (nome, foto, etc) e
 * info do fornecedor + status atual.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ catalogo_id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { catalogo_id: catalogoIdStr } = await params
    const catalogoId = Number(catalogoIdStr)
    if (!catalogoId || isNaN(catalogoId)) {
      return NextResponse.json({ error: 'catalogo_id invalido' }, { status: 400 })
    }

    const url = new URL(_req.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page')) || 20))
    const tipo = url.searchParams.get('tipo')  // 'novo' | 'preco' | 'dados' | 'removido' | null
    const offset = (page - 1) * perPage

    const supabase = createServerSupabaseClient()

    // Catálogo + status do par (lojista, catálogo)
    const [{ data: catalogo }, { data: status }] = await Promise.all([
      supabase
        .from('catalogo_fornecedor')
        .select('id, nome, slug, logo_url, cor_primaria, cnpj')
        .eq('id', catalogoId)
        .maybeSingle(),
      supabase
        .from('catalogo_status_lojista')
        .select('status, qtd_nao_vistas, ultima_publicacao_at, ultima_visualizacao_at')
        .eq('empresa_id', user.empresaId)
        .eq('catalogo_id', catalogoId)
        .maybeSingle()
    ])

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Lista paginada de atualizações
    let query = supabase
      .from('catalogo_atualizacoes')
      .select(`
        id, tipo, catalogo_item_id, dados_antigos, dados_novos, status, respondido_em, created_at,
        catalogo_item:catalogo_itens(id, nome, codigo, ean, marca, imagem_url, ativo)
      `, { count: 'exact' })
      .eq('empresa_id', user.empresaId)
      .eq('catalogo_id', catalogoId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data: itens, count, error } = await query

    if (error) {
      console.error('Erro ao listar atualizacoes:', error)
      return NextResponse.json({ error: 'Erro ao listar atualizacoes' }, { status: 500 })
    }

    // Inativos do lojista (catalogo_precos_lojista.ativo=false) — pra UI mostrar
    const itemIds = (itens || []).map(i => i.catalogo_item_id).filter((id): id is number => id != null)
    const inativosSet = new Set<number>()
    if (itemIds.length > 0) {
      const { data: precos } = await supabase
        .from('catalogo_precos_lojista')
        .select('catalogo_item_id, ativo')
        .eq('empresa_id', user.empresaId)
        .in('catalogo_item_id', itemIds)
      for (const p of precos || []) {
        if (p.ativo === false && p.catalogo_item_id) inativosSet.add(p.catalogo_item_id)
      }
    }

    const itensComFlag = (itens || []).map(i => ({
      ...i,
      inativo_para_mim: i.catalogo_item_id ? inativosSet.has(i.catalogo_item_id) : false
    }))

    return NextResponse.json({
      page,
      per_page: perPage,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / perPage),
      catalogo,
      status_lojista: status || {
        status: 'atualizado',
        qtd_nao_vistas: 0,
        ultima_publicacao_at: null,
        ultima_visualizacao_at: null
      },
      itens: itensComFlag
    })
  } catch (err) {
    console.error('Erro em /api/compras/atualizacoes/[catalogo_id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
