import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogo,
  authRepresentanteCatalogoMulti,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs } = ctx

    const supabase = createServerSupabaseClient()

    const { data: catalogos, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .in('cnpj', cnpjs)

    if (catError) {
      console.error('Erro ao buscar catalogos:', catError)
      return NextResponse.json({ error: 'Erro ao buscar catalogos' }, { status: 500 })
    }

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({ categorias: [] })
    }

    const catalogoIds = catalogos.map((c) => c.id)

    const { data: itens, error: itensError } = await supabase
      .from('catalogo_itens')
      .select('categoria')
      .in('catalogo_id', catalogoIds)
      .not('categoria', 'is', null)

    if (itensError) {
      console.error('Erro ao buscar categorias:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
    }

    const categoriasSet = new Set<string>()
    if (itens) {
      for (const item of itens) {
        if (item.categoria && item.categoria.trim().length > 0) {
          categoriasSet.add(item.categoria.trim())
        }
      }
    }

    const categorias = Array.from(categoriasSet).sort((a, b) => a.localeCompare(b, 'pt-BR'))

    return NextResponse.json({ categorias })
  } catch (error) {
    console.error('Erro ao listar categorias (representante):', error)
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
      return NextResponse.json({ error: 'itens obrigatorio (array nao vazio)' }, { status: 400 })
    }

    if (itens.length > 500) {
      return NextResponse.json({ error: 'Maximo de 500 itens por batch' }, { status: 400 })
    }

    for (const item of itens) {
      if (!item.id || typeof item.id !== 'number') {
        return NextResponse.json({ error: 'Cada item deve ter um id numerico' }, { status: 400 })
      }
      if (item.categoria !== undefined && item.categoria !== null && typeof item.categoria !== 'string') {
        return NextResponse.json({ error: `categoria invalida para item ${item.id}` }, { status: 400 })
      }
    }

    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const itemIds = itens.map((i: { id: number }) => i.id)
    const { data: validItems } = await supabase
      .from('catalogo_itens')
      .select('id')
      .eq('catalogo_id', catalogo.id)
      .in('id', itemIds)

    if (!validItems || validItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais itens nao pertencem ao seu catalogo' },
        { status: 403 }
      )
    }

    let atualizados = 0
    let erros = 0

    for (const item of itens) {
      const categoria = item.categoria === undefined ? undefined : (item.categoria?.trim() || null)
      if (categoria === undefined) {
        continue
      }

      const { error: updateError } = await supabase
        .from('catalogo_itens')
        .update({ categoria })
        .eq('id', item.id)
        .eq('catalogo_id', catalogo.id)

      if (updateError) {
        console.error('Erro ao atualizar categoria do item:', updateError)
        erros++
      } else {
        atualizados++
      }
    }

    return NextResponse.json({ success: true, atualizados, erros })
  } catch (error) {
    console.error('Erro ao atualizar categorias (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
