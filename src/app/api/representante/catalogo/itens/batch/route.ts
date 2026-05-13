import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'

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
      if (item.destaque !== undefined && typeof item.destaque !== 'boolean') {
        return NextResponse.json({ error: `destaque invalido para item ${item.id}: deve ser boolean` }, { status: 400 })
      }
      if (item.descricao_produto !== undefined && item.descricao_produto !== null && typeof item.descricao_produto !== 'string') {
        return NextResponse.json({ error: `descricao_produto invalida para item ${item.id}` }, { status: 400 })
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
      const updateFields: Record<string, unknown> = {}

      if (item.categoria !== undefined) {
        updateFields.categoria = item.categoria?.trim() || null
      }
      if (item.destaque !== undefined) {
        updateFields.destaque = item.destaque
      }
      if (item.descricao_produto !== undefined) {
        updateFields.descricao_produto = item.descricao_produto?.trim() || null
      }

      if (Object.keys(updateFields).length === 0) {
        continue
      }

      const { error: updateError } = await supabase
        .from('catalogo_itens')
        .update(updateFields)
        .eq('id', item.id)
        .eq('catalogo_id', catalogo.id)

      if (updateError) {
        console.error('Erro ao atualizar item em batch:', updateError)
        erros++
      } else {
        atualizados++
      }
    }

    return NextResponse.json({ success: true, atualizados, erros })
  } catch (error) {
    console.error('Erro ao atualizar itens em batch (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
