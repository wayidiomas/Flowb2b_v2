'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import {
  CurvaToggle,
  CurvaBadge,
  ProdutosCurvaTable,
  SugestaoModal,
  PedidoEmAbertoModal,
} from '@/components/compras/curva'
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip'
import { PageLoader } from '@/components/ui/PageLoader'

type Urgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK'

interface Produto {
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
  // Campos de cobertura de estoque
  media_diaria: number
  dias_cobertura: number | null
  dias_necessarios: number
  urgencia: Urgencia
  em_ruptura: boolean  // true se CRITICA ou ALTA
  faturamento_90d: number
  quantidade_90d: number
  ultima_venda: string | null
  valor_compra: number
}

interface Resumo {
  total_produtos: number
  curva_faturamento: { A: number; B: number; C: number; D: number }
  curva_quantidade: { A: number; B: number; C: number; D: number }
  por_urgencia: { CRITICA: number; ALTA: number; MEDIA: number; OK: number }
  faturamento_90d: number
  quantidade_90d: number
}

interface FornecedorData {
  fornecedor: {
    id: number
    nome: string
    telefone: string | null
    email: string | null
  }
  prazo_entrega: number | null
  resumo: Resumo
  produtos: Produto[]
  navegacao?: {
    prev: { id: number; nome: string } | null
    next: { id: number; nome: string } | null
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function CurvaCard({
  curva,
  total,
  ruptura,
  valor,
  tipoCurva,
}: {
  curva: 'A' | 'B' | 'C' | 'D'
  total: number
  ruptura: number
  valor: number
  tipoCurva: 'faturamento' | 'quantidade'
}) {
  const colorConfig = {
    A: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-600',
      light: 'text-emerald-600',
    },
    B: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-600',
      light: 'text-blue-600',
    },
    C: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-600',
      light: 'text-amber-600',
    },
    D: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      badge: 'bg-gray-500',
      light: 'text-gray-500',
    },
  }

  const config = colorConfig[curva]

  const descricoes = {
    A: 'Alto impacto - Produtos estrategicos',
    B: 'Medio impacto - Produtos importantes',
    C: 'Baixo impacto - Produtos complementares',
    D: 'Sem vendas recentes',
  }

  return (
    <div className={`rounded-[20px] border ${config.border} ${config.bg} p-5 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg ${config.badge}`}>
            {curva}
          </span>
          <Tooltip content={descricoes[curva]} position="top">
            <InfoIcon className="w-4 h-4 text-[#838383] cursor-help" />
          </Tooltip>
        </div>
        {ruptura > 0 && (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            {ruptura} em ruptura
          </span>
        )}
      </div>

      <div className={`text-3xl font-bold ${config.text}`}>{total}</div>
      <div className="text-sm text-[#667085] mt-1">produtos</div>

      <div className="mt-4 pt-4 border-t border-gray-200/50">
        <div className="text-xs text-[#838383] mb-1">
          {tipoCurva === 'faturamento' ? 'Faturamento 90d' : 'Quantidade 90d'}
        </div>
        <div className={`text-base font-semibold ${config.text}`}>
          {tipoCurva === 'faturamento'
            ? formatCurrency(valor)
            : `${formatNumber(valor)} un`
          }
        </div>
      </div>
    </div>
  )
}

