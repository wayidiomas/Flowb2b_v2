import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'
import { contarPaginasPdf } from '@/lib/catalogo-pdf-extractor'
import https from 'node:https'
import { URL } from 'node:url'

function putBufferHttps(urlStr: string, buffer: Buffer, contentType: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.byteLength,
          'x-upsert': 'false',
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }))
      },
    )
    req.on('error', reject)
    req.write(buffer)
    req.end()
  })
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

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

    // Para o job, fornecedor_user_id eh referente ao users_fornecedor.id. Quando o
    // representante cria o job, deixamos null (representantes nao tem entrada lah).
    const fornecedorUserId: number | null = null

    const buffer = Buffer.from(await file.arrayBuffer())
    const totalPages = await contarPaginasPdf(buffer)

    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${catalogoId}/${Date.now()}_${filename}`

    const { data: signed, error: signErr } = await supabase.storage
      .from('catalogo-pdfs')
      .createSignedUploadUrl(storagePath)

    if (signErr || !signed) {
      console.error('Erro criar signed URL:', signErr)
      return NextResponse.json({ error: `Erro ao preparar upload: ${signErr?.message || 'sem url'}` }, { status: 500 })
    }

    const putRes = await putBufferHttps(signed.signedUrl, buffer, 'application/pdf')

    if (putRes.status < 200 || putRes.status >= 300) {
      console.error('Erro PUT storage:', putRes.status, putRes.body)
      return NextResponse.json({ error: `Erro ao subir PDF: HTTP ${putRes.status} ${putRes.body.slice(0, 200)}` }, { status: 500 })
    }

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
    console.error('Erro na importacao PDF (representante):', error)
    return NextResponse.json({ error: 'Erro interno na importacao' }, { status: 500 })
  }
}
