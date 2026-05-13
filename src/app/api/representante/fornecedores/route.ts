import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/representante/fornecedores
 * Lista fornecedores que o representante autenticado pode gerenciar.
 * Retorna dados consolidados por CNPJ (ja que o catalogo eh por CNPJ).
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // 1) Buscar representantes do usuario (1+ linhas, uma por empresa)
    const { data: representantes, error: repError } = await supabase
      .from('representantes')
      .select('id, empresa_id, ativo')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    if (repError) {
      console.error('Erro ao buscar representantes:', repError)
      return NextResponse.json({ error: 'Erro ao buscar representantes' }, { status: 500 })
    }

    const representanteIds = (representantes || []).map(r => r.id)
    if (representanteIds.length === 0) {
      return NextResponse.json({ fornecedores: [] })
    }

    // 2) Buscar fornecedores vinculados
    const { data: vinculos, error: vincError } = await supabase
      .from('representante_fornecedores')
      .select(`
        fornecedor_id,
        representante_id,
        fornecedores!inner(id, cnpj, nome, nome_fantasia, razao_social, empresa_id)
      `)
      .in('representante_id', representanteIds)

    if (vincError) {
      console.error('Erro ao buscar vinculos:', vincError)
      return NextResponse.json({ error: 'Erro ao buscar fornecedores vinculados' }, { status: 500 })
    }

    // 3) Montar lista de fornecedores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fornecedoresList = (vinculos || []).map((v: any) => {
      const forn = Array.isArray(v.fornecedores) ? v.fornecedores[0] : v.fornecedores
      return {
        id: forn?.id ?? v.fornecedor_id,
        cnpj: forn?.cnpj || null,
        nome: forn?.nome_fantasia || forn?.nome || forn?.razao_social || 'Fornecedor',
        razao_social: forn?.razao_social || null,
        nome_fantasia: forn?.nome_fantasia || null,
        empresa_id: forn?.empresa_id ?? null,
      }
    })

    return NextResponse.json({ fornecedores: fornecedoresList })
  } catch (error) {
    console.error('Erro ao listar fornecedores do representante:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
