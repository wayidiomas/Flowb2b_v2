import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { createServerSupabaseClient } from '@/lib/supabase'

// Interface para o produto retornado pela API Python
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

// Interface para a politica retornada pela API Python
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

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const body = await request.json()
    const { fornecedor_id, descontar_pedidos_abertos } = body

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

    // Chamar API externa com timeout de 5 minutos (300000ms)
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

      // A API Python retorna uma lista de politicas de compra
      // Cada politica tem um array de produtos
      // Precisamos encontrar a melhor politica e extrair os produtos

      // Se for um objeto com message, retornar erro
      if (data.message) {
        return NextResponse.json({ error: data.message }, { status: 400 })
      }

      // Se for um array vazio
      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({
          sugestoes: [],
          message: 'Nenhuma sugestao encontrada'
        })
      }

      // A API Python retorna TODAS as politicas que atingiram valor minimo
      // Cada politica tem seus produtos calculados
      const politicasAPI = data as PoliticaAPI[]

      // Coletar todos os produto_ids unicos para buscar gtin
      const todosProduotIds = new Set<number>()
      politicasAPI.forEach(pol => {
        pol.produtos.forEach(p => todosProduotIds.add(p.produto_id))
      })

      // Buscar gtin dos produtos no Supabase
      const supabase = createServerSupabaseClient()
      const { data: produtosGtin } = await supabase
        .from('produtos')
        .select('id, gtin')
        .in('id', Array.from(todosProduotIds))
        .eq('empresa_id', user.empresaId)

      // Criar mapa de produto_id -> gtin
      const gtinMap = new Map<number, string>()
      produtosGtin?.forEach(p => {
        if (p.gtin) gtinMap.set(p.id, p.gtin)
      })

      // Buscar codigo_fornecedor de fornecedores_produtos
      const { data: produtosFornecedor } = await supabase
        .from('fornecedores_produtos')
        .select('produto_id, codigo_fornecedor')
        .eq('fornecedor_id', fornecedor_id)
        .in('produto_id', Array.from(todosProduotIds))
        .not('codigo_fornecedor', 'is', null)

      // Criar mapa de produto_id -> codigo_fornecedor
      const codigoFornecedorMap = new Map<number, string>()
      produtosFornecedor?.forEach(p => {
        if (p.codigo_fornecedor) codigoFornecedorMap.set(p.produto_id, p.codigo_fornecedor)
      })

      // Buscar quantidades ja pedidas em pedidos abertos (se flag ativa)
      const qtdJaPedidaMap = new Map<number, number>()
      if (descontar_pedidos_abertos) {
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
          itensJaPedidos?.forEach(item => {
            if (!item.produto_id) return
            const atual = qtdJaPedidaMap.get(item.produto_id) || 0
            qtdJaPedidaMap.set(item.produto_id, atual + (item.quantidade || 0))
          })
        }
      }

      // Transformar cada politica para o formato do frontend
      const politicasAplicaveis = politicasAPI.map(pol => {
        let sugestoes = pol.produtos.map((produto: ProdutoAPI) => {
          // Calcular media de venda por dia
          const mediaVendaDia = produto.periodo_venda > 0
            ? produto.quantidade_vendida / produto.periodo_venda
            : 0

          // Calcular valor unitario
          const valorUnitario = produto.sugestao_quantidade > 0
            ? produto.valor_total_produto / produto.sugestao_quantidade
            : (produto.valor_de_compra || 0)

          // Descontar quantidade ja pedida se flag ativa
          const qtdJaPedida = qtdJaPedidaMap.get(produto.produto_id) || 0
          const quantidadeAjustada = descontar_pedidos_abertos
            ? Math.max(0, produto.sugestao_quantidade - qtdJaPedida)
            : produto.sugestao_quantidade
          const valorTotalAjustado = quantidadeAjustada * Number(valorUnitario.toFixed(2))

          return {
            produto_id: produto.produto_id,
            id_produto_bling: produto.id_produto_bling,
            codigo: produto.codigo_do_produto || '-',
            nome: produto.nome_produto || produto.codigo_do_produto || `Produto ${produto.produto_id}`,
            gtin: gtinMap.get(produto.produto_id) || '',
            codigo_fornecedor: codigoFornecedorMap.get(produto.produto_id) || undefined,
            estoque_atual: produto.estoque_atual || 0,
            media_venda_dia: Number(mediaVendaDia.toFixed(2)),
            quantidade_sugerida: quantidadeAjustada,
            valor_unitario: Number(valorUnitario.toFixed(2)),
            valor_total: valorTotalAjustado,
            itens_por_caixa: produto.itens_por_caixa || 1,
            qtd_ja_pedida: qtdJaPedida > 0 ? qtdJaPedida : undefined
          }
        })

        // Se desconto ativo, remover itens com quantidade <= 0
        if (descontar_pedidos_abertos) {
          sugestoes = sugestoes.filter(s => s.quantidade_sugerida > 0)
        }

        // Recalcular totais se houve desconto
        const valorTotalComDesconto = sugestoes.reduce((sum, s) => sum + s.valor_total, 0)

        return {
          politica_id: pol.politica_id,
          melhor_politica: pol.melhor_politica,
          valor_total_sem_desconto: pol.valor_total_pedido_sem_desconto,
          valor_total_com_desconto: descontar_pedidos_abertos ? valorTotalComDesconto : pol.valor_total_pedido_com_desconto,
          sugestoes
        }
      })

      // Encontrar a melhor politica para pre-selecionar
      const melhorPolitica = politicasAplicaveis.find(p => p.melhor_politica) || politicasAplicaveis[0]

      return NextResponse.json({
        politicas_aplicaveis: politicasAplicaveis,
        politica_selecionada_id: melhorPolitica?.politica_id || null,
        // Retrocompatibilidade: retorna sugestoes da melhor politica
        sugestoes: melhorPolitica?.sugestoes || [],
        politica_id: melhorPolitica?.politica_id,
        valor_total_pedido: melhorPolitica?.valor_total_com_desconto
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