export default function FornecedorCurvaPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const fornecedorId = params.fornecedorId as string

  // Ler filtros da URL ou usar valores padrao
  const [tipoCurva, setTipoCurva] = useState<'faturamento' | 'quantidade'>(
    (searchParams.get('tipo') as 'faturamento' | 'quantidade') || 'faturamento'
  )
  const [data, setData] = useState<FornecedorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Filtros - inicializar da URL
  const [curvaFatFilter, setCurvaFatFilter] = useState<string>(searchParams.get('curva_fat') || '')
  const [curvaQtdFilter, setCurvaQtdFilter] = useState<string>(searchParams.get('curva_qtd') || '')
  const [apenasRuptura, setApenasRuptura] = useState(searchParams.get('ruptura') === 'true')

  // Modal de Sugestao
  const [sugestaoModalOpen, setSugestaoModalOpen] = useState(false)
  const [modalModo, setModalModo] = useState<'rapido' | 'completo'>('completo')
  const [produtosPreSelecionados, setProdutosPreSelecionados] = useState<number[]>([])
  const [descontarPedidos, setDescontarPedidos] = useState(false)

  // Modal de pedido em aberto
  const [pedidoAbertoModalOpen, setPedidoAbertoModalOpen] = useState(false)
  const [pedidoAbertoLoading, setPedidoAbertoLoading] = useState(false)
  const [pedidosEmAberto, setPedidosEmAberto] = useState<Array<{
    id: number
    numero: string
    data: string
    total: number
    situacao: number
  }>>([])
  const [itensJaPedidos, setItensJaPedidos] = useState<Array<{
    produto_id: number
    nome: string
    codigo: string
    quantidade: number
    valor: number
  }>>([])

  // Atualizar URL quando filtros mudarem
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    if (tipoCurva !== 'faturamento') params.set('tipo', tipoCurva)
    if (curvaFatFilter) params.set('curva_fat', curvaFatFilter)
    if (curvaQtdFilter) params.set('curva_qtd', curvaQtdFilter)
    if (apenasRuptura) params.set('ruptura', 'true')

    const queryString = params.toString()
    const newUrl = queryString
      ? `/compras/curva/${fornecedorId}?${queryString}`
      : `/compras/curva/${fornecedorId}`

    // Usar replaceState para nao poluir historico
    window.history.replaceState(null, '', newUrl)
  }, [fornecedorId, tipoCurva, curvaFatFilter, curvaQtdFilter, apenasRuptura])

  // Atualizar URL quando filtros mudarem
  useEffect(() => {
    updateURL()
  }, [updateURL])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !fornecedorId) return

      setLoading(true)
      try {
        const queryParams = new URLSearchParams()
        if (curvaFatFilter) queryParams.append('curva_fat', curvaFatFilter)
        if (curvaQtdFilter) queryParams.append('curva_qtd', curvaQtdFilter)
        if (apenasRuptura) queryParams.append('apenas_ruptura', 'true')

        const res = await fetch(
          `/api/compras/curva/fornecedor/${fornecedorId}?${queryParams.toString()}`
        )

        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, fornecedorId, curvaFatFilter, curvaQtdFilter, apenasRuptura])

  // Funcao auxiliar para verificar pedido em aberto
  const verificarPedidoEmAberto = async (
    ids: number[],
    modo: 'rapido' | 'completo'
  ) => {
    // Buscar pedidos em aberto do fornecedor
    setPedidoAbertoLoading(true)
    setProdutosPreSelecionados(ids)
    setModalModo(modo)

    try {
      const res = await fetch(`/api/compras/curva/pedido-aberto-itens?fornecedor_id=${fornecedorId}`)
      const responseData = await res.json()

      if (responseData.success && responseData.pedidos?.length > 0) {
        // Tem pedido em aberto - abrir modal de aviso
        setPedidosEmAberto(responseData.pedidos || [])
        setItensJaPedidos(responseData.itens || [])
        setPedidoAbertoModalOpen(true)
      } else {
        // Nao tem pedido em aberto - abrir SugestaoModal diretamente
        setDescontarPedidos(false)
        setSugestaoModalOpen(true)
      }
    } catch (error) {
      console.error('Erro ao verificar pedido em aberto:', error)
      // Em caso de erro, continuar normalmente
      setDescontarPedidos(false)
      setSugestaoModalOpen(true)
    } finally {
      setPedidoAbertoLoading(false)
    }
  }

  // Continuar com desconto apos ver o modal de pedido em aberto
  const handleContinuarComDesconto = () => {
    setPedidoAbertoModalOpen(false)
    setDescontarPedidos(true)
    setSugestaoModalOpen(true)
  }

  const handleCriarPedidoSelecionados = () => {
    if (!data || selectedIds.length === 0) return

    // Verificar pedido em aberto antes de abrir modal
    verificarPedidoEmAberto(selectedIds, 'completo')
  }

  const handleCriarPedidoRupturas = () => {
    if (!data) return

    // Filtrar produtos em ruptura
    const produtosRuptura = data.produtos.filter((p) => p.em_ruptura)
    if (produtosRuptura.length === 0) return

    const rupturaIds = produtosRuptura.map((p) => p.produto_id)
    // Verificar pedido em aberto antes de abrir modal
    verificarPedidoEmAberto(rupturaIds, 'rapido')
  }

  const handleVerSugestao = () => {
    // Verificar pedido em aberto antes de abrir modal
    verificarPedidoEmAberto([], 'completo')
  }

  const handleCriarPedidoFromSugestao = (items: {
    produto_id: number
    id_produto_bling: number
    codigo: string
    nome: string
    gtin: string
    codigo_fornecedor?: string
    sugestao_qtd: number
    valor_unitario: number
    estoque_atual: number
  }[]) => {
    if (items.length === 0) return

    // Formatar itens para o pedido de compra
    const itensParaPedido = items.map((item) => ({
      produto_id: item.produto_id,
      id_produto_bling: item.id_produto_bling,
      codigo_produto: item.codigo,
      codigo_fornecedor: item.codigo_fornecedor || '',
      descricao: item.nome,
      unidade: 'UN',
      quantidade: item.sugestao_qtd,
      valor: item.valor_unitario,
      aliquota_ipi: 0,
      estoque_atual: item.estoque_atual,
      ean: item.gtin,
    }))

    // Salvar no sessionStorage e redirecionar
    sessionStorage.setItem('curva_pedido_itens', JSON.stringify(itensParaPedido))
    router.push(`/compras/pedidos/novo?fornecedor_id=${fornecedorId}&from=curva`)
  }

  const curvaOptions = ['A', 'B', 'C', 'D']
  const produtosEmRuptura = data?.produtos.filter((p) => p.em_ruptura).length || 0

  // Calcular valor por curva baseado no tipo selecionado
  const getValorPorCurva = (curva: 'A' | 'B' | 'C' | 'D') => {
    if (!data) return 0
    return data.produtos
      .filter((p) => (tipoCurva === 'faturamento' ? p.curva_fat : p.curva_qtd) === curva)
      .reduce((sum, p) => sum + (tipoCurva === 'faturamento' ? p.faturamento_90d : p.quantidade_90d), 0)
  }

  // Loading inicial com logo animada
  if (loading) {
    return (
      <RequirePermission permission="pedidos">
      <DashboardLayout>
        <PageLoader message="Carregando produtos do fornecedor..." />
      </DashboardLayout>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="pedidos">
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#838383] mb-4">
          <Link href="/compras" className="hover:text-[#336FB6] transition-colors">
            Compras
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/compras/curva" className="hover:text-[#336FB6] transition-colors">
            Curva ABC
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#344054] font-medium truncate max-w-[200px]">
            {data?.fornecedor.nome || 'Fornecedor'}
          </span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Navegacao Prev/Next */}
              <div className="flex items-center gap-1">
                {data?.navegacao?.prev ? (
                  <Link
                    href={`/compras/curva/${data.navegacao.prev.id}`}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F5F5F5] hover:bg-[#336FB6] hover:text-white text-[#667085] transition-colors group"
                    title={`Anterior: ${data.navegacao.prev.nome}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center opacity-40 cursor-not-allowed">
                    <svg className="w-4 h-4 text-[#C9C9C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                )}
                {data?.navegacao?.next ? (
                  <Link
                    href={`/compras/curva/${data.navegacao.next.id}`}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F5F5F5] hover:bg-[#336FB6] hover:text-white text-[#667085] transition-colors group"
                    title={`Proximo: ${data.navegacao.next.nome}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center opacity-40 cursor-not-allowed">
                    <svg className="w-4 h-4 text-[#C9C9C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-xl font-bold text-[#344054]">
                  {data?.fornecedor.nome || 'Carregando...'}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-[#838383]">
                    {data?.resumo.total_produtos || 0} produtos
                  </span>
                  <span className="text-[#EDEDED]">|</span>
                  <span className="text-sm text-[#838383]">
                    Prazo entrega: <span className="font-medium text-[#344054]">{data?.prazo_entrega ?? 15} dias</span>
                    {!data?.prazo_entrega && <span className="text-xs text-amber-600 ml-1">(padrao)</span>}
                  </span>
                </div>
              </div>
            </div>
            <CurvaToggle value={tipoCurva} onChange={setTipoCurva} />
          </div>
        </div>

        {/* Resumo por Urgencia */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(['CRITICA', 'ALTA', 'MEDIA', 'OK'] as const).map((urg) => {
            const count = data?.resumo.por_urgencia[urg] || 0
            const config = {
              CRITICA: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
              ALTA: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
              MEDIA: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
              OK: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            }[urg]
            return (
              <div key={urg} className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${config.dot} ${urg === 'CRITICA' || urg === 'ALTA' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-medium ${config.text}`}>{urg}</span>
                </div>
                <div className={`text-2xl font-bold ${config.text}`}>{count}</div>
                <div className="text-xs text-[#667085]">produtos</div>
              </div>
            )
          })}
        </div>

        {/* Cards de Resumo por Curva */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {(['A', 'B', 'C', 'D'] as const).map((curva) => {
            const curvaData = tipoCurva === 'faturamento'
              ? data?.resumo.curva_faturamento
              : data?.resumo.curva_quantidade
            // Calcular ruptura por curva filtrando os produtos
            const rupturaPorCurva = data?.produtos.filter(
              (p) => (tipoCurva === 'faturamento' ? p.curva_fat : p.curva_qtd) === curva && p.em_ruptura
            ).length || 0

            return (
              <CurvaCard
                key={curva}
                curva={curva}
                total={curvaData?.[curva] || 0}
                ruptura={rupturaPorCurva}
                valor={getValorPorCurva(curva)}
                tipoCurva={tipoCurva}
              />
            )
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-2">
                Curva Faturamento
              </label>
              <select
                value={curvaFatFilter}
                onChange={(e) => setCurvaFatFilter(e.target.value)}
                className="w-32 px-3 py-2.5 border border-[#EDEDED] rounded-xl text-sm text-[#344054] bg-[#FBFBFB] focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-transparent transition-all"
              >
                <option value="">Todas</option>
                {curvaOptions.map((c) => (
                  <option key={c} value={c}>Curva {c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#667085] mb-2">
                Curva Quantidade
              </label>
              <select
                value={curvaQtdFilter}
                onChange={(e) => setCurvaQtdFilter(e.target.value)}
                className="w-32 px-3 py-2.5 border border-[#EDEDED] rounded-xl text-sm text-[#344054] bg-[#FBFBFB] focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-transparent transition-all"
              >
                <option value="">Todas</option>
                {curvaOptions.map((c) => (
                  <option key={c} value={c}>Curva {c}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer py-2.5 px-3 rounded-xl hover:bg-[#FBFBFB] transition-colors">
              <input
                type="checkbox"
                checked={apenasRuptura}
                onChange={(e) => setApenasRuptura(e.target.checked)}
                className="w-4 h-4 rounded border-[#D0D5DD] text-[#336FB6] focus:ring-[#336FB6]"
              />
              <span className="text-sm text-[#344054]">Apenas em Ruptura</span>
            </label>

            <div className="flex-1" />

            <div className="flex items-center gap-2 text-sm text-[#667085]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="font-medium">{data?.produtos.length || 0}</span>
              <span>produtos encontrados</span>
            </div>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-5 mb-28">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[#344054]">
                Produtos
              </h2>
              {selectedIds.length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#336FB6]/10 text-[#336FB6]">
                  {selectedIds.length} selecionado(s)
                </span>
              )}
            </div>
          </div>
          <ProdutosCurvaTable
            produtos={data?.produtos || []}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            loading={loading}
            tipoCurva={tipoCurva}
            prazoEntrega={data?.prazo_entrega ?? 15}
          />
        </div>

        {/* Barra de Acoes Fixa */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDEDED] shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] p-3 sm:p-4 z-50">
          <div className="max-w-[1600px] mx-auto">
            {/* Mobile: Stack vertical */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Contadores */}
              <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-[#667085]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#344054]">{selectedIds.length}</span>
                  <span className="hidden sm:inline">selecionado(s)</span>
                  <span className="sm:hidden">sel.</span>
                </div>
                {produtosEmRuptura > 0 && (
                  <>
                    <span className="text-[#EDEDED]">|</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        {produtosEmRuptura}
                      </span>
                      <span className="text-red-600 hidden sm:inline">em ruptura</span>
                      <span className="text-red-600 sm:hidden">rupt.</span>
                    </div>
                  </>
                )}
              </div>

              {/* Botoes - scroll horizontal no mobile */}
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={handleVerSugestao}
                  className="shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-[#344054] bg-white border border-[#D0D5DD] rounded-xl hover:bg-[#FBFBFB] transition-colors"
                >
                  <span className="hidden sm:inline">Ver Sugestao Automatica</span>
                  <span className="sm:hidden">Sugestao</span>
                </button>

                <button
                  onClick={handleCriarPedidoRupturas}
                  disabled={produtosEmRuptura === 0}
                  className="shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Criar Pedido Rupturas</span>
                  <span className="sm:hidden">Rupturas</span>
                  <span className="ml-1">({produtosEmRuptura})</span>
                </button>

                <button
                  onClick={handleCriarPedidoSelecionados}
                  disabled={selectedIds.length === 0}
                  className="shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2a5a94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Criar Pedido Selecionados</span>
                  <span className="sm:hidden">Selecionados</span>
                  <span className="ml-1">({selectedIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Pedido em Aberto (aviso) */}
        <PedidoEmAbertoModal
          isOpen={pedidoAbertoModalOpen}
          onClose={() => {
            setPedidoAbertoModalOpen(false)
            setProdutosPreSelecionados([])
            setPedidosEmAberto([])
            setItensJaPedidos([])
          }}
          fornecedorNome={data?.fornecedor.nome || ''}
          pedidos={pedidosEmAberto}
          itens={itensJaPedidos}
          loading={pedidoAbertoLoading}
          onContinuar={handleContinuarComDesconto}
        />

        {/* Modal de Sugestao Automatica */}
        <SugestaoModal
          isOpen={sugestaoModalOpen}
          onClose={() => {
            setSugestaoModalOpen(false)
            setProdutosPreSelecionados([])
            setDescontarPedidos(false)
          }}
          fornecedorId={parseInt(fornecedorId)}
          fornecedorNome={data?.fornecedor.nome || ''}
          onCriarPedido={handleCriarPedidoFromSugestao}
          autoCalculate={true}
          produtosPreSelecionados={produtosPreSelecionados}
          modo={modalModo}
          descontarPedidosAbertos={descontarPedidos}
        />
      </div>
    </DashboardLayout>
    </RequirePermission>
  )
}
