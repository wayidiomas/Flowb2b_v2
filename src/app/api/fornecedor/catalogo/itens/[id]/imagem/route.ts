import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'catalogo-produtos'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.tipo !== 'fornecedor' && user.tipo !== 'representante') || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const itemId = Number(id)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // Verificar que o catalogo pertence ao fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Verificar que o item pertence ao catalogo
    const { data: item } = await supabase
      .from('catalogo_itens')
      .select('id, imagem_url')
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item nao encontrado no seu catalogo' }, { status: 404 })
    }

    // Ler arquivo do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo invalido. Use JPEG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Maximo 2MB.' },
        { status: 400 }
      )
    }

    // Deletar imagem anterior se existir
    if (item.imagem_url) {
      const oldPath = item.imagem_url.split(`/${BUCKET}/`)[1]
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath])
      }
    }

    // Upload
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${catalogo.id}/${itemId}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
    }

    // Gerar URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    // Atualizar catalogo_itens com a URL
    const { error: updateError } = await supabase
      .from('catalogo_itens')
      .update({ imagem_url: publicUrl })
      .eq('id', itemId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Erro ao salvar URL da imagem' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imagem_url: publicUrl,
    })
  } catch (error) {
    console.error('Erro no upload de imagem:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.tipo !== 'fornecedor' && user.tipo !== 'representante') || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const itemId = Number(id)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const { imagem_url } = body

    if (!imagem_url || typeof imagem_url !== 'string') {
      return NextResponse.json({ error: 'URL da imagem e obrigatoria' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const { data: item } = await supabase
      .from('catalogo_itens')
      .select('id')
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item nao encontrado no seu catalogo' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('catalogo_itens')
      .update({ imagem_url })
      .eq('id', itemId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Erro ao salvar URL da imagem' }, { status: 500 })
    }

    return NextResponse.json({ success: true, imagem_url })
  } catch (error) {
    console.error('Erro ao salvar URL da imagem:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.tipo !== 'fornecedor' && user.tipo !== 'representante') || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const itemId = Number(id)
    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    const { data: item } = await supabase
      .from('catalogo_itens')
      .select('id, imagem_url')
      .eq('id', itemId)
      .eq('catalogo_id', catalogo.id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
    }

    if (item.imagem_url) {
      const oldPath = item.imagem_url.split(`/${BUCKET}/`)[1]
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath])
      }
    }

    await supabase
      .from('catalogo_itens')
      .update({ imagem_url: null })
      .eq('id', itemId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover imagem:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
