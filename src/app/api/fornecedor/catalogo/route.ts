import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)

    const { data: catalogo, error } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome, status, created_at, updated_at, slug, logo_url, banner_url, cor_primaria, descricao, whatsapp, publico')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar catalogo:', error)
      return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
    }

    if (!catalogo) {
      return NextResponse.json({ catalogo: null, exists: false })
    }

    // Contar itens
    const { count } = await supabase
      .from('catalogo_itens')
      .select('id', { count: 'exact', head: true })
      .eq('catalogo_id', catalogo.id)

    return NextResponse.json({
      catalogo,
      exists: true,
      total_itens: count || 0,
    })
  } catch (error) {
    console.error('Erro ao buscar catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    let catalogo: { id: number; cnpj?: string; nome?: string } | null = null

    if (existing) {
      // Catálogo existe — verificar se está vazio para repopular
      const { count } = await supabase
        .from('catalogo_itens')
        .select('id', { count: 'exact', head: true })
        .eq('catalogo_id', existing.id)

      if (count && count > 0) {
        return NextResponse.json({ error: 'Catalogo ja existe e possui itens. Use o botao Sincronizar para atualizar.' }, { status: 409 })
      }

      // Catálogo vazio — vamos populá-lo
      catalogo = existing
    }

    if (!catalogo) {
      // Buscar nome do fornecedor para preencher o catálogo
      const { data: fornecedorRef } = await supabase
        .from('fornecedores')
        .select('nome, nome_fantasia')
        .eq('cnpj', cnpjLimpo)
        .limit(1)
        .single()

      // Criar catálogo
      const { data: novoCatalogo, error: createError } = await supabase
        .from('catalogo_fornecedor')
        .insert({
          cnpj: cnpjLimpo,
          nome: fornecedorRef?.nome_fantasia || fornecedorRef?.nome || 'Catalogo',
          status: 'ativo',
        })
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar catalogo:', createError)
        return NextResponse.json({ error: 'Erro ao criar catalogo' }, { status: 500 })
      }
      catalogo = novoCatalogo
    }

    if (!catalogo) {
      return NextResponse.json({ error: 'Erro ao criar/encontrar catalogo' }, { status: 500 })
    }

    // Auto-popular: buscar todos fornecedores com este CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', cnpjLimpo)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ catalogo, total_itens: 0 }, { status: 201 })
    }

    // Para cada fornecedor, buscar produtos via fornecedores_produtos
    const itensToInsert: Array<{
      catalogo_id: number
      produto_id: number
      empresa_id: number
      codigo: string | null
      nome: string | null
      marca: string | null
      unidade: string | null
      itens_por_caixa: number | null
      preco_base: number | null
      ativo: boolean
    }> = []
    const seen = new Set<string>()

    for (const forn of fornecedores) {
      const { data: produtos } = await supabase
        .from('fornecedores_produtos')
        .select(`
          produto_id, empresa_id, valor_de_compra, codigo_fornecedor,
          produtos!inner(id, codigo, nome, marca, unidade, itens_por_caixa)
        `)
        .eq('fornecedor_id', forn.id)
        .eq('empresa_id', forn.empresa_id)

      if (!produtos) continue

      for (const item of produtos) {
        const prod = item.produtos as any
        const key = `${item.produto_id}-${item.empresa_id}`
        if (seen.has(key)) continue
        seen.add(key)

        itensToInsert.push({
          catalogo_id: catalogo.id,
          produto_id: item.produto_id,
          empresa_id: item.empresa_id,
          codigo: item.codigo_fornecedor || prod.codigo || null,
          nome: prod.nome || null,
          marca: prod.marca || null,
          unidade: prod.unidade || null,
          itens_por_caixa: prod.itens_por_caixa || null,
          preco_base: item.valor_de_compra ?? 0,
          ativo: true,
        })
      }
    }

    let totalItens = 0
    if (itensToInsert.length > 0) {
      // Inserir em batches de 500
      for (let i = 0; i < itensToInsert.length; i += 500) {
        const batch = itensToInsert.slice(i, i + 500)
        const { error: insertError } = await supabase
          .from('catalogo_itens')
          .insert(batch)

        if (insertError) {
          console.error('Erro ao inserir itens do catalogo (batch):', insertError)
        } else {
          totalItens += batch.length
        }
      }
    }

    return NextResponse.json({ catalogo, total_itens: totalItens }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}
