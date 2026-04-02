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
      .select('id, status, empresa_id, catalogo_fornecedor_id')
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

    // Ao aceitar: vincular fornecedor ao lojista automaticamente
    if (action === 'aceitar' && solicitacao.empresa_id) {
      // Verificar se ja existe vinculo
      const { data: existingLink } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('cnpj', cnpjLimpo)
        .eq('empresa_id', solicitacao.empresa_id)
        .single()

      if (!existingLink) {
        // Buscar dados do fornecedor de outra empresa para copiar nome/razao_social
        const { data: fornecedorRef } = await supabase
          .from('fornecedores')
          .select('nome, nome_fantasia, razao_social, tipo_pessoa, email, telefone, celular')
          .eq('cnpj', cnpjLimpo)
          .limit(1)
          .single()

        // Buscar nome do catalogo como fallback
        const { data: catalogo } = await supabase
          .from('catalogo_fornecedor')
          .select('nome')
          .eq('id', solicitacao.catalogo_fornecedor_id)
          .single()

        const { error: insertError } = await supabase
          .from('fornecedores')
          .insert({
            cnpj: cnpjLimpo,
            empresa_id: solicitacao.empresa_id,
            nome: fornecedorRef?.nome || catalogo?.nome || 'Fornecedor',
            nome_fantasia: fornecedorRef?.nome_fantasia || null,
            razao_social: fornecedorRef?.razao_social || null,
            tipo_pessoa: fornecedorRef?.tipo_pessoa || 'J',
            email: fornecedorRef?.email || null,
            telefone: fornecedorRef?.telefone || null,
            celular: fornecedorRef?.celular || null,
          })

        if (insertError) {
          console.error('Erro ao vincular fornecedor ao lojista:', insertError)
          // Nao falha a solicitacao por isso, apenas loga
        }
      }
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
