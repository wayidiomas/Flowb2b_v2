import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { getBlingToken, atualizarEstoquesBling } from '@/lib/bling-estoque'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'lojista' || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const conferenciaId = Number(id)

    if (isNaN(conferenciaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const { aceitar_todos, itens_aceitos, observacao } = body

    const supabase = createServerSupabaseClient()

    // Buscar conferência filtrando por empresa_id e status enviada
    const { data: conferencia, error: confError } = await supabase
      .from('conferencias_estoque')
      .select('id, empresa_id, fornecedor_id, status')
      .eq('id', conferenciaId)
      .eq('empresa_id', user.empresaId)
      .eq('status', 'enviada')
      .single()

    if (confError || !conferencia) {
      return NextResponse.json({ error: 'Sugestao nao encontrada ou ja processada' }, { status: 404 })
    }

    // Buscar todos os itens com id_produto_bling do produto
    const { data: itens, error: itensError } = await supabase
      .from('itens_conferencia_estoque')
      .select('id, produto_id, estoque_conferido, estoque_sistema, produtos(id_produto_bling)')
      .eq('conferencia_id', conferenciaId)

    if (itensError || !itens || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item encontrado na conferencia' }, { status: 400 })
    }

    // Buscar nome do fornecedor para o log
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('nome, nome_fantasia')
      .eq('id', conferencia.fornecedor_id)
      .single()

    const fornecedorNome = fornecedor?.nome_fantasia || fornecedor?.nome || 'Fornecedor'

    // Determinar quais itens aceitar
    const itensAceitosIds = aceitar_todos
      ? itens.map(i => i.id)
      : (itens_aceitos || [])

    const itensAceitosSet = new Set(itensAceitosIds.map(Number))
    let atualizados = 0

    // Processar cada item
    for (const item of itens) {
      const aceito = itensAceitosSet.has(item.id)

      if (aceito && item.estoque_conferido !== item.estoque_sistema) {
        // Atualizar estoque do produto
        await supabase
          .from('produtos')
          .update({ estoque_atual: item.estoque_conferido })
          .eq('id', item.produto_id)
          .eq('empresa_id', user.empresaId)

        // Registrar movimentação de estoque
        const diferenca = item.estoque_conferido - (item.estoque_sistema || 0)
        await supabase
          .from('movimentacao_estoque')
          .insert({
            produto_id: item.produto_id,
            empresa_id: user.empresaId,
            data: new Date().toISOString(),
            tipo: diferenca > 0 ? 'Entrada' : 'Saida',
            quantidade: Math.abs(diferenca),
            origem: 'Conferência de Estoque',
            observacao: `Conferencia #${conferenciaId} - ${fornecedorNome}`,
          })

        atualizados++
      }

      // Marcar item como aceito ou rejeitado
      await supabase
        .from('itens_conferencia_estoque')
        .update({ aceito })
        .eq('id', item.id)
    }

    // Sincronizar com Bling (se empresa tiver integração)
    let blingSync: { sucessos: number; erros: number; detalhes: Array<{ id: number; success: boolean; error?: string }> } | null = null
    if (atualizados > 0) {
      try {
        const blingToken = await getBlingToken(supabase, user.empresaId)
        if (blingToken) {
          // Montar lista de itens aceitos com divergência que têm id_produto_bling
          const itensParaBling = itens
            .filter((item) => {
              if (!itensAceitosSet.has(item.id)) return false
              if (item.estoque_conferido === item.estoque_sistema) return false
              const produto = item.produtos as unknown as { id_produto_bling: string | null } | null
              return produto?.id_produto_bling
            })
            .map((item) => {
              const produto = item.produtos as unknown as { id_produto_bling: string }
              return {
                idProdutoBling: Number(produto.id_produto_bling),
                quantidade: item.estoque_conferido,
                observacao: `Conferencia de Estoque #${conferenciaId} - ${fornecedorNome}`,
              }
            })

          if (itensParaBling.length > 0) {
            blingSync = await atualizarEstoquesBling(blingToken, itensParaBling)
            console.log(
              `[Bling Estoque] Conferencia #${conferenciaId}: ${blingSync.sucessos} sucessos, ${blingSync.erros} erros de ${itensParaBling.length} itens`
            )
          }
        }
      } catch (error) {
        console.error('[Bling Estoque] Erro ao sincronizar com Bling:', error)
        // Não bloquear o aceite — Supabase já foi atualizado
      }
    }

    // Determinar status final
    const todosAceitos = itens.every(i => itensAceitosSet.has(i.id))
    const nenhumAceito = itensAceitosSet.size === 0
    let statusFinal: string

    if (nenhumAceito) {
      statusFinal = 'rejeitada'
    } else if (todosAceitos) {
      statusFinal = 'aceita'
    } else {
      statusFinal = 'parcialmente_aceita'
    }

    // Atualizar conferência
    await supabase
      .from('conferencias_estoque')
      .update({
        status: statusFinal,
        data_resposta: new Date().toISOString(),
        observacao_lojista: observacao || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conferenciaId)

    return NextResponse.json({
      success: true,
      status: statusFinal,
      itens_aceitos: itensAceitosSet.size,
      itens_rejeitados: itens.length - itensAceitosSet.size,
      produtos_atualizados: atualizados,
      bling_sync: blingSync,
    })
  } catch (error) {
    console.error('Erro ao aceitar sugestao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
