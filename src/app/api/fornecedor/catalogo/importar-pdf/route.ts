import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { contarPaginasPdf } from '@/lib/catalogo-pdf-extractor'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Apenas arquivos PDF sao aceitos' }, { status: 400 })
    }

    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo excede o limite de 50MB' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // Find or create catalogo_fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    let catalogoId: number

    if (catalogo) {
      catalogoId = catalogo.id
    } else {
      const { data: fornecedorRef } = await supabase
        .from('fornecedores')
        .select('nome, nome_fantasia')
        .eq('cnpj', cnpjLimpo)
        .limit(1)
        .single()

      const { data: novoCatalogo, error: createError } = await supabase
        .from('catalogo_fornecedor')
        .insert({
          cnpj: cnpjLimpo,
          nome: fornecedorRef?.nome_fantasia || fornecedorRef?.nome || 'Catalogo',
          status: 'ativo',
        })
        .select()
        .single()

      if (createError || !novoCatalogo) {
        return NextResponse.json({ error: 'Erro ao criar catalogo' }, { status: 500 })
      }
      catalogoId = novoCatalogo.id
    }

    // Get fornecedor user id
    let fornecedorUserId: number | null = null
    if (user.fornecedorUserId) {
      fornecedorUserId = user.fornecedorUserId
    } else {
      const { data: uf } = await supabase
        .from('users_fornecedor')
        .select('id')
        .eq('cnpj', cnpjLimpo)
        .limit(1)
        .single()
      fornecedorUserId = uf?.id ?? null
    }

    // Read file and count pages
    const buffer = Buffer.from(await file.arrayBuffer())
    const totalPages = await contarPaginasPdf(buffer)

    // Upload PDF to storage
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${catalogoId}/${Date.now()}_${filename}`

    await supabase.storage
      .from('catalogo-pdfs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    // Create job — retorna imediato, processamento via /processar
    const { data: job, error: jobError } = await supabase
      .from('catalogo_import_jobs')
      .insert({
        catalogo_id: catalogoId,
        fornecedor_user_id: fornecedorUserId,
        status: 'pending',
        pdf_url: storagePath,
        pdf_nome: file.name,
        total_pages: totalPages,
        current_page: 0,
        total_products: 0,
        produtos_json: [],
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Erro ao criar job de importacao' }, { status: 500 })
    }

    return NextResponse.json({
      job_id: job.id,
      status: 'pending',
      total_pages: totalPages,
    })
  } catch (error) {
    console.error('Erro na importacao PDF:', error)
    return NextResponse.json({ error: 'Erro interno na importacao' }, { status: 500 })
  }
}
