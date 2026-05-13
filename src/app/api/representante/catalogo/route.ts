import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogo,
  authRepresentanteCatalogoMulti,
  extractFornecedorIds,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

export async function GET(request: NextRequest) {
  try {
    // Suporte multi-fornecedor: se o request informou fornecedor_ids OU nada
    // (default = todos vinculados), usa o fluxo multi e agrega total de itens
    // de todos os catalogos correspondentes aos CNPJs.
    const singleId = (() => {
      try {
        const url = new URL(request.url)
        return url.searchParams.get('fornecedor_id') || request.headers.get('x-fornecedor-id')
      } catch {
        return null
      }
    })()
    const requestedMulti = await extractFornecedorIds(request)

    if (singleId && requestedMulti.length === 0) {
      // Fluxo legacy / single
      const ctx = await authRepresentanteCatalogo(request)
      if (isNextResponse(ctx)) return ctx
      const { cnpj: cnpjLimpo } = ctx

      const supabase = createServerSupabaseClient()

      const { data: catalogo, error } = await supabase
        .from('catalogo_fornecedor')
        .select('id, cnpj, nome, status, created_at, updated_at, slug, logo_url, banner_url, cor_primaria, descricao, whatsapp, publico')
        .eq('cnpj', cnpjLimpo)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar catalogo:', error)
        return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
      }

      if (!catalogo) {
        return NextResponse.json({ catalogo: null, exists: false })
      }

      const { data: countResult } = await supabase.rpc('count_catalogo_itens_dedup', {
        p_catalogo_id: catalogo.id,
      })

      const totalItens = countResult ?? 0

      return NextResponse.json({
        catalogo,
        exists: true,
        total_itens: totalItens,
      })
    }

    // Fluxo multi
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs } = ctx

    const supabase = createServerSupabaseClient()

    const { data: catalogos, error } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome, status, created_at, updated_at, slug, logo_url, banner_url, cor_primaria, descricao, whatsapp, publico')
      .in('cnpj', cnpjs)

    if (error) {
      console.error('Erro ao buscar catalogos:', error)
      return NextResponse.json({ error: 'Erro ao buscar catalogos' }, { status: 500 })
    }

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({ catalogo: null, catalogos: [], exists: false, total_itens: 0 })
    }

    let totalItens = 0
    for (const cat of catalogos) {
      const { data: countResult } = await supabase.rpc('count_catalogo_itens_dedup', {
        p_catalogo_id: cat.id,
      })
      totalItens += countResult ?? 0
    }

    // Compatibilidade: campo 'catalogo' continua existindo (primeiro catalogo)
    return NextResponse.json({
      catalogo: catalogos[0],
      catalogos,
      exists: true,
      total_itens: totalItens,
    })
  } catch (error) {
    console.error('Erro ao buscar catalogo (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const supabase = createServerSupabaseClient()

    const { data: existing } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    let catalogo: { id: number; cnpj?: string; nome?: string } | null = null

    if (existing) {
      const { count } = await supabase
        .from('catalogo_itens')
        .select('id', { count: 'exact', head: true })
        .eq('catalogo_id', existing.id)

      if (count && count > 0) {
        return NextResponse.json(
          { error: 'Catalogo ja existe e possui itens. Use o botao Sincronizar para atualizar.' },
          { status: 409 }
        )
      }

      catalogo = existing
    }

    if (!catalogo) {
      const { data: fornecedorRef } = await supabase
        .from('fornecedores')
        .select('nome, nome_fantasia')
        .eq('cnpj', cnpjLimpo)
        .limit(1)
        .single()

      const { data: novoCatalogo, error: createError } = await supabase
        .from('catalogo_fornecedor')
        .insert({
          cnpj: cnpjLimpo,
          nome: fornecedorRef?.nome_fantasia || fornecedorRef?.nome || 'Catalogo',
          status: 'ativo',
        })
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar catalogo:', createError)
        return NextResponse.json({ error: 'Erro ao criar catalogo' }, { status: 500 })
      }
      catalogo = novoCatalogo
    }

    if (!catalogo) {
      return NextResponse.json({ error: 'Erro ao criar/encontrar catalogo' }, { status: 500 })
    }

    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', cnpjLimpo)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ catalogo, total_itens: 0 }, { status: 201 })
    }

    const itensToInsert: Array<{
      catalogo_id: number
      produto_id: number
      empresa_id: number
      codigo: string | null
      nome: string | null
      marca: string | null
      unidade: string | null
      itens_por_caixa: number | null
      preco_base: number | null
      ativo: boolean
    }> = []
    const seen = new Set<string>()

    for (const forn of fornecedores) {
      const { data: produtos } = await supabase
        .from('fornecedores_produtos')
        .select(`
          produto_id, empresa_id, valor_de_compra, codigo_fornecedor,
          produtos!inner(id, codigo, nome, marca, unidade, itens_por_caixa)
        `)
        .eq('fornecedor_id', forn.id)
        .eq('empresa_id', forn.empresa_id)

      if (!produtos) continue

      for (const item of produtos) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = item.produtos as any
        const key = `${item.produto_id}-${item.empresa_id}`
        if (seen.has(key)) continue
        seen.add(key)

        itensToInsert.push({
          catalogo_id: catalogo.id,
          produto_id: item.produto_id,
          empresa_id: item.empresa_id,
          codigo: item.codigo_fornecedor || prod.codigo || null,
          nome: prod.nome || null,
          marca: prod.marca || null,
          unidade: prod.unidade || null,
          itens_por_caixa: prod.itens_por_caixa || null,
          preco_base: item.valor_de_compra ?? 0,
          ativo: true,
        })
      }
    }

    let totalItens = 0
    if (itensToInsert.length > 0) {
      for (let i = 0; i < itensToInsert.length; i += 500) {
        const batch = itensToInsert.slice(i, i + 500)
        const { error: insertError } = await supabase
          .from('catalogo_itens')
          .insert(batch)

        if (insertError) {
          console.error('Erro ao inserir itens do catalogo (batch):', insertError)
        } else {
          totalItens += batch.length
        }
      }
    }

    return NextResponse.json({ catalogo, total_itens: totalItens }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar catalogo (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
