import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'
import { extrairProdutosDeChunk, curarProdutos, type ProdutoExtraido } from '@/lib/catalogo-pdf-extractor'

const PAGES_PER_CHUNK = 3

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const { jobId } = await params
    const supabase = createServerSupabaseClient()

    const { data: job, error: jobError } = await supabase
      .from('catalogo_import_jobs')
      .select('id, catalogo_id, status, pdf_url, total_pages, current_page, produtos_json')
      .eq('id', Number(jobId))
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
    }

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('id', job.catalogo_id)
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
    }

    if (job.status === 'extracted' || job.status === 'completed') {
      return NextResponse.json({
        status: job.status,
        current_page: job.total_pages,
        total_pages: job.total_pages,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products_found: (job.produtos_json as any[])?.length || 0,
        done: true,
      })
    }

    if (job.status === 'error') {
      return NextResponse.json({ status: 'error', error: 'Job com erro' }, { status: 422 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('catalogo-pdfs')
      .download(job.pdf_url)

    if (downloadError || !fileData) {
      console.error('Erro download PDF:', downloadError?.message, 'path:', job.pdf_url)
      return NextResponse.json({ error: `Erro ao baixar PDF: ${downloadError?.message || 'arquivo vazio'}` }, { status: 500 })
    }

    const pdfBuffer = Buffer.from(await fileData.arrayBuffer())

    const startPage = job.current_page || 0
    const endPage = Math.min(startPage + PAGES_PER_CHUNK - 1, job.total_pages - 1)

    await supabase
      .from('catalogo_import_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id)

    const result = await extrairProdutosDeChunk(pdfBuffer, startPage, endPage)

    const existingProducts = (job.produtos_json as ProdutoExtraido[]) || []
    let allProducts: ProdutoExtraido[] = [...existingProducts, ...(result.produtos || [])]
    const nextPage = endPage + 1
    const isLastChunk = nextPage >= job.total_pages

    let curacao: { flagados: number; corrigidos: number; naoCorrigidos: number } | null = null
    if (isLastChunk && allProducts.length > 0) {
      try {
        const resultado = await curarProdutos(pdfBuffer, allProducts)
        allProducts = resultado.produtos
        curacao = {
          flagados: resultado.flagados,
          corrigidos: resultado.corrigidos,
          naoCorrigidos: resultado.naoCorrigidos,
        }
      } catch (err) {
        console.error('Erro curador:', err)
      }
    }

    await supabase
      .from('catalogo_import_jobs')
      .update({
        status: isLastChunk ? 'extracted' : 'processing',
        current_page: nextPage,
        total_products: allProducts.length,
        produtos_json: allProducts,
        error: result.success ? null : result.error,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return NextResponse.json({
      status: isLastChunk ? 'extracted' : 'processing',
      current_page: nextPage,
      total_pages: job.total_pages,
      products_found: allProducts.length,
      chunk_products: result.produtos?.length || 0,
      done: isLastChunk,
      produtos: isLastChunk ? allProducts : undefined,
      curacao,
    })
  } catch (error) {
    console.error('Erro ao processar chunk (representante):', error)
    return NextResponse.json({ error: 'Erro interno no processamento' }, { status: 500 })
  }
}
