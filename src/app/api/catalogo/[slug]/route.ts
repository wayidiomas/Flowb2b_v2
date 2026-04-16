import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria') || ''
    const search = searchParams.get('search') || ''
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = 50
    const offset = (page - 1) * limit

    // Fetch catalog by slug
    const { data: catalogo, error } = await supabase
      .from('catalogo_fornecedor')
      .select('id, nome, cnpj, slug, logo_url, banner_url, cor_primaria, descricao, whatsapp, publico')
      .eq('slug', slug)
      .eq('status', 'ativo')
      .single()

    if (error || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    if (!catalogo.publico) {
      return NextResponse.json({ error: 'Este catalogo nao esta publico' }, { status: 403 })
    }

    // Fetch items with pagination
    let query = supabase
      .from('catalogo_itens')
      .select('id, codigo, nome, marca, unidade, itens_por_caixa, preco_base, imagem_url, categoria, descricao_produto, destaque', { count: 'exact' })
      .eq('catalogo_id', catalogo.id)
      .eq('ativo', true)

    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    if (search) {
      const sanitized = search.replace(/[,%()\.]/g, '')
      if (sanitized) {
        query = query.or(`nome.ilike.%${sanitized}%,codigo.ilike.%${sanitized}%`)
      }
    }

    // Order: destaques first, then by name
    query = query
      .order('destaque', { ascending: false })
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: itens, count, error: itensError } = await query

    if (itensError) {
      console.error('Erro ao buscar itens do catalogo:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
    }

    // Get distinct categories for filter
    const { data: categoriasRaw } = await supabase
      .from('catalogo_itens')
      .select('categoria')
      .eq('catalogo_id', catalogo.id)
      .eq('ativo', true)
      .not('categoria', 'is', null)

    const categorias = [...new Set((categoriasRaw || []).map(c => c.categoria).filter(Boolean))].sort()

    // Deduplicate items by codigo
    const seen = new Set<string>()
    const itensDedup = (itens || []).filter(item => {
      const key = item.codigo || `id-${item.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      catalogo: {
        nome: catalogo.nome,
        slug: catalogo.slug,
        logo_url: catalogo.logo_url,
        banner_url: catalogo.banner_url,
        cor_primaria: catalogo.cor_primaria || '#336FB6',
        descricao: catalogo.descricao,
        whatsapp: catalogo.whatsapp,
      },
      itens: itensDedup,
      categorias,
      total: count || 0, // paginacao usa count bruto (PostgREST count:exact)
      page,
      limit,
    })
  } catch (error) {
    console.error('Erro catalogo publico:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
