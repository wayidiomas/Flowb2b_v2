import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'

/**
 * POST /api/fornecedor/solicitacoes-vinculo/[id]/aceitar
 *
 * Aceita a solicitacao: cria espelho do fornecedor no tenant do lojista
 * (mesma logica do vinculo invertido) e marca solicitacao como aceita.
 */
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

    // 1. Carrega solicitacao + valida ownership
    const { data: sol } = await supabase
      .from('solicitacoes_atendimento')
      .select('id, fornecedor_cnpj, empresa_id, status')
      .eq('id', solId)
      .maybeSingle()

    if (!sol || stripCnpj(sol.fornecedor_cnpj) !== cnpjForn) {
      return NextResponse.json({ error: 'Solicitacao nao encontrada' }, { status: 404 })
    }
    if (sol.status !== 'pendente') {
      return NextResponse.json({ error: 'Solicitacao ja foi respondida' }, { status: 409 })
    }

    // 2. Busca dados do fornecedor pra clonar no tenant do lojista
    const { data: fornecedorOwn } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, nome, nome_fantasia, razao_social')
      .eq('cnpj', cnpjForn)
      .neq('empresa_id', sol.empresa_id)
      .limit(1)

    const fornecedorData = fornecedorOwn?.[0]

    // 3. Cria fornecedor no tenant do lojista (idempotente)
    const { data: jaExiste } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjForn)
      .eq('empresa_id', sol.empresa_id)
      .limit(1)
      .maybeSingle()

    if (!jaExiste) {
      const { error: insErr } = await supabase.from('fornecedores').insert({
        cnpj: cnpjForn,
        nome: fornecedorData?.razao_social || fornecedorData?.nome || 'Fornecedor',
        nome_fantasia: fornecedorData?.nome_fantasia || fornecedorData?.nome,
        razao_social: fornecedorData?.razao_social || fornecedorData?.nome,
        tipo_pessoa: 'J',
        empresa_id: sol.empresa_id,
      })
      if (insErr) {
        console.error('Erro ao criar fornecedor no tenant:', insErr)
        return NextResponse.json({ error: 'Erro ao criar vinculo' }, { status: 500 })
      }
    }

    // 4. Marca solicitacao como aceita
    const { error: updErr } = await supabase
      .from('solicitacoes_atendimento')
      .update({ status: 'aceita', responded_at: new Date().toISOString() })
      .eq('id', solId)

    if (updErr) {
      console.error('Erro ao atualizar solicitacao:', updErr)
      return NextResponse.json({ error: 'Erro ao registrar aceite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro em POST aceitar:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
