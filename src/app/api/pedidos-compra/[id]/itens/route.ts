import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

interface AdicionarItemRequest {
  produto_nome: string
  produto_gtin?: string | null
  codigo_fornecedor?: string | null
  quantidade?: number
  valor?: number
  unidade?: string
}

// POST - Adicionar item ao pedido de compra
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const body: AdicionarItemRequest = await request.json()
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // Validar body
    if (!body.produto_nome || body.produto_nome.trim().length === 0) {
      return NextResponse.json({ error: 'Nome do produto e obrigatorio' }, { status: 400 })
    }

    // 1. Buscar pedido (validar empresa_id, nao excluido, nao finalizado/cancelado)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, fornecedor_id, status_interno, situacao')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar se nao esta em estado final
    if (pedido.status_interno === 'cancelado' || pedido.status_interno === 'finalizado') {
      return NextResponse.json(
        { error: `Pedido em estado "${pedido.status_interno}" nao pode ser alterado` },
        { status: 400 }
      )
    }

    // Verificar situacao no Bling (1=Atendido, 2=Cancelado sao finais)
    if (pedido.situacao === 1 || pedido.situacao === 2) {
      return NextResponse.json(
        { error: 'Pedido ja foi concluido ou cancelado no Bling' },
        { status: 400 }
      )
    }

    // 2. Resolver produto_id - buscar por gtin na empresa
    let produtoResolvido: { id: number } | null = null

    if (body.produto_gtin) {
      const { data: produtoByGtin } = await supabase
        .from('produtos')
        .select('id')
        .eq('gtin', body.produto_gtin)
        .eq('empresa_id', empresaId)
        .limit(1)
        .single()

      if (produtoByGtin) {
        produtoResolvido = produtoByGtin
      }
    }

    // Se nao encontrou por gtin, buscar por codigo_fornecedor via fornecedores_produtos
    if (!produtoResolvido && body.codigo_fornecedor && pedido.fornecedor_id) {
      const { data: fpData } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id')
        .eq('codigo_fornecedor', body.codigo_fornecedor)
        .eq('fornecedor_id', pedido.fornecedor_id)
        .eq('empresa_id', empresaId)
        .limit(1)
        .single()

      if (fpData) {
        produtoResolvido = { id: fpData.produto_id }
      }
    }

    // 3. Inserir em itens_pedido_compra
    const novoItem = {
      pedido_compra_id: parseInt(pedidoId),
      produto_id: produtoResolvido?.id || null,
      descricao: body.produto_nome.trim(),
      codigo_fornecedor: body.codigo_fornecedor || null,
      quantidade: body.quantidade || 1,
      valor: body.valor || 0,
      unidade: body.unidade || 'UN',
    }

    const { data: itemInserido, error: insertError } = await supabase
      .from('itens_pedido_compra')
      .insert(novoItem)
      .select('id')
      .single()

    if (insertError) {
      console.error('Erro ao inserir item:', insertError)
      return NextResponse.json({ error: 'Erro ao adicionar item ao pedido' }, { status: 500 })
    }

    // 4. Recalcular total do pedido
    const { data: todosItens, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select('quantidade, valor')
      .eq('pedido_compra_id', parseInt(pedidoId))

    if (!itensError && todosItens) {
      const totalProdutos = todosItens.reduce(
        (acc: number, item: { quantidade: number; valor: number }) => acc + (item.quantidade * item.valor),
        0
      )

      // Buscar frete e desconto atuais para calcular total
      const { data: pedidoAtual } = await supabase
        .from('pedidos_compra')
        .select('frete, desconto, outras_despesas')
        .eq('id', parseInt(pedidoId))
        .eq('empresa_id', empresaId)
        .single()

      const frete = pedidoAtual?.frete || 0
      const desconto = pedidoAtual?.desconto || 0
      const outrasDespesas = pedidoAtual?.outras_despesas || 0
      const total = totalProdutos + frete - desconto + outrasDespesas

      await supabase
        .from('pedidos_compra')
        .update({
          total_produtos: totalProdutos,
          total: total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parseInt(pedidoId))
        .eq('empresa_id', empresaId)
    }

    // 5. Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'item_adicionado',
        descricao: `Produto "${body.produto_nome.trim()}" adicionado ao pedido pelo lojista`,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      item_id: itemInserido.id,
    })

  } catch (error) {
    console.error('Erro ao adicionar item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao adicionar item' },
      { status: 500 }
    )
  }
}

