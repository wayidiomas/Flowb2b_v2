import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/admin/auditoria/bling-erros
 *
 * Lista jobs da bling_sync_queue com status='erro_terminal' (e opcionalmente
 * 'pendente' com tentativas > 0). Painel para o superadmin diagnosticar e
 * decidir reprocessar.
 */
export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const empresaId = searchParams.get('empresa_id')
    const operacao = searchParams.get('operacao')
    const codigo = searchParams.get('codigo')  // ex: '429', '500'
    const status = searchParams.get('status') || 'erro_terminal'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = Math.min(100, parseInt(searchParams.get('per_page') || '20', 10))
    const offset = (page - 1) * perPage

    let query = supabase
      .from('bling_sync_queue')
      .select(`
        id, empresa_id, operacao, payload, origem, origem_ref_id, status,
        tentativas, max_tentativas, proximo_em, ultimo_erro, ultimo_erro_codigo,
        locked_by, locked_em, concluido_em, created_at, updated_at,
        empresa:empresas(id, nome_fantasia, razao_social)
      `, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (status === 'todos') {
      // sem filtro de status
    } else {
      query = query.eq('status', status)
    }
    if (empresaId) query = query.eq('empresa_id', Number(empresaId))
    if (operacao) query = query.eq('operacao', operacao)
    if (codigo) query = query.eq('ultimo_erro_codigo', codigo)

    const { data, count, error } = await query
    if (error) {
      console.error('Erro bling_sync_queue:', error)
      return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 })
    }

    return NextResponse.json({
      page,
      per_page: perPage,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / perPage),
      jobs: data || []
    })
  } catch (err) {
    console.error('Erro em /api/admin/auditoria/bling-erros:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
