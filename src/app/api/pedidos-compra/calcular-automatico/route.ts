import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
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

    const { fornecedor_id } = await request.json()

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

      // Transformar cada politica para o formato do frontend
      const politicasAplicaveis = politicasAPI.map(pol => {
        const sugestoes = pol.produtos.map((produto: ProdutoAPI) => {
          // Calcular media de venda por dia
          const mediaVendaDia = produto.periodo_venda > 0
            ? produto.quantidade_vendida / produto.periodo_venda
            : 0

          // Calcular valor unitario
          const valorUnitario = produto.sugestao_quantidade > 0
            ? produto.valor_total_produto / produto.sugestao_quantidade
            : (produto.valor_de_compra || 0)

          return {
            produto_id: produto.produto_id,
            id_produto_bling: produto.id_produto_bling,
            codigo: produto.codigo_do_produto || '-',
            nome: produto.nome_produto || produto.codigo_do_produto || `Produto ${produto.produto_id}`,
            gtin: gtinMap.get(produto.produto_id) || '',
            codigo_fornecedor: codigoFornecedorMap.get(produto.produto_id) || undefined,
            estoque_atual: produto.estoque_atual || 0,
            media_venda_dia: Number(mediaVendaDia.toFixed(2)),
            quantidade_sugerida: produto.sugestao_quantidade,
            valor_unitario: Number(valorUnitario.toFixed(2)),
            valor_total: produto.valor_total_produto,
            itens_por_caixa: produto.itens_por_caixa || 1
          }
        })

        return {
          politica_id: pol.politica_id,
          melhor_politica: pol.melhor_politica,
          valor_total_sem_desconto: pol.valor_total_pedido_sem_desconto,
          valor_total_com_desconto: pol.valor_total_pedido_com_desconto,
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
