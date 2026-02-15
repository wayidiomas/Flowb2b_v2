import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

interface ProdutoAPI {
  produto_id: number
  id_produto_bling: number
  codigo_do_produto?: string
  nome_produto?: string
  quantidade_vendida: number
  periodo_venda: number
  sugestao_quantidade: number
  valor_total_produto: number
  valor_total_produto_com_desconto: number
  estoque_atual: number
  itens_por_caixa: number
  valor_de_compra?: number
}

interface PoliticaAPI {
  politica_id: number
  melhor_politica: boolean
  produtos: ProdutoAPI[]
  valor_total_pedido_sem_desconto: number
  valor_total_pedido_com_desconto: number
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.empresaId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { fornecedor_id, filtros } = body

    if (!fornecedor_id) {
      return NextResponse.json({ error: 'fornecedor_id obrigatorio' }, { status: 400 })
    }

    const validacaoEanUrl = process.env.VALIDACAO_EAN_URL
    if (!validacaoEanUrl) {
      console.error('VALIDACAO_EAN_URL nao configurada')
      return NextResponse.json(
        { error: 'Servico de calculo nao configurado' },
        { status: 500 }
      )
    }

    // Chamar API externa com timeout de 5 minutos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000)

    try {
      const response = await fetch(
        `${validacaoEanUrl}/calculo_pedido_auto_otimizado/calcular`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fornecedor_id,
            empresa_id: user.empresaId
          }),
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro da API validacao_ean:', response.status, errorText)
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.message) {
        return NextResponse.json({ error: data.message }, { status: 400 })
      }

      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({
          sugestao: [],
          totais: { total_itens: 0, valor_total: 0 },
          message: 'Nenhuma sugestao encontrada'
        })
      }

      const politicasAPI = data as PoliticaAPI[]
      const melhorPolitica = politicasAPI.find(p => p.melhor_politica) || politicasAPI[0]

      if (!melhorPolitica || !melhorPolitica.produtos.length) {
        return NextResponse.json({
          sugestao: [],
          totais: { total_itens: 0, valor_total: 0 }
        })
      }

      // Coletar produto_ids para buscar curvas e demais dados
      const produtoIds = melhorPolitica.produtos.map(p => p.produto_id)

      const supabase = createServerSupabaseClient()

      // Buscar produtos com curvas
      const { data: produtosDB } = await supabase
        .from('produtos')
        .select('id, curva, curva_qtd, estoque_atual, estoque_minimo, gtin')
        .in('id', produtoIds)
        .eq('empresa_id', user.empresaId)

      // Criar mapa de produtos
      const produtosMap = new Map(produtosDB?.map(p => [p.id, p]) || [])

      // Buscar codigo_fornecedor
      const { data: produtosFornecedor } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, codigo_fornecedor')
        .eq('fornecedor_id', fornecedor_id)
        .in('produto_id', produtoIds)
        .not('codigo_fornecedor', 'is', null)

      const codigoFornecedorMap = new Map(
        produtosFornecedor?.map(p => [p.produto_id, p.codigo_fornecedor]) || []
      )

      // Transformar produtos com curvas
      let sugestoes = melhorPolitica.produtos.map((produto: ProdutoAPI) => {
        const produtoDB = produtosMap.get(produto.produto_id)
        const mediaVendaDia = produto.periodo_venda > 0
          ? produto.quantidade_vendida / produto.periodo_venda
          : 0
        const valorUnitario = produto.sugestao_quantidade > 0
          ? produto.valor_total_produto / produto.sugestao_quantidade
          : (produto.valor_de_compra || 0)

        const estoqueAtual = produtoDB?.estoque_atual ?? produto.estoque_atual ?? 0
        const estoqueMinimo = produtoDB?.estoque_minimo ?? 0
        const emRuptura = estoqueAtual <= estoqueMinimo

        return {
          produto_id: produto.produto_id,
          id_produto_bling: produto.id_produto_bling,
          codigo: produto.codigo_do_produto || '-',
          nome: produto.nome_produto || `Produto ${produto.produto_id}`,
          gtin: produtoDB?.gtin || '',
          codigo_fornecedor: codigoFornecedorMap.get(produto.produto_id),
          curva_fat: produtoDB?.curva || 'D',
          curva_qtd: produtoDB?.curva_qtd || 'D',
          em_ruptura: emRuptura,
          estoque_atual: estoqueAtual,
          estoque_minimo: estoqueMinimo,
          media_diaria: Number(mediaVendaDia.toFixed(2)),
          sugestao_qtd: produto.sugestao_quantidade,
          sugestao_caixas: Math.ceil(produto.sugestao_quantidade / (produto.itens_por_caixa || 1)),
          itens_por_caixa: produto.itens_por_caixa || 1,
          valor_unitario: Number(valorUnitario.toFixed(2)),
          valor_total: produto.valor_total_produto
        }
      })

      // Aplicar filtros se fornecidos
      if (filtros) {
        if (filtros.apenas_ruptura) {
          sugestoes = sugestoes.filter(s => s.em_ruptura)
        }
        if (filtros.curvas_fat && filtros.curvas_fat.length > 0) {
          sugestoes = sugestoes.filter(s => filtros.curvas_fat.includes(s.curva_fat))
        }
        if (filtros.curvas_qtd && filtros.curvas_qtd.length > 0) {
          sugestoes = sugestoes.filter(s => filtros.curvas_qtd.includes(s.curva_qtd))
        }

        // Descontar quantidades de pedidos em aberto
        if (filtros.descontar_pedidos_abertos) {
          // Calcular data limite (30 dias atras)
          const dataLimite = new Date()
          dataLimite.setDate(dataLimite.getDate() - 30)
          const dataLimiteStr = dataLimite.toISOString().split('T')[0]

          // 1. Buscar pedido mais recente em aberto do fornecedor (ultimos 30 dias)
          const { data: pedidosAbertos } = await supabase
            .from('pedidos_compra')
            .select('id')
            .eq('fornecedor_id', fornecedor_id)
            .eq('empresa_id', user.empresaId)
            .in('situacao', [0, 3]) // 0=aberto, 3=parcial
            .gte('data', dataLimiteStr)
            .order('data', { ascending: false })
            .limit(1) // Apenas o mais recente

          const pedidoIds = pedidosAbertos?.map(p => p.id) || []

          if (pedidoIds.length > 0) {
            // 2. Buscar itens desses pedidos
            const { data: itensJaPedidos } = await supabase
              .from('itens_pedido_compra')
              .select('produto_id, quantidade')
              .in('pedido_compra_id', pedidoIds)

            // 3. Criar mapa de quantidade ja pedida por produto
            const qtdJaPedidaMap = new Map<number, number>()
            itensJaPedidos?.forEach(item => {
              if (!item.produto_id) return
              const atual = qtdJaPedidaMap.get(item.produto_id) || 0
              qtdJaPedidaMap.set(item.produto_id, atual + (item.quantidade || 0))
            })

            // 4. Descontar de cada sugestao
            sugestoes = sugestoes.map(s => {
              const qtdJaPedida = qtdJaPedidaMap.get(s.produto_id) || 0
              const novaQtd = Math.max(0, s.sugestao_qtd - qtdJaPedida)
              return {
                ...s,
                sugestao_qtd: novaQtd,
                sugestao_caixas: Math.ceil(novaQtd / (s.itens_por_caixa || 1)),
                valor_total: novaQtd * s.valor_unitario,
                qtd_ja_pedida: qtdJaPedida, // Mostrar quanto ja foi pedido
              }
            })

            // 5. Remover itens com sugestao_qtd <= 0 (ja pediu tudo ou mais)
            sugestoes = sugestoes.filter(s => s.sugestao_qtd > 0)
          }
        }
      }

      // Calcular totais
      const totais = {
        total_itens: sugestoes.length,
        valor_total: sugestoes.reduce((sum, s) => sum + s.valor_total, 0),
        total_caixas: sugestoes.reduce((sum, s) => sum + s.sugestao_caixas, 0)
      }

      return NextResponse.json({
        sugestao: sugestoes,
        totais,
        politica_id: melhorPolitica.politica_id
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Tempo limite excedido. Tente novamente.' },
          { status: 504 }
        )
      }

      throw fetchError
    }
  } catch (error) {
    console.error('Erro ao calcular sugestoes:', error)
    return NextResponse.json(
      { error: 'Erro ao calcular sugestoes de compra' },
      { status: 500 }
    )
  }
}
