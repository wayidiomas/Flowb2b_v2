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
    const itemId = Number(id)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const body = await request.json()

    // Buscar catalogo_id via CNPJ
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Validar que o item pertence ao catálogo
    const { data: existing } = await supabase
      .from('catalogo_itens')
      .select('id')
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Item nao encontrado no seu catalogo' }, { status: 404 })
    }

    const updateFields: Record<string, unknown> = {}
    if (body.preco_base !== undefined) updateFields.preco_base = body.preco_base
    if (body.ativo !== undefined) updateFields.ativo = body.ativo
    if (body.ordem !== undefined) updateFields.ordem = body.ordem

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('catalogo_itens')
      .update(updateFields)
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar item do catalogo:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    console.error('Erro ao atualizar item do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
