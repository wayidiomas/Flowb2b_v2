'use client'

import { useState, useMemo } from 'react'
import { CurvaBadge } from './CurvaBadge'
import { RupturaIndicator } from './RupturaIndicator'
import { CoberturaBar } from './CoberturaBar'
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip'

type Urgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK'
type SortField = 'codigo' | 'nome' | 'curvaFat' | 'curvaQtd' | 'estoque' | 'cobertura' | 'urgencia' | 'vendas' | 'valorCompra'
type SortDirection = 'asc' | 'desc'

interface Produto {
  produto_id: number
  codigo: string
  nome: string
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

interface ProdutosCurvaTableProps {
  produtos: Produto[]
  selectedIds: number[]
  onSelectChange: (ids: number[]) => void
  loading?: boolean
  tipoCurva?: 'faturamento' | 'quantidade'
  prazoEntrega?: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function SortIcon({ direction, active }: { direction: SortDirection; active: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-colors ${active ? 'text-[#336FB6]' : 'text-[#C9C9C9]'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  )
}

function TableHeader({
  children,
  tooltip,
  className = '',
  sortField,
  currentSort,
  currentDirection,
  onSort,
}: {
  children: React.ReactNode
  tooltip?: string
  className?: string
  sortField?: SortField
  currentSort?: SortField
  currentDirection?: SortDirection
  onSort?: (field: SortField) => void
}) {
  const isSortable = sortField && onSort
  const isActive = currentSort === sortField

  return (
    <th className={`py-3 px-2 font-semibold text-[#344054] ${className}`}>
      <div
        className={`flex items-center justify-center gap-1 ${isSortable ? 'cursor-pointer select-none hover:text-[#336FB6] transition-colors' : ''}`}
        onClick={() => isSortable && onSort(sortField)}
      >
        {children}
        {isSortable && (
          <SortIcon direction={isActive ? currentDirection! : 'desc'} active={isActive} />
        )}
        {tooltip && (
          <Tooltip content={tooltip} position="top">
            <InfoIcon className="w-3.5 h-3.5 text-[#838383] cursor-help" />
          </Tooltip>
        )}
      </div>
    </th>
  )
}

export function ProdutosCurvaTable({
  produtos,
  selectedIds,
  onSelectChange,
  loading,
  tipoCurva = 'faturamento',
  prazoEntrega = 15,
}: ProdutosCurvaTableProps) {
  const [sortField, setSortField] = useState<SortField>('urgencia')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      // Defaults: urgencia asc, valores desc
      setSortDirection(['urgencia', 'codigo', 'nome', 'curvaFat', 'curvaQtd'].includes(field) ? 'asc' : 'desc')
    }
  }

