import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/compras/atualizacoes/contagem
 *
 * Retorna contagem de catálogos com atualizações pendentes para o lojista
 * logado. Usado pelo badge no menu e pelo banner em /compras/catalogo.
 *
 * Resposta:
 * {
 *   total_nao_vistas: number          // soma de qtd_nao_vistas de todos catálogos
 *   total_catalogos_desatualizados: number
 *   por_catalogo: [
 *     {
 *       catalogo_id, fornecedor_nome, slug, logo_url, cor_primaria,
 *       qtd_nao_vistas, ultima_publicacao_at
 *     }
 *   ]
 * }
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('catalogo_status_lojista')
      .select(`
        catalogo_id,
        qtd_nao_vistas,
        ultima_publicacao_at,
        catalogo:catalogo_fornecedor(id, nome, slug, logo_url, cor_primaria, cnpj)
      `)
      .eq('empresa_id', user.empresaId)
      .eq('status', 'desatualizado')
      .gt('qtd_nao_vistas', 0)
      .order('ultima_publicacao_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar contagem:', error)
      return NextResponse.json({ error: 'Erro ao buscar contagem' }, { status: 500 })
    }

    type Row = {
      catalogo_id: number
      qtd_nao_vistas: number
      ultima_publicacao_at: string | null
      catalogo: {
        id: number
        nome: string | null
        slug: string | null
        logo_url: string | null
        cor_primaria: string | null
        cnpj: string | null
      } | null
    }

    const rows = (data || []) as unknown as Row[]

    const por_catalogo = rows.map(r => ({
      catalogo_id: r.catalogo_id,
      fornecedor_nome: r.catalogo?.nome || 'Fornecedor',
      slug: r.catalogo?.slug || null,
      logo_url: r.catalogo?.logo_url || null,
      cor_primaria: r.catalogo?.cor_primaria || null,
      cnpj: r.catalogo?.cnpj || null,
      qtd_nao_vistas: r.qtd_nao_vistas,
      ultima_publicacao_at: r.ultima_publicacao_at
    }))

    const total_nao_vistas = por_catalogo.reduce((sum, c) => sum + c.qtd_nao_vistas, 0)

    return NextResponse.json({
      total_nao_vistas,
      total_catalogos_desatualizados: por_catalogo.length,
      por_catalogo
    })
  } catch (err) {
    console.error('Erro em /api/compras/atualizacoes/contagem:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
