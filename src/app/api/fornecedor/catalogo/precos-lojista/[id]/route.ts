import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const overrideId = Number(id)
    if (!overrideId || isNaN(overrideId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const body = await request.json()

    // Validar ownership
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Buscar override e verificar que pertence a um item deste catálogo
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
    console.error('Erro ao atualizar preco lojista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const overrideId = Number(id)
    if (!overrideId || isNaN(overrideId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)

    // Validar ownership
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
    console.error('Erro ao remover preco lojista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
