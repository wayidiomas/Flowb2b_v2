import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

// GET - Buscar info do espelho para o lojista
export async function GET(
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
    const supabase = createServerSupabaseClient()

    // Buscar pedido com campos do espelho
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_nome, espelho_enviado_em, espelho_status, prazo_entrega_fornecedor')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Gerar signed URL se houver espelho
    let espelhoSignedUrl: string | null = null
    if (pedido.espelho_url) {
      const { data: signedData } = await supabase.storage
        .from('espelhos-pedido')
        .createSignedUrl(pedido.espelho_url, 3600)
      espelhoSignedUrl = signedData?.signedUrl || null
    }

    return NextResponse.json({
      espelho_url: espelhoSignedUrl,
      espelho_nome: pedido.espelho_nome,
      espelho_enviado_em: pedido.espelho_enviado_em,
      espelho_status: pedido.espelho_status,
      prazo_entrega_fornecedor: pedido.prazo_entrega_fornecedor,
    })
  } catch (error) {
    console.error('Erro ao buscar espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Aprovar ou rejeitar espelho
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
    const body = await request.json()
    const { action, motivo }: { action: 'aprovar' | 'rejeitar'; motivo?: string } = body

    if (!action || !['aprovar', 'rejeitar'].includes(action)) {
      return NextResponse.json({ error: 'Acao invalida. Use "aprovar" ou "rejeitar"' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_status, status_interno')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Validar que existe espelho e esta pendente
    if (!pedido.espelho_url) {
      return NextResponse.json({ error: 'Nenhum espelho encontrado para este pedido' }, { status: 400 })
    }

    if (pedido.espelho_status !== 'pendente') {
      return NextResponse.json(
        { error: `Espelho ja foi ${pedido.espelho_status}. Nao pode ser processado novamente` },
        { status: 400 }
      )
    }

    // Buscar nome do usuario para timeline
    const { data: userData } = await supabase
      .from('users')
      .select('nome')
      .eq('id', user.userId)
      .single()

    const autorNome = userData?.nome || user.nome || user.email

    if (action === 'aprovar') {
      // Atualizar espelho_status para aprovado
      const { error: updateError } = await supabase
        .from('pedidos_compra')
        .update({
          espelho_status: 'aprovado',
        })
        .eq('id', pedidoId)
        .eq('empresa_id', user.empresaId)
        .eq('is_excluded', false)

      if (updateError) {
        console.error('Erro ao aprovar espelho:', updateError)
        return NextResponse.json({ error: 'Erro ao aprovar espelho' }, { status: 500 })
      }

      // Registrar na timeline
      await supabase
        .from('pedido_timeline')
        .insert({
          pedido_compra_id: parseInt(pedidoId),
          evento: 'espelho_aprovado',
          descricao: motivo
            ? `Espelho do pedido aprovado pelo lojista: "${motivo}"`
            : 'Espelho do pedido aprovado pelo lojista',
          autor_tipo: 'lojista',
          autor_nome: autorNome,
        })

      return NextResponse.json({
        success: true,
        espelho_status: 'aprovado',
        message: 'Espelho aprovado com sucesso',
      })
    }

    if (action === 'rejeitar') {
      // Atualizar espelho_status para rejeitado
      const { error: updateError } = await supabase
        .from('pedidos_compra')
        .update({
          espelho_status: 'rejeitado',
        })
        .eq('id', pedidoId)
        .eq('empresa_id', user.empresaId)
        .eq('is_excluded', false)

      if (updateError) {
        console.error('Erro ao rejeitar espelho:', updateError)
        return NextResponse.json({ error: 'Erro ao rejeitar espelho' }, { status: 500 })
      }

      // Registrar na timeline
      await supabase
        .from('pedido_timeline')
        .insert({
          pedido_compra_id: parseInt(pedidoId),
          evento: 'espelho_rejeitado',
          descricao: motivo
            ? `Espelho do pedido rejeitado pelo lojista: "${motivo}"`
            : 'Espelho do pedido rejeitado pelo lojista',
          autor_tipo: 'lojista',
          autor_nome: autorNome,
        })

      return NextResponse.json({
        success: true,
        espelho_status: 'rejeitado',
        message: 'Espelho rejeitado',
      })
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
