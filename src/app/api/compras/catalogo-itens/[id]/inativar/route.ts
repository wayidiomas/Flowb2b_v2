import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/compras/catalogo-itens/[id]/inativar
 * Body: { ativo: boolean }
 *
 * Alterna o status do item no catalogo_precos_lojista para o lojista logado.
 * Se row não existe ainda, cria com preco_customizado=0 (sem efeito de preço).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: idStr } = await params
    const itemId = Number(idStr)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'id invalido' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const ativo = body.ativo === true  // default false (inativar)

    const supabase = createServerSupabaseClient()

    // 1. Validar que o item existe e pertence a um catálogo
    const { data: item, error: itemErr } = await supabase
      .from('catalogo_itens')
      .select('id, catalogo_id')
      .eq('id', itemId)
      .maybeSingle()

    if (itemErr || !item) {
      return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
    }

    // 2. Buscar row existente em catalogo_precos_lojista
    const { data: existing } = await supabase
      .from('catalogo_precos_lojista')
      .select('id, ativo')
      .eq('catalogo_item_id', itemId)
      .eq('empresa_id', user.empresaId)
      .maybeSingle()

    if (existing) {
      const { error: updErr } = await supabase
        .from('catalogo_precos_lojista')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updErr) {
        console.error('Erro ao atualizar catalogo_precos_lojista:', updErr)
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
      }
    } else {
      const { error: insErr } = await supabase
        .from('catalogo_precos_lojista')
        .insert({
          catalogo_item_id: itemId,
          empresa_id: user.empresaId,
          preco_customizado: 0,  // sem override de preço — só usar como flag de ativo
          ativo
        })

      if (insErr) {
        console.error('Erro ao criar catalogo_precos_lojista:', insErr)
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, catalogo_item_id: itemId, ativo })
  } catch (err) {
    console.error('Erro em /api/compras/catalogo-itens/[id]/inativar:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