// DELETE - Remover item do pedido de compra
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    if (!itemId) {
      return NextResponse.json({ error: 'item_id e obrigatorio' }, { status: 400 })
    }

    // 1. Buscar pedido (validar empresa_id, nao excluido, nao finalizado/cancelado)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, fornecedor_id, status_interno, situacao')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (pedido.status_interno === 'cancelado' || pedido.status_interno === 'finalizado') {
      return NextResponse.json(
        { error: `Pedido em estado "${pedido.status_interno}" nao pode ser alterado` },
        { status: 400 }
      )
    }

    if (pedido.situacao === 1 || pedido.situacao === 2) {
      return NextResponse.json(
        { error: 'Pedido ja foi concluido ou cancelado no Bling' },
        { status: 400 }
      )
    }

    // 2. Validar que o item pertence a este pedido
    const { data: item, error: itemError } = await supabase
      .from('itens_pedido_compra')
      .select('id, descricao')
      .eq('id', parseInt(itemId))
      .eq('pedido_compra_id', parseInt(pedidoId))
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item nao encontrado neste pedido' }, { status: 404 })
    }

    // 3. Deletar o item
    const { error: deleteError } = await supabase
      .from('itens_pedido_compra')
      .delete()
      .eq('id', parseInt(itemId))
      .eq('pedido_compra_id', parseInt(pedidoId))

    if (deleteError) {
      console.error('Erro ao remover item:', deleteError)
      return NextResponse.json({ error: 'Erro ao remover item do pedido' }, { status: 500 })
    }

    // 4. Recalcular total do pedido
    const { data: todosItens, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select('quantidade, valor')
      .eq('pedido_compra_id', parseInt(pedidoId))

    if (!itensError && todosItens) {
      const totalProdutos = todosItens.reduce(
        (acc: number, i: { quantidade: number; valor: number }) => acc + (i.quantidade * i.valor),
        0
      )

      const { data: pedidoAtual } = await supabase
        .from('pedidos_compra')
        .select('frete, desconto, outras_despesas')
        .eq('id', parseInt(pedidoId))
        .eq('empresa_id', empresaId)
        .single()

      const frete = pedidoAtual?.frete || 0
      const desconto = pedidoAtual?.desconto || 0
      const outrasDespesas = pedidoAtual?.outras_despesas || 0
      const total = totalProdutos + frete - desconto + outrasDespesas

      await supabase
        .from('pedidos_compra')
        .update({
          total_produtos: totalProdutos,
          total: total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parseInt(pedidoId))
        .eq('empresa_id', empresaId)
    }

    // 5. Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'item_removido',
        descricao: `Produto "${item.descricao}" removido do pedido pelo lojista`,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao remover item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover item' },
      { status: 500 }
    )
  }
}

// PUT - Editar quantidade de item do pedido de compra
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const body: { item_id: number; quantidade: number } = await request.json()
    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    if (!body.item_id) {
      return NextResponse.json({ error: 'item_id e obrigatorio' }, { status: 400 })
    }

    if (!body.quantidade || body.quantidade < 1) {
      return NextResponse.json({ error: 'quantidade deve ser maior que 0' }, { status: 400 })
    }

    // 1. Buscar pedido (validar empresa_id, nao excluido, nao finalizado/cancelado)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, fornecedor_id, status_interno, situacao')
      .eq('id', pedidoId)
      .eq('empresa_id', empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (pedido.status_interno === 'cancelado' || pedido.status_interno === 'finalizado') {
      return NextResponse.json(
        { error: `Pedido em estado "${pedido.status_interno}" nao pode ser alterado` },
        { status: 400 }
      )
    }

    if (pedido.situacao === 1 || pedido.situacao === 2) {
      return NextResponse.json(
        { error: 'Pedido ja foi concluido ou cancelado no Bling' },
        { status: 400 }
      )
    }

    // 2. Validar que o item pertence a este pedido
    const { data: item, error: itemError } = await supabase
      .from('itens_pedido_compra')
      .select('id, descricao, quantidade')
      .eq('id', body.item_id)
      .eq('pedido_compra_id', parseInt(pedidoId))
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item nao encontrado neste pedido' }, { status: 404 })
    }

    // 3. Atualizar quantidade
    const { data: itemAtualizado, error: updateError } = await supabase
      .from('itens_pedido_compra')
      .update({ quantidade: body.quantidade })
      .eq('id', body.item_id)
      .eq('pedido_compra_id', parseInt(pedidoId))
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar quantidade do item' }, { status: 500 })
    }

    // 4. Recalcular total do pedido
    const { data: todosItens, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select('quantidade, valor')
      .eq('pedido_compra_id', parseInt(pedidoId))

    if (!itensError && todosItens) {
      const totalProdutos = todosItens.reduce(
        (acc: number, i: { quantidade: number; valor: number }) => acc + (i.quantidade * i.valor),
        0
      )

      const { data: pedidoAtual } = await supabase
        .from('pedidos_compra')
        .select('frete, desconto, outras_despesas')
        .eq('id', parseInt(pedidoId))
        .eq('empresa_id', empresaId)
        .single()

      const frete = pedidoAtual?.frete || 0
      const desconto = pedidoAtual?.desconto || 0
      const outrasDespesas = pedidoAtual?.outras_despesas || 0
      const total = totalProdutos + frete - desconto + outrasDespesas

      await supabase
        .from('pedidos_compra')
        .update({
          total_produtos: totalProdutos,
          total: total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parseInt(pedidoId))
        .eq('empresa_id', empresaId)
    }

    // 5. Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'item_editado',
        descricao: `Quantidade do produto "${item.descricao}" alterada para ${body.quantidade} pelo lojista`,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    return NextResponse.json({
      success: true,
      item: itemAtualizado,
    })

  } catch (error) {
    console.error('Erro ao atualizar item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar item' },
      { status: 500 }
    )
  }
}
