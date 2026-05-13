import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const { jobId } = await params
    const id = Number(jobId)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: job, error } = await supabase
      .from('catalogo_import_jobs')
      .select('id, catalogo_id, status, total_pages, total_products, current_page, produtos_json, error, created_at')
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
    }

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj')
      .eq('id', job.catalogo_id)
      .single()

    if (!catalogo || catalogo.cnpj !== cnpjLimpo) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const response: Record<string, unknown> = {
      catalogo_id: job.catalogo_id,
      status: job.status,
      progress: {
        current_page: job.current_page ?? null,
        total_pages: job.total_pages ?? null,
        products_found: job.total_products ?? 0,
      },
    }

    if (job.status === 'extracted' && job.produtos_json) {
      response.produtos = job.produtos_json
    }

    if (job.status === 'error' && job.error) {
      response.error = job.error
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao consultar job (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
