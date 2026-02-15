'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip'

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

interface AlertasUrgenciaPanelProps {
  alertas: {
    CRITICA?: Alerta[]
    ALTA?: Alerta[]
    MEDIA?: Alerta[]
    OK?: Alerta[]
  }
  totais: {
    CRITICA: number
    ALTA: number
    MEDIA: number
    total: number
  }
  loading?: boolean
  tipoCurva?: 'faturamento' | 'quantidade'
  // Duas opcoes de acao:
  // 1. onPedidoRapido - Cria pedido direto so com rupturas (modo rapido)
  // 2. onVerSugestoes - Abre modal completo com rupturas + sugestoes adicionais
  onPedidoRapido?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
  onVerSugestoes?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
  // Manter compatibilidade com versao anterior (usa onVerSugestoes se passado)
  onCriarPedido?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
}

const urgenciaConfig = {
  CRITICA: {
    label: 'Criticas',
    tooltip: 'Estoque acaba ANTES do pedido chegar! Cobertura menor que prazo de entrega. Acao imediata necessaria',
    bgHeader: 'bg-red-600',
    bgContent: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    hoverBg: 'hover:bg-red-100/50',
    btnBg: 'bg-red-600 hover:bg-red-700',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  ALTA: {
    label: 'Altas',
    tooltip: 'Estoque no limite, sem margem de seguranca. Cobertura menor que prazo + margem. Atencao recomendada',
    bgHeader: 'bg-orange-500',
    bgContent: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    hoverBg: 'hover:bg-orange-100/50',
    btnBg: 'bg-orange-500 hover:bg-orange-600',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  MEDIA: {
    label: 'Medias',
    tooltip: 'Estoque baixo, precisa pedir logo. Cobertura menor que 1.5x dias necessarios',
    bgHeader: 'bg-amber-500',
    bgContent: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    hoverBg: 'hover:bg-amber-100/50',
    btnBg: 'bg-amber-500 hover:bg-amber-600',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
}

// Agrupa alertas por fornecedor
function agruparPorFornecedor(alertas: Alerta[]): Map<number, { nome: string; cnpj: string; alertas: Alerta[] }> {
  const map = new Map<number, { nome: string; cnpj: string; alertas: Alerta[] }>()

  alertas.forEach((a) => {
    if (!map.has(a.fornecedor_id)) {
      map.set(a.fornecedor_id, { nome: a.fornecedor_nome, cnpj: a.fornecedor_cnpj, alertas: [] })
    }
    map.get(a.fornecedor_id)!.alertas.push(a)
  })

  return map
}

// Formatar CNPJ
function formatCNPJ(cnpj: string): string {
  if (!cnpj) return ''
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function FornecedorGroup({
  fornecedorId,
  fornecedorNome,
  fornecedorCnpj,
  alertas,
  config,
  onPedidoRapido,
  onVerSugestoes,
}: {
  fornecedorId: number
  fornecedorNome: string
  fornecedorCnpj: string
  alertas: Alerta[]
  config: typeof urgenciaConfig.CRITICA
  onPedidoRapido?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
  onVerSugestoes?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
}) {
  const hasActions = onPedidoRapido || onVerSugestoes

  return (
    <div className="mb-3 last:mb-0">
      {/* Fornecedor Header */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex flex-col">
          <Link
            href={`/compras/curva/${fornecedorId}`}
            className={`text-xs font-semibold ${config.textColor} hover:underline flex items-center gap-1`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {fornecedorNome}
          </Link>
          {fornecedorCnpj && (
            <span className="text-[10px] text-[#838383] ml-4">{formatCNPJ(fornecedorCnpj)}</span>
          )}
        </div>
        <span className="text-xs text-[#838383]">{alertas.length} itens</span>
      </div>

      {/* Produtos do fornecedor - lista completa sem limite */}
      <ul className="space-y-1 mb-2">
        {alertas.map((a) => (
          <li key={a.produto_id}>
            <div className={`p-2 rounded-lg ${config.hoverBg} transition-colors`}>
              <div className={`font-medium text-xs truncate ${config.textColor}`}>
                {a.produto_nome}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-[#838383]">
                  Est: {a.estoque_atual} | Cob: {a.dias_cobertura !== null ? `${a.dias_cobertura.toFixed(0)}d` : '-'}
                </span>
                <span className={`text-[10px] font-medium ${
                  a.urgencia === 'CRITICA' ? 'text-red-600' :
                  a.urgencia === 'ALTA' ? 'text-orange-600' :
                  'text-amber-600'
                }`}>
                  {a.urgencia}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Botoes de acao por fornecedor */}
      {hasActions && (
        <div className="flex gap-2">
          {/* Botao Pedido Rapido - so rupturas */}
          {onPedidoRapido && (
            <button
              onClick={() => onPedidoRapido(fornecedorId, fornecedorNome, alertas)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium ${config.btnBg} text-white transition-colors flex items-center justify-center gap-1`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Rapido ({alertas.length})
            </button>
          )}
          {/* Botao Ver Sugestoes - abre modal completo */}
          {onVerSugestoes && (
            <button
              onClick={() => onVerSugestoes(fornecedorId, fornecedorNome, alertas)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-[#336FB6] hover:bg-[#2a5a94] text-white transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Sugestoes
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function UrgenciaSection({
  urgencia,
  alertas,
  tipoCurva,
  onPedidoRapido,
  onVerSugestoes,
}: {
  urgencia: 'CRITICA' | 'ALTA' | 'MEDIA'
  alertas: Alerta[]
  tipoCurva: 'faturamento' | 'quantidade'
  onPedidoRapido?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
  onVerSugestoes?: (fornecedorId: number, fornecedorNome: string, alertas: Alerta[]) => void
}) {
  const [expanded, setExpanded] = useState(urgencia === 'CRITICA' || urgencia === 'ALTA')
  const config = urgenciaConfig[urgencia]

  // A urgencia agora e baseada em cobertura de estoque, nao em curva ABC
  // A API ja retorna os produtos agrupados pela urgencia correta
  const alertasFiltrados = alertas

  // Agrupar por fornecedor
  const fornecedoresMap = useMemo(() => agruparPorFornecedor(alertasFiltrados), [alertasFiltrados])
  const fornecedores = Array.from(fornecedoresMap.entries())

  if (alertasFiltrados.length === 0) return null

  return (
    <div className={`rounded-xl border ${config.borderColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 ${config.bgHeader} text-white transition-opacity hover:opacity-95`}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-semibold">{config.label}</span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm font-medium">
            {alertasFiltrados.length}
          </span>
          <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
            {fornecedores.length} fornec.
          </span>
        </div>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className={`${config.bgContent} p-3`}>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-[#838383]">
              Agrupado por fornecedor ({tipoCurva === 'faturamento' ? 'Fat' : 'Qtd'})
            </span>
            <Tooltip content={config.tooltip} position="left">
              <InfoIcon className="w-3.5 h-3.5 text-[#838383] cursor-help" />
            </Tooltip>
          </div>

          <div className="space-y-4">
            {fornecedores.map(([fornecedorId, { nome, cnpj, alertas: fornAlerts }]) => (
              <FornecedorGroup
                key={fornecedorId}
                fornecedorId={fornecedorId}
                fornecedorNome={nome}
                fornecedorCnpj={cnpj}
                alertas={fornAlerts}
                config={config}
                onPedidoRapido={onPedidoRapido}
                onVerSugestoes={onVerSugestoes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AlertasUrgenciaPanel({
  alertas,
  totais,
  loading,
  tipoCurva = 'faturamento',
  onPedidoRapido,
  onVerSugestoes,
  onCriarPedido, // Compatibilidade: se passado, usa como onVerSugestoes
}: AlertasUrgenciaPanelProps) {
  // Compatibilidade com versao anterior
  const handlePedidoRapido = onPedidoRapido
  const handleVerSugestoes = onVerSugestoes || onCriarPedido
  // Recalcular totais baseado na curva selecionada
  const totaisFiltrados = useMemo(() => {
    const calcularTotal = (lista: Alerta[] | undefined) => {
      if (!lista) return 0
      return lista.length
    }

    const critica = calcularTotal(alertas.CRITICA)
    const alta = calcularTotal(alertas.ALTA)
    const media = calcularTotal(alertas.MEDIA)

    return {
      CRITICA: critica,
      ALTA: alta,
      MEDIA: media,
      total: critica + alta + media,
    }
  }, [alertas])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#F5F5F5] rounded-xl" />
        ))}
      </div>
    )
  }

  if (totaisFiltrados.total === 0) {
    return (
      <div className="text-center py-12 bg-[#FBFBFB] rounded-xl border border-[#EDEDED]">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[#344054] font-medium">Tudo certo!</p>
        <p className="text-sm text-[#838383] mt-1">
          Nenhum produto em ruptura por {tipoCurva === 'faturamento' ? 'faturamento' : 'quantidade'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <UrgenciaSection urgencia="CRITICA" alertas={alertas.CRITICA || []} tipoCurva={tipoCurva} onPedidoRapido={handlePedidoRapido} onVerSugestoes={handleVerSugestoes} />
      <UrgenciaSection urgencia="ALTA" alertas={alertas.ALTA || []} tipoCurva={tipoCurva} onPedidoRapido={handlePedidoRapido} onVerSugestoes={handleVerSugestoes} />
      <UrgenciaSection urgencia="MEDIA" alertas={alertas.MEDIA || []} tipoCurva={tipoCurva} onPedidoRapido={handlePedidoRapido} onVerSugestoes={handleVerSugestoes} />
    </div>
  )
}
