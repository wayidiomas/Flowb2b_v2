import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'

export async function GET(request: NextRequest) {
  const ctx = await authRepresentanteCatalogo(request)
  if (isNextResponse(ctx)) return ctx
  const { cnpj: cnpjLimpo } = ctx

  const url = new URL(request.url)
  const idParam = url.searchParams.get('id')
  if (!idParam) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
  const id = Number(idParam)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id invalido' }, { status: 400 })

  const supabase = createServerSupabaseClient()

  const { data: job, error } = await supabase
    .from('catalogo_import_xlsx_jobs')
    .select('id, status, total_linhas, processados, novos, atualizados, erros, resumo, error_message, created_at, updated_at, cnpj')
    .eq('id', id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
  }

  if (job.cnpj !== cnpjLimpo) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    totalLinhas: job.total_linhas,
    processados: job.processados,
    novos: job.novos,
    atualizados: job.atualizados,
    erros: job.erros,
    resumo: job.resumo,
    errorMessage: job.error_message,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  })
}
