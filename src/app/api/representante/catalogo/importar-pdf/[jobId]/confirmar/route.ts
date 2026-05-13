import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authRepresentanteCatalogo, isNextResponse } from '@/lib/representante-catalogo-auth'
import type { ProdutoExtraido } from '@/lib/catalogo-pdf-extractor'
import { notificarLojistas, type MudancaCatalogo } from '@/lib/catalogo-notificacoes'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const ctx = await authRepresentanteCatalogo(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpj: cnpjLimpo } = ctx

    const { jobId } = await params
    const id = Number(jobId)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const produtos: ProdutoExtraido[] = body.produtos
    if (!Array.isArray(produtos) || produtos.length === 0) {
      return NextResponse.json({ error: 'Lista de produtos obrigatoria' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: job, error: jobError } = await supabase
      .from('catalogo_import_jobs')
      .select('id, catalogo_id, status')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
    }

    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj')
      .eq('id', job.catalogo_id)
      .single()

    if (!catalogo || catalogo.cnpj !== cnpjLimpo) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const catalogoId = catalogo.id

    const eans = produtos.map(p => p.ean).filter(Boolean) as string[]
    const codigos = produtos.map(p => p.codigo_fornecedor).filter(Boolean) as string[]

    type ExistingInfo = { id: number; preco_base: number | null }
    const existingByEan = new Map<string, ExistingInfo>()
    const existingByCodigo = new Map<string, ExistingInfo>()

    if (eans.length > 0) {
      const { data: byEan } = await supabase
        .from('catalogo_itens')
        .select('id, ean, preco_base')
        .eq('catalogo_id', catalogoId)
        .in('ean', eans)

      for (const item of byEan || []) {
        if (item.ean) existingByEan.set(item.ean, { id: item.id, preco_base: item.preco_base })
      }
    }

    if (codigos.length > 0) {
      const { data: byCodigo } = await supabase
        .from('catalogo_itens')
        .select('id, codigo, preco_base')
        .eq('catalogo_id', catalogoId)
        .in('codigo', codigos)

      for (const item of byCodigo || []) {
        if (item.codigo) existingByCodigo.set(item.codigo, { id: item.id, preco_base: item.preco_base })
      }
    }

    const seenKeys = new Set<string>()
    const produtosDedup = produtos.filter(p => {
      const key = p.ean || p.codigo_fornecedor || p.nome
      if (!key || seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    const inserts: Array<{ row: Record<string, unknown>; produto: ProdutoExtraido }> = []
    const updates: Array<{ id: number; data: Record<string, unknown>; preco_antigo: number | null; produto: ProdutoExtraido }> = []

    for (const produto of produtosDedup) {
      let existing: ExistingInfo | null = null

      if (produto.ean && existingByEan.has(produto.ean)) {
        existing = existingByEan.get(produto.ean)!
      } else if (produto.codigo_fornecedor && existingByCodigo.has(produto.codigo_fornecedor)) {
        existing = existingByCodigo.get(produto.codigo_fornecedor)!
      }

      const rawIpc = produto.itens_por_caixa
      const itensCaixa = rawIpc != null && !isNaN(Number(rawIpc)) ? Math.max(1, Math.round(Number(rawIpc))) : null
      const precoBase = produto.preco_base != null ? Math.round(Number(produto.preco_base) * 100) / 100 : 0
      const bonif = produto.bonificacao != null && !isNaN(Number(produto.bonificacao)) ? Math.round(Number(produto.bonificacao)) : null

      const itemData: Record<string, unknown> = {
        codigo: produto.codigo_fornecedor || null,
        nome: produto.nome,
        ean: produto.ean || null,
        ncm: produto.ncm || null,
        marca: produto.marca || null,
        unidade: produto.unidade || 'UN',
        itens_por_caixa: itensCaixa,
        preco_base: isNaN(precoBase) ? 0 : precoBase,
        bonificacao: bonif,
        categoria: produto.categoria || null,
        ativo: true,
      }

      if (existing) {
        updates.push({ id: existing.id, data: itemData, preco_antigo: existing.preco_base, produto })
      } else {
        inserts.push({ row: { catalogo_id: catalogoId, ...itemData }, produto })
      }
    }

    let novos = 0
    if (inserts.length > 0) {
      const rowsToInsert = inserts.map(i => i.row)
      for (let i = 0; i < rowsToInsert.length; i += 500) {
        const batch = rowsToInsert.slice(i, i + 500)
        const { error: insertError } = await supabase
          .from('catalogo_itens')
          .insert(batch)

        if (insertError) {
          console.error('Erro ao inserir itens (batch):', insertError)
        } else {
          novos += batch.length
        }
      }
    }

    let atualizados = 0
    for (const item of updates) {
      const { error: updateError } = await supabase
        .from('catalogo_itens')
        .update(item.data)
        .eq('id', item.id)
        .eq('catalogo_id', catalogoId)

      if (!updateError) atualizados++
    }

    await supabase
      .from('catalogo_import_jobs')
      .update({ status: 'completed' })
      .eq('id', job.id)

    try {
      const insertedEans = inserts.map(i => i.produto.ean).filter(Boolean) as string[]
      const insertedCodigos = inserts.map(i => i.produto.codigo_fornecedor).filter(Boolean) as string[]
      const insertedIdMap = new Map<string, number>()
      if (insertedEans.length > 0 || insertedCodigos.length > 0) {
        let q = supabase
          .from('catalogo_itens')
          .select('id, ean, codigo')
          .eq('catalogo_id', catalogoId)
        if (insertedEans.length > 0 && insertedCodigos.length > 0) {
          q = q.or(`ean.in.(${insertedEans.join(',')}),codigo.in.(${insertedCodigos.join(',')})`)
        } else if (insertedEans.length > 0) {
          q = q.in('ean', insertedEans)
        } else {
          q = q.in('codigo', insertedCodigos)
        }
        const { data: rows } = await q
        for (const r of rows || []) {
          if (r.ean) insertedIdMap.set(`ean:${r.ean}`, r.id)
          if (r.codigo) insertedIdMap.set(`codigo:${r.codigo}`, r.id)
        }
      }

      const mudancas: MudancaCatalogo[] = []
      for (const ins of inserts) {
        const idIns = (ins.produto.ean && insertedIdMap.get(`ean:${ins.produto.ean}`))
          || (ins.produto.codigo_fornecedor && insertedIdMap.get(`codigo:${ins.produto.codigo_fornecedor}`))
          || null
        mudancas.push({
          tipo: 'novo',
          catalogo_item_id: idIns,
          dados_antigos: null,
          dados_novos: {
            nome: ins.produto.nome,
            ean: ins.produto.ean,
            codigo: ins.produto.codigo_fornecedor,
            preco_base: ins.row.preco_base
          }
        })
      }
      for (const upd of updates) {
        const precoNovo = Number(upd.data.preco_base ?? 0)
        const precoAntigo = upd.preco_antigo ?? 0
        const precoMudou = upd.preco_antigo != null && Math.abs(precoAntigo - precoNovo) > 0.001
        mudancas.push({
          tipo: precoMudou ? 'preco' : 'dados',
          catalogo_item_id: upd.id,
          dados_antigos: { preco_base: upd.preco_antigo },
          dados_novos: {
            nome: upd.produto.nome,
            ean: upd.produto.ean,
            preco_base: precoNovo
          }
        })
      }

      if (mudancas.length > 0) {
        const r = await notificarLojistas(supabase, catalogoId, cnpjLimpo, mudancas)
        if (r.erros.length > 0) {
          console.warn('Erros ao notificar lojistas (PDF representante):', r.erros)
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar lojistas (nao bloqueante, PDF representante):', notifyErr)
    }

    return NextResponse.json({
      success: true,
      total: produtosDedup.length,
      novos,
      atualizados,
      duplicados_removidos: produtos.length - produtosDedup.length,
    })
  } catch (error) {
    console.error('Erro ao confirmar importacao (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
