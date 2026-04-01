import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    const { data: solicitacoes, error } = await supabase
      .from('solicitacoes_atendimento')
      .select('*')
      .eq('fornecedor_cnpj', cnpjLimpo)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar solicitacoes:', error)
      return NextResponse.json({ error: 'Erro ao buscar solicitacoes' }, { status: 500 })
    }

    return NextResponse.json({ solicitacoes: solicitacoes || [] })
  } catch (error) {
    console.error('Erro solicitacoes fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { solicitacao_id, action } = body

    if (!solicitacao_id || !['aceitar', 'rejeitar'].includes(action)) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // Verificar que a solicitacao pertence a este fornecedor e esta pendente
    const { data: solicitacao, error: fetchError } = await supabase
      .from('solicitacoes_atendimento')
      .select('id, status')
      .eq('id', solicitacao_id)
      .eq('fornecedor_cnpj', cnpjLimpo)
      .eq('status', 'pendente')
      .single()

    if (fetchError || !solicitacao) {
      return NextResponse.json({ error: 'Solicitacao nao encontrada ou ja processada' }, { status: 404 })
    }

    const newStatus = action === 'aceitar' ? 'aceita' : 'rejeitada'

    const { error: updateError } = await supabase
      .from('solicitacoes_atendimento')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitacao_id)
      .eq('fornecedor_cnpj', cnpjLimpo)

    if (updateError) {
      console.error('Erro ao atualizar solicitacao:', updateError)
      return NextResponse.json({ error: 'Erro ao processar solicitacao' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: action === 'aceitar' ? 'Solicitacao aceita' : 'Solicitacao rejeitada',
    })
  } catch (error) {
    console.error('Erro ao processar solicitacao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
