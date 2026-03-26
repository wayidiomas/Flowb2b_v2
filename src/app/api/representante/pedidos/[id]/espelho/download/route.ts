import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  return contentTypes[ext || ''] || 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select('id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    const representanteIds = representantes?.map(r => r.id) || []

    // Buscar fornecedores vinculados
    const { data: vinculos } = await supabase
      .from('representante_fornecedores')
      .select('fornecedor_id')
      .in('representante_id', representanteIds)

    const fornecedorIds = vinculos?.map(v => v.fornecedor_id) || []

    if (fornecedorIds.length === 0) {
      return NextResponse.json(
        { error: 'Sem fornecedores vinculados' },
        { status: 403 }
      )
    }

    // Buscar pedido e validar que pertence a um fornecedor vinculado
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_nome')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { error: 'Pedido nao encontrado' },
        { status: 404 }
      )
    }

    if (!pedido.espelho_url) {
      return NextResponse.json(
        { error: 'Nenhum espelho encontrado para este pedido' },
        { status: 404 }
      )
    }

    // Download do arquivo do Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('espelhos-pedido')
      .download(pedido.espelho_url)

    if (downloadError || !fileData) {
      console.error('Erro ao baixar espelho do storage:', downloadError)
      return NextResponse.json(
        { error: 'Erro ao baixar arquivo' },
        { status: 500 }
      )
    }

    // Determinar nome do arquivo para download
    const filename = pedido.espelho_nome || pedido.espelho_url.split('/').pop() || 'espelho'
    const contentType = getContentType(filename)

    // Retornar o arquivo com headers de download
    const buffer = Buffer.from(await fileData.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Erro ao fazer download do espelho (representante):', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
