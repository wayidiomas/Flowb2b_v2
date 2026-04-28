import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const solId = Number(id)
    if (isNaN(solId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjForn = stripCnpj(user.cnpj)

    const { data: sol } = await supabase
      .from('solicitacoes_atendimento')
      .select('id, fornecedor_cnpj, status')
      .eq('id', solId)
      .maybeSingle()

    if (!sol || stripCnpj(sol.fornecedor_cnpj) !== cnpjForn) {
      return NextResponse.json({ error: 'Solicitacao nao encontrada' }, { status: 404 })
    }
    if (sol.status !== 'pendente') {
      return NextResponse.json({ error: 'Solicitacao ja foi respondida' }, { status: 409 })
    }

    const { error: updErr } = await supabase
      .from('solicitacoes_atendimento')
      .update({ status: 'rejeitada', responded_at: new Date().toISOString() })
      .eq('id', solId)

    if (updErr) {
      return NextResponse.json({ error: 'Erro ao rejeitar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em POST rejeitar:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
