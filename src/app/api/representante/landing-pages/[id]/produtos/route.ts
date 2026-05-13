import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * Curadoria do pivot landing_page_representante_produtos.
 * - POST: adiciona produtos (1 ou N) com fornecedor_id explicito.
 * - DELETE: remove um produto.
 */

async function resolveLp(lpId: number) {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
    return { error: NextResponse.json({ error: 'Nao autenticado' }, { status: 401 }) }
  }

  const supabase = createServerSupabaseClient()

  const { data: representantes } = await supabase
    .from('representantes')
    .select('id')
    .eq('user_representante_id', user.representanteUserId)
    .eq('ativo', true)

  const representanteIds = (representantes || []).map(r => r.id)
  if (representanteIds.length === 0) {
    return { error: NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 }) }
  }

  const { data: vinculos } = await supabase
    .from('representante_fornecedores')
    .select('fornecedor_id')
    .in('representante_id', representanteIds)
  const fornecedorIds = [...new Set((vinculos || []).map(v => v.fornecedor_id))] as number[]

  const { data: lp } = await supabase
    .from('landing_pages_representante')
    .select('id, representante_id, modo')
    .eq('id', lpId)
    .is('deletada_em', null)
    .maybeSingle()

  if (!lp || !representanteIds.includes(lp.representante_id)) {
    return { error: NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 }) }
  }

  return { supabase, lp, fornecedorIds }
}

// ─── POST: adiciona produto(s) ao pivot ──────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const ctx = await resolveLp(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase, fornecedorIds } = ctx

    const body = await request.json()

    // Body pode ser objeto unico ou array
    type ItemBody = {
      produto_id: number
      fornecedor_id: number
      ordem?: number
      preco_override?: number | null
      destaque?: boolean
    }
    const items: ItemBody[] = Array.isArray(body) ? body : [body]

    if (items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item' }, { status: 400 })
    }

    // Valida que todos os fornecedor_ids estao no escopo do representante
    for (const item of items) {
      if (!item.produto_id || !item.fornecedor_id) {
        return NextResponse.json(
          { error: 'produto_id e fornecedor_id obrigatorios' },
          { status: 400 }
        )
      }
      if (!fornecedorIds.includes(Number(item.fornecedor_id))) {
        return NextResponse.json(
          { error: `Fornecedor ${item.fornecedor_id} fora do escopo do representante` },
          { status: 403 }
        )
      }
    }

    const rows = items.map((item, idx) => ({
      landing_page_id: lpId,
      produto_id: Number(item.produto_id),
      fornecedor_id: Number(item.fornecedor_id),
      ordem: item.ordem ?? idx,
      preco_override: item.preco_override ?? null,
      destaque: item.destaque ?? false,
    }))

    const { error: upErr } = await supabase
      .from('landing_page_representante_produtos')
      .upsert(rows, { onConflict: 'landing_page_id,produto_id' })

    if (upErr) {
      console.error('Erro ao salvar produtos da LP rep:', upErr)
      return NextResponse.json({ error: 'Erro ao salvar produtos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    console.error('Erro em POST /api/representante/landing-pages/[id]/produtos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── DELETE: remove produto do pivot ─────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lpId = Number(id)
    if (isNaN(lpId)) return NextResponse.json({ error: 'ID invalido' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const produtoId = Number(searchParams.get('produto_id'))
    if (!produtoId) {
      return NextResponse.json({ error: 'produto_id obrigatorio' }, { status: 400 })
    }

    const ctx = await resolveLp(lpId)
    if ('error' in ctx) return ctx.error
    const { supabase } = ctx

    const { error } = await supabase
      .from('landing_page_representante_produtos')
      .delete()
      .eq('landing_page_id', lpId)
      .eq('produto_id', produtoId)

    if (error) {
      console.error('Erro ao remover produto:', error)
      return NextResponse.json({ error: 'Erro ao remover produto' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em DELETE /api/representante/landing-pages/[id]/produtos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
