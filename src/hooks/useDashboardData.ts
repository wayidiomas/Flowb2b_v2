'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  DashboardMetrics,
  Fornecedor,
  ProdutoCurvaA,
  PedidoPeriodo,
  AtividadeRecente,
  IntervaloGrafico,
  IntervaloEstoque,
  TopProdutoVendido,
  ProdutoAltaRotatividade,
  VariacaoEstoque,
  FornecedorMaisVendas,
} from '@/types/dashboard'

interface UseDashboardDataReturn {
  // Dados
  metrics: DashboardMetrics | null
  fornecedores: Fornecedor[]
  produtosCurvaA: ProdutoCurvaA[]
  pedidosPeriodo: PedidoPeriodo[]
  atividadeRecente: AtividadeRecente[]
  topProdutosVendidos: TopProdutoVendido[]
  produtosAltaRotatividade: ProdutoAltaRotatividade[]
  variacaoEstoque: VariacaoEstoque[]
  fornecedoresMaisVendas: FornecedorMaisVendas[]

  // Estado - loading individual por grupo
  loading: boolean // loading geral (inicial)
  loadingBase: boolean // metrics, fornecedores, curvaA, atividade, alta rotatividade
  loadingIntervalo: boolean // pedidosPeriodo, fornecedoresMaisVendas
  loadingEstoque: boolean // variacaoEstoque
  error: string | null

  // Ações
  refetch: () => Promise<void>
  setIntervalo: (intervalo: IntervaloGrafico) => void
  intervalo: IntervaloGrafico
  setIntervaloEstoque: (intervalo: IntervaloEstoque) => void
  intervaloEstoque: IntervaloEstoque
  // Datas personalizadas para variação de estoque
  dataInicioEstoque: string | null
  dataFimEstoque: string | null
  setDatasEstoque: (inicio: string | null, fim: string | null) => void
}

