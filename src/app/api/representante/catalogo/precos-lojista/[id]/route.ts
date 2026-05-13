import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const { id } = await params
    const overrideId = Number(id)
    if (!overrideId || isNaN(overrideId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const { data: override } = await supabase
      .from('catalogo_precos_lojista')
      .select('id, catalogo_item_id')
      .eq('id', overrideId)
      .single()

    if (!override) {
      return NextResponse.json({ error: 'Override nao encontrado' }, { status: 404 })
    }

    const { data: item } = await supabase
      .from('catalogo_itens')
      .select('id')
      .eq('id', override.catalogo_item_id)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Override nao pertence ao seu catalogo' }, { status: 403 })
    }

    const updateFields: Record<string, unknown> = {}
    if (body.preco_customizado !== undefined) updateFields.preco_customizado = body.preco_customizado
    if (body.desconto_percentual !== undefined) updateFields.desconto_percentual = body.desconto_percentual
    if (body.ativo !== undefined) updateFields.ativo = body.ativo
    updateFields.updated_at = new Date().toISOString()

    if (Object.keys(updateFields).length <= 1) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('catalogo_precos_lojista')
      .update(updateFields)
      .eq('id', overrideId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar preco lojista:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar preco' }, { status: 500 })
    }

    return NextResponse.json({ success: true, override: updated })
  } catch (error) {
    console.error('Erro ao atualizar preco lojista (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const { id } = await params
    const overrideId = Number(id)
    if (!overrideId || isNaN(overrideId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const { data: override } = await supabase
      .from('catalogo_precos_lojista')
      .select('id, catalogo_item_id')
      .eq('id', overrideId)
      .single()

    if (!override) {
      return NextResponse.json({ error: 'Override nao encontrado' }, { status: 404 })
    }

    const { data: item } = await supabase
      .from('catalogo_itens')
      .select('id')
      .eq('id', override.catalogo_item_id)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Override nao pertence ao seu catalogo' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('catalogo_precos_lojista')
      .delete()
      .eq('id', overrideId)

    if (deleteError) {
      console.error('Erro ao remover preco lojista:', deleteError)
      return NextResponse.json({ error: 'Erro ao remover preco' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover preco lojista (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
