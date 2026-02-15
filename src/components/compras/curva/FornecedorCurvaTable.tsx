'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip'

interface CurvaData {
  A: { total: number; ruptura: number }
  B: { total: number; ruptura: number }
  C: { total: number; ruptura: number }
  D: { total: number; ruptura: number }
}

interface PedidoEmAberto {
  numero: string
  data: string
  total: number
  situacao: number // 0=aberto, 3=parcial
}

interface Fornecedor {
  fornecedor_id: number
  fornecedor_nome: string
  fornecedor_cnpj: string
  total_produtos: number
  curva_faturamento: CurvaData
  curva_quantidade: CurvaData
  faturamento_90d: number
  ruptura_total: number
  valor_ruptura_estimado: number
  ultimo_pedido_data: string | null
  ultimo_pedido_valor: number | null
  dias_sem_pedido: number | null
  pedido_em_aberto: PedidoEmAberto | null
}

interface FornecedorCurvaTableProps {
  fornecedores: Fornecedor[]
  tipoCurva: 'faturamento' | 'quantidade'
  loading?: boolean
}

type SortField = 'nome' | 'curvaA' | 'curvaB' | 'curvaC' | 'ruptura' | 'ultimoPedido' | 'dias'
type SortDirection = 'asc' | 'desc'