  // Ordenar produtos
  const produtosOrdenados = useMemo(() => {
    const sorted = [...produtos]
    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'codigo':
          comparison = (a.codigo || '').localeCompare(b.codigo || '')
          break
        case 'nome':
          comparison = (a.nome || '').localeCompare(b.nome || '')
          break
        case 'curvaFat':
          comparison = (a.curva_fat || 'D').localeCompare(b.curva_fat || 'D')
          break
        case 'curvaQtd':
          comparison = (a.curva_qtd || 'D').localeCompare(b.curva_qtd || 'D')
          break
        case 'estoque':
          comparison = a.estoque_atual - b.estoque_atual
          break
        case 'cobertura':
          const cobA = a.dias_cobertura ?? 999
          const cobB = b.dias_cobertura ?? 999
          comparison = cobA - cobB
          break
        case 'urgencia':
          const urgOrder = { CRITICA: 1, ALTA: 2, MEDIA: 3, OK: 4 } as Record<string, number>
          comparison = (urgOrder[a.urgencia] || 4) - (urgOrder[b.urgencia] || 4)
          break
        case 'vendas':
          if (tipoCurva === 'faturamento') {
            comparison = a.faturamento_90d - b.faturamento_90d
          } else {
            comparison = a.quantidade_90d - b.quantidade_90d
          }
          break
        case 'valorCompra':
          comparison = (a.valor_compra || 0) - (b.valor_compra || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [produtos, sortField, sortDirection, tipoCurva])

  const handleSelectAll = () => {
    if (selectedIds.length === produtosOrdenados.length) {
      onSelectChange([])
    } else {
      onSelectChange(produtosOrdenados.map((p) => p.produto_id))
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectChange([...selectedIds, id])
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-[#F5F5F5] rounded-lg" />
        ))}
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-12 text-[#838383]">
        <svg className="w-12 h-12 mx-auto mb-3 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">Nenhum produto encontrado com os filtros aplicados</p>
      </div>
    )
  }

  const allSelected = selectedIds.length === produtosOrdenados.length && produtosOrdenados.length > 0

  return (
    <div className="overflow-auto max-h-[600px] rounded-lg border border-[#EDEDED]">
      <table className="w-full text-sm relative">
        <thead className="sticky top-0 z-10 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
          <tr className="bg-[#FBFBFB] border-b border-[#EDEDED]">
            <th className="py-3 px-3 w-10 bg-[#FBFBFB]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-[#D0D5DD] text-[#336FB6] focus:ring-[#336FB6] cursor-pointer"
              />
            </th>
            <TableHeader
              className="text-left bg-[#FBFBFB]"
              tooltip="Codigo interno do produto no sistema"
              sortField="codigo"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Codigo
            </TableHeader>
            <TableHeader
              className="text-left bg-[#FBFBFB]"
              tooltip="Nome do produto cadastrado"
              sortField="nome"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Produto
            </TableHeader>
            <TableHeader
              className="bg-[#FBFBFB]"
              tooltip="Classificacao ABC por valor de faturamento. A = maior impacto financeiro"
              sortField="curvaFat"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Curva Fat
            </TableHeader>
            <TableHeader
              className="bg-[#FBFBFB]"
              tooltip="Classificacao ABC por quantidade vendida. A = maior giro de vendas"
              sortField="curvaQtd"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Curva Qtd
            </TableHeader>
            <TableHeader
              className="bg-[#FBFBFB]"
              tooltip="Unidades em estoque atualmente"
              sortField="estoque"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Estoque
            </TableHeader>
            <TableHeader
              className="bg-[#FBFBFB]"
              tooltip="Dias de cobertura: quantos dias o estoque atual dura. Barra mostra comparativo com prazo de entrega"
              sortField="cobertura"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Cobertura
            </TableHeader>
            <TableHeader
              className="bg-[#FBFBFB]"
              tooltip="Urgencia baseada em cobertura de estoque vs prazo de entrega. CRITICA = estoque acaba antes do pedido chegar"
              sortField="urgencia"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Urgencia
            </TableHeader>
            <TableHeader
              className="text-right bg-[#FBFBFB]"
              tooltip={tipoCurva === 'faturamento'
                ? "Valor total vendido nos ultimos 90 dias (preco x quantidade)"
                : "Quantidade total de unidades vendidas nos ultimos 90 dias"
              }
              sortField="vendas"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              {tipoCurva === 'faturamento' ? 'Vendas 90d (R$)' : 'Vendas 90d (Un)'}
            </TableHeader>
            <TableHeader
              className="text-right bg-[#FBFBFB]"
              tooltip="Valor unitario de compra do produto com o fornecedor"
              sortField="valorCompra"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Valor Compra
            </TableHeader>
          </tr>
        </thead>
        <tbody>
          {produtosOrdenados.map((p, index) => (
            <tr
              key={p.produto_id}
              className={`border-b border-[#F0F0F0] transition-colors ${
                p.em_ruptura
                  ? 'bg-red-50/60 hover:bg-red-50'
                  : index % 2 === 0
                    ? 'bg-white hover:bg-[#FBFBFB]'
                    : 'bg-[#FAFAFA] hover:bg-[#F5F5F5]'
              }`}
            >
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.produto_id)}
                  onChange={() => handleSelectOne(p.produto_id)}
                  className="w-4 h-4 rounded border-[#D0D5DD] text-[#336FB6] focus:ring-[#336FB6] cursor-pointer"
                />
              </td>
              <td className="py-3 px-2">
                <span className="font-mono text-xs text-[#667085] bg-[#F2F4F7] px-2 py-1 rounded">
                  {p.codigo}
                </span>
              </td>
              <td className="py-3 px-2">
                <div className="font-medium text-[#344054] truncate max-w-[200px]" title={p.nome}>
                  {p.nome}
                </div>
              </td>
              <td className="py-3 px-2 text-center">
                <CurvaBadge curva={p.curva_fat} />
              </td>
              <td className="py-3 px-2 text-center">
                <CurvaBadge curva={p.curva_qtd} />
              </td>
              <td className="py-3 px-2 text-center">
                <span className={`font-semibold ${p.em_ruptura ? 'text-red-600' : 'text-[#344054]'}`}>
                  {formatNumber(p.estoque_atual)}
                </span>
              </td>
              <td className="py-3 px-2">
                <div className="flex justify-center">
                  <CoberturaBar
                    diasCobertura={p.dias_cobertura}
                    diasNecessarios={p.dias_necessarios}
                    prazoEntrega={prazoEntrega}
                    urgencia={p.urgencia}
                    compact
                  />
                </div>
              </td>
              <td className="py-3 px-2 text-center">
                <RupturaIndicator urgencia={p.urgencia} diasCobertura={p.dias_cobertura} />
              </td>
              <td className="py-3 px-2 text-right">
                {tipoCurva === 'faturamento' ? (
                  <span className="font-medium text-[#344054]">
                    {formatCurrency(p.faturamento_90d)}
                  </span>
                ) : (
                  <span className="font-medium text-[#344054]">
                    {formatNumber(p.quantidade_90d)} un
                  </span>
                )}
              </td>
              <td className="py-3 px-2 text-right text-[#667085]">
                {formatCurrency(p.valor_compra || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
