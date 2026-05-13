import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogoMulti,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

const BUCKET_MS = 5 * 60 * 1000

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

export async function GET(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs } = ctx

    const supabase = createServerSupabaseClient()

    const { data: catalogos } = await supabase
      .from('catalogo_fornecedor')
      .select('id, nome, cnpj')
      .in('cnpj', cnpjs)

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const catalogoIds = catalogos.map((c) => c.id)

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: atualizacoes, error: atErr } = await supabase
      .from('catalogo_atualizacoes')
      .select('id, empresa_id, tipo, status, respondido_em, created_at, catalogo_id')
      .in('catalogo_id', catalogoIds)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (atErr) {
      console.error('Erro ao buscar atualizacoes:', atErr)
      return NextResponse.json({ error: 'Erro ao buscar atualizacoes' }, { status: 500 })
    }

    const rows = (atualizacoes || []) as AtualizacaoRow[]

    const empresaIds = Array.from(new Set(rows.map(r => r.empresa_id)))
    const statusMap = new Map<number, string | null>()
    if (empresaIds.length > 0) {
      const { data: statuses } = await supabase
        .from('catalogo_status_lojista')
        .select('empresa_id, ultima_visualizacao_at, catalogo_id')
        .in('catalogo_id', catalogoIds)
        .in('empresa_id', empresaIds)
      const sl = (statuses || []) as Array<StatusLojistaRow & { catalogo_id: number }>
      for (const s of sl) {
        // Pega o mais recente quando ha mais de um catalogo para a mesma empresa
        const prev = statusMap.get(s.empresa_id)
        if (!prev || (s.ultima_visualizacao_at && new Date(s.ultima_visualizacao_at) > new Date(prev))) {
          statusMap.set(s.empresa_id, s.ultima_visualizacao_at)
        }
      }
    }

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
      catalogo: { id: catalogos[0].id, nome: catalogos.map(c => c.nome).join(', ') },
      catalogos: catalogos.map(c => ({ id: c.id, nome: c.nome })),
      publicacoes,
      total: publicacoes.length
    })
  } catch (err) {
    console.error('Erro em /api/representante/catalogo/atualizacoes:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
