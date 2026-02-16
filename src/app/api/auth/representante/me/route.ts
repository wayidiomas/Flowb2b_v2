import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar dados do usuario representante
    const { data: userData, error: userError } = await supabase
      .from('users_representante')
      .select('id, nome, email, telefone, ativo')
      .eq('id', user.representanteUserId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar representantes vinculados a este usuario
    const { data: representantes } = await supabase
      .from('representantes')
      .select(`
        id,
        empresa_id,
        codigo_acesso,
        nome,
        empresas (
          id,
          razao_social,
          nome_fantasia
        )
      `)
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    // Buscar fornecedores vinculados
    const representanteIds = representantes?.map(r => r.id) || []
    let fornecedoresVinculados: Array<{
      fornecedor_id: number
      fornecedor_nome: string
      fornecedor_cnpj?: string
      empresa_id: number
      empresa_nome: string
      representante_id: number
    }> = []

    if (representanteIds.length > 0) {
      const { data: vinculos } = await supabase
        .from('representante_fornecedores')
        .select(`
          representante_id,
          fornecedor_id,
          fornecedores (
            id,
            nome,
            cnpj,
            empresa_id
          )
        `)
        .in('representante_id', representanteIds)

      if (vinculos) {
        fornecedoresVinculados = vinculos
          .filter(v => v.fornecedores)
          .map(v => {
            // Supabase pode retornar como array ou objeto dependendo da relação
            const fornData = v.fornecedores as unknown
            const forn = Array.isArray(fornData) ? fornData[0] : fornData
            const typedForn = forn as { id: number; nome: string; cnpj?: string; empresa_id: number }

            const rep = representantes?.find(r => r.id === v.representante_id)
            const empData = rep?.empresas as unknown
            const emp = Array.isArray(empData) ? empData[0] : empData
            const typedEmp = emp as { id: number; razao_social: string; nome_fantasia?: string } | null

            return {
              fornecedor_id: typedForn.id,
              fornecedor_nome: typedForn.nome,
              fornecedor_cnpj: typedForn.cnpj,
              empresa_id: typedForn.empresa_id,
              empresa_nome: typedEmp?.nome_fantasia || typedEmp?.razao_social || '',
              representante_id: v.representante_id,
            }
          })
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        nome: userData.nome,
        email: userData.email,
        telefone: userData.telefone,
        tipo: 'representante',
      },
      representantes: representantes?.map(r => {
        const empData = r.empresas as unknown
        const emp = Array.isArray(empData) ? empData[0] : empData
        const typedEmp = emp as { nome_fantasia?: string; razao_social: string } | null
        return {
          id: r.id,
          codigo_acesso: r.codigo_acesso,
          nome: r.nome,
          empresa_id: r.empresa_id,
          empresa_nome: typedEmp?.nome_fantasia || typedEmp?.razao_social || '',
        }
      }) || [],
      fornecedoresVinculados,
    })
  } catch (error) {
    console.error('Representante me error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
