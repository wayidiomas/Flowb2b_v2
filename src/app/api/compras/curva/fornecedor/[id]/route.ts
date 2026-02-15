import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { calcularCobertura, Urgencia } from '@/lib/cobertura'

interface ProdutoCurva {
  produto_id: number
  id_produto_bling: number | null
  codigo: string
  codigo_fornecedor: string
  nome: string
  gtin: string
  curva_fat: string
  curva_qtd: string
  estoque_atual: number
  estoque_minimo: number
  // Novos campos de cobertura
  media_diaria: number
  dias_cobertura: number | null
  dias_necessarios: number
  urgencia: Urgencia
  em_ruptura: boolean  // Compatibilidade: true se CRITICA ou ALTA
  faturamento_90d: number
  quantidade_90d: number
  ultima_venda: string | null
  valor_compra: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const fornecedorId = parseInt(id, 10)
    if (isNaN(fornecedorId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    // Obter parametros de filtro
    const searchParams = request.nextUrl.searchParams
    const curvaFat = searchParams.get('curva_fat') || null
    const curvaQtd = searchParams.get('curva_qtd') || null
    const apenasRuptura = searchParams.get('apenas_ruptura') === 'true'

    const supabase = createServerSupabaseClient()

    // Buscar dados do fornecedor
    const { data: fornecedor, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, nome, nome_fantasia, telefone, email')
      .eq('id', fornecedorId)
      .eq('empresa_id', user.empresaId)
      .single()

    if (fornError || !fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Ignorar fornecedor "fantasma" sem nome (criado pela edge function)
    const fornecedorNome = fornecedor.nome
    if (!fornecedorNome) {
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    // Buscar politica de compra para obter prazo_entrega
    const { data: politica } = await supabase
      .from('politica_compra')
      .select('prazo_entrega')
      .eq('fornecedor_id', fornecedorId)
      .eq('empresa_id', user.empresaId)
      .single()

    const prazoEntrega = politica?.prazo_entrega ?? null

    // Buscar IDs de produtos do fornecedor
    const { data: fornecedoresProdutos, error: fpError } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id, valor_de_compra, codigo_fornecedor')
      .eq('fornecedor_id', fornecedorId)
      .eq('empresa_id', user.empresaId)

    if (fpError) {
      console.error('Erro ao buscar fornecedores_produtos:', fpError)
      throw fpError
    }

    const produtoIds = fornecedoresProdutos?.map(fp => fp.produto_id) || []
    const valorCompraMap = new Map<number, number>()
    const codigoFornecedorMap = new Map<number, string>()
    fornecedoresProdutos?.forEach(fp => {
      valorCompraMap.set(fp.produto_id, fp.valor_de_compra || 0)
      codigoFornecedorMap.set(fp.produto_id, fp.codigo_fornecedor || '')
    })

    if (produtoIds.length === 0) {
      return NextResponse.json({
        success: true,
        fornecedor: {
          id: fornecedor.id,
          nome: fornecedor.nome,
          telefone: fornecedor.telefone,
          email: fornecedor.email,
        },
        prazo_entrega: prazoEntrega,
        resumo: {
          total_produtos: 0,
          curva_faturamento: { A: 0, B: 0, C: 0, D: 0 },
          curva_quantidade: { A: 0, B: 0, C: 0, D: 0 },
          por_urgencia: { CRITICA: 0, ALTA: 0, MEDIA: 0, OK: 0 },
          faturamento_90d: 0,
          quantidade_90d: 0,
        },
        produtos: [],
      })
    }

    // Buscar produtos desse fornecedor (incluindo curva_qtd, id_produto_bling e gtin)
    const { data: produtosRaw, error: prodError } = await supabase
      .from('produtos')
      .select('id, id_produto_bling, codigo, nome, curva, curva_qtd, estoque_atual, estoque_minimo, gtin')
      .eq('empresa_id', user.empresaId)
      .eq('situacao', 'A')
      .in('id', produtoIds)

    if (prodError) {
      console.error('Erro ao buscar produtos:', prodError)
      throw prodError
    }

    // Buscar vendas dos últimos 90 dias para esses produtos
    const vendasMap = new Map<number, { faturamento: number; quantidade: number; ultima_venda: string | null }>()

    if (produtoIds.length > 0) {
      // Calcular data de 90 dias atrás
      const data90dias = new Date()
      data90dias.setDate(data90dias.getDate() - 90)
      const data90diasStr = data90dias.toISOString().split('T')[0]

      // Buscar vendas agregadas por produto
      const { data: vendasData, error: vendasError } = await supabase
        .from('itens_pedido_venda')
        .select(`
          produto_id,
          valor,
          quantidade,
          pedidos_venda!inner(data, empresa_id)
        `)
        .in('produto_id', produtoIds)
        .gte('pedidos_venda.data', data90diasStr)
        .eq('pedidos_venda.empresa_id', user.empresaId)

      if (!vendasError && vendasData) {
        // Agregar vendas por produto
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vendasData.forEach((item: any) => {
          const prodId = item.produto_id
          const existing = vendasMap.get(prodId) || { faturamento: 0, quantidade: 0, ultima_venda: null }

          existing.faturamento += (item.valor || 0) * (item.quantidade || 0)
          existing.quantidade += item.quantidade || 0

          // Atualizar última venda se for mais recente
          const pedidoData = Array.isArray(item.pedidos_venda)
            ? item.pedidos_venda[0]?.data
            : item.pedidos_venda?.data
          if (pedidoData && (!existing.ultima_venda || pedidoData > existing.ultima_venda)) {
            existing.ultima_venda = pedidoData
          }

          vendasMap.set(prodId, existing)
        })
      }
    }

    // Processar produtos com dados de vendas reais e calcular cobertura
    const todosProdutos: ProdutoCurva[] = (produtosRaw || []).map(p => {
      const estoqueAtual = p.estoque_atual || 0
      const estoqueMinimo = p.estoque_minimo || 0
      const curvaFat = p.curva || 'D'
      const curvaQtd = p.curva_qtd || 'D'
      const vendas = vendasMap.get(p.id)
      const quantidade_90d = vendas?.quantidade || 0

      // Calcular cobertura de estoque
      const cobertura = calcularCobertura({
        estoque_atual: estoqueAtual,
        quantidade_90d,
        prazo_entrega: prazoEntrega,
        curva_fat: curvaFat,
        curva_qtd: curvaQtd,
      })

      return {
        produto_id: p.id,
        id_produto_bling: p.id_produto_bling || null,
        codigo: p.codigo || '',
        codigo_fornecedor: codigoFornecedorMap.get(p.id) || '',
        nome: p.nome || '',
        gtin: p.gtin || '',
        curva_fat: curvaFat,
        curva_qtd: curvaQtd,
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        // Campos de cobertura
        media_diaria: cobertura.media_diaria,
        dias_cobertura: cobertura.dias_cobertura,
        dias_necessarios: cobertura.dias_necessarios,
        urgencia: cobertura.urgencia,
        em_ruptura: cobertura.em_ruptura,  // CRITICA ou ALTA
        faturamento_90d: vendas?.faturamento || 0,
        quantidade_90d,
        ultima_venda: vendas?.ultima_venda || null,
        valor_compra: valorCompraMap.get(p.id) || 0,
      }
    })

    // Calcular resumo com todos os produtos
    const resumo = {
      total_produtos: 0,
      curva_faturamento: { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>,
      curva_quantidade: { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>,
      por_urgencia: { CRITICA: 0, ALTA: 0, MEDIA: 0, OK: 0 } as Record<string, number>,
      faturamento_90d: 0,
      quantidade_90d: 0,
    }

    todosProdutos.forEach((p: ProdutoCurva) => {
      resumo.total_produtos++
      resumo.faturamento_90d += p.faturamento_90d || 0
      resumo.quantidade_90d += p.quantidade_90d || 0

      // Contar por curva faturamento
      const curvaFatKey = p.curva_fat || 'D'
      if (['A', 'B', 'C', 'D'].includes(curvaFatKey)) {
        resumo.curva_faturamento[curvaFatKey]++
      } else {
        resumo.curva_faturamento['D']++
      }

      // Contar por curva quantidade
      const curvaQtdKey = p.curva_qtd || 'D'
      if (['A', 'B', 'C', 'D'].includes(curvaQtdKey)) {
        resumo.curva_quantidade[curvaQtdKey]++
      } else {
        resumo.curva_quantidade['D']++
      }

      // Contar por urgencia (baseado em cobertura de estoque)
      resumo.por_urgencia[p.urgencia]++
    })

    // Aplicar filtros aos produtos retornados
    let produtosFiltrados = todosProdutos

    if (curvaFat) {
      produtosFiltrados = produtosFiltrados.filter(p => p.curva_fat === curvaFat)
    }

    if (curvaQtd) {
      produtosFiltrados = produtosFiltrados.filter(p => p.curva_qtd === curvaQtd)
    }

    if (apenasRuptura) {
      produtosFiltrados = produtosFiltrados.filter(p => p.em_ruptura)
    }

    // Ordenar: por urgencia (CRITICA > ALTA > MEDIA > OK), depois por curva
    produtosFiltrados.sort((a, b) => {
      const urgenciaOrder = { CRITICA: 1, ALTA: 2, MEDIA: 3, OK: 4 } as Record<string, number>
      const urgenciaA = urgenciaOrder[a.urgencia] || 4
      const urgenciaB = urgenciaOrder[b.urgencia] || 4

      if (urgenciaA !== urgenciaB) {
        return urgenciaA - urgenciaB
      }

      const curvaOrder = { A: 1, B: 2, C: 3, D: 4 } as Record<string, number>
      return (curvaOrder[a.curva_fat] || 4) - (curvaOrder[b.curva_fat] || 4)
    })

    // Buscar fornecedores vizinhos para navegacao prev/next
    // Ordenados por ruptura_total desc (mesmo que a tabela principal)
    const { data: fornecedoresLista } = await supabase
      .from('fornecedores')
      .select('id, nome')
      .eq('empresa_id', user.empresaId)
      .not('nome', 'is', null)
      .order('nome', { ascending: true })

    let prevFornecedor: { id: number; nome: string } | null = null
    let nextFornecedor: { id: number; nome: string } | null = null

    if (fornecedoresLista && fornecedoresLista.length > 1) {
      const currentIndex = fornecedoresLista.findIndex(f => f.id === fornecedorId)
      if (currentIndex > 0) {
        prevFornecedor = fornecedoresLista[currentIndex - 1]
      }
      if (currentIndex < fornecedoresLista.length - 1) {
        nextFornecedor = fornecedoresLista[currentIndex + 1]
      }
    }

    return NextResponse.json({
      success: true,
      fornecedor: {
        id: fornecedor.id,
        nome: fornecedorNome,
        telefone: fornecedor.telefone,
        email: fornecedor.email,
      },
      prazo_entrega: prazoEntrega,
      resumo,
      produtos: produtosFiltrados,
      navegacao: {
        prev: prevFornecedor,
        next: nextFornecedor,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar produtos do fornecedor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar produtos' },
      { status: 500 }
    )
  }
}
