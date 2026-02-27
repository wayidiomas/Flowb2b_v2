'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import {
  CurvaToggle,
  FornecedorCurvaTable,
  AlertasUrgenciaPanel,
  SugestaoModal,
  PedidoEmAbertoModal,
} from '@/components/compras/curva'
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip'
import { PageLoader } from '@/components/ui/PageLoader'

interface CurvaData {
  A: { total: number; ruptura: number }
  B: { total: number; ruptura: number }
  C: { total: number; ruptura: number }
  D: { total: number; ruptura: number }
}

interface Fornecedor {
  fornecedor_id: number
  fornecedor_nome: string
  fornecedor_cnpj: string
  total_produtos: number
  curva_faturamento: CurvaData
  curva_quantidade: CurvaData
  por_urgencia: { CRITICA: number; ALTA: number; MEDIA: number; OK: number }
  faturamento_90d: number
  ruptura_total: number
  valor_ruptura_estimado: number
  ultimo_pedido_data: string | null
  ultimo_pedido_valor: number | null
  dias_sem_pedido: number | null
  prazo_entrega: number | null
  pedido_em_aberto: {
    numero: string
    data: string
    total: number
    situacao: number
  } | null
}

type Urgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK'

interface Alerta {
  produto_id: number
  codigo: string
  produto_nome: string
  fornecedor_id: number
  fornecedor_nome: string
  fornecedor_cnpj: string
  curva_fat: string
  curva_qtd: string
  estoque_atual: number
  estoque_minimo: number
  // Campos de cobertura
  media_diaria: number
  dias_cobertura: number | null
  dias_necessarios: number
  urgencia: Urgencia
  faturamento_90d: number
  quantidade_90d: number
  dias_sem_entrada: number
}

interface AlertasData {
  CRITICA: Alerta[]
  ALTA: Alerta[]
  MEDIA: Alerta[]
  OK?: Alerta[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function KPICard({
  label,
  value,
  subValue,
  tooltip,
  color,
  icon,
}: {
  label: string
  value: string | number
  subValue?: string
  tooltip: string
  color: 'red' | 'amber' | 'blue' | 'gray'
  icon: React.ReactNode
}) {
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
    },
    gray: {
      bg: 'bg-[#FBFBFB]',
      border: 'border-[#EDEDED]',
      text: 'text-[#344054]',
      iconBg: 'bg-[#F2F4F7]',
    },
  }

  const config = colorClasses[color]

  return (
    <div className={`rounded-[20px] border ${config.border} ${config.bg} p-5 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${config.iconBg}`}>
          {icon}
        </div>
        <Tooltip content={tooltip} position="top">
          <InfoIcon className="w-4 h-4 text-[#838383] cursor-help" />
        </Tooltip>
      </div>
      <div className={`text-3xl font-bold ${config.text}`}>{value}</div>
      <div className="text-sm font-medium text-[#667085] mt-1">{label}</div>
      {subValue && <div className="text-xs text-[#838383] mt-0.5">{subValue}</div>}
    </div>
  )
}

// Interface para itens do SugestaoModal
interface SugestaoItem {
  produto_id: number
  id_produto_bling: number
  codigo: string
  nome: string
  gtin: string
  codigo_fornecedor?: string
  curva_fat: string
  curva_qtd: string
  em_ruptura: boolean
  estoque_atual: number
  estoque_minimo: number
  media_diaria: number
  sugestao_qtd: number
  sugestao_caixas: number
  itens_por_caixa: number
  valor_unitario: number
  valor_total: number
}

