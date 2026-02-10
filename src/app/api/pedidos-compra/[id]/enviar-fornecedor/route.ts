import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Verificar pedido pertence a empresa e esta em rascunho
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, status_interno, numero, fornecedor_id')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (pedido.status_interno !== 'rascunho') {
      return NextResponse.json(
        { error: 'Pedido ja foi enviado ao fornecedor anteriormente' },
        { status: 400 }
      )
    }

    // Buscar dados do fornecedor
    const { data: fornecedor, error: fornecedorError } = await supabase
      .from('fornecedores')
      .select('id, cnpj, nome, telefone, celular')
      .eq('id', pedido.fornecedor_id)
      .single()

    if (fornecedorError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Verificar se o fornecedor tem usuario cadastrado na Flow (tabela users_fornecedor)
    const { data: usuarioFornecedor } = await supabase
      .from('users_fornecedor')
      .select('id, nome, email')
      .eq('cnpj', fornecedor.cnpj)
      .eq('ativo', true)
      .limit(1)
      .single()

    const fornecedorCadastrado = !!usuarioFornecedor

    // SEMPRE atualizar status para enviado_fornecedor (independente de estar cadastrado)
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({ status_interno: 'enviado_fornecedor' })
      .eq('id', pedidoId)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
    }

    // Registrar na timeline
    const descricaoTimeline = fornecedorCadastrado
      ? 'Pedido enviado ao fornecedor para analise'
      : 'Pedido enviado ao fornecedor via WhatsApp'

    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'enviado_fornecedor',
        descricao: descricaoTimeline,
        autor_tipo: 'lojista',
        autor_nome: user.email,
      })

    // Se o fornecedor esta cadastrado na Flow, retorna sucesso simples
    if (fornecedorCadastrado) {
      return NextResponse.json({
        success: true,
        fornecedorCadastrado: true,
        message: 'Pedido enviado ao fornecedor com sucesso',
      })
    }

    // Fornecedor NAO esta cadastrado - retornar dados para abrir WhatsApp
    const telefone = fornecedor.celular || fornecedor.telefone
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowb2b-v2.onrender.com'
    const linkPublico = `${baseUrl}/publico/pedido/${pedidoId}`

    return NextResponse.json({
      success: true,
      fornecedorCadastrado: false,
      fornecedor: {
        id: fornecedor.id,
        nome: fornecedor.nome,
        telefone: telefone || null,
      },
      linkPublico,
      numeroPedido: pedido.numero,
      message: telefone
        ? 'Fornecedor nao cadastrado na Flow. Envie via WhatsApp.'
        : 'Fornecedor sem telefone cadastrado.',
    })
  } catch (error) {
    console.error('Erro ao enviar pedido ao fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
