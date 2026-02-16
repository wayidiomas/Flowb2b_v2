import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// GET - Lista representantes vinculados ao fornecedor logado
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar todos os fornecedores com o CNPJ do usuario
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({
        success: true,
        representantes: [],
      })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Buscar representantes vinculados a esses fornecedores
    const { data: vinculos, error } = await supabase
      .from('representante_fornecedores')
      .select(`
        id,
        fornecedor_id,
        created_at,
        representantes (
          id,
          nome,
          telefone,
          codigo_acesso,
          ativo,
          user_representante_id,
          empresa_id,
          empresas (
            id,
            razao_social,
            nome_fantasia
          )
        ),
        fornecedores (
          id,
          nome,
          nome_fantasia
        )
      `)
      .in('fornecedor_id', fornecedorIds)

    if (error) throw error

    // Agrupar por representante (pode ter mesmo representante vinculado a multiplos fornecedores)
    const representantesMap = new Map<number, {
      id: number
      nome: string
      telefone: string | null
      codigo_acesso: string
      ativo: boolean
      cadastrado: boolean
      lojista_nome: string
      fornecedores: { id: number; nome: string }[]
      vinculado_em: string
    }>()

    // Tipos para relações retornadas pelo Supabase (relação many-to-one retorna objeto)
    type RepresentanteRelation = {
      id: number
      nome: string
      telefone: string | null
      codigo_acesso: string
      ativo: boolean
      user_representante_id: number | null
      empresa_id: number
      empresas: { id: number; razao_social: string; nome_fantasia: string | null } | null
    } | null
    type FornecedorRelation = { id: number; nome: string; nome_fantasia: string | null } | null

    for (const vinculo of vinculos || []) {
      // Supabase pode inferir tipos incorretamente em queries complexas, usar unknown como intermediário
      const rep = vinculo.representantes as unknown as RepresentanteRelation
      const forn = vinculo.fornecedores as unknown as FornecedorRelation

      if (!rep) continue

      const existing = representantesMap.get(rep.id)
      const fornecedorInfo = {
        id: forn?.id || vinculo.fornecedor_id,
        nome: forn?.nome_fantasia || forn?.nome || 'Fornecedor',
      }

      if (existing) {
        // Adicionar fornecedor ao representante existente
        existing.fornecedores.push(fornecedorInfo)
      } else {
        // Novo representante
        representantesMap.set(rep.id, {
          id: rep.id,
          nome: rep.nome,
          telefone: rep.telefone,
          codigo_acesso: rep.codigo_acesso,
          ativo: rep.ativo,
          cadastrado: !!rep.user_representante_id,
          lojista_nome: rep.empresas?.nome_fantasia || rep.empresas?.razao_social || 'Lojista',
          fornecedores: [fornecedorInfo],
          vinculado_em: vinculo.created_at,
        })
      }
    }

    const representantes = Array.from(representantesMap.values())

    return NextResponse.json({
      success: true,
      representantes,
    })

  } catch (error) {
    console.error('Erro ao listar representantes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar representantes' },
      { status: 500 }
    )
  }
}
