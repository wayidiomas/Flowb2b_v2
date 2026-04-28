import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj } from '@/lib/cnpj'

/**
 * POST /api/lp/[slug]/solicitar-vinculo
 *
 * Lojista flowb2b sem vinculo solicita atendimento do fornecedor da LP.
 * Reusa a tabela solicitacoes_atendimento existente.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const user = await getCurrentUser()
    if (!user || user.tipo !== 'lojista' || !user.empresaId) {
      return NextResponse.json({ error: 'Faca login como lojista' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Carrega LP + fornecedor
    const { data: lp } = await supabase
      .from('landing_pages_fornecedor')
      .select(`
        id, slug, fornecedor_id,
        fornecedor:fornecedor_id (id, cnpj, nome, nome_fantasia)
      `)
      .eq('slug', slug)
      .is('deletada_em', null)
      .maybeSingle()

    if (!lp) {
      return NextResponse.json({ error: 'Landing page nao encontrada' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fornecedorData = (lp as any).fornecedor
    const cnpjForn = stripCnpj(fornecedorData?.cnpj || '')

    // 2. Verifica se ja tem vinculo (ja eh cliente)
    const { data: vinculoExistente } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjForn)
      .eq('empresa_id', user.empresaId)
      .limit(1)
      .maybeSingle()

    if (vinculoExistente) {
      return NextResponse.json(
        { error: 'Voce ja e cliente desse fornecedor' },
        { status: 409 }
      )
    }

    // 3. Verifica se ja tem solicitacao pendente
    const { data: pendente } = await supabase
      .from('solicitacoes_atendimento')
      .select('id, status')
      .eq('fornecedor_cnpj', cnpjForn)
      .eq('empresa_id', user.empresaId)
      .eq('status', 'pendente')
      .limit(1)
      .maybeSingle()

    if (pendente) {
      return NextResponse.json(
        { error: 'Voce ja tem uma solicitacao pendente com esse fornecedor', solicitacao_id: pendente.id },
        { status: 409 }
      )
    }

    // 4. Pega dados do user pra preencher solicitacao
    const { data: userRow } = await supabase
      .from('users')
      .select('email, nome, telefone')
      .eq('id', user.userId)
      .maybeSingle()

    // 5. Cria solicitacao
    const { data: nova, error: insErr } = await supabase
      .from('solicitacoes_atendimento')
      .insert({
        fornecedor_cnpj: cnpjForn,
        fornecedor_nome: fornecedorData?.nome_fantasia || fornecedorData?.nome || 'Fornecedor',
        lojista_nome: userRow?.nome || user.email,
        lojista_email: userRow?.email || user.email,
        lojista_telefone: userRow?.telefone || null,
        empresa_id: user.empresaId,
        user_id: user.userId,
        status: 'pendente',
      })
      .select('id')
      .single()

    if (insErr || !nova) {
      console.error('Erro ao criar solicitacao:', insErr)
      return NextResponse.json({ error: 'Erro ao criar solicitacao' }, { status: 500 })
    }

    return NextResponse.json({ success: true, solicitacao_id: nova.id }, { status: 201 })
  } catch (error) {
    console.error('Erro em POST solicitar-vinculo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
