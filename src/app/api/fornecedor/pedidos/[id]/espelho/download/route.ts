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
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Buscar fornecedores pelo CNPJ do usuario
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar pedido e validar que pertence ao fornecedor
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_nome')
      .eq('id', pedidoId)
      .in('fornecedor_id', fornecedorIds)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (!pedido.espelho_url) {
      return NextResponse.json({ error: 'Nenhum espelho encontrado para este pedido' }, { status: 404 })
    }

    // Download do arquivo do Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('espelhos-pedido')
      .download(pedido.espelho_url)

    if (downloadError || !fileData) {
      console.error('Erro ao baixar espelho do storage:', downloadError)
      return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 500 })
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
    console.error('Erro ao fazer download do espelho:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
