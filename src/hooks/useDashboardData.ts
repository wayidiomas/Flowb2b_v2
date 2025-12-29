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
} from '@/types/dashboard'

interface UseDashboardDataReturn {
  // Dados
  metrics: DashboardMetrics | null
  fornecedores: Fornecedor[]
  produtosCurvaA: ProdutoCurvaA[]
  pedidosPeriodo: PedidoPeriodo[]
  atividadeRecente: AtividadeRecente[]

  // Estado
  loading: boolean
  error: string | null

  // Ações
  refetch: () => Promise<void>
  setIntervalo: (intervalo: IntervaloGrafico) => void
  intervalo: IntervaloGrafico
}

export function useDashboardData(): UseDashboardDataReturn {
  const { user, empresa } = useAuth()
  const empresaId = empresa?.id

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [produtosCurvaA, setProdutosCurvaA] = useState<ProdutoCurvaA[]>([])
  const [pedidosPeriodo, setPedidosPeriodo] = useState<PedidoPeriodo[]>([])
  const [atividadeRecente, setAtividadeRecente] = useState<AtividadeRecente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intervalo, setIntervalo] = useState<IntervaloGrafico>('12_meses')

  const fetchData = useCallback(async () => {
    console.log('[Dashboard] empresaId:', empresaId)

    if (!empresaId) {
      console.log('[Dashboard] No empresaId, skipping fetch')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('[Dashboard] Fetching data for empresa:', empresaId)

      // Buscar todos os dados em paralelo
      const [metricsRes, fornecedoresRes, produtosRes, pedidosRes, atividadeRes] = await Promise.all([
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

        // 4. Pedidos por período (gráfico de barras vertical)
        supabase.rpc('get_pedidos_compra_por_periodo', {
          p_empresa_id: empresaId,
          p_user_bling: false,
          p_intervalo: intervalo,
        }),

        // 5. Atividade recente (RPC que busca 2 de cada tipo)
        supabase.rpc('get_atividade_recente', {
          p_empresa_id: empresaId,
          p_limit_per_type: 2,
        }),
      ])

      console.log('[Dashboard] Responses:', {
        metrics: metricsRes,
        fornecedores: fornecedoresRes,
        produtos: produtosRes,
        pedidos: pedidosRes,
        atividade: atividadeRes,
      })

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

      // Processar pedidos por período (inverter ordem para cronológico)
      if (pedidosRes.data) {
        const pedidos = (pedidosRes.data as PedidoPeriodo[]).reverse()
        setPedidosPeriodo(pedidos)
      }

      // Processar atividade recente (já vem formatado da RPC)
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

      // Verificar erros
      const errors = [metricsRes.error, fornecedoresRes.error, produtosRes.error, pedidosRes.error]
        .filter(Boolean)
        .map((e) => e?.message)
        .join(', ')

      if (errors) {
        console.error('Erros ao buscar dados:', errors)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard')
      console.error('Erro no dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId, intervalo])

  // Buscar dados quando empresaId ou intervalo mudar
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    metrics,
    fornecedores,
    produtosCurvaA,
    pedidosPeriodo,
    atividadeRecente,
    loading,
    error,
    refetch: fetchData,
    setIntervalo,
    intervalo,
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
