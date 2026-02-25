import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

async function validateFornecedorOwnership(supabase: ReturnType<typeof createServerSupabaseClient>, cnpj: string, tabelaId: number) {
  // Buscar instâncias do fornecedor
  const { data: fornecedores } = await supabase
    .from('fornecedores')
    .select('id')
    .eq('cnpj', cnpj)

  if (!fornecedores || fornecedores.length === 0) {
    return { error: 'Fornecedor nao encontrado', status: 404, tabela: null }
  }

  const fornecedorIds = fornecedores.map(f => f.id)

  // Buscar tabela validando ownership
  const { data: tabela, error } = await supabase
    .from('tabelas_preco')
    .select('*')
    .eq('id', tabelaId)
    .in('fornecedor_id', fornecedorIds)
    .single()

  if (error || !tabela) {
    return { error: 'Tabela nao encontrada', status: 404, tabela: null }
  }

  return { error: null, status: 200, tabela }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const tabelaId = Number(id)

    if (isNaN(tabelaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const result = await validateFornecedorOwnership(supabase, user.cnpj, tabelaId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Buscar itens da tabela
    const { data: itens } = await supabase
      .from('itens_tabela_preco')
      .select('*')
      .eq('tabela_preco_id', tabelaId)
      .order('created_at', { ascending: true })

    // Buscar nome da empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('id', result.tabela!.empresa_id)
      .single()

    return NextResponse.json({
      tabela: {
        ...result.tabela,
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
        total_itens: (itens || []).length,
      },
      itens: itens || [],
    })
  } catch (error) {
    console.error('Erro ao buscar tabela de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const tabelaId = Number(id)

    if (isNaN(tabelaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const result = await validateFornecedorOwnership(supabase, user.cnpj, tabelaId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const { nome, vigencia_inicio, vigencia_fim, observacao, status, itens } = body

    // Atualizar tabela
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (nome !== undefined) updateData.nome = nome
    if (vigencia_inicio !== undefined) updateData.vigencia_inicio = vigencia_inicio || null
    if (vigencia_fim !== undefined) updateData.vigencia_fim = vigencia_fim || null
    if (observacao !== undefined) updateData.observacao = observacao || null
    if (status !== undefined) updateData.status = status

    const { data: tabela, error: updateError } = await supabase
      .from('tabelas_preco')
      .update(updateData)
      .eq('id', tabelaId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar tabela:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar tabela' }, { status: 500 })
    }

    // Se itens foram enviados, substituir todos
    if (itens && Array.isArray(itens)) {
      // Remover itens antigos
      await supabase
        .from('itens_tabela_preco')
        .delete()
        .eq('tabela_preco_id', tabelaId)

      // Inserir novos itens
      if (itens.length > 0) {
        const itensToInsert = itens.map((item: { produto_id?: number; codigo?: string; nome?: string; unidade?: string; itens_por_caixa?: number; preco_original?: number; preco_tabela: number; desconto_percentual?: number }) => ({
          tabela_preco_id: tabelaId,
          produto_id: item.produto_id || null,
          codigo: item.codigo || null,
          nome: item.nome || null,
          unidade: item.unidade || null,
          itens_por_caixa: item.itens_por_caixa || null,
          preco_original: item.preco_original || null,
          preco_tabela: item.preco_tabela,
          desconto_percentual: item.desconto_percentual || null,
        }))

        await supabase
          .from('itens_tabela_preco')
          .insert(itensToInsert)
      }
    }

    return NextResponse.json({ tabela })
  } catch (error) {
    console.error('Erro ao atualizar tabela de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const tabelaId = Number(id)

    if (isNaN(tabelaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const result = await validateFornecedorOwnership(supabase, user.cnpj, tabelaId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Deletar tabela (itens são deletados via CASCADE)
    const { error: deleteError } = await supabase
      .from('tabelas_preco')
      .delete()
      .eq('id', tabelaId)

    if (deleteError) {
      console.error('Erro ao deletar tabela:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar tabela' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar tabela de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
