import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor') {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar dados do usuario fornecedor
    const { data: fornecedorUser, error: userError } = await supabase
      .from('users_fornecedor')
      .select('id, email, nome, cnpj, telefone, created_at')
      .eq('id', user.fornecedorUserId)
      .single()

    if (userError || !fornecedorUser) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    // Buscar empresas (lojistas) vinculadas via CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia, empresa_id, empresas!inner(id, razao_social, nome_fantasia)')
      .eq('cnpj', fornecedorUser.cnpj)

    const empresasVinculadas = (fornecedores || []).map(f => ({
      fornecedorId: f.id,
      empresaId: f.empresa_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      razaoSocial: (f.empresas as any)?.razao_social || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nomeFantasia: (f.empresas as any)?.nome_fantasia || '',
    }))

    return NextResponse.json({
      success: true,
      user: {
        ...fornecedorUser,
        tipo: 'fornecedor',
      },
      empresasVinculadas,
    })
  } catch (error) {
    console.error('Fornecedor me error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