// Formatar CNPJ
function formatCNPJ(cnpj: string): string {
  if (!cnpj) return ''
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
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

function CurvaCell({ total, ruptura, curva }: { total: number; ruptura: number; curva: 'A' | 'B' | 'C' | 'D' }) {
  const hasRuptura = ruptura > 0

  const colorConfig = {
    A: hasRuptura ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    B: hasRuptura ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200',
    C: hasRuptura ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
    D: hasRuptura ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <div className={`text-center px-2 py-1.5 rounded-lg border ${colorConfig[curva]}`}>
      <span className="font-semibold">{total}</span>
      {hasRuptura && (
        <span className="text-xs ml-1 opacity-75">({ruptura})</span>
      )}
    </div>
  )
}

export function FornecedorCurvaTable({
  fornecedores,
  tipoCurva,
  loading,
}: FornecedorCurvaTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('ruptura')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Handler para ordenacao
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Filtrar fornecedores pelo termo de busca
  const termo = search.toLowerCase().trim()
  const termoDigitos = termo.replace(/\D/g, '')

  const fornecedoresFiltrados = useMemo(() => {
    let filtered = termo
      ? fornecedores.filter(f => {
          const nome = f.fornecedor_nome?.toLowerCase() || ''
          const cnpj = f.fornecedor_cnpj?.replace(/\D/g, '') || ''
          const cnpjFormatado = formatCNPJ(f.fornecedor_cnpj || '').toLowerCase()

          const matchNome = nome.includes(termo)
          const matchCnpj = termoDigitos.length > 0 && cnpj.includes(termoDigitos)
          const matchCnpjFormat = cnpjFormatado.includes(termo)

          return matchNome || matchCnpj || matchCnpjFormat
        })
      : [...fornecedores]

    // Ordenar
    filtered.sort((a, b) => {
      const curvaA = tipoCurva === 'faturamento' ? a.curva_faturamento : a.curva_quantidade
      const curvaB = tipoCurva === 'faturamento' ? b.curva_faturamento : b.curva_quantidade

      let comparison = 0
      switch (sortField) {
        case 'nome':
          comparison = (a.fornecedor_nome || '').localeCompare(b.fornecedor_nome || '')
          break
        case 'curvaA':
          comparison = curvaA.A.ruptura - curvaB.A.ruptura || curvaA.A.total - curvaB.A.total
          break
        case 'curvaB':
          comparison = curvaA.B.ruptura - curvaB.B.ruptura || curvaA.B.total - curvaB.B.total
          break
        case 'curvaC':
          comparison = curvaA.C.ruptura - curvaB.C.ruptura || curvaA.C.total - curvaB.C.total
          break
        case 'ruptura':
          comparison = a.ruptura_total - b.ruptura_total
          break
        case 'ultimoPedido':
          const dateA = a.ultimo_pedido_data ? new Date(a.ultimo_pedido_data).getTime() : 0
          const dateB = b.ultimo_pedido_data ? new Date(b.ultimo_pedido_data).getTime() : 0
          comparison = dateA - dateB
          break
        case 'dias':
          comparison = (a.dias_sem_pedido ?? 999) - (b.dias_sem_pedido ?? 999)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [fornecedores, termo, termoDigitos, sortField, sortDirection, tipoCurva])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-[#F5F5F5] rounded-lg" />
        ))}
      </div>
    )
  }

  if (fornecedores.length === 0) {
    return (
      <div className="text-center py-12 text-[#838383]">
        <svg className="w-12 h-12 mx-auto mb-3 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-sm">Nenhum fornecedor encontrado</p>
      </div>
    )
  }

  return (
    <div>
      {/* Campo de busca */}
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#838383]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#EDEDED] rounded-xl bg-[#FBFBFB] focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] placeholder:text-[#C9C9C9] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#838383] hover:text-[#344054] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-[#838383] mt-1.5 ml-1">
            {fornecedoresFiltrados.length} de {fornecedores.length} fornecedores
          </p>
        )}
      </div>

      {/* Mensagem quando nao encontra resultados */}
      {fornecedoresFiltrados.length === 0 ? (
        <div className="text-center py-8 text-[#838383]">
          <svg className="w-10 h-10 mx-auto mb-2 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">Nenhum fornecedor encontrado para &quot;{search}&quot;</p>
        </div>
      ) : (
      <div className="overflow-auto max-h-[600px] rounded-lg border border-[#EDEDED]">
      <table className="w-full text-sm relative">
        <thead className="sticky top-0 z-10 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
          <tr className="bg-[#FBFBFB] border-b border-[#EDEDED]">
            <TableHeader
              className="text-left"
              tooltip="Nome do fornecedor. Clique para ver detalhes dos produtos"
              sortField="nome"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Fornecedor
            </TableHeader>
            <TableHeader
              tooltip="Produtos Curva A - Alto impacto. Numero entre parenteses indica rupturas"
              sortField="curvaA"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              <span className="text-emerald-600">A</span>
            </TableHeader>
            <TableHeader
              tooltip="Produtos Curva B - Medio impacto. Numero entre parenteses indica rupturas"
              sortField="curvaB"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              <span className="text-blue-600">B</span>
            </TableHeader>
            <TableHeader
              tooltip="Produtos Curva C - Baixo impacto. Numero entre parenteses indica rupturas"
              sortField="curvaC"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              <span className="text-amber-600">C</span>
            </TableHeader>
            <TableHeader
              tooltip="Total de produtos em ruptura (estoque critico baseado em cobertura)"
              sortField="ruptura"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Rupt.
            </TableHeader>
            <TableHeader
              tooltip="Ultimo pedido finalizado ou indicador de pedido em andamento (aguardando NF)"
              sortField="ultimoPedido"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Ult. Pedido
            </TableHeader>
            <TableHeader
              tooltip="Dias desde o ultimo pedido. Alerta amarelo se maior que 30 dias"
              sortField="dias"
              currentSort={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            >
              Dias
            </TableHeader>
          </tr>
        </thead>
        <tbody>
          {fornecedoresFiltrados.map((f, index) => {
            const curva = tipoCurva === 'faturamento' ? f.curva_faturamento : f.curva_quantidade
            const hasRupturaA = curva.A.ruptura > 0
            const diasSemPedidoAlerta = f.dias_sem_pedido && f.dias_sem_pedido > 30

            return (
              <tr
                key={f.fornecedor_id}
                className={`border-b border-[#F0F0F0] transition-colors ${
                  hasRupturaA
                    ? 'bg-red-50/40 hover:bg-red-50/60'
                    : index % 2 === 0
                      ? 'bg-white hover:bg-[#FBFBFB]'
                      : 'bg-[#FAFAFA] hover:bg-[#F5F5F5]'
                }`}
              >
                <td className="py-3 px-2">
                  <Link
                    href={`/compras/curva/${f.fornecedor_id}`}
                    className="block group"
                  >
                    <span className="font-medium text-[#344054] group-hover:text-[#336FB6] transition-colors">
                      {f.fornecedor_nome}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {f.fornecedor_cnpj && (
                        <span className="text-[10px] text-[#838383]">
                          {formatCNPJ(f.fornecedor_cnpj)}
                        </span>
                      )}
                      <span className="text-[10px] text-[#838383]">
                        {f.total_produtos} produtos
                      </span>
                    </div>
                  </Link>
                </td>
                <td className="py-3 px-1.5">
                  <CurvaCell total={curva.A.total} ruptura={curva.A.ruptura} curva="A" />
                </td>
                <td className="py-3 px-1.5">
                  <CurvaCell total={curva.B.total} ruptura={curva.B.ruptura} curva="B" />
                </td>
                <td className="py-3 px-1.5">
                  <CurvaCell total={curva.C.total} ruptura={curva.C.ruptura} curva="C" />
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full text-sm font-bold ${
                      f.ruptura_total > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-[#F2F4F7] text-[#667085]'
                    }`}
                  >
                    {f.ruptura_total}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  {f.pedido_em_aberto ? (
                    <Tooltip
                      content={`Pedido #${f.pedido_em_aberto.numero} em ${f.pedido_em_aberto.situacao === 0 ? 'aberto' : 'andamento'} - ${formatDate(f.pedido_em_aberto.data)} - R$ ${f.pedido_em_aberto.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      position="top"
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium cursor-help">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Em andamento
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="text-[#667085]">{formatDate(f.ultimo_pedido_data)}</span>
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-md text-sm font-medium ${
                      diasSemPedidoAlerta
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-[#667085]'
                    }`}
                  >
                    {f.dias_sem_pedido ?? '-'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    )}
    </div>
  )
}
