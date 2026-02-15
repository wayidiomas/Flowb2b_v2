'use client'

import { useState, useEffect } from 'react'
import { CurvaBadge } from './CurvaBadge'
import { RupturaIndicator } from './RupturaIndicator'
import { InlineLoader } from '@/components/ui/PageLoader'

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

interface SugestaoModalProps {
  isOpen: boolean
  onClose: () => void
  fornecedorId: number
  fornecedorNome: string
  onCriarPedido: (items: SugestaoItem[]) => void
  autoCalculate?: boolean // Calcular automaticamente ao abrir
  produtosPreSelecionados?: number[] // IDs de produtos para pré-selecionar
  modo?: 'rapido' | 'completo' // rapido = so rupturas, completo = rupturas + sugestoes
  descontarPedidosAbertos?: boolean // Descontar itens ja pedidos em pedidos abertos
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

function ItemRow({
  item,
  isSelected,
  quantidade,
  onToggleSelect,
  onQuantidadeChange,
}: {
  item: SugestaoItem
  isSelected: boolean
  quantidade: number
  onToggleSelect: () => void
  onQuantidadeChange: (value: number) => void
}) {
  const valorItem = quantidade * item.valor_unitario

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${item.em_ruptura ? 'bg-red-50/50' : ''}`}>
      <td className="py-3 px-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-gray-300 text-[#336FB6] focus:ring-[#336FB6]"
        />
      </td>
      <td className="py-3 px-2">
        <div className="font-medium text-gray-900 truncate max-w-[200px]">{item.nome}</div>
        <div className="text-xs text-gray-500">{item.codigo}</div>
      </td>
      <td className="py-3 px-2 text-center">
        <CurvaBadge curva={item.curva_fat} />
      </td>
      <td className="py-3 px-2 text-center">
        <span className={item.em_ruptura ? 'text-red-600 font-semibold' : 'text-gray-600'}>
          {item.estoque_atual}/{item.estoque_minimo}
        </span>
      </td>
      <td className="py-3 px-2 text-center text-gray-600">
        {item.media_diaria.toFixed(1)}
      </td>
      <td className="py-3 px-2 text-center">
        <input
          type="number"
          min="0"
          value={quantidade}
          onChange={(e) => onQuantidadeChange(parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1 text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-transparent text-sm"
        />
        {item.itens_por_caixa > 1 && (
          <div className="text-[10px] text-gray-400 mt-0.5">
            {Math.ceil(quantidade / item.itens_por_caixa)} cx
          </div>
        )}
      </td>
      <td className="py-3 px-2 text-right text-gray-700 text-sm">
        {formatCurrency(valorItem)}
      </td>
    </tr>
  )
}

function SectionHeader({
  title,
  count,
  total,
  color,
  icon,
  isExpanded,
  onToggle,
  onSelectAll,
  allSelected,
}: {
  title: string
  count: number
  total: string
  color: 'red' | 'blue'
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  onSelectAll: () => void
  allSelected: boolean
}) {
  const colors = {
    red: 'bg-red-600',
    blue: 'bg-[#336FB6]',
  }

  return (
    <div className={`${colors[color]} text-white rounded-t-xl px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="flex items-center gap-2">
          {icon}
          <span className="font-semibold">{title}</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{count}</span>
        </button>
        <span className="text-sm opacity-80">{total}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-white/30 text-white focus:ring-white/50"
          />
          Todos
        </label>
        <button onClick={onToggle} className="p-1">
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function SugestaoModal({
  isOpen,
  onClose,
  fornecedorId,
  fornecedorNome,
  onCriarPedido,
  autoCalculate = false,
  produtosPreSelecionados,
  modo = 'completo',
  descontarPedidosAbertos = false,
}: SugestaoModalProps) {
  const isRapido = modo === 'rapido'
  const [loading, setLoading] = useState(false)
  const [sugestoes, setSugestoes] = useState<SugestaoItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [quantidades, setQuantidades] = useState<Map<number, number>>(new Map())
  const [calculated, setCalculated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seções expandidas
  const [rupturasExpanded, setRupturasExpanded] = useState(true)
  const [sugestoesExpanded, setSugestoesExpanded] = useState(true)

  // Separar itens em ruptura dos sugeridos
  const itensRuptura = sugestoes.filter(s => s.em_ruptura)
  const itensSugeridos = sugestoes.filter(s => !s.em_ruptura)

  const handleCalcular = async () => {
    setLoading(true)
    setError(null)
    try {
      // Montar payload com filtros
      const payload: {
        fornecedor_id: number
        filtros?: { apenas_ruptura?: boolean; descontar_pedidos_abertos?: boolean }
      } = {
        fornecedor_id: fornecedorId,
      }

      // Adicionar filtros conforme necessario
      if (isRapido || descontarPedidosAbertos) {
        payload.filtros = {}
        if (isRapido) {
          payload.filtros.apenas_ruptura = true
        }
        if (descontarPedidosAbertos) {
          payload.filtros.descontar_pedidos_abertos = true
        }
      }

      const response = await fetch('/api/compras/curva/sugestao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular sugestao')
      }

      setSugestoes(data.sugestao || [])
      setCalculated(true)

      // Pré-selecionar: todos em ruptura + pré-selecionados
      const rupturaIds = (data.sugestao || [])
        .filter((s: SugestaoItem) => s.em_ruptura)
        .map((s: SugestaoItem) => s.produto_id)

      const preSelIds = produtosPreSelecionados || []
      const allIds = new Set<number>([...rupturaIds, ...preSelIds])
      setSelectedIds(allIds)

      // Inicializar quantidades com sugestao
      const qtdMap = new Map<number, number>()
      data.sugestao?.forEach((s: SugestaoItem) => {
        qtdMap.set(s.produto_id, s.sugestao_qtd)
      })
      setQuantidades(qtdMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Auto-calcular quando abrir
  useEffect(() => {
    if (isOpen && autoCalculate && !calculated && !loading) {
      handleCalcular()
    }
  }, [isOpen, autoCalculate])

  // Reset quando fechar
  useEffect(() => {
    if (!isOpen) {
      setCalculated(false)
      setSugestoes([])
      setSelectedIds(new Set())
      setQuantidades(new Map())
      setError(null)
    }
  }, [isOpen])

  const handleToggleSelect = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleSelectAllRupturas = () => {
    const rupturaIds = itensRuptura.map(s => s.produto_id)
    const allSelected = rupturaIds.every(id => selectedIds.has(id))

    const newSet = new Set(selectedIds)
    if (allSelected) {
      rupturaIds.forEach(id => newSet.delete(id))
    } else {
      rupturaIds.forEach(id => newSet.add(id))
    }
    setSelectedIds(newSet)
  }

  const handleSelectAllSugeridos = () => {
    const sugeridoIds = itensSugeridos.map(s => s.produto_id)
    const allSelected = sugeridoIds.every(id => selectedIds.has(id))

    const newSet = new Set(selectedIds)
    if (allSelected) {
      sugeridoIds.forEach(id => newSet.delete(id))
    } else {
      sugeridoIds.forEach(id => newSet.add(id))
    }
    setSelectedIds(newSet)
  }

  const handleQuantidadeChange = (id: number, value: number) => {
    const newMap = new Map(quantidades)
    newMap.set(id, Math.max(0, value))
    setQuantidades(newMap)
  }

  const handleCriarPedido = () => {
    const itemsSelecionados = sugestoes
      .filter(s => selectedIds.has(s.produto_id))
      .map(s => ({
        ...s,
        sugestao_qtd: quantidades.get(s.produto_id) || s.sugestao_qtd,
        valor_total: (quantidades.get(s.produto_id) || s.sugestao_qtd) * s.valor_unitario
      }))

    onCriarPedido(itemsSelecionados)
    onClose()
  }

  // Calcular totais
  const calcularTotal = (items: SugestaoItem[]) => {
    return items
      .filter(s => selectedIds.has(s.produto_id))
      .reduce((sum, s) => sum + ((quantidades.get(s.produto_id) || s.sugestao_qtd) * s.valor_unitario), 0)
  }

  const totalRupturas = calcularTotal(itensRuptura)
  const totalSugeridos = calcularTotal(itensSugeridos)
  const totalGeral = totalRupturas + totalSugeridos

  const rupturasSelecionadas = itensRuptura.filter(s => selectedIds.has(s.produto_id)).length
  const sugeridosSelecionados = itensSugeridos.filter(s => selectedIds.has(s.produto_id)).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                {isRapido ? (
                  <>
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Pedido Rapido - Rupturas
                  </>
                ) : (
                  'Pedido de Compra'
                )}
              </h2>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {fornecedorNome}
                {isRapido && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">So itens em ruptura</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {error && (
              <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {loading && <InlineLoader message="Calculando sugestao de compra..." />}

            {!calculated && !loading && (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700 mb-2">Calcular Sugestao de Compra</p>
                <p className="text-sm mb-4">
                  Baseado no historico de vendas, prazo de entrega e estoque atual
                </p>
                <button
                  onClick={handleCalcular}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-[#336FB6] rounded-lg hover:bg-[#2a5a94] transition-colors"
                >
                  Calcular Agora
                </button>
              </div>
            )}

            {calculated && !loading && sugestoes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700">Estoque em dia!</p>
                <p className="text-sm">Nenhuma sugestao de compra para este fornecedor</p>
              </div>
            )}

            {calculated && !loading && sugestoes.length > 0 && (
              <div className="p-4 space-y-4">
                {/* Seção: Itens em Ruptura */}
                {itensRuptura.length > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <SectionHeader
                      title="Necessario Comprar"
                      count={itensRuptura.length}
                      total={`${rupturasSelecionadas} sel. | ${formatCurrency(totalRupturas)}`}
                      color="red"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      }
                      isExpanded={rupturasExpanded}
                      onToggle={() => setRupturasExpanded(!rupturasExpanded)}
                      onSelectAll={handleSelectAllRupturas}
                      allSelected={itensRuptura.every(s => selectedIds.has(s.produto_id))}
                    />
                    {rupturasExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-red-50 text-red-800">
                              <th className="py-2 px-2 w-10"></th>
                              <th className="text-left py-2 px-2 font-medium">Produto</th>
                              <th className="text-center py-2 px-2 font-medium w-12">Curva</th>
                              <th className="text-center py-2 px-2 font-medium w-20">Estoque</th>
                              <th className="text-center py-2 px-2 font-medium w-16">Media/d</th>
                              <th className="text-center py-2 px-2 font-medium w-20">Qtd</th>
                              <th className="text-right py-2 px-2 font-medium w-24">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensRuptura.map((item) => (
                              <ItemRow
                                key={item.produto_id}
                                item={item}
                                isSelected={selectedIds.has(item.produto_id)}
                                quantidade={quantidades.get(item.produto_id) || item.sugestao_qtd}
                                onToggleSelect={() => handleToggleSelect(item.produto_id)}
                                onQuantidadeChange={(v) => handleQuantidadeChange(item.produto_id, v)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Seção: Sugestões Adicionais */}
                {itensSugeridos.length > 0 && (
                  <div className="border border-[#336FB6]/30 rounded-xl overflow-hidden">
                    <SectionHeader
                      title="Sugestoes Adicionais"
                      count={itensSugeridos.length}
                      total={`${sugeridosSelecionados} sel. | ${formatCurrency(totalSugeridos)}`}
                      color="blue"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      }
                      isExpanded={sugestoesExpanded}
                      onToggle={() => setSugestoesExpanded(!sugestoesExpanded)}
                      onSelectAll={handleSelectAllSugeridos}
                      allSelected={itensSugeridos.every(s => selectedIds.has(s.produto_id))}
                    />
                    {sugestoesExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[#336FB6]/5 text-[#336FB6]">
                              <th className="py-2 px-2 w-10"></th>
                              <th className="text-left py-2 px-2 font-medium">Produto</th>
                              <th className="text-center py-2 px-2 font-medium w-12">Curva</th>
                              <th className="text-center py-2 px-2 font-medium w-20">Estoque</th>
                              <th className="text-center py-2 px-2 font-medium w-16">Media/d</th>
                              <th className="text-center py-2 px-2 font-medium w-20">Qtd</th>
                              <th className="text-right py-2 px-2 font-medium w-24">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensSugeridos.map((item) => (
                              <ItemRow
                                key={item.produto_id}
                                item={item}
                                isSelected={selectedIds.has(item.produto_id)}
                                quantidade={quantidades.get(item.produto_id) || item.sugestao_qtd}
                                onToggleSelect={() => handleToggleSelect(item.produto_id)}
                                onQuantidadeChange={(v) => handleQuantidadeChange(item.produto_id, v)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {calculated && sugestoes.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-red-600">{rupturasSelecionadas} rupturas</span>
                {' + '}
                <span className="font-medium text-[#336FB6]">{sugeridosSelecionados} sugestoes</span>
                {' = '}
                <span className="font-bold">{selectedIds.size} itens</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total do pedido</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalGeral)}
                  </div>
                </div>
                <button
                  onClick={handleCriarPedido}
                  disabled={selectedIds.size === 0}
                  className="px-6 py-3 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Continuar para Pedido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
