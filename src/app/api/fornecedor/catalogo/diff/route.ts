import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { calcularDiff } from '@/lib/catalogo-diff'
import type { CatalogoItem } from '@/lib/catalogo-diff'
import type { ProdutoExtraido } from '@/lib/catalogo-pdf-extractor'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { catalogo_id, produtos } = body as { catalogo_id: number; produtos: ProdutoExtraido[] }

    if (!catalogo_id || !Array.isArray(produtos) || produtos.length === 0) {
      return NextResponse.json({ error: 'catalogo_id e produtos obrigatorios' }, { status: 400 })
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

    const { data: itensExistentes, error: itensError } = await supabase
      .from('catalogo_itens')
      .select('id, codigo, nome, ean, marca, unidade, itens_por_caixa, preco_base, ativo')
      .eq('catalogo_id', catalogo_id)
      .eq('ativo', true)

    if (itensError) {
      console.error('Erro ao buscar itens existentes:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens existentes' }, { status: 500 })
    }

    const existentes: CatalogoItem[] = (itensExistentes || []).map(item => ({
      id: item.id,
      codigo: item.codigo,
      nome: item.nome,
      ean: item.ean,
      marca: item.marca,
      unidade: item.unidade,
      itens_por_caixa: item.itens_por_caixa,
      preco_base: item.preco_base,
      ativo: item.ativo,
    }))

    const diff = calcularDiff(existentes, produtos)

    return NextResponse.json({
      diff,
      resumo: {
        novos: diff.novos.length,
        removidos: diff.removidos.length,
        preco_alterado: diff.preco_alterado.length,
        dados_alterados: diff.dados_alterados.length,
        sem_mudanca: diff.sem_mudanca,
      },
    })
  } catch (error) {
    console.error('Erro ao calcular diff:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
