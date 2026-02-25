import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const { gtin, quantidade, modo } = body

    if (!gtin || quantidade === undefined || quantidade === null) {
      return NextResponse.json({ error: 'gtin e quantidade obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Buscar conferencia validando ownership e status
    const { data: conferencia, error: confError } = await supabase
      .from('conferencias_estoque')
      .select('id, empresa_id, fornecedor_id, status')
      .eq('id', conferenciaId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (confError || !conferencia) {
      return NextResponse.json({ error: 'Conferencia nao encontrada' }, { status: 404 })
    }

    if (conferencia.status !== 'em_andamento') {
      return NextResponse.json({ error: 'Conferencia nao esta em andamento' }, { status: 400 })
    }

    // Buscar produto na empresa do lojista por gtin, gtin_embalagem ou codigo
    const gtinClean = gtin.trim()
    const { data: produtos, error: prodError } = await supabase
      .from('produtos')
      .select('id, codigo, nome, gtin, gtin_embalagem, estoque_atual')
      .eq('empresa_id', conferencia.empresa_id)
      .or(`gtin.eq.${gtinClean},gtin_embalagem.eq.${gtinClean},codigo.eq.${gtinClean}`)

    if (prodError) {
      console.error('Erro ao buscar produto:', prodError)
      return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 })
    }

    if (!produtos || produtos.length === 0) {
      return NextResponse.json({ error: 'Produto nao encontrado nesta empresa' }, { status: 404 })
    }

    const produto = produtos[0]

    // Verificar se produto e do fornecedor
    const { data: vinculoProduto, error: vincError } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id')
      .eq('produto_id', produto.id)
      .eq('fornecedor_id', conferencia.fornecedor_id)
      .single()

    if (vincError || !vinculoProduto) {
      return NextResponse.json({ error: 'Produto nao pertence a este fornecedor' }, { status: 400 })
    }

    // Verificar se ja foi bipado
    const { data: existente } = await supabase
      .from('itens_conferencia_estoque')
      .select('id, estoque_conferido, nome, codigo, gtin, estoque_sistema')
      .eq('conferencia_id', conferenciaId)
      .eq('produto_id', produto.id)
      .single()

    let item
    if (existente) {
      // Produto ja bipado - se modo nao foi passado, retornar duplicado para o frontend decidir
      if (!modo) {
        return NextResponse.json({
          duplicado: true,
          item_existente: {
            id: existente.id,
            nome: existente.nome,
            codigo: existente.codigo,
            gtin: existente.gtin,
            estoque_conferido: existente.estoque_conferido,
            estoque_sistema: existente.estoque_sistema,
          },
        }, { status: 200 })
      }

      const novaQuantidade = modo === 'somar'
        ? existente.estoque_conferido + Number(quantidade)
        : Number(quantidade)

      const { data: updated, error: updateError } = await supabase
        .from('itens_conferencia_estoque')
        .update({ estoque_conferido: novaQuantidade })
        .eq('id', existente.id)
        .select()
        .single()

      if (updateError) {
        console.error('Erro ao atualizar item:', updateError)
        return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
      }
      item = updated
    } else {
      // Inserir novo item com snapshot do estoque_sistema
      const { data: inserted, error: insertError } = await supabase
        .from('itens_conferencia_estoque')
        .insert({
          conferencia_id: conferenciaId,
          produto_id: produto.id,
          codigo: produto.codigo,
          gtin: produto.gtin || produto.gtin_embalagem,
          nome: produto.nome,
          estoque_conferido: Number(quantidade),
          estoque_sistema: produto.estoque_atual,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Erro ao inserir item:', insertError)
        return NextResponse.json({ error: 'Erro ao inserir item' }, { status: 500 })
      }
      item = inserted
    }

    // Atualizar total_itens da conferencia
    const { count } = await supabase
      .from('itens_conferencia_estoque')
      .select('id', { count: 'exact', head: true })
      .eq('conferencia_id', conferenciaId)

    await supabase
      .from('conferencias_estoque')
      .update({ total_itens: count || 0, updated_at: new Date().toISOString() })
      .eq('id', conferenciaId)

    return NextResponse.json({
      item,
      produto: {
        id: produto.id,
        codigo: produto.codigo,
        nome: produto.nome,
        gtin: produto.gtin,
        estoque_atual: produto.estoque_atual,
      },
      ja_existia: !!existente,
    }, { status: existente ? 200 : 201 })
  } catch (error) {
    console.error('Erro ao bipar produto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')

    if (!itemId) {
      return NextResponse.json({ error: 'item_id obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    if (representanteIds.length === 0) {
      return NextResponse.json({ error: 'Representante nao encontrado' }, { status: 404 })
    }

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Validar ownership da conferencia
    const { data: conferencia } = await supabase
      .from('conferencias_estoque')
      .select('id, status')
      .eq('id', conferenciaId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (!conferencia) {
      return NextResponse.json({ error: 'Conferencia nao encontrada' }, { status: 404 })
    }

    if (conferencia.status !== 'em_andamento') {
      return NextResponse.json({ error: 'Conferencia nao esta em andamento' }, { status: 400 })
    }

    // Remover item
    const { error: deleteError } = await supabase
      .from('itens_conferencia_estoque')
      .delete()
      .eq('id', Number(itemId))
      .eq('conferencia_id', conferenciaId)

    if (deleteError) {
      console.error('Erro ao remover item:', deleteError)
      return NextResponse.json({ error: 'Erro ao remover item' }, { status: 500 })
    }

    // Atualizar total_itens
    const { count } = await supabase
      .from('itens_conferencia_estoque')
      .select('id', { count: 'exact', head: true })
      .eq('conferencia_id', conferenciaId)

    await supabase
      .from('conferencias_estoque')
      .update({ total_itens: count || 0, updated_at: new Date().toISOString() })
      .eq('id', conferenciaId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover item:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
