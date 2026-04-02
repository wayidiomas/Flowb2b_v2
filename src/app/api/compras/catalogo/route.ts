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
    const catalogoId = searchParams.get('catalogo_id')
    const tabelaId = searchParams.get('tabela_id')
    const search = searchParams.get('search')
    const marca = searchParams.get('marca')
    const filtro = searchParams.get('filtro') // 'todos' | 'meus' | 'novos'
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const offset = (page - 1) * limit

    // Se sem fornecedor_id e sem catalogo_id: listar fornecedores que têm catálogo ativo
    if (!fornecedorId && !catalogoId) {
      // Buscar fornecedores vinculados a esta empresa
      const { data: fornecedores, error: fornError } = await supabase
        .from('fornecedores')
        .select('id, cnpj, nome, nome_fantasia')
        .eq('empresa_id', user.empresaId)

      if (fornError) {
        console.error('Erro ao buscar fornecedores:', fornError)
        return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
      }

      // Buscar catálogos ativos
      const { data: catalogos } = await supabase
        .from('catalogo_fornecedor')
        .select('id, cnpj, nome')
        .eq('status', 'ativo')

      if (!catalogos || catalogos.length === 0) {
        return NextResponse.json({ fornecedores: [] })
      }

      // Mapear CNPJs dos fornecedores vinculados
      const fornecedoresCnpjMap = new Map((fornecedores || []).map(f => [cleanCnpj(f.cnpj || ''), f]))

      // Cruzar catálogos com fornecedores vinculados e identificar os não vinculados
      const catalogoCnpjMap = new Map(catalogos.map(c => [cleanCnpj(c.cnpj), c as { id: number; cnpj: string; nome: string }]))

      const fornecedoresResult: Array<{
        fornecedor_id: number | null
        cnpj: string
        nome: string
        catalogo_id: number
        catalogo_nome: string
        vinculado: boolean
      }> = []

      // Fornecedores vinculados que têm catálogo
      for (const f of (fornecedores || [])) {
        const cnpjLimpo = cleanCnpj(f.cnpj || '')
        const cat = catalogoCnpjMap.get(cnpjLimpo)
        if (cat) {
          fornecedoresResult.push({
            fornecedor_id: f.id,
            cnpj: f.cnpj,
            nome: f.nome_fantasia || f.nome,
            catalogo_id: cat.id,
            catalogo_nome: cat.nome,
            vinculado: true,
          })
        }
      }

      // Catálogos de fornecedores NÃO vinculados a esta empresa
      for (const cat of catalogos) {
        const cnpjLimpo = cleanCnpj(cat.cnpj)
        if (!fornecedoresCnpjMap.has(cnpjLimpo)) {
          fornecedoresResult.push({
            fornecedor_id: null,
            cnpj: cat.cnpj,
            nome: cat.nome,
            catalogo_id: cat.id,
            catalogo_nome: cat.nome,
            vinculado: false,
          })
        }
      }

      // Buscar quais fornecedores vinculados têm tabela de preço ativa para esta empresa
      const fornecedorIdsList = fornecedoresResult.filter(f => f.fornecedor_id !== null).map(f => f.fornecedor_id as number)
      let tabelasAtivasSet = new Set<number>()
      const tabelasCountMap = new Map<number, number>()
      if (fornecedorIdsList.length > 0) {
        const { data: tabelasAtivas } = await supabase
          .from('tabelas_preco')
          .select('fornecedor_id')
          .in('fornecedor_id', fornecedorIdsList)
          .eq('empresa_id', user.empresaId)
          .eq('status', 'ativa')

        if (tabelasAtivas) {
          tabelasAtivasSet = new Set(tabelasAtivas.map(t => t.fornecedor_id))
          for (const t of tabelasAtivas) {
            tabelasCountMap.set(t.fornecedor_id, (tabelasCountMap.get(t.fornecedor_id) || 0) + 1)
          }
        }
      }

      // 5. Verificar solicitações pendentes para catálogos não vinculados
      const catalogoIdsNaoVinculados = fornecedoresResult
        .filter(f => !f.vinculado)
        .map(f => f.catalogo_id)

      let solicitacoesPendentesSet = new Set<number>()
      if (catalogoIdsNaoVinculados.length > 0) {
        const { data: solicitacoes } = await supabase
          .from('solicitacoes_atendimento')
          .select('catalogo_fornecedor_id')
          .eq('empresa_id', user.empresaId)
          .in('catalogo_fornecedor_id', catalogoIdsNaoVinculados)
          .eq('status', 'pendente')

        if (solicitacoes) {
          solicitacoesPendentesSet = new Set(solicitacoes.map(s => s.catalogo_fornecedor_id))
        }
      }

      const fornecedoresComInfo = fornecedoresResult.map(f => ({
        ...f,
        tem_tabela_ativa: f.fornecedor_id ? tabelasAtivasSet.has(f.fornecedor_id) : false,
        tabelas_ativas_count: f.fornecedor_id ? (tabelasCountMap.get(f.fornecedor_id) || 0) : 0,
        solicitacao_pendente: !f.vinculado ? solicitacoesPendentesSet.has(f.catalogo_id) : false,
      }))

      // Ordenar: vinculados primeiro, depois não vinculados, ambos alfabeticamente
      fornecedoresComInfo.sort((a, b) => {
        if (a.vinculado && !b.vinculado) return -1
        if (!a.vinculado && b.vinculado) return 1
        return a.nome.localeCompare(b.nome)
      })

      return NextResponse.json({ fornecedores: fornecedoresComInfo })
    }

    // Com fornecedor_id ou catalogo_id: listar itens do catálogo com preço aplicável
    let fornecedorVinculado: { id: number; cnpj: string; nome: string; nome_fantasia: string | null } | null = null
    let catalogoDbId: number | null = null
    let isVinculado = false
    let catalogoNome: string | null = null

    if (fornecedorId) {
      // Fornecedor vinculado: buscar pelo ID vinculado a esta empresa
      const { data: fornData, error: fornErr } = await supabase
        .from('fornecedores')
        .select('id, cnpj, nome, nome_fantasia')
        .eq('id', Number(fornecedorId))
        .eq('empresa_id', user.empresaId)
        .single()

      if (fornErr || !fornData) {
        return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
      }
      fornecedorVinculado = fornData
      isVinculado = true

      const cnpjLimpo = cleanCnpj(fornData.cnpj || '')
      const { data: catData } = await supabase
        .from('catalogo_fornecedor')
        .select('id, nome')
        .eq('cnpj', cnpjLimpo)
        .eq('status', 'ativo')
        .single()

      if (!catData) {
        return NextResponse.json({ error: 'Catalogo nao encontrado para este fornecedor' }, { status: 404 })
      }
      catalogoDbId = catData.id
      catalogoNome = catData.nome
    } else if (catalogoId) {
      // Acesso por catalogo_id (para fornecedores não vinculados ou acesso direto)
      const { data: catData } = await supabase
        .from('catalogo_fornecedor')
        .select('id, cnpj, nome')
        .eq('id', Number(catalogoId))
        .eq('status', 'ativo')
        .single()

      if (!catData) {
        return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
      }
      catalogoDbId = catData.id
      catalogoNome = catData.nome

      // Verificar se este fornecedor está vinculado a esta empresa
      const cnpjLimpo = cleanCnpj(catData.cnpj)
      const { data: fornData } = await supabase
        .from('fornecedores')
        .select('id, cnpj, nome, nome_fantasia')
        .eq('cnpj', cnpjLimpo)
        .eq('empresa_id', user.empresaId)
        .single()

      if (fornData) {
        fornecedorVinculado = fornData
        isVinculado = true
      }
    } else {
      return NextResponse.json({ error: 'fornecedor_id ou catalogo_id obrigatorio' }, { status: 400 })
    }

    if (!catalogoDbId) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Buscar itens do catálogo
    let query = supabase
      .from('catalogo_itens')
      .select('*')
      .eq('catalogo_id', catalogoDbId)
      .eq('ativo', true)

    // Não filtra por empresa_id: itens do catálogo são do fornecedor e visíveis para todos os lojistas

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

    const { data: itens, error: itensError } = await query

    if (itensError) {
      console.error('Erro ao buscar itens do catalogo:', itensError)
      return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
    }

    // Buscar overrides de preço para esta empresa (apenas para fornecedores vinculados)
    let itensComPreco = (itens || []).map(item => ({
      ...item,
      preco_aplicavel: item.preco_base,
      desconto_percentual: null as number | null,
      tem_preco_customizado: false,
      preco_tabela: null as number | null,
      desconto_tabela: null as number | null,
    }))

    let tabelasAtivas: Array<{ id: number; nome: string; created_at: string; vigencia_fim?: string | null }> = []
    let temTabelaAtiva = false
    let tabelaSelecionada: { id: number; nome: string } | null = null

    if (isVinculado) {
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

      // Buscar todas as tabelas de preço ativas e não expiradas para este fornecedor + empresa
      const { data: tabelasAtivasRaw } = await supabase
        .from('tabelas_preco')
        .select('id, nome, created_at, vigencia_fim')
        .eq('fornecedor_id', fornecedorVinculado!.id)
        .eq('empresa_id', user.empresaId)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })

      // Filtrar tabelas expiradas (vigencia_fim < hoje)
      const hoje = new Date().toISOString().split('T')[0]
      tabelasAtivas = (tabelasAtivasRaw || []).filter(t =>
        !t.vigencia_fim || t.vigencia_fim >= hoje
      )

      temTabelaAtiva = !!(tabelasAtivas && tabelasAtivas.length > 0)

      // Determinar qual tabela usar
      if (tabelaId === '0' || tabelaId === 'none') {
        // User explicitly wants base price (no table)
        tabelaSelecionada = null
      } else if (tabelaId) {
        // User selected a specific table
        tabelaSelecionada = (tabelasAtivas || []).find(t => t.id === Number(tabelaId)) || null
      } else {
        // Default: most recent
        tabelaSelecionada = (tabelasAtivas || [])[0] || null
      }

      if (tabelaSelecionada) {
        const { data: itensTabela } = await supabase
          .from('itens_tabela_preco')
          .select('produto_id, preco_tabela, desconto_percentual')
          .eq('tabela_preco_id', tabelaSelecionada.id)

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
    }

    // Marcar ja_trabalho: verificar quais produto_ids existem em fornecedores_produtos desta empresa
    const produtoIdsFromCatalog = itensComPreco
      .map(i => i.produto_id)
      .filter((id): id is number => id !== null && id !== undefined)

    const meusProdutoIds = new Set<number>()
    if (produtoIdsFromCatalog.length > 0 && isVinculado) {
      const { data: meusProds } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id')
        .in('produto_id', [...new Set(produtoIdsFromCatalog)])
        .eq('empresa_id', user.empresaId)

      for (const mp of meusProds || []) {
        meusProdutoIds.add(mp.produto_id)
      }
    }

    let itensComFlag = itensComPreco.map(item => ({
      ...item,
      ja_trabalho: item.produto_id ? meusProdutoIds.has(item.produto_id) : false,
    }))

    // Aplicar filtro meus/novos
    if (filtro === 'meus') {
      itensComFlag = itensComFlag.filter(i => i.ja_trabalho)
    } else if (filtro === 'novos') {
      itensComFlag = itensComFlag.filter(i => !i.ja_trabalho)
    }

    // Deduplicar itens para catálogos não vinculados ou filtros todos/novos (podem ter itens duplicados entre empresas)
    // Deduplicar itens (podem ter duplicados entre empresas no mesmo catálogo)
    if (itensComFlag.length > 0) {
      const seen = new Map<string, typeof itensComFlag[0]>()
      for (const item of itensComFlag) {
        const key = item.codigo || item.nome || String(item.id)
        if (!seen.has(key)) {
          seen.set(key, item)
        } else {
          const existing = seen.get(key)!
          // Preferir o item que ja_trabalho, senão o de maior preço
          if (item.ja_trabalho && !existing.ja_trabalho) {
            seen.set(key, item)
          } else if (item.preco_base && (!existing.preco_base || item.preco_base > existing.preco_base)) {
            seen.set(key, item)
          }
        }
      }
      itensComFlag = Array.from(seen.values())
    }

    // Paginar em memória após deduplicação
    const totalAfterDedup = itensComFlag.length
    const paginatedItens = itensComFlag.slice(offset, offset + limit)

    return NextResponse.json({
      itens: paginatedItens,
      total: totalAfterDedup,
      page,
      limit,
      vinculado: isVinculado,
      tem_tabela_ativa: temTabelaAtiva,
      tabelas_disponiveis: tabelasAtivas.map(t => ({
        id: t.id,
        nome: t.nome,
        created_at: t.created_at,
      })),
      tabela_selecionada_id: tabelaSelecionada?.id ?? null,
      fornecedor: fornecedorVinculado
        ? {
            id: fornecedorVinculado.id,
            nome: fornecedorVinculado.nome_fantasia || fornecedorVinculado.nome,
            cnpj: fornecedorVinculado.cnpj,
          }
        : null,
      catalogo: {
        id: catalogoDbId,
        nome: catalogoNome,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar catalogo do lojista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
