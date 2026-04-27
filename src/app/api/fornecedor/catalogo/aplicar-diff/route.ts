import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { CatalogoDiff } from '@/lib/catalogo-diff'
import { notificarLojistas, type MudancaCatalogo } from '@/lib/catalogo-notificacoes'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { catalogo_id, diff, notificar_lojistas } = body as {
      catalogo_id: number
      diff: CatalogoDiff
      notificar_lojistas: boolean
    }

    if (!catalogo_id || !diff) {
      return NextResponse.json({ error: 'catalogo_id e diff obrigatorios' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj')
      .eq('id', catalogo_id)
      .single()

    if (!catalogo || catalogo.cnpj !== cnpjLimpo) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    let totalNovos = 0
    let totalRemovidos = 0
    let totalAtualizados = 0

    // 1. Insert new products
    if (diff.novos.length > 0) {
      const toInsert = diff.novos.map(p => ({
        catalogo_id,
        codigo: p.codigo_fornecedor || null,
        nome: p.nome,
        ean: p.ean || null,
        ncm: p.ncm || null,
        marca: p.marca || null,
        unidade: p.unidade || 'UN',
        itens_por_caixa: p.itens_por_caixa ?? 1,
        preco_base: p.preco_base ?? 0,
        ativo: true,
      }))

      for (let i = 0; i < toInsert.length; i += 500) {
        const batch = toInsert.slice(i, i + 500)
        const { error: insertError } = await supabase
          .from('catalogo_itens')
          .insert(batch)

        if (insertError) {
          console.error('Erro ao inserir novos itens:', insertError)
        } else {
          totalNovos += batch.length
        }
      }
    }

    // 2. Deactivate removed products
    if (diff.removidos.length > 0) {
      const removidosIds = diff.removidos.map(r => r.id)

      for (let i = 0; i < removidosIds.length; i += 500) {
        const batch = removidosIds.slice(i, i + 500)
        const { error: removeError } = await supabase
          .from('catalogo_itens')
          .update({ ativo: false })
          .eq('catalogo_id', catalogo_id)
          .in('id', batch)

        if (removeError) {
          console.error('Erro ao desativar itens removidos:', removeError)
        } else {
          totalRemovidos += batch.length
        }
      }
    }

    // 3. Update price changes
    for (const item of diff.preco_alterado) {
      const { error: precoError } = await supabase
        .from('catalogo_itens')
        .update({ preco_base: item.preco_novo })
        .eq('id', item.item.id)
        .eq('catalogo_id', catalogo_id)

      if (precoError) {
        console.error(`Erro ao atualizar preco do item ${item.item.id}:`, precoError)
      } else {
        totalAtualizados++
      }
    }

    // 4. Update data changes
    for (const item of diff.dados_alterados) {
      const updates: Record<string, any> = {}
      for (const m of item.mudancas) {
        updates[m.campo] = m.novo
      }

      const { error: dadosError } = await supabase
        .from('catalogo_itens')
        .update(updates)
        .eq('id', item.item.id)
        .eq('catalogo_id', catalogo_id)

      if (dadosError) {
        console.error(`Erro ao atualizar dados do item ${item.item.id}:`, dadosError)
      } else {
        totalAtualizados++
      }
    }

    // 5. Notificar lojistas vinculados via lib (registra em catalogo_atualizacoes;
    //    trigger bumpa catalogo_status_lojista automaticamente).
    let lojistasNotificados = 0

    if (notificar_lojistas) {
      // Lookup de IDs dos itens novos recém-inseridos (batch insert não retorna IDs)
      const novosItemMap = new Map<string, number>()
      if (diff.novos.length > 0) {
        const novosEans = diff.novos.map(p => p.ean).filter(Boolean) as string[]
        const novosCodigos = diff.novos.map(p => p.codigo_fornecedor).filter(Boolean) as string[]
        if (novosEans.length > 0 || novosCodigos.length > 0) {
          let query = supabase
            .from('catalogo_itens')
            .select('id, ean, codigo')
            .eq('catalogo_id', catalogo_id)
            .eq('ativo', true)
          if (novosEans.length > 0 && novosCodigos.length > 0) {
            query = query.or(`ean.in.(${novosEans.join(',')}),codigo.in.(${novosCodigos.join(',')})`)
          } else if (novosEans.length > 0) {
            query = query.in('ean', novosEans)
          } else {
            query = query.in('codigo', novosCodigos)
          }
          const { data: novosItens } = await query
          for (const item of novosItens || []) {
            if (item.ean) novosItemMap.set(`ean:${item.ean}`, item.id)
            if (item.codigo) novosItemMap.set(`codigo:${item.codigo}`, item.id)
          }
        }
      }

      const mudancas: MudancaCatalogo[] = []
      for (const novo of diff.novos) {
        const id = (novo.ean && novosItemMap.get(`ean:${novo.ean}`))
          || (novo.codigo_fornecedor && novosItemMap.get(`codigo:${novo.codigo_fornecedor}`))
          || null
        mudancas.push({
          tipo: 'novo',
          catalogo_item_id: id,
          dados_antigos: null,
          dados_novos: { nome: novo.nome, ean: novo.ean, preco_base: novo.preco_base },
        })
      }
      for (const item of diff.removidos) {
        mudancas.push({
          tipo: 'removido',
          catalogo_item_id: item.id,
          dados_antigos: { nome: item.nome, preco_base: item.preco_base },
          dados_novos: null,
        })
      }
      for (const item of diff.preco_alterado) {
        mudancas.push({
          tipo: 'preco',
          catalogo_item_id: item.item.id,
          dados_antigos: { preco_base: item.preco_antigo },
          dados_novos: { preco_base: item.preco_novo, variacao_percentual: item.variacao_percentual },
        })
      }
      for (const item of diff.dados_alterados) {
        const antigos: Record<string, unknown> = {}
        const novosD: Record<string, unknown> = {}
        for (const m of item.mudancas) {
          antigos[m.campo] = m.antigo
          novosD[m.campo] = m.novo
        }
        mudancas.push({
          tipo: 'dados',
          catalogo_item_id: item.item.id,
          dados_antigos: antigos,
          dados_novos: novosD,
        })
      }

      if (mudancas.length > 0) {
        const r = await notificarLojistas(supabase, catalogo_id, cnpjLimpo, mudancas)
        lojistasNotificados = r.empresasNotificadas
        if (r.erros.length > 0) {
          console.warn('Erros ao notificar lojistas (aplicar-diff):', r.erros)
        }
      }
    }

    return NextResponse.json({
      success: true,
      novos: totalNovos,
      removidos: totalRemovidos,
      atualizados: totalAtualizados,
      lojistas_notificados: lojistasNotificados,
    })
  } catch (error) {
    console.error('Erro ao aplicar diff:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
