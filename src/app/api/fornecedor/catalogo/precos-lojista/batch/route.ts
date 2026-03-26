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
    const { empresa_id, itens } = body

    if (!empresa_id || !itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { error: 'empresa_id e itens (array nao vazio) sao obrigatorios' },
        { status: 400 }
      )
    }

    // WARNING-1: Limite de batch
    if (itens.length > 500) {
      return NextResponse.json(
        { error: 'Maximo de 500 itens por batch' },
        { status: 400 }
      )
    }

    // Validar que todos os itens possuem catalogo_item_id e preco_customizado
    for (const item of itens) {
      if (!item.catalogo_item_id || item.preco_customizado === undefined) {
        return NextResponse.json(
          { error: 'Cada item deve ter catalogo_item_id e preco_customizado' },
          { status: 400 }
        )
      }

      // CRITICAL-2: Validacao numerica
      if (typeof item.preco_customizado !== 'number' || !isFinite(item.preco_customizado) || item.preco_customizado < 0) {
        return NextResponse.json(
          { error: `preco_customizado invalido para item ${item.catalogo_item_id}: deve ser numero >= 0` },
          { status: 400 }
        )
      }
      if (item.desconto_percentual !== undefined) {
        if (typeof item.desconto_percentual !== 'number' || !isFinite(item.desconto_percentual) || item.desconto_percentual < -100 || item.desconto_percentual > 100) {
          return NextResponse.json(
            { error: `desconto_percentual invalido para item ${item.catalogo_item_id}: deve ser numero entre -100 e 100` },
            { status: 400 }
          )
        }
      }
    }

    // Validar ownership: catálogo pertence a este fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // CRITICAL-1: Validar vinculo fornecedor-empresa
    const { data: fornecedorEmpresa } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .eq('empresa_id', empresa_id)
      .limit(1)
      .single()

    if (!fornecedorEmpresa) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
    }

    // Validar que todos os itens pertencem ao catálogo deste fornecedor
    const itemIds = itens.map((item: { catalogo_item_id: number }) => Number(item.catalogo_item_id))
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

    // Montar array de upsert
    const now = new Date().toISOString()
    const upsertData = itens.map((item: {
      catalogo_item_id: number
      preco_customizado: number
      desconto_percentual?: number
      ativo?: boolean
    }) => ({
      catalogo_item_id: Number(item.catalogo_item_id),
      empresa_id: Number(empresa_id),
      preco_customizado: item.preco_customizado,
      ...(item.desconto_percentual !== undefined && { desconto_percentual: item.desconto_percentual }),
      ativo: item.ativo !== undefined ? item.ativo : true,
      updated_at: now,
    }))

    const { error: upsertError } = await supabase
      .from('catalogo_precos_lojista')
      .upsert(upsertData, { onConflict: 'catalogo_item_id,empresa_id' })

    if (upsertError) {
      console.error('Erro ao salvar precos lojista em batch:', upsertError)
      return NextResponse.json({ error: 'Erro ao salvar precos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, total: itens.length })
  } catch (error) {
    console.error('Erro ao salvar precos lojista em batch:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
