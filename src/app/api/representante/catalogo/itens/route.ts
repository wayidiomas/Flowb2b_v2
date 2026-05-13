import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogo,
  authRepresentanteCatalogoMulti,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

export async function GET(request: NextRequest) {
  try {
    // GET aceita multi-fornecedor (default = todos vinculados).
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs, fornecedores } = ctx

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')
    const empresaId = searchParams.get('empresa_id')
    const marca = searchParams.get('marca')
    const categoria = searchParams.get('categoria')
    const ativo = searchParams.get('ativo')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const offset = (page - 1) * limit

    const { data: catalogos, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj')
      .in('cnpj', cnpjs)

    if (catError) {
      console.error('Erro ao buscar catalogos:', catError)
      return NextResponse.json({ error: 'Erro ao buscar catalogos' }, { status: 500 })
    }

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({ itens: [], total: 0, page, limit })
    }

    const catalogoIds = catalogos.map((c) => c.id)
    // CNPJ -> fornecedor_id (preferimos o primeiro id para cada cnpj — usado para anotar
    // cada item com o fornecedor "dono" no contexto do representante).
    const cnpjToFornecedorId = new Map<string, number>()
    for (const f of fornecedores) {
      if (!cnpjToFornecedorId.has(f.cnpj)) {
        cnpjToFornecedorId.set(f.cnpj, f.fornecedor_id)
      }
    }
    const catalogoIdToCnpj = new Map<number, string>()
    for (const c of catalogos) {
      catalogoIdToCnpj.set(c.id, String(c.cnpj).replace(/\D/g, ''))
    }

    let query = supabase
      .from('catalogo_itens')
      .select('*', { count: 'exact' })
      .in('catalogo_id', catalogoIds)

    if (search) {
      query = query.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`)
    }
    if (empresaId) {
      query = query.eq('empresa_id', Number(empresaId))
    }
    if (marca) {
      query = query.ilike('marca', `%${marca}%`)
    }
    if (categoria) {
      query = query.eq('categoria', categoria)
    }
    if (ativo !== null && ativo !== undefined && ativo !== '') {
      query = query.eq('ativo', ativo === 'true')
    }

    query = query.order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let itens: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let itensError: any = null
    let count: number | null = null

    if (empresaId) {
      const result = await query.range(offset, offset + limit - 1)
      itens = result.data || []
      itensError = result.error
      count = result.count
    } else {
      let fetchOffset = 0
      const PAGE_SIZE = 1000
      while (true) {
        const { data: batch, error: batchErr } = await query.range(fetchOffset, fetchOffset + PAGE_SIZE - 1)
        if (batchErr) { itensError = batchErr; break }
        if (!batch || batch.length === 0) break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itens = (itens as any[]).concat(batch)
        if (batch.length < PAGE_SIZE) break
        fetchOffset += PAGE_SIZE
      }
    }

    if (itensError) {
      console.error('Erro ao buscar itens do catalogo:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
    }

    let itensDedup = itens || []
    if (!empresaId && itensDedup.length > 0) {
      // Deduplicar por (catalogo_id, codigo|nome|id) — preserva itens de catalogos distintos
      const seen = new Map<string, typeof itensDedup[0]>()
      for (const item of itensDedup) {
        const key = `${item.catalogo_id}::${item.codigo || item.nome || String(item.id)}`
        if (!seen.has(key)) {
          seen.set(key, item)
        } else {
          const existing = seen.get(key)!
          if (item.preco_base && (!existing.preco_base || item.preco_base > existing.preco_base)) {
            seen.set(key, item)
          }
        }
      }
      const allDedup = Array.from(seen.values())
      itensDedup = allDedup.slice(offset, offset + limit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(itensDedup as any)._totalDedup = allDedup.length
    }

    // Anotar cada item com fornecedor_id (resolvido via CNPJ do catalogo)
    const itensComFornecedor = itensDedup.map((item) => {
      const cnpj = catalogoIdToCnpj.get(item.catalogo_id)
      const fornecedorId = cnpj ? cnpjToFornecedorId.get(cnpj) ?? null : null
      return { ...item, fornecedor_id: fornecedorId }
    })

    let itensComPreco = itensComFornecedor
    if (empresaId && itensComFornecedor.length > 0) {
      const itemIds = itensComFornecedor.map((i) => i.id)
      const { data: precos } = await supabase
        .from('catalogo_precos_lojista')
        .select('catalogo_item_id, preco_customizado, desconto_percentual, ativo')
        .in('catalogo_item_id', itemIds)
        .eq('empresa_id', Number(empresaId))

      if (precos && precos.length > 0) {
        const precoMap = new Map(precos.map((p) => [p.catalogo_item_id, p]))
        itensComPreco = itensComFornecedor.map((item) => {
          const override = precoMap.get(item.id) as { preco_customizado: number | null; desconto_percentual: number | null; ativo: boolean } | undefined
          return {
            ...item,
            preco_customizado: override?.preco_customizado ?? null,
            desconto_percentual: override?.desconto_percentual ?? null,
            ativo_lojista: override?.ativo ?? null,
          }
        })
      }
    }

    let totalDedup = count || 0
    if (!empresaId) {
      let totalAgg = 0
      for (const cat of catalogos) {
        const { data: rpcCount } = await supabase.rpc('count_catalogo_itens_dedup', {
          p_catalogo_id: cat.id,
        })
        totalAgg += rpcCount ?? 0
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalDedup = totalAgg || ((itensDedup as any)._totalDedup || itensDedup.length)
    }

    return NextResponse.json({
      itens: itensComPreco,
      total: totalDedup,
      page,
      limit,
    })
  } catch (error) {
    console.error('Erro ao listar itens do catalogo (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}


export async function PUT(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const supabase = createServerSupabaseClient()
    const body = await request.json()
    const { itens } = body

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'itens obrigatorio (array)' }, { status: 400 })
    }

    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    let atualizados = 0
    let erros = 0

    for (const item of itens) {
      if (!item.id) {
        erros++
        continue
      }

      const updateFields: Record<string, unknown> = {}
      if (item.preco_base !== undefined) updateFields.preco_base = item.preco_base
      if (item.ativo !== undefined) updateFields.ativo = item.ativo

      if (Object.keys(updateFields).length === 0) continue

      const { error: updateError } = await supabase
        .from('catalogo_itens')
        .update(updateFields)
        .eq('id', item.id)
        .eq('catalogo_id', catalogo.id)

      if (updateError) {
        console.error('Erro ao atualizar item:', updateError)
        erros++
      } else {
        atualizados++
      }
    }

    return NextResponse.json({ success: true, atualizados, erros })
  } catch (error) {
    console.error('Erro ao atualizar itens do catalogo (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const supabase = createServerSupabaseClient()
    const body = await request.json()

    if (!body.nome || typeof body.nome !== 'string') {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    }

    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const itemData: Record<string, unknown> = {
      catalogo_id: catalogo.id,
      nome: body.nome.trim(),
      codigo: body.codigo || null,
      ean: body.ean || null,
      marca: body.marca || null,
      ncm: body.ncm || null,
      unidade: body.unidade || 'UN',
      itens_por_caixa: body.itens_por_caixa ?? 1,
      preco_base: body.preco_base ?? 0,
      bonificacao: body.bonificacao ?? null,
      categoria: body.categoria || null,
      descricao_produto: body.descricao_produto || null,
      destaque: body.destaque ?? false,
      ativo: true,
    }

    const { data: novo, error: insertError } = await supabase
      .from('catalogo_itens')
      .insert(itemData)
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao criar item:', insertError)
      return NextResponse.json({ error: 'Erro ao criar item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: novo }, { status: 201 })
  } catch (error) {
    console.error('Erro no POST item (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
