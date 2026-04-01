import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const tabelaId = Number(id)

    if (isNaN(tabelaId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = await request.json()
    const { target_empresa_ids } = body

    if (!target_empresa_ids || !Array.isArray(target_empresa_ids) || target_empresa_ids.length === 0) {
      return NextResponse.json({ error: 'target_empresa_ids obrigatorio (array de IDs)' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // -------------------------------------------------------
    // 1. Buscar todas as instancias do fornecedor por CNPJ
    // -------------------------------------------------------
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', cnpjLimpo)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const fornecedorIds = fornecedores.map(f => f.id)

    // -------------------------------------------------------
    // 2. Validar ownership da tabela de origem
    // -------------------------------------------------------
    const { data: sourceTabela, error: tabelaError } = await supabase
      .from('tabelas_preco')
      .select('*')
      .eq('id', tabelaId)
      .in('fornecedor_id', fornecedorIds)
      .single()

    if (tabelaError || !sourceTabela) {
      return NextResponse.json({ error: 'Tabela nao encontrada' }, { status: 404 })
    }

    // -------------------------------------------------------
    // 3. Validar target_empresa_ids
    // -------------------------------------------------------
    const fornecedorEmpresaIds = fornecedores.map(f => f.empresa_id)

    // Cada target deve ser uma empresa que o fornecedor atende
    const invalidTargets = target_empresa_ids.filter(id => !fornecedorEmpresaIds.includes(id))
    if (invalidTargets.length > 0) {
      return NextResponse.json(
        { error: `Fornecedor nao vinculado as empresas: ${invalidTargets.join(', ')}` },
        { status: 403 }
      )
    }

    // -------------------------------------------------------
    // 4. Buscar dados da tabela de origem (itens + GTINs)
    // -------------------------------------------------------
    const { data: sourceItens } = await supabase
      .from('itens_tabela_preco')
      .select('*')
      .eq('tabela_preco_id', tabelaId)
      .order('created_at', { ascending: true })

    const itens = sourceItens || []

    // Buscar GTINs dos produtos vinculados
    const produtoIdsComValor = itens
      .filter(item => item.produto_id != null)
      .map(item => item.produto_id as number)

    let gtinMap = new Map<number, string | null>()
    if (produtoIdsComValor.length > 0) {
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, gtin')
        .in('id', produtoIdsComValor)

      if (produtos) {
        for (const p of produtos) {
          gtinMap.set(p.id, p.gtin || null)
        }
      }
    }

    // Buscar nomes das empresas alvo
    const { data: empresasAlvo } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .in('id', target_empresa_ids)

    const empresaMap = new Map(
      (empresasAlvo || []).map(e => [e.id, e])
    )

    // -------------------------------------------------------
    // 5. Duplicar para cada empresa alvo
    // -------------------------------------------------------
    const resultados: {
      empresa_id: number
      empresa_nome: string
      tabela_id: number
      itens_copiados: number
      itens_sem_match: number
    }[] = []

    for (const targetEmpresaId of target_empresa_ids) {
      // a. Encontrar fornecedor_id para esta empresa
      const targetFornecedor = fornecedores.find(f => f.empresa_id === targetEmpresaId)
      if (!targetFornecedor) continue // ja validado acima, mas safety check

      const empresaInfo = empresaMap.get(targetEmpresaId)
      const empresaNome = empresaInfo?.nome_fantasia || empresaInfo?.razao_social || ''

      // b. Criar nova tabela de preco
      const { data: novaTabela, error: createError } = await supabase
        .from('tabelas_preco')
        .insert({
          fornecedor_id: targetFornecedor.id,
          empresa_id: targetEmpresaId,
          nome: targetEmpresaId === sourceTabela.empresa_id
            ? `${sourceTabela.nome} - Copia`
            : `${sourceTabela.nome} - ${empresaNome}`,
          vigencia_inicio: sourceTabela.vigencia_inicio,
          vigencia_fim: sourceTabela.vigencia_fim,
          observacao: sourceTabela.observacao,
          status: 'ativa',
        })
        .select()
        .single()

      if (createError || !novaTabela) {
        console.error(`Erro ao criar tabela para empresa ${targetEmpresaId}:`, createError)
        continue
      }

      // c. Mapear itens via GTIN
      let itensCopiados = 0
      let itensSemMatch = 0

      if (itens.length > 0) {
        // Coletar GTINs unicos para buscar produtos na empresa alvo
        const gtinsUnicos = new Set<string>()
        for (const item of itens) {
          if (item.produto_id != null) {
            const gtin = gtinMap.get(item.produto_id)
            if (gtin) gtinsUnicos.add(gtin)
          }
        }

        // Buscar produtos na empresa alvo por GTIN
        let targetProdutoMap = new Map<string, number>()
        if (gtinsUnicos.size > 0) {
          const { data: targetProdutos } = await supabase
            .from('produtos')
            .select('id, gtin')
            .eq('empresa_id', targetEmpresaId)
            .in('gtin', Array.from(gtinsUnicos))

          if (targetProdutos) {
            for (const p of targetProdutos) {
              if (p.gtin) {
                targetProdutoMap.set(p.gtin, p.id)
              }
            }
          }
        }

        // Montar itens para inserir
        const itensToInsert = itens.map(item => {
          let targetProdutoId: number | null = null
          let matched = false

          if (item.produto_id != null) {
            const gtin = gtinMap.get(item.produto_id)
            if (gtin && targetProdutoMap.has(gtin)) {
              targetProdutoId = targetProdutoMap.get(gtin)!
              matched = true
            }
          }

          if (item.produto_id != null && !matched) {
            itensSemMatch++
          }

          return {
            tabela_preco_id: novaTabela.id,
            produto_id: targetProdutoId,
            codigo: item.codigo || null,
            nome: item.nome || null,
            unidade: item.unidade || null,
            itens_por_caixa: item.itens_por_caixa || null,
            preco_original: item.preco_original || null,
            preco_tabela: item.preco_tabela,
            desconto_percentual: item.desconto_percentual || null,
          }
        })

        const { error: insertItensError } = await supabase
          .from('itens_tabela_preco')
          .insert(itensToInsert)

        if (insertItensError) {
          console.error(`Erro ao inserir itens para tabela ${novaTabela.id}:`, insertItensError)
          // Tabela foi criada mas itens falharam - reportar com 0 itens
          resultados.push({
            empresa_id: targetEmpresaId,
            empresa_nome: empresaNome,
            tabela_id: novaTabela.id,
            itens_copiados: 0,
            itens_sem_match: 0,
          })
          continue
        }

        itensCopiados = itensToInsert.length
      }

      resultados.push({
        empresa_id: targetEmpresaId,
        empresa_nome: empresaNome,
        tabela_id: novaTabela.id,
        itens_copiados: itensCopiados,
        itens_sem_match: itensSemMatch,
      })
    }

    return NextResponse.json({
      success: true,
      resultados,
    })
  } catch (error) {
    console.error('Erro ao duplicar tabela de preco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