export function useDashboardData(): UseDashboardDataReturn {
  const { user, empresa } = useAuth()
  const empresaId = empresa?.id

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [produtosCurvaA, setProdutosCurvaA] = useState<ProdutoCurvaA[]>([])
  const [pedidosPeriodo, setPedidosPeriodo] = useState<PedidoPeriodo[]>([])
  const [atividadeRecente, setAtividadeRecente] = useState<AtividadeRecente[]>([])
  const [topProdutosVendidos, setTopProdutosVendidos] = useState<TopProdutoVendido[]>([])
  const [produtosAltaRotatividade, setProdutosAltaRotatividade] = useState<ProdutoAltaRotatividade[]>([])
  const [variacaoEstoque, setVariacaoEstoque] = useState<VariacaoEstoque[]>([])
  const [fornecedoresMaisVendas, setFornecedoresMaisVendas] = useState<FornecedorMaisVendas[]>([])

  // Loading states individuais
  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingIntervalo, setLoadingIntervalo] = useState(true)
  const [loadingEstoque, setLoadingEstoque] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [intervalo, setIntervalo] = useState<IntervaloGrafico>('12_meses')
  const [intervaloEstoque, setIntervaloEstoque] = useState<IntervaloEstoque>('4_meses')
  const [dataInicioEstoque, setDataInicioEstoque] = useState<string | null>(null)
  const [dataFimEstoque, setDataFimEstoque] = useState<string | null>(null)

  // Setter para datas personalizadas
  const setDatasEstoque = (inicio: string | null, fim: string | null) => {
    setDataInicioEstoque(inicio)
    setDataFimEstoque(fim)
  }

  // ============================================
  // GRUPO 1: Dados base (apenas empresaId)
  // metrics, fornecedores, produtosCurvaA, atividadeRecente, produtosAltaRotatividade
  // ============================================
  const fetchBaseData = useCallback(async () => {
    if (!empresaId) {
      setLoadingBase(false)
      return
    }

    try {
      setLoadingBase(true)

      // Recalcula curvas ABC antes de buscar dados que dependem delas
      await supabase.rpc('calcular_abc', { p_empresa_id: empresaId })

      const [
        metricsRes,
        fornecedoresRes,
        produtosRes,
        atividadeRes,
        altaRotatividadeRes,
      ] = await Promise.all([
        // 1. Métricas principais
        supabase.rpc('get_dashboard_metrics', {
          p_empresa_id: empresaId,
          p_user_bling: false,
        }),

        // 2. Principais fornecedores (gráfico de pizza)
        supabase.rpc('get_principais_fornecedores', {
          p_empresa_id: empresaId,
          p_user_bling: false,
        }),

        // 3. Top 5 produtos curva A (gráfico de barras)
        supabase.rpc('get_top5_produtos_curva_a', {
          p_empresa_id: empresaId,
        }),

        // 4. Atividade recente (RPC que busca 2 de cada tipo)
        supabase.rpc('get_atividade_recente', {
          p_empresa_id: empresaId,
          p_limit_per_type: 2,
        }),

        // 5. Produtos de alta rotatividade
        supabase.rpc('get_produtos_alta_rotatividade', {
          p_empresa_id: empresaId,
          p_dias: 90,
          p_limit: 100,
        }),
      ])

      // Processar métricas
      if (metricsRes.data) {
        setMetrics(metricsRes.data as DashboardMetrics)
      }

      // Processar fornecedores
      if (fornecedoresRes.data) {
        setFornecedores(fornecedoresRes.data as Fornecedor[])
      }

      // Processar produtos curva A
      if (produtosRes.data) {
        setProdutosCurvaA(produtosRes.data as ProdutoCurvaA[])
      }

      // Processar atividade recente
      if (atividadeRes.data) {
        interface AtividadeRPC {
          tipo: string
          titulo: string
          descricao: string
          data_atividade: string
          status: string
        }
        const atividades: AtividadeRecente[] = (atividadeRes.data as AtividadeRPC[]).map((item) => ({
          tipo: item.tipo as AtividadeRecente['tipo'],
          titulo: item.titulo,
          descricao: item.descricao,
          data: item.data_atividade,
          status: item.status as AtividadeRecente['status'],
        }))
        setAtividadeRecente(atividades)
      }

      // Processar produtos de alta rotatividade
      if (altaRotatividadeRes.data) {
        setProdutosAltaRotatividade(altaRotatividadeRes.data as ProdutoAltaRotatividade[])
      }

      // Verificar erros
      const errors = [metricsRes.error, fornecedoresRes.error, produtosRes.error, atividadeRes.error]
        .filter(Boolean)
        .map((e) => e?.message)
        .join(', ')

      if (errors) {
        console.error('Erros ao buscar dados base:', errors)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados base do dashboard')
      console.error('Erro no dashboard (base):', err)
    } finally {
      setLoadingBase(false)
    }
  }, [empresaId])

  // ============================================
  // GRUPO 2: Dados com filtro de intervalo
  // pedidosPeriodo, topProdutosVendidos, fornecedoresMaisVendas
  // ============================================
  const fetchIntervaloData = useCallback(async () => {
    if (!empresaId) {
      setLoadingIntervalo(false)
      return
    }

    try {
      setLoadingIntervalo(true)

      const [
        pedidosRes,
        topVendidosRes,
        fornecedoresMaisVendasRes,
      ] = await Promise.all([
        // Pedidos por período (gráfico de barras vertical)
        supabase.rpc('get_pedidos_compra_por_periodo', {
          p_empresa_id: empresaId,
          p_user_bling: false,
          p_intervalo: intervalo,
        }),

        // Top produtos vendidos por período
        supabase.rpc('get_top_produtos_vendidos', {
          p_empresa_id: empresaId,
          p_intervalo: intervalo,
          p_limit: 10,
        }),

        // Fornecedores que mais vendem
        supabase.rpc('get_fornecedores_mais_vendas', {
          p_empresa_id: empresaId,
          p_intervalo: intervalo,
          p_limit: 5,
        }),
      ])

      // Processar pedidos por período (inverter ordem para cronológico)
      if (pedidosRes.data) {
        const pedidos = (pedidosRes.data as PedidoPeriodo[]).reverse()
        setPedidosPeriodo(pedidos)
      }

      // Processar top produtos vendidos
      if (topVendidosRes.data) {
        setTopProdutosVendidos(topVendidosRes.data as TopProdutoVendido[])
      }

      // Processar fornecedores que mais vendem
      if (fornecedoresMaisVendasRes.data) {
        setFornecedoresMaisVendas(fornecedoresMaisVendasRes.data as FornecedorMaisVendas[])
      }

      // Verificar erros
      const errors = [pedidosRes.error, topVendidosRes.error, fornecedoresMaisVendasRes.error]
        .filter(Boolean)
        .map((e) => e?.message)
        .join(', ')

      if (errors) {
        console.error('Erros ao buscar dados de intervalo:', errors)
      }
    } catch (err) {
      console.error('Erro no dashboard (intervalo):', err)
    } finally {
      setLoadingIntervalo(false)
    }
  }, [empresaId, intervalo])

  // ============================================
  // GRUPO 3: Dados com filtro de estoque
  // variacaoEstoque
  // ============================================
  const fetchEstoqueData = useCallback(async () => {
    if (!empresaId) {
      setLoadingEstoque(false)
      return
    }

    try {
      setLoadingEstoque(true)

      const variacaoEstoqueRes = await supabase.rpc('get_variacao_valor_estoque', {
        p_empresa_id: empresaId,
        p_intervalo: intervaloEstoque,
        p_data_inicio: intervaloEstoque === 'personalizado' ? dataInicioEstoque : null,
        p_data_fim: intervaloEstoque === 'personalizado' ? dataFimEstoque : null,
      })

      // Processar variação do estoque
      if (variacaoEstoqueRes.data) {
        setVariacaoEstoque(variacaoEstoqueRes.data as VariacaoEstoque[])
      }

      if (variacaoEstoqueRes.error) {
        console.error('Erro ao buscar variação de estoque:', variacaoEstoqueRes.error.message)
      }
    } catch (err) {
      console.error('Erro no dashboard (estoque):', err)
    } finally {
      setLoadingEstoque(false)
    }
  }, [empresaId, intervaloEstoque, dataInicioEstoque, dataFimEstoque])

  // Função de refetch completo (para uso manual)
  const refetch = useCallback(async () => {
    setError(null)
    await Promise.all([
      fetchBaseData(),
      fetchIntervaloData(),
      fetchEstoqueData(),
    ])
  }, [fetchBaseData, fetchIntervaloData, fetchEstoqueData])

  // Effect para dados base (apenas empresaId muda)
  useEffect(() => {
    fetchBaseData()
  }, [fetchBaseData])

  // Effect para dados de intervalo
  useEffect(() => {
    fetchIntervaloData()
  }, [fetchIntervaloData])

  // Effect para dados de estoque
  useEffect(() => {
    fetchEstoqueData()
  }, [fetchEstoqueData])

  // Marcar initial load como completo quando todos terminarem
  useEffect(() => {
    if (!loadingBase && !loadingIntervalo && !loadingEstoque && initialLoad) {
      setInitialLoad(false)
    }
  }, [loadingBase, loadingIntervalo, loadingEstoque, initialLoad])

  // Loading geral é true apenas no carregamento inicial
  const loading = initialLoad && (loadingBase || loadingIntervalo || loadingEstoque)

  return {
    metrics,
    fornecedores,
    produtosCurvaA,
    pedidosPeriodo,
    atividadeRecente,
    topProdutosVendidos,
    produtosAltaRotatividade,
    variacaoEstoque,
    fornecedoresMaisVendas,
    loading,
    loadingBase,
    loadingIntervalo,
    loadingEstoque,
    error,
    refetch,
    setIntervalo,
    intervalo,
    setIntervaloEstoque,
    intervaloEstoque,
    dataInicioEstoque,
    dataFimEstoque,
    setDatasEstoque,
  }
}

// Hook auxiliar para buscar produtos por curva
export function useProdutosCurva(curva?: 'A' | 'B' | 'C') {
  const { empresa } = useAuth()
  const empresaId = empresa?.id
  const [data, setData] = useState<ProdutoCurvaA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!empresaId) return

    const fetchProdutos = async () => {
      setLoading(true)

      let query = supabase
        .from('view_produtos_curva')
        .select('produto_id, produto_nome, numero_vendas, curva, quantidade_em_estoque, condicao_de_ruptura')
        .eq('empresa_id', empresaId)
        .order('numero_vendas', { ascending: false })
        .limit(50)

      if (curva) {
        query = query.eq('curva', curva)
      }

      const { data: produtos } = await query

      if (produtos) {
        setData(produtos as ProdutoCurvaA[])
      }

      setLoading(false)
    }

    fetchProdutos()
  }, [empresaId, curva])

  return { data, loading }
}
