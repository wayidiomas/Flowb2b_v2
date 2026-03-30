import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const fornecedorId = searchParams.get('fornecedor_id')
    const search = searchParams.get('search')
    const marca = searchParams.get('marca')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const offset = (page - 1) * limit

    // Se sem fornecedor_id: listar fornecedores que têm catálogo ativo e vendem para esta empresa
    if (!fornecedorId) {
      // Buscar fornecedores vinculados a esta empresa
      const { data: fornecedores, error: fornError } = await supabase
        .from('fornecedores')
        .select('id, cnpj, nome, nome_fantasia')
        .eq('empresa_id', user.empresaId)

      if (fornError) {
        console.error('Erro ao buscar fornecedores:', fornError)
        return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
      }

      if (!fornecedores || fornecedores.length === 0) {
        return NextResponse.json({ fornecedores: [] })
      }

      // Buscar catálogos ativos
      const { data: catalogos } = await supabase
        .from('catalogo_fornecedor')
        .select('id, cnpj, nome')
        .eq('status', 'ativo')

      if (!catalogos || catalogos.length === 0) {
        return NextResponse.json({ fornecedores: [] })
      }

      // Cruzar: fornecedores desta empresa que têm catálogo ativo
      const catalogoCnpjMap = new Map(catalogos.map(c => [cleanCnpj(c.cnpj), c as { id: number; cnpj: string; nome: string }]))

      const fornecedoresComCatalogo = fornecedores
        .filter(f => {
          const cnpjLimpo = cleanCnpj(f.cnpj || '')
          return catalogoCnpjMap.has(cnpjLimpo)
        })
        .map(f => {
          const cnpjLimpo = cleanCnpj(f.cnpj || '')
          const cat = catalogoCnpjMap.get(cnpjLimpo)!
          return {
            fornecedor_id: f.id,
            cnpj: f.cnpj,
            nome: f.nome_fantasia || f.nome,
            catalogo_id: cat.id,
            catalogo_nome: cat.nome,
          }
        })

      // Buscar quais fornecedores têm tabela de preço ativa para esta empresa
      const fornecedorIdsList = fornecedoresComCatalogo.map(f => f.fornecedor_id)
      let tabelasAtivasSet = new Set<number>()
      if (fornecedorIdsList.length > 0) {
        const { data: tabelasAtivas } = await supabase
          .from('tabelas_preco')
          .select('fornecedor_id')
          .in('fornecedor_id', fornecedorIdsList)
          .eq('empresa_id', user.empresaId)
          .eq('status', 'ativa')

        if (tabelasAtivas) {
          tabelasAtivasSet = new Set(tabelasAtivas.map(t => t.fornecedor_id))
        }
      }

      const fornecedoresComInfo = fornecedoresComCatalogo.map(f => ({
        ...f,
        tem_tabela_ativa: tabelasAtivasSet.has(f.fornecedor_id),
      }))

      return NextResponse.json({ fornecedores: fornecedoresComInfo })
    }

    // Com fornecedor_id: listar itens do catálogo com preço aplicável
    const { data: fornecedor, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, cnpj, nome, nome_fantasia')
      .eq('id', Number(fornecedorId))
      .eq('empresa_id', user.empresaId)
      .single()

    if (fornError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const cnpjLimpo = cleanCnpj(fornecedor.cnpj || '')

    // Buscar catálogo do fornecedor
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .eq('status', 'ativo')
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado para este fornecedor' }, { status: 404 })
    }

    // Buscar itens do catálogo para esta empresa
    let query = supabase
      .from('catalogo_itens')
      .select('*', { count: 'exact' })
      .eq('catalogo_id', catalogo.id)
      .eq('empresa_id', user.empresaId)
      .eq('ativo', true)

    if (search) {
      const sanitized = search.replace(/[,%()\.]/g, '')
      if (sanitized) {
        query = query.or(`nome.ilike.%${sanitized}%,codigo.ilike.%${sanitized}%`)
      }
    }
    if (marca) {
      query = query.ilike('marca', `%${marca}%`)
    }

    query = query.order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: itens, error: itensError, count } = await query

    if (itensError) {
      console.error('Erro ao buscar itens do catalogo:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
    }

    // Buscar overrides de preço para esta empresa
    let itensComPreco = (itens || []).map(item => ({
      ...item,
      preco_aplicavel: item.preco_base,
      desconto_percentual: null as number | null,
      tem_preco_customizado: false,
      preco_tabela: null as number | null,
      desconto_tabela: null as number | null,
    }))

    if (itens && itens.length > 0) {
      const itemIds = itens.map(i => i.id)
      const { data: precos } = await supabase
        .from('catalogo_precos_lojista')
        .select('catalogo_item_id, preco_customizado, desconto_percentual, ativo')
        .in('catalogo_item_id', itemIds)
        .eq('empresa_id', user.empresaId)

      if (precos && precos.length > 0) {
        const precoMap = new Map(precos.map(p => [p.catalogo_item_id, p as { catalogo_item_id: number; preco_customizado: number | null; desconto_percentual: number | null; ativo: boolean }]))

        itensComPreco = itensComPreco
          .map(item => {
            const override = precoMap.get(item.id)
            if (!override) return item
            // Se override marcou ativo=false, excluir da lista
            if (override.ativo === false) return null
            return {
              ...item,
              preco_aplicavel: override.preco_customizado ?? item.preco_base,
              desconto_percentual: override.desconto_percentual,
              tem_preco_customizado: override.preco_customizado !== null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      }
    }

    // Buscar tabela de preço ativa para este fornecedor + empresa
    const { data: tabelaAtiva } = await supabase
      .from('tabelas_preco')
      .select('id')
      .eq('fornecedor_id', Number(fornecedorId))
      .eq('empresa_id', user.empresaId)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let temTabelaAtiva = false
    if (tabelaAtiva) {
      temTabelaAtiva = true
      const { data: itensTabela } = await supabase
        .from('itens_tabela_preco')
        .select('produto_id, preco_tabela, desconto_percentual')
        .eq('tabela_preco_id', tabelaAtiva.id)

      if (itensTabela && itensTabela.length > 0) {
        const precosTabelaMap = new Map<number, { preco_tabela: number | null; desconto_percentual: number | null }>()
        for (const it of itensTabela) {
          if (it.produto_id) precosTabelaMap.set(it.produto_id, it)
        }

        itensComPreco = itensComPreco.map(item => {
          const precoTabela = item.produto_id ? precosTabelaMap.get(item.produto_id) : null
          return {
            ...item,
            preco_tabela: precoTabela?.preco_tabela ?? null,
            desconto_tabela: precoTabela?.desconto_percentual ?? null,
          }
        })
      }
    }

    return NextResponse.json({
      itens: itensComPreco,
      total: count || 0,
      page,
      limit,
      tem_tabela_ativa: temTabelaAtiva,
      fornecedor: {
        id: fornecedor.id,
        nome: fornecedor.nome_fantasia || fornecedor.nome,
        cnpj: fornecedor.cnpj,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar catalogo do lojista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
