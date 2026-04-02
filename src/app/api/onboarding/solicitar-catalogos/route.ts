import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface SolicitarCatalogosBody {
  catalogo_ids: number[]
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: SolicitarCatalogosBody = await request.json()
    const { catalogo_ids } = body

    if (!Array.isArray(catalogo_ids) || catalogo_ids.length === 0) {
      return NextResponse.json(
        { error: 'catalogo_ids deve ser um array nao vazio' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar dados da empresa solicitante
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj')
      .eq('id', user.empresaId)
      .single()

    // Buscar dados do usuario solicitante
    const { data: userData } = await supabase
      .from('users')
      .select('nome, email')
      .eq('id', user.userId)
      .single()

    // Buscar catalogos ativos em batch
    const { data: catalogos, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome')
      .in('id', catalogo_ids)
      .eq('status', 'ativo')

    if (catError) {
      console.error('Erro ao buscar catalogos:', catError)
      return NextResponse.json({ error: 'Erro ao buscar catalogos' }, { status: 500 })
    }

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum catalogo ativo encontrado' },
        { status: 404 }
      )
    }

    const catalogoMap = new Map(catalogos.map(c => [c.id, c]))

    // Buscar solicitacoes pendentes existentes para esta empresa + catalogos
    const { data: existingSolicitacoes } = await supabase
      .from('solicitacoes_atendimento')
      .select('catalogo_fornecedor_id')
      .eq('empresa_id', user.empresaId)
      .in('catalogo_fornecedor_id', catalogo_ids)
      .in('status', ['pendente', 'em_analise'])

    const pendingSet = new Set(
      (existingSolicitacoes || []).map(s => s.catalogo_fornecedor_id)
    )

    // Montar inserts apenas para catalogos validos e sem solicitacao pendente
    const inserts = []
    for (const catalogoId of catalogo_ids) {
      const catalogo = catalogoMap.get(catalogoId)
      if (!catalogo) continue
      if (pendingSet.has(catalogoId)) continue

      inserts.push({
        empresa_id: user.empresaId,
        catalogo_fornecedor_id: catalogo.id,
        fornecedor_cnpj: (catalogo.cnpj || '').replace(/\D/g, ''),
        solicitante_nome: userData?.nome || '',
        solicitante_email: userData?.email || user.email || '',
        status: 'pendente',
        created_at: new Date().toISOString(),
      })
    }

    if (inserts.length === 0) {
      return NextResponse.json({
        success: true,
        criadas: 0,
        message: 'Todas as solicitacoes ja existem ou catalogos invalidos',
      })
    }

    const { error: insertError } = await supabase
      .from('solicitacoes_atendimento')
      .insert(inserts)

    if (insertError) {
      console.error('Erro ao criar solicitacoes:', insertError)
      return NextResponse.json({ error: 'Erro ao criar solicitacoes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      criadas: inserts.length,
      total_solicitadas: catalogo_ids.length,
      duplicadas_ignoradas: catalogo_ids.length - inserts.length,
    })
  } catch (error) {
    console.error('Erro ao solicitar catalogos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
