import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar instâncias do fornecedor
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // Validar ownership e status
    const { data: conferencia } = await supabase
      .from('conferencias_estoque')
      .select('id, status')
      .eq('id', conferenciaId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (!conferencia) {
      return NextResponse.json({ error: 'Conferencia nao encontrada' }, { status: 404 })
    }

    if (conferencia.status !== 'em_andamento') {
      return NextResponse.json({ error: 'Conferencia nao esta em andamento' }, { status: 400 })
    }

    // Buscar itens para calcular divergências
    const { data: itens } = await supabase
      .from('itens_conferencia_estoque')
      .select('id, estoque_conferido, estoque_sistema')
      .eq('conferencia_id', conferenciaId)

    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Conferencia sem itens para enviar' }, { status: 400 })
    }

    const totalItens = itens.length
    const totalDivergencias = itens.filter(
      i => i.estoque_conferido !== i.estoque_sistema
    ).length

    // Ler observação do body se enviada
    let observacao_fornecedor = null
    try {
      const body = await request.json()
      observacao_fornecedor = body.observacao || null
    } catch {
      // Body vazio é ok
    }

    // Atualizar conferência para enviada
    const { data: updated, error: updateError } = await supabase
      .from('conferencias_estoque')
      .update({
        status: 'enviada',
        data_envio: new Date().toISOString(),
        total_itens: totalItens,
        total_divergencias: totalDivergencias,
        observacao_fornecedor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conferenciaId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao enviar conferencia:', updateError)
      return NextResponse.json({ error: 'Erro ao enviar conferencia' }, { status: 500 })
    }

    return NextResponse.json({ conferencia: updated })
  } catch (error) {
    console.error('Erro ao enviar conferencia:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
