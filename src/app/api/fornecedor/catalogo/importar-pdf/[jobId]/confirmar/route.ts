import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { ProdutoExtraido } from '@/lib/catalogo-pdf-extractor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

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
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

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

    const existingByEan = new Map<string, number>()
    const existingByCodigo = new Map<string, number>()

    if (eans.length > 0) {
      const { data: byEan } = await supabase
        .from('catalogo_itens')
        .select('id, ean')
        .eq('catalogo_id', catalogoId)
        .in('ean', eans)

      for (const item of byEan || []) {
        if (item.ean) existingByEan.set(item.ean, item.id)
      }
    }

    if (codigos.length > 0) {
      const { data: byCodigo } = await supabase
        .from('catalogo_itens')
        .select('id, codigo')
        .eq('catalogo_id', catalogoId)
        .in('codigo', codigos)

      for (const item of byCodigo || []) {
        if (item.codigo) existingByCodigo.set(item.codigo, item.id)
      }
    }

    // Dedup: se IA extraiu mesmo produto 2x (split entre páginas), manter apenas 1
    const seenKeys = new Set<string>()
    const produtosDedup = produtos.filter(p => {
      const key = p.ean || p.codigo_fornecedor || p.nome
      if (!key || seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    const toInsert: Array<Record<string, unknown>> = []
    const toUpdate: Array<{ id: number; data: Record<string, unknown> }> = []

    for (const produto of produtosDedup) {
      let existingId: number | null = null

      if (produto.ean && existingByEan.has(produto.ean)) {
        existingId = existingByEan.get(produto.ean)!
      } else if (produto.codigo_fornecedor && existingByCodigo.has(produto.codigo_fornecedor)) {
        existingId = existingByCodigo.get(produto.codigo_fornecedor)!
      }

      const itemData: Record<string, unknown> = {
        codigo: produto.codigo_fornecedor || null,
        nome: produto.nome,
        ean: produto.ean || null,
        ncm: produto.ncm || null,
        marca: produto.marca || null,
        unidade: produto.unidade || 'UN',
        itens_por_caixa: produto.itens_por_caixa ?? 1,
        preco_base: produto.preco_base ?? 0,
        bonificacao: produto.bonificacao ?? null,
        categoria: produto.categoria || null,
        ativo: true,
      }

      if (existingId) {
        toUpdate.push({ id: existingId, data: itemData })
      } else {
        toInsert.push({ catalogo_id: catalogoId, ...itemData })
      }
    }

    let novos = 0
    if (toInsert.length > 0) {
      for (let i = 0; i < toInsert.length; i += 500) {
        const batch = toInsert.slice(i, i + 500)
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
    for (const item of toUpdate) {
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

    return NextResponse.json({
      success: true,
      total: produtosDedup.length,
      novos,
      atualizados,
      duplicados_removidos: produtos.length - produtosDedup.length,
    })
  } catch (error) {
    console.error('Erro ao confirmar importacao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
