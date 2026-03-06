import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')
    const empresaId = searchParams.get('empresa_id')
    const marca = searchParams.get('marca')
    const ativo = searchParams.get('ativo')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const offset = (page - 1) * limit

    // Buscar catalogo_id via CNPJ
    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Buscar itens com filtros
    let query = supabase
      .from('catalogo_itens')
      .select('*', { count: 'exact' })
      .eq('catalogo_id', catalogo.id)

    if (search) {
      query = query.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`)
    }
    if (empresaId) {
      query = query.eq('empresa_id', Number(empresaId))
    }
    if (marca) {
      query = query.ilike('marca', `%${marca}%`)
    }
    if (ativo !== null && ativo !== undefined && ativo !== '') {
      query = query.eq('ativo', ativo === 'true')
    }

    query = query.order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: itens, error: itensError, count } = await query

    if (itensError) {
      console.error('Erro ao buscar itens do catalogo:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
    }

    // Se empresa_id fornecido, buscar precos customizados
    let itensComPreco = itens || []
    if (empresaId && itens && itens.length > 0) {
      const itemIds = itens.map(i => i.id)
      const { data: precos } = await supabase
        .from('catalogo_precos_lojista')
        .select('catalogo_item_id, preco_customizado, desconto_percentual, ativo')
        .in('catalogo_item_id', itemIds)
        .eq('empresa_id', Number(empresaId))

      if (precos && precos.length > 0) {
        const precoMap = new Map(precos.map(p => [p.catalogo_item_id, p]))
        itensComPreco = itens.map(item => {
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

    return NextResponse.json({
      itens: itensComPreco,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Erro ao listar itens do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const body = await request.json()
    const { itens } = body

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'itens obrigatorio (array)' }, { status: 400 })
    }

    // Buscar catalogo_id via CNPJ
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
    console.error('Erro ao atualizar itens do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
