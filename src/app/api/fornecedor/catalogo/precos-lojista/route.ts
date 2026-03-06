import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const body = await request.json()
    const { catalogo_item_id, empresa_id, preco_customizado, desconto_percentual, ativo } = body

    if (!catalogo_item_id || !empresa_id) {
      return NextResponse.json({ error: 'catalogo_item_id e empresa_id obrigatorios' }, { status: 400 })
    }

    if (preco_customizado === undefined && desconto_percentual === undefined && ativo === undefined) {
      return NextResponse.json({ error: 'Informe ao menos preco_customizado, desconto_percentual ou ativo' }, { status: 400 })
    }

    // Validar ownership: item pertence ao catálogo deste fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const { data: item } = await supabase
      .from('catalogo_itens')
      .select('id')
      .eq('id', Number(catalogo_item_id))
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item nao pertence ao seu catalogo' }, { status: 403 })
    }

    // Upsert override de preço
    const upsertData: Record<string, unknown> = {
      catalogo_item_id: Number(catalogo_item_id),
      empresa_id: Number(empresa_id),
    }
    if (preco_customizado !== undefined) upsertData.preco_customizado = preco_customizado
    if (desconto_percentual !== undefined) upsertData.desconto_percentual = desconto_percentual
    if (ativo !== undefined) upsertData.ativo = ativo

    const { data: override, error: upsertError } = await supabase
      .from('catalogo_precos_lojista')
      .upsert(upsertData, { onConflict: 'catalogo_item_id,empresa_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Erro ao criar/atualizar preco lojista:', upsertError)
      return NextResponse.json({ error: 'Erro ao salvar preco' }, { status: 500 })
    }

    return NextResponse.json({ success: true, override })
  } catch (error) {
    console.error('Erro ao criar/atualizar preco lojista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
    }

    // Validar ownership: buscar o override e verificar que o item pertence ao catálogo
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Verificar que o override existe e pertence a um item deste catálogo
    const { data: override } = await supabase
      .from('catalogo_precos_lojista')
      .select('id, catalogo_item_id')
      .eq('id', Number(id))
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
      .eq('id', Number(id))

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
