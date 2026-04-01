import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)

    // Buscar catalogo_id via CNPJ
    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Buscar categorias distintas dos itens do catalogo
    const { data: itens, error: itensError } = await supabase
      .from('catalogo_itens')
      .select('categoria')
      .eq('catalogo_id', catalogo.id)
      .not('categoria', 'is', null)

    if (itensError) {
      console.error('Erro ao buscar categorias:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
    }

    // Extrair categorias unicas e ordenar
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
    console.error('Erro ao listar categorias:', error)
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
      return NextResponse.json({ error: 'itens obrigatorio (array nao vazio)' }, { status: 400 })
    }

    if (itens.length > 500) {
      return NextResponse.json({ error: 'Maximo de 500 itens por batch' }, { status: 400 })
    }

    // Validar formato dos itens
    for (const item of itens) {
      if (!item.id || typeof item.id !== 'number') {
        return NextResponse.json({ error: 'Cada item deve ter um id numerico' }, { status: 400 })
      }
      if (item.categoria !== undefined && item.categoria !== null && typeof item.categoria !== 'string') {
        return NextResponse.json({ error: `categoria invalida para item ${item.id}` }, { status: 400 })
      }
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

    // Validar que todos os itens pertencem ao catalogo
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

    // Atualizar categorias
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
    console.error('Erro ao atualizar categorias:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
