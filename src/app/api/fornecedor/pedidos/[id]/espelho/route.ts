import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// POST - Upload do espelho do pedido pelo fornecedor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Buscar fornecedores pelo CNPJ do usuario
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar pedido e validar que pertence ao fornecedor
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, empresa_id, fornecedor_id, status_interno')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Validar status do pedido
    const statusPermitidos = ['aceito', 'sugestao_pendente', 'enviado_fornecedor']
    if (!statusPermitidos.includes(pedido.status_interno)) {
      return NextResponse.json(
        { error: 'Pedido nao esta em um status que permite envio de espelho' },
        { status: 400 }
      )
    }

    // Ler FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const prazoEntrega = formData.get('prazo_entrega') as string | null

    // Validar arquivo
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Arquivo e obrigatorio' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande, max 10MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo nao permitido. Use PDF, JPG, PNG ou WEBP' },
        { status: 400 }
      )
    }

    // Upload para Supabase Storage
    const fileName = `${pedido.empresa_id}/${pedidoId}/${Date.now()}_${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('espelhos-pedido')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Erro ao fazer upload do espelho:', uploadError)
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
    }

    // Atualizar pedido com dados do espelho (guardar path, nao URL)
    const updateData: Record<string, unknown> = {
      espelho_url: fileName,
      espelho_nome: file.name,
      espelho_enviado_em: new Date().toISOString(),
      espelho_status: 'pendente',
    }

    if (prazoEntrega) {
      updateData.prazo_entrega_fornecedor = prazoEntrega
    }

    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update(updateData)
      .eq('id', pedidoId)
      .eq('is_excluded', false)

    if (updateError) {
      console.error('Erro ao atualizar pedido com espelho:', updateError)
      return NextResponse.json({ error: 'Erro ao salvar dados do espelho' }, { status: 500 })
    }

    // Buscar nome do usuario fornecedor para timeline
    const { data: fornecedorUser } = await supabase
      .from('users_fornecedor')
      .select('nome')
      .eq('id', user.fornecedorUserId!)
      .single()

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'espelho_enviado',
        descricao: prazoEntrega
          ? `Espelho do pedido anexado pelo fornecedor. Prazo de entrega: ${prazoEntrega}`
          : 'Espelho do pedido anexado pelo fornecedor',
        autor_tipo: 'fornecedor',
        autor_nome: fornecedorUser?.nome || user.email,
      })

    // Gerar signed URL para retorno
    const { data: signedData } = await supabase.storage
      .from('espelhos-pedido')
      .createSignedUrl(fileName, 3600)

    return NextResponse.json({
      success: true,
      espelho_url: signedData?.signedUrl || null,
      espelho_nome: file.name,
    })
  } catch (error) {
    console.error('Erro ao fazer upload do espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET - Buscar info do espelho
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Buscar fornecedores pelo CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_nome, espelho_enviado_em, espelho_status, prazo_entrega_fornecedor')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
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

// DELETE - Remover espelho (fornecedor pode remover se ainda pendente)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Buscar fornecedores pelo CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_status')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Verificar que o espelho existe e esta pendente
    if (!pedido.espelho_url) {
      return NextResponse.json({ error: 'Nenhum espelho encontrado' }, { status: 400 })
    }

    if (pedido.espelho_status !== 'pendente') {
      return NextResponse.json(
        { error: 'Espelho so pode ser removido enquanto estiver pendente' },
        { status: 400 }
      )
    }

    // Remover arquivo do Storage
    const { error: removeError } = await supabase.storage
      .from('espelhos-pedido')
      .remove([pedido.espelho_url])

    if (removeError) {
      console.error('Erro ao remover arquivo do storage:', removeError)
    }

    // Limpar campos do pedido
    const { error: updateError } = await supabase
      .from('pedidos_compra')
      .update({
        espelho_url: null,
        espelho_nome: null,
        espelho_enviado_em: null,
        espelho_status: null,
      })
      .eq('id', pedidoId)
      .eq('is_excluded', false)

    if (updateError) {
      console.error('Erro ao limpar dados do espelho:', updateError)
      return NextResponse.json({ error: 'Erro ao remover espelho' }, { status: 500 })
    }

    // Buscar nome do usuario fornecedor para timeline
    const { data: fornecedorUser } = await supabase
      .from('users_fornecedor')
      .select('nome')
      .eq('id', user.fornecedorUserId!)
      .single()

    // Registrar na timeline
    await supabase
      .from('pedido_timeline')
      .insert({
        pedido_compra_id: parseInt(pedidoId),
        evento: 'espelho_removido',
        descricao: 'Espelho do pedido removido pelo fornecedor',
        autor_tipo: 'fornecedor',
        autor_nome: fornecedorUser?.nome || user.email,
      })

    return NextResponse.json({ success: true, message: 'Espelho removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
