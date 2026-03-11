import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'

const ACTIVE_STATUSES = [
  'enviado_fornecedor',
  'sugestao_pendente',
  'contra_proposta_pendente',
  'aceito',
  'rejeitado',
  'finalizado',
  'cancelado',
] as const

type StatusInterno = (typeof ACTIVE_STATUSES)[number]

export async function GET(request: NextRequest) {
  const forbidden = requireSuperAdmin(request)
  if (forbidden) return forbidden

  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const empresaId = searchParams.get('empresa_id')
    const status = searchParams.get('status')

    // --------------------------------------------------
    // 1. Fetch pedidos_compra (active negotiations only)
    // --------------------------------------------------
    let query = supabase
      .from('pedidos_compra')
      .select(
        `
        id,
        numero,
        data,
        data_prevista,
        total,
        status_interno,
        situacao,
        origem,
        is_excluded,
        updated_at,
        empresa_id,
        fornecedor_id,
        representante_id,
        empresas ( id, nome_fantasia ),
        fornecedores ( id, nome ),
        representantes ( id, nome )
        `
      )
      .neq('status_interno', 'rascunho')
      .or('is_excluded.is.null,is_excluded.eq.false')
      .order('updated_at', { ascending: false })

    if (empresaId) {
      query = query.eq('empresa_id', parseInt(empresaId, 10))
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length === 1) {
        query = query.eq('status_interno', statuses[0])
      } else if (statuses.length > 1) {
        query = query.in('status_interno', statuses)
      }
    }

    const { data: pedidos, error: pedidosError } = await query

    if (pedidosError) {
      console.error('Error fetching negociacoes:', pedidosError)
      return NextResponse.json(
        { error: 'Erro ao buscar negociacoes', details: pedidosError.message },
        { status: 500 }
      )
    }

    const pedidosList = pedidos || []

    // Early return when there are no results
    if (pedidosList.length === 0) {
      return NextResponse.json({
        data: [],
        summary: buildEmptySummary(),
      })
    }

    const pedidoIds = pedidosList.map((p: Record<string, unknown>) => p.id as number)

    // --------------------------------------------------
    // 2. Bulk-fetch timeline events and sugestoes in parallel
    // --------------------------------------------------
    const [timelineResult, sugestoesResult] = await Promise.all([
      supabase
        .from('pedido_timeline')
        .select('id, pedido_compra_id, evento, descricao, autor_tipo, autor_nome, created_at')
        .in('pedido_compra_id', pedidoIds)
        .order('created_at', { ascending: false }),

      supabase
        .from('sugestoes_fornecedor')
        .select('id, pedido_compra_id, status, created_at')
        .in('pedido_compra_id', pedidoIds)
        .order('created_at', { ascending: false }),
    ])

    if (timelineResult.error) {
      console.error('Error fetching timeline:', timelineResult.error)
    }

    if (sugestoesResult.error) {
      console.error('Error fetching sugestoes:', sugestoesResult.error)
    }

    // --------------------------------------------------
    // 3. Group timeline events by pedido_compra_id (latest first)
    // --------------------------------------------------
    const latestTimelineByPedido = new Map<
      number,
      {
        evento: string
        descricao: string | null
        autor_tipo: string | null
        autor_nome: string | null
        created_at: string
      }
    >()

    for (const ev of timelineResult.data || []) {
      const pid = ev.pedido_compra_id as number
      // Since results are ordered desc, the first occurrence is the latest
      if (!latestTimelineByPedido.has(pid)) {
        latestTimelineByPedido.set(pid, {
          evento: ev.evento,
          descricao: ev.descricao,
          autor_tipo: ev.autor_tipo,
          autor_nome: ev.autor_nome,
          created_at: ev.created_at,
        })
      }
    }

    // --------------------------------------------------
    // 4. Group sugestoes by pedido_compra_id (count + latest status)
    // --------------------------------------------------
    const sugestoesByPedido = new Map<
      number,
      { count: number; latestStatus: string | null }
    >()

    for (const sug of sugestoesResult.data || []) {
      const pid = sug.pedido_compra_id as number
      const existing = sugestoesByPedido.get(pid)
      if (existing) {
        existing.count += 1
      } else {
        // First occurrence is the latest (ordered desc)
        sugestoesByPedido.set(pid, {
          count: 1,
          latestStatus: sug.status,
        })
      }
    }

    // --------------------------------------------------
    // 5. Build summary counts
    // --------------------------------------------------
    const summary: Record<string, number> = {}
    for (const s of ACTIVE_STATUSES) {
      summary[s] = 0
    }

    for (const p of pedidosList) {
      const si = (p as Record<string, unknown>).status_interno as string
      if (si in summary) {
        summary[si] += 1
      }
    }

    // --------------------------------------------------
    // 6. Transform and return
    // --------------------------------------------------
    const data = pedidosList.map((p: Record<string, unknown>) => {
      const empresa = p.empresas as { id: number; nome_fantasia: string | null } | null
      const fornecedor = p.fornecedores as { id: number; nome: string | null } | null
      const representante = p.representantes as { id: number; nome: string | null } | null

      const pedidoId = p.id as number
      const timeline = latestTimelineByPedido.get(pedidoId) || null
      const sugestaoInfo = sugestoesByPedido.get(pedidoId)

      return {
        id: p.id,
        numero: p.numero,
        data: p.data,
        data_prevista: p.data_prevista,
        total: p.total,
        status_interno: p.status_interno,
        situacao: p.situacao,
        origem: p.origem,
        updated_at: p.updated_at,
        empresa_nome: empresa?.nome_fantasia || `Empresa #${p.empresa_id}`,
        fornecedor_nome: fornecedor?.nome || '-',
        representante_nome: representante?.nome || null,
        ultimo_evento: timeline,
        sugestoes_count: sugestaoInfo?.count || 0,
        ultima_sugestao_status: sugestaoInfo?.latestStatus || null,
      }
    })

    return NextResponse.json({ data, summary })
  } catch (error) {
    console.error('Unexpected error in admin negociacoes GET:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function buildEmptySummary(): Record<string, number> {
  const summary: Record<string, number> = {}
  for (const s of ACTIVE_STATUSES) {
    summary[s] = 0
  }
  return summary
}
