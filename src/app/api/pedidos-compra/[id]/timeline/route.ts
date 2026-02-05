import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Verificar acesso ao pedido
    if (user.tipo === 'lojista' && user.empresaId) {
      // Lojista: verificar se pedido pertence a empresa
      const { data: pedido } = await supabase
        .from('pedidos_compra')
        .select('id')
        .eq('id', pedidoId)
        .eq('empresa_id', user.empresaId)
        .single()

      if (!pedido) {
        return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
      }
    } else if (user.tipo === 'fornecedor' && user.cnpj) {
      // Fornecedor: verificar se pedido e para um fornecedor vinculado ao CNPJ
      const { data: fornecedores } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('cnpj', user.cnpj)

      if (!fornecedores || fornecedores.length === 0) {
        return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
      }

      const fornecedorIds = fornecedores.map(f => f.id)
      const { data: pedido } = await supabase
        .from('pedidos_compra')
        .select('id')
        .eq('id', pedidoId)
        .in('fornecedor_id', fornecedorIds)
        .single()

      if (!pedido) {
        return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar eventos da timeline
    const { data: timeline, error } = await supabase
      .from('pedido_timeline')
      .select('id, evento, descricao, autor_tipo, autor_nome, created_at')
      .eq('pedido_compra_id', pedidoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar timeline:', error)
      return NextResponse.json({ error: 'Erro ao buscar timeline' }, { status: 500 })
    }

    return NextResponse.json({ timeline: timeline || [] })
  } catch (error) {
    console.error('Erro ao buscar timeline:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
