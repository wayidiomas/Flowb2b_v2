import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId || !user.userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, acao } = body as { ids: number[]; acao: 'aceitar' | 'rejeitar' }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids obrigatorio (array nao vazio)' }, { status: 400 })
    }

    if (acao !== 'aceitar' && acao !== 'rejeitar') {
      return NextResponse.json({ error: 'acao deve ser "aceitar" ou "rejeitar"' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Validate all ids belong to this empresa and are still pending
    const { data: registros, error: fetchError } = await supabase
      .from('catalogo_atualizacoes')
      .select('id, empresa_id, status')
      .in('id', ids)

    if (fetchError) {
      console.error('Erro ao validar atualizacoes:', fetchError)
      return NextResponse.json({ error: 'Erro ao validar atualizacoes' }, { status: 500 })
    }

    if (!registros || registros.length === 0) {
      return NextResponse.json({ error: 'Nenhuma atualizacao encontrada' }, { status: 404 })
    }

    // Security: check all belong to the user's empresa
    const idsInvalidos = registros.filter(r => r.empresa_id !== user.empresaId)
    if (idsInvalidos.length > 0) {
      return NextResponse.json({ error: 'Acesso negado a uma ou mais atualizacoes' }, { status: 403 })
    }

    // Filter only pending ones (skip already responded)
    const idsPendentes = registros
      .filter(r => r.status === 'pendente')
      .map(r => r.id)

    if (idsPendentes.length === 0) {
      return NextResponse.json({
        success: true,
        aceitos: 0,
        rejeitados: 0,
        mensagem: 'Todas as atualizacoes ja foram respondidas',
      })
    }

    // Apply the response
    const novoStatus = acao === 'aceitar' ? 'aceito' : 'rejeitado'

    const { error: updateError } = await supabase
      .from('catalogo_atualizacoes')
      .update({
        status: novoStatus,
        respondido_por: user.userId,
        respondido_em: new Date().toISOString(),
      })
      .eq('empresa_id', user.empresaId)
      .in('id', idsPendentes)

    if (updateError) {
      console.error('Erro ao responder atualizacoes:', updateError)
      return NextResponse.json({ error: 'Erro ao salvar resposta' }, { status: 500 })
    }

    const aceitos = acao === 'aceitar' ? idsPendentes.length : 0
    const rejeitados = acao === 'rejeitar' ? idsPendentes.length : 0

    // After successful update, if accepting and empresa uses Bling, trigger sync
    if (acao === 'aceitar' && idsPendentes.length > 0) {
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('conectadabling')
        .eq('id', user.empresaId)
        .single()

      if (empresaData?.conectadabling) {
        // Get catalogo_id from first atualizacao
        const { data: firstAtt } = await supabase
          .from('catalogo_atualizacoes')
          .select('catalogo_id')
          .eq('id', idsPendentes[0])
          .single()

        if (firstAtt?.catalogo_id) {
          // Fire-and-forget: trigger Bling sync in background
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          fetch(`${appUrl}/api/catalogo-atualizacoes/sync-bling`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: user.empresaId,
              catalogo_id: firstAtt.catalogo_id,
              atualizacao_ids: idsPendentes,
            }),
          }).catch(() => {}) // fire and forget
        }
      }
    }

    return NextResponse.json({
      success: true,
      aceitos,
      rejeitados,
    })
  } catch (error) {
    console.error('Erro ao responder atualizacoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
