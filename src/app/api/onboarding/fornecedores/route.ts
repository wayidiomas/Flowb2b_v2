import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar catalogos ativos
    const { data: catalogos, error: catalogosError } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome, logo_url, descricao')
      .eq('status', 'ativo')
      .order('nome', { ascending: true })

    if (catalogosError) {
      console.error('Erro ao buscar catalogos:', catalogosError)
      return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
    }

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({ fornecedores: [] })
    }

    // Contar itens ativos de cada catalogo em uma unica query
    const catalogoIds = catalogos.map(c => c.id)
    const { data: contagens, error: contagensError } = await supabase
      .from('catalogo_itens')
      .select('catalogo_id', { count: 'exact', head: false })
      .in('catalogo_id', catalogoIds)
      .eq('ativo', true)

    if (contagensError) {
      console.error('Erro ao contar itens:', contagensError)
    }

    // Agrupar contagens por catalogo_id
    const contagemMap = new Map<number, number>()
    if (contagens) {
      for (const item of contagens) {
        contagemMap.set(item.catalogo_id, (contagemMap.get(item.catalogo_id) || 0) + 1)
      }
    }

    const fornecedores = catalogos.map(catalogo => ({
      id: catalogo.id,
      cnpj: catalogo.cnpj,
      nome: catalogo.nome,
      logo_url: catalogo.logo_url,
      descricao: catalogo.descricao,
      total_itens: contagemMap.get(catalogo.id) || 0,
    }))

    return NextResponse.json({ fornecedores })
  } catch (error) {
    console.error('Erro ao listar fornecedores onboarding:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
