import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/fornecedor/catalogo/atualizacoes
 *
 * Lista publicações de diff do catálogo do fornecedor (agrupadas por janela
 * de 5 min) com status agregado por lojista (visualizado / sincronizado /
 * pendente).
 *
 * Resposta:
 * {
 *   publicacoes: [
 *     {
 *       publicacao_at: ISO timestamp da janela,
 *       total_mudancas, tipos: {novo, preco, dados, removido},
 *       lojistas: { total, sincronizados, pendentes, visualizados },
 *       detalhes: [{empresa_id, empresa_nome, status, visualizado_em, sincronizado_em}]
 *     }
 *   ]
 * }
 */

const BUCKET_MS = 5 * 60 * 1000  // 5 min

interface AtualizacaoRow {
  id: number
  empresa_id: number
  tipo: string
  status: string
  respondido_em: string | null
  created_at: string
}

interface StatusLojistaRow {
  empresa_id: number
  ultima_visualizacao_at: string | null
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const cnpjLimpo = user.cnpj.replace(/\D/g, '')
    const supabase = createServerSupabaseClient()

    // Catálogo do fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id, nome')
      .eq('cnpj', cnpjLimpo)
      .maybeSingle()
    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Atualizações dos últimos 90 dias
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: atualizacoes, error: atErr } = await supabase
      .from('catalogo_atualizacoes')
      .select('id, empresa_id, tipo, status, respondido_em, created_at')
      .eq('catalogo_id', catalogo.id)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (atErr) {
      console.error('Erro ao buscar atualizacoes:', atErr)
      return NextResponse.json({ error: 'Erro ao buscar atualizacoes' }, { status: 500 })
    }

    const rows = (atualizacoes || []) as AtualizacaoRow[]

    // Status_lojista: pra mapear visualizacao
    const empresaIds = Array.from(new Set(rows.map(r => r.empresa_id)))
    let statusMap = new Map<number, string | null>()
    if (empresaIds.length > 0) {
      const { data: statuses } = await supabase
        .from('catalogo_status_lojista')
        .select('empresa_id, ultima_visualizacao_at')
        .eq('catalogo_id', catalogo.id)
        .in('empresa_id', empresaIds)
      const sl = (statuses || []) as StatusLojistaRow[]
      for (const s of sl) {
        statusMap.set(s.empresa_id, s.ultima_visualizacao_at)
      }
    }

    // Nomes das empresas
    const empresasMap = new Map<number, string>()
    if (empresaIds.length > 0) {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social')
        .in('id', empresaIds)
      for (const e of empresas || []) {
        empresasMap.set(e.id, e.nome_fantasia || e.razao_social || `Empresa ${e.id}`)
      }
    }

    // Agrupa por bucket de 5 min
    type Bucket = {
      publicacao_at: number
      mudancas: AtualizacaoRow[]
    }
    const buckets = new Map<number, Bucket>()
    for (const row of rows) {
      const ms = new Date(row.created_at).getTime()
      const bucketKey = Math.floor(ms / BUCKET_MS) * BUCKET_MS
      const existing = buckets.get(bucketKey)
      if (existing) {
        existing.mudancas.push(row)
      } else {
        buckets.set(bucketKey, { publicacao_at: bucketKey, mudancas: [row] })
      }
    }

    const publicacoes = Array.from(buckets.values())
      .sort((a, b) => b.publicacao_at - a.publicacao_at)
      .map(b => {
        const tipos = { novo: 0, preco: 0, dados: 0, removido: 0 }
        const porEmpresa = new Map<number, { aceitos: number; total: number }>()

        for (const m of b.mudancas) {
          if (m.tipo in tipos) tipos[m.tipo as keyof typeof tipos]++
          const e = porEmpresa.get(m.empresa_id) || { aceitos: 0, total: 0 }
          e.total++
          if (m.status === 'aceito') e.aceitos++
          porEmpresa.set(m.empresa_id, e)
        }

        const detalhes: Array<{
          empresa_id: number
          empresa_nome: string
          status: 'sincronizado' | 'pendente'
          ultima_visualizacao_at: string | null
        }> = []

        let sincronizados = 0
        let visualizados = 0
        for (const [empId, agg] of porEmpresa.entries()) {
          const completo = agg.total > 0 && agg.aceitos === agg.total
          if (completo) sincronizados++
          const ultVis = statusMap.get(empId) || null
          if (ultVis && new Date(ultVis).getTime() >= b.publicacao_at) {
            visualizados++
          }
          detalhes.push({
            empresa_id: empId,
            empresa_nome: empresasMap.get(empId) || `Empresa ${empId}`,
            status: completo ? 'sincronizado' : 'pendente',
            ultima_visualizacao_at: ultVis
          })
        }
        detalhes.sort((a, b) => a.empresa_nome.localeCompare(b.empresa_nome))

        return {
          publicacao_at: new Date(b.publicacao_at).toISOString(),
          total_mudancas: b.mudancas.length,
          tipos,
          lojistas: {
            total: porEmpresa.size,
            sincronizados,
            visualizados,
            pendentes: porEmpresa.size - sincronizados
          },
          detalhes
        }
      })

    return NextResponse.json({
      catalogo: { id: catalogo.id, nome: catalogo.nome },
      publicacoes,
      total: publicacoes.length
    })
  } catch (err) {
    console.error('Erro em /api/fornecedor/catalogo/atualizacoes:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
