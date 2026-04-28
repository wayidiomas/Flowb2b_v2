import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { stripCnpj, formatCnpj } from '@/lib/cnpj'

/**
 * GET /api/fornecedor/solicitacoes-vinculo
 * Lista solicitacoes pendentes ao fornecedor logado.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpj = stripCnpj(user.cnpj)

    const { data: solicitacoes, error } = await supabase
      .from('solicitacoes_atendimento')
      .select(`
        id, lojista_nome, lojista_email, lojista_telefone,
        empresa_id, user_id, status, created_at, responded_at,
        empresa:empresa_id (id, razao_social, nome_fantasia, cnpj)
      `)
      .eq('fornecedor_cnpj', cnpj)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Erro ao listar solicitacoes:', error)
      return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 })
    }

    return NextResponse.json({
      solicitacoes: (solicitacoes || []).map(s => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emp = (s as any).empresa
        return {
          id: s.id,
          lojista_nome: s.lojista_nome,
          lojista_email: s.lojista_email,
          lojista_telefone: s.lojista_telefone,
          empresa_id: s.empresa_id,
          empresa_razao: emp?.razao_social || null,
          empresa_nome_fantasia: emp?.nome_fantasia || null,
          empresa_cnpj: emp?.cnpj ? formatCnpj(emp.cnpj) : null,
          status: s.status,
          created_at: s.created_at,
          responded_at: s.responded_at,
        }
      }),
    })
  } catch (error) {
    console.error('Erro em GET solicitacoes-vinculo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