export default function ComprasCurvaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tipoCurva, setTipoCurva] = useState<'faturamento' | 'quantidade'>('faturamento')
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [alertas, setAlertas] = useState<AlertasData>({
    CRITICA: [],
    ALTA: [],
    MEDIA: [],
  })
  const [totais, setTotais] = useState({
    total_fornecedores: 0,
    total_produtos: 0,
    total_ruptura: 0,
    valor_ruptura_total: 0,
    por_urgencia: { CRITICA: 0, ALTA: 0, MEDIA: 0 },
  })
  const [alertasTotais, setAlertasTotais] = useState({
    CRITICA: 0,
    ALTA: 0,
    MEDIA: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)

  // Estado do modal de sugestao/pedido
  const [modalOpen, setModalOpen] = useState(false)
  const [modalModo, setModalModo] = useState<'rapido' | 'completo'>('completo')
  const [selectedFornecedor, setSelectedFornecedor] = useState<{
    id: number
    nome: string
    produtosIds: number[]
  } | null>(null)
  const [descontarPedidos, setDescontarPedidos] = useState(false)

  // Estado do modal de pedido em aberto
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setLoading(true)
      try {
        // Buscar visao geral e alertas em paralelo
        const [visaoRes, alertasRes] = await Promise.all([
          fetch('/api/compras/curva/visao-geral'),
          fetch('/api/compras/curva/alertas'),
        ])

        if (visaoRes.ok) {
          const visaoData = await visaoRes.json()
          setFornecedores(visaoData.fornecedores || [])
          setTotais(visaoData.totais)
        }

        if (alertasRes.ok) {
          const alertasData = await alertasRes.json()
          setAlertas(alertasData.alertas || { CRITICA: [], ALTA: [], MEDIA: [] })
          setAlertasTotais(alertasData.totais || { CRITICA: 0, ALTA: 0, MEDIA: 0, total: 0 })
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Calcular totais de rupturas por curva ABC
  const rupturasPorCurva = useMemo(() => {
    const curvaKey = tipoCurva === 'faturamento' ? 'curva_faturamento' : 'curva_quantidade'
    return fornecedores.reduce(
      (acc, f) => {
        const curva = f[curvaKey] as CurvaData
        if (curva) {
          acc.A += curva.A?.ruptura || 0
          acc.B += curva.B?.ruptura || 0
          acc.C += curva.C?.ruptura || 0
        }
        return acc
      },
      { A: 0, B: 0, C: 0 }
    )
  }, [fornecedores, tipoCurva])

  // Funcao auxiliar para verificar pedido em aberto e abrir modal apropriado
  const verificarPedidoEmAberto = async (
    fornecedorId: number,
    fornecedorNome: string,
    produtosIds: number[],
    modo: 'rapido' | 'completo'
  ) => {
    // Verificar se tem pedido em aberto nos dados ja carregados
    const fornecedor = fornecedores.find(f => f.fornecedor_id === fornecedorId)

    if (fornecedor?.pedido_em_aberto) {
      // Buscar itens do pedido em aberto
      setPedidoAbertoLoading(true)
      setSelectedFornecedor({ id: fornecedorId, nome: fornecedorNome, produtosIds })
      setModalModo(modo)
      setPedidoAbertoModalOpen(true)

      try {
        const res = await fetch(`/api/compras/curva/pedido-aberto-itens?fornecedor_id=${fornecedorId}`)
        const data = await res.json()

        if (data.success) {
          setPedidosEmAberto(data.pedidos || [])
          setItensJaPedidos(data.itens || [])
        }
      } catch (error) {
        console.error('Erro ao buscar itens do pedido em aberto:', error)
      } finally {
        setPedidoAbertoLoading(false)
      }
    } else {
      // Fluxo normal - abrir SugestaoModal diretamente
      setSelectedFornecedor({ id: fornecedorId, nome: fornecedorNome, produtosIds })
      setModalModo(modo)
      setDescontarPedidos(false)
      setModalOpen(true)
    }
  }

  // Abrir modal em modo rapido (so rupturas)
  const handlePedidoRapido = (fornecedorId: number, fornecedorNome: string, alertasFornecedor: Alerta[]) => {
    const produtosIds = alertasFornecedor.map(a => a.produto_id)
    verificarPedidoEmAberto(fornecedorId, fornecedorNome, produtosIds, 'rapido')
  }

  // Abrir modal em modo completo (rupturas + sugestoes)
  const handleVerSugestoes = (fornecedorId: number, fornecedorNome: string, alertasFornecedor: Alerta[]) => {
    const produtosIds = alertasFornecedor.map(a => a.produto_id)
    verificarPedidoEmAberto(fornecedorId, fornecedorNome, produtosIds, 'completo')
  }

  // Continuar com desconto apos ver o modal de pedido em aberto
  const handleContinuarComDesconto = () => {
    setPedidoAbertoModalOpen(false)
    setDescontarPedidos(true)
    setModalOpen(true)
  }

  // Callback quando usuario confirma criacao do pedido no modal
  // Em vez de criar o pedido diretamente, redireciona para a pagina de novo pedido
  // com os itens pre-preenchidos via sessionStorage
  const handleConfirmarPedido = (items: SugestaoItem[]) => {
    if (!selectedFornecedor || items.length === 0) return

    // Armazenar itens no sessionStorage para a pagina de novo pedido
    const itensParaPedido = items.map(item => ({
      produto_id: item.produto_id,
      id_produto_bling: item.id_produto_bling,
      codigo_produto: item.codigo,
      codigo_fornecedor: item.codigo_fornecedor,
      descricao: item.nome,
      unidade: 'UN',
      quantidade: item.sugestao_qtd,
      valor: item.valor_unitario,
      aliquota_ipi: 0,
      estoque_atual: item.estoque_atual,
      ean: item.gtin,
    }))

    sessionStorage.setItem('curva_pedido_itens', JSON.stringify(itensParaPedido))

    // Fechar modal e redirecionar para pagina de novo pedido
    setModalOpen(false)
    setSelectedFornecedor(null)
    router.push(`/compras/pedidos/novo?fornecedor_id=${selectedFornecedor.id}&from=curva`)
  }

  // Loading inicial com logo animada
  if (loading) {
    return (
      <RequirePermission permission="pedidos">
      <DashboardLayout>
        <PageLoader message="Calculando curvas ABC e carregando dados..." />
      </DashboardLayout>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="pedidos">
    <DashboardLayout>
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#344054]">Compras por Curva ABC</h1>
              <p className="text-sm text-[#838383] mt-1">
                Visao estrategica de fornecedores e produtos por classificacao
              </p>
            </div>
            <CurvaToggle value={tipoCurva} onChange={setTipoCurva} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Total Rupturas"
            value={alertasTotais.total}
            tooltip="Quantidade total de produtos com estoque igual ou abaixo do minimo em todos os fornecedores"
            color="gray"
            icon={
              <svg className="w-5 h-5 text-[#667085]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
          />
          <KPICard
            label="Rupturas Curva A"
            value={rupturasPorCurva.A}
            subValue="Alto impacto"
            tooltip="Produtos curva A (maior impacto em faturamento/quantidade) com estoque critico. Prioridade maxima!"
            color="red"
            icon={
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <KPICard
            label="Rupturas Curva B"
            value={rupturasPorCurva.B}
            subValue="Medio impacto"
            tooltip="Produtos curva B (impacto medio em faturamento/quantidade) com estoque critico"
            color="amber"
            icon={
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KPICard
            label="Valor em Risco"
            value={formatCurrency(totais.valor_ruptura_total)}
            subValue="Faturamento 90d"
            tooltip="Valor estimado de faturamento perdido devido aos produtos em ruptura, baseado nos ultimos 90 dias"
            color="blue"
            icon={
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Fornecedores Table */}
          <div className="lg:col-span-2 bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#344054]">
                  Fornecedores
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F2F4F7] text-[#667085]">
                  {fornecedores.length}
                </span>
              </div>
              <Tooltip content="Clique no nome do fornecedor para ver detalhes e criar pedidos" position="left">
                <InfoIcon className="w-4 h-4 text-[#838383] cursor-help" />
              </Tooltip>
            </div>
            <FornecedorCurvaTable
              fornecedores={fornecedores}
              tipoCurva={tipoCurva}
              loading={loading}
            />
          </div>

          {/* Alertas Panel */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#344054]">
                Alertas por Urgencia
              </h2>
              <Tooltip content="Produtos agrupados por cobertura de estoque. Critica = estoque acaba antes do pedido chegar" position="left">
                <InfoIcon className="w-4 h-4 text-[#838383] cursor-help" />
              </Tooltip>
            </div>
            <AlertasUrgenciaPanel
              alertas={alertas}
              totais={alertasTotais}
              loading={loading}
              tipoCurva={tipoCurva}
              onPedidoRapido={handlePedidoRapido}
              onVerSugestoes={handleVerSugestoes}
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-[20px] p-5">
          <div className="flex gap-4">
            <div className="shrink-0 p-2.5 bg-blue-100 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Sobre as Curvas ABC</h4>
              <p className="text-sm text-blue-700">
                <strong>Faturamento:</strong> Baseado no valor vendido (preco x quantidade) - identifica produtos com maior impacto financeiro.{' '}
                <strong>Quantidade:</strong> Baseado no giro de vendas (unidades vendidas) - identifica produtos com maior demanda.
                Produtos Curva A em qualquer classificacao sao considerados <strong>CRITICOS</strong> quando em ruptura.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pedido em Aberto (aviso) */}
      {selectedFornecedor && (
        <PedidoEmAbertoModal
          isOpen={pedidoAbertoModalOpen}
          onClose={() => {
            setPedidoAbertoModalOpen(false)
            setSelectedFornecedor(null)
            setPedidosEmAberto([])
            setItensJaPedidos([])
          }}
          fornecedorNome={selectedFornecedor.nome}
          pedidos={pedidosEmAberto}
          itens={itensJaPedidos}
          loading={pedidoAbertoLoading}
          onContinuar={handleContinuarComDesconto}
        />
      )}

      {/* Modal de Sugestao de Pedido */}
      {selectedFornecedor && (
        <SugestaoModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setSelectedFornecedor(null)
            setDescontarPedidos(false)
          }}
          fornecedorId={selectedFornecedor.id}
          fornecedorNome={selectedFornecedor.nome}
          onCriarPedido={handleConfirmarPedido}
          autoCalculate={true}
          produtosPreSelecionados={selectedFornecedor.produtosIds}
          modo={modalModo}
          descontarPedidosAbertos={descontarPedidos}
        />
      )}
    </DashboardLayout>
    </RequirePermission>
  )
}
