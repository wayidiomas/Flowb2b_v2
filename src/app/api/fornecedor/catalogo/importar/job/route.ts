import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const idParam = url.searchParams.get('id')
  if (!idParam) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
  const id = Number(idParam)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id invalido' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const cnpjLimpo = user.cnpj.replace(/\D/g, '')

  const { data: job, error } = await supabase
    .from('catalogo_import_xlsx_jobs')
    .select('id, status, total_linhas, processados, novos, atualizados, erros, resumo, error_message, created_at, updated_at, cnpj')
    .eq('id', id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
  }

  // Garante isolamento: o job tem que ser do fornecedor logado
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
