'use client'

import { useState, useEffect, Fragment } from 'react'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { TableSkeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { TabelaPreco, ItemTabelaPreco } from '@/types/tabela-preco'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  ativa: { label: 'Ativa', bg: 'bg-green-100', text: 'text-green-800' },
  inativa: { label: 'Inativa', bg: 'bg-gray-100', text: 'text-gray-700' },
  expirada: { label: 'Expirada', bg: 'bg-red-100', text: 'text-red-800' },
}

interface TabelaComItens extends TabelaPreco {
  fornecedor_nome?: string
  itens_tabela_preco?: ItemTabelaPreco[] | { count: number }[]
}

export default function TabelasPrecoPage() {
  const { empresa } = useAuth()
  const [tabelas, setTabelas] = useState<TabelaComItens[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('todos')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedItens, setExpandedItens] = useState<ItemTabelaPreco[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  useEffect(() => {
    if (!empresa?.id) return
    fetchTabelas()
  }, [empresa?.id])

  const fetchTabelas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/compras/tabelas-preco')
      const data = await res.json()
      setTabelas(data.tabelas || [])
    } catch (error) {
      console.error('Erro ao buscar tabelas de preco:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = async (tabelaId: number) => {
    if (expandedId === tabelaId) {
      setExpandedId(null)
      setExpandedItens([])
      return
    }

    setExpandedId(tabelaId)
    setLoadingItens(true)
    try {
      const res = await fetch(`/api/compras/tabelas-preco?tabela_id=${tabelaId}`)
      const data = await res.json()
      setExpandedItens(data.itens || [])
    } catch (error) {
      console.error('Erro ao buscar itens:', error)
      setExpandedItens([])
    } finally {
      setLoadingItens(false)
    }
  }

  // Unique fornecedores for filter
  const fornecedorNomes = Array.from(
    new Set(
      tabelas
        .filter((t) => t.fornecedor_nome)
        .map((t) => t.fornecedor_nome!)
    )
  )

  const filteredTabelas = tabelas.filter((t) => {
    const fornecedorNome = t.fornecedor_nome || ''
    const matchSearch =
      fornecedorNome.toLowerCase().includes(search.toLowerCase()) ||
      t.nome.toLowerCase().includes(search.toLowerCase())
    const matchFornecedor =
      fornecedorFilter === 'todos' || t.fornecedor_nome === fornecedorFilter
    return matchSearch && matchFornecedor
  })

  const getItemCount = (tabela: TabelaComItens): number => {
    if (!tabela.itens_tabela_preco) return 0
    if (Array.isArray(tabela.itens_tabela_preco) && tabela.itens_tabela_preco.length > 0) {
      const first = tabela.itens_tabela_preco[0]
      if ('count' in first) return (first as { count: number }).count
      return tabela.itens_tabela_preco.length
    }
    return 0
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <DashboardLayout>
      <PageHeader title="Tabelas de Preco" subtitle="Tabelas recebidas de fornecedores" />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por fornecedor ou nome da tabela..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
            />
          </div>

          {/* Fornecedor filter */}
          <select
            value={fornecedorFilter}
            onChange={(e) => setFornecedorFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] bg-white"
          >
            <option value="todos">Todos os fornecedores</option>
            {fornecedorNomes.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                <th className="w-10 px-4 py-3 bg-gray-50/50" />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Fornecedor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Nome da Tabela</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Vigencia</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Itens</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase bg-gray-50/50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={5} rows={5} />
              ) : filteredTabelas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <TagIcon />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Nenhuma tabela de preco encontrada</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {search || fornecedorFilter !== 'todos'
                            ? 'Tente ajustar os filtros'
                            : 'Quando fornecedores criarem tabelas de preco, elas aparecerao aqui'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTabelas.map((tabela) => {
                  const sConfig = statusConfig[tabela.status] || statusConfig.inativa
                  const isExpanded = expandedId === tabela.id
                  const itemCount = getItemCount(tabela)

                  return (
                    <Fragment key={tabela.id}>
                      <tr
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50/30' : ''}`}
                        onClick={() => toggleExpand(tabela.id)}
                      >
                        <td className="px-4 py-3">
                          <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDownIcon />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {tabela.fornecedor_nome || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{tabela.nome}</td>
                        <td className="px-4 py-3 text-center text-gray-600 text-xs">
                          {tabela.vigencia_inicio && tabela.vigencia_fim ? (
                            <>
                              {new Date(tabela.vigencia_inicio).toLocaleDateString('pt-BR')}
                              {' - '}
                              {new Date(tabela.vigencia_fim).toLocaleDateString('pt-BR')}
                            </>
                          ) : tabela.vigencia_inicio ? (
                            <>A partir de {new Date(tabela.vigencia_inicio).toLocaleDateString('pt-BR')}</>
                          ) : (
                            'Sem vigencia definida'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{itemCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sConfig.bg} ${sConfig.text}`}>
                            {sConfig.label}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded items row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0">
                            <div className="bg-gray-50 border-y border-gray-200">
                              {loadingItens ? (
                                <div className="p-6 text-center">
                                  <div className="animate-spin h-5 w-5 border-2 border-[#336FB6] border-t-transparent rounded-full mx-auto" />
                                  <p className="text-xs text-gray-500 mt-2">Carregando itens...</p>
                                </div>
                              ) : expandedItens.length === 0 ? (
                                <div className="p-6 text-center text-sm text-gray-500">
                                  Nenhum item nesta tabela
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr>
                                        <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase">Codigo</th>
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Produto</th>
                                        <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">Unidade</th>
                                        <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">Cx.</th>
                                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Preco Original</th>
                                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Preco Tabela</th>
                                        <th className="text-right px-6 py-2 text-xs font-medium text-gray-500 uppercase">Desconto</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {expandedItens.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/50">
                                          <td className="px-6 py-2 text-gray-600">{item.codigo || '-'}</td>
                                          <td className="px-4 py-2 text-gray-900">{item.nome || '-'}</td>
                                          <td className="px-4 py-2 text-center text-gray-600">{item.unidade || '-'}</td>
                                          <td className="px-4 py-2 text-center text-gray-600">{item.itens_por_caixa || '-'}</td>
                                          <td className="px-4 py-2 text-right text-gray-500">
                                            {item.preco_original ? (
                                              <span className="line-through">{formatCurrency(item.preco_original)}</span>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                                            {formatCurrency(item.preco_tabela)}
                                          </td>
                                          <td className="px-6 py-2 text-right">
                                            {item.desconto_percentual ? (
                                              <span className="text-green-600 font-medium">
                                                -{item.desconto_percentual.toFixed(1)}%
                                              </span>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {tabela.observacao && (
                                <div className="px-6 py-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-500">
                                    <span className="font-medium">Observacao:</span> {tabela.observacao}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
