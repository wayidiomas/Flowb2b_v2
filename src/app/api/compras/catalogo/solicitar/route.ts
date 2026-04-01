import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { catalogo_fornecedor_id, fornecedor_cnpj, mensagem } = body

    if (!catalogo_fornecedor_id) {
      return NextResponse.json({ error: 'catalogo_fornecedor_id obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verificar se o catálogo existe e está ativo
    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome')
      .eq('id', catalogo_fornecedor_id)
      .eq('status', 'ativo')
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Verificar se já existe solicitação pendente
    const { data: existing } = await supabase
      .from('solicitacoes_atendimento')
      .select('id, status')
      .eq('empresa_id', user.empresaId)
      .eq('catalogo_fornecedor_id', catalogo_fornecedor_id)
      .in('status', ['pendente', 'em_analise'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ja existe uma solicitacao pendente para este fornecedor' }, { status: 409 })
    }

    // Buscar dados da empresa solicitante
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj')
      .eq('id', user.empresaId)
      .single()

    // Buscar dados do usuário solicitante
    const { data: userData } = await supabase
      .from('users')
      .select('nome, email')
      .eq('id', user.userId)
      .single()

    // Criar solicitação
    const { data: solicitacao, error: insertError } = await supabase
      .from('solicitacoes_atendimento')
      .insert({
        empresa_id: user.empresaId,
        catalogo_fornecedor_id: catalogo_fornecedor_id,
        fornecedor_cnpj: (fornecedor_cnpj || catalogo.cnpj).replace(/\D/g, ''),
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || '',
        empresa_cnpj: empresa?.cnpj || '',
        solicitante_nome: userData?.nome || '',
        solicitante_email: userData?.email || user.email || '',
        mensagem: mensagem || null,
        status: 'pendente',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Erro ao criar solicitacao:', insertError)
      return NextResponse.json({ error: 'Erro ao criar solicitacao' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      solicitacao_id: solicitacao?.id,
      message: 'Solicitacao enviada com sucesso',
    })
  } catch (error) {
    console.error('Erro ao solicitar atendimento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
