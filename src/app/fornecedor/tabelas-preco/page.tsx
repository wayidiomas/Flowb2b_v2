'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { LojistaSelectorDropdown } from '@/components/fornecedor/LojistaSelectorDropdown'
import { Button, Skeleton } from '@/components/ui'
import type { TabelaPreco, ItemTabelaPreco } from '@/types/tabela-preco'

const statusColors: Record<string, string> = {
  ativa: 'bg-emerald-100 text-emerald-700',
  inativa: 'bg-gray-100 text-gray-500',
  expirada: 'bg-red-100 text-red-600',
}

const statusLabels: Record<string, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  expirada: 'Expirada',
}

export default function FornecedorTabelasPrecoPage() {
  const { loading: authLoading } = useFornecedorAuth()
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedItens, setExpandedItens] = useState<ItemTabelaPreco[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  const fetchTabelas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (empresaId) params.set('empresa_id', String(empresaId))
      const res = await fetch(`/api/fornecedor/tabelas-preco?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTabelas(data.tabelas || [])
      }
    } catch (err) {
      console.error('Erro ao carregar tabelas:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (!authLoading) fetchTabelas()
  }, [fetchTabelas, authLoading])

  const toggleExpand = async (tabelaId: number) => {
    if (expandedId === tabelaId) {
      setExpandedId(null)
      setExpandedItens([])
      return
    }
    setExpandedId(tabelaId)
    setLoadingItens(true)
    try {
      const res = await fetch(`/api/fornecedor/tabelas-preco/${tabelaId}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedItens(data.itens || [])
      } else {
        setExpandedItens([])
      }
    } catch {
      setExpandedItens([])
    } finally {
      setLoadingItens(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">Tabelas de Preco</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie suas tabelas de preco por lojista
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <LojistaSelectorDropdown
              onSelect={(sel) => setEmpresaId(sel?.empresaId ?? null)}
            />
            <Link href="/fornecedor/tabelas-preco/nova">
              <Button className="bg-[#336FB6] hover:bg-[#2660a5] text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nova Tabela
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : tabelas.length > 0 ? (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Lojista</th>
                      <th className="px-6 py-4">Vigencia</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Itens</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tabelas.map((tabela) => {
                      const isExpanded = expandedId === tabela.id
                      return (
                        <Fragment key={tabela.id}>
                          <tr className="hover:bg-[#336FB6]/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{tabela.nome}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{tabela.empresa_nome || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {tabela.vigencia_inicio && tabela.vigencia_fim
                                ? `${new Date(tabela.vigencia_inicio).toLocaleDateString('pt-BR')} - ${new Date(tabela.vigencia_fim).toLocaleDateString('pt-BR')}`
                                : tabela.vigencia_inicio
                                ? `A partir de ${new Date(tabela.vigencia_inicio).toLocaleDateString('pt-BR')}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[tabela.status] || 'bg-gray-100 text-gray-600'}`}>
                                {statusLabels[tabela.status] || tabela.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                              {tabela.total_itens ?? 0}
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#FFAA11] text-[#FFAA11] hover:bg-[#FFAA11] hover:text-white"
                                onClick={() => toggleExpand(tabela.id)}
                              >
                                {isExpanded ? 'Fechar' : 'Ver detalhes'}
                              </Button>
                            </td>
                          </tr>
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
                                              <td className="px-4 py-2 text-right text-gray-500">
                                                {item.preco_original ? (
                                                  <span className="line-through">{formatCurrency(item.preco_original)}</span>
                                                ) : '-'}
                                              </td>
                                              <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                {formatCurrency(item.preco_tabela)}
                                              </td>
                                              <td className="px-6 py-2 text-right">
                                                {item.desconto_percentual ? (
                                                  <span className="text-green-600 font-medium">-{item.desconto_percentual.toFixed(1)}%</span>
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
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {tabelas.map((tabela) => {
                  const isExpanded = expandedId === tabela.id
                  return (
                    <div key={tabela.id}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900">{tabela.nome}</p>
                            <p className="text-xs text-gray-600 mt-0.5 truncate">{tabela.empresa_nome || '-'}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusColors[tabela.status] || 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[tabela.status] || tabela.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="text-xs text-gray-500">
                            {tabela.vigencia_inicio && tabela.vigencia_fim
                              ? `${new Date(tabela.vigencia_inicio).toLocaleDateString('pt-BR')} - ${new Date(tabela.vigencia_fim).toLocaleDateString('pt-BR')}`
                              : tabela.vigencia_inicio
                              ? `A partir de ${new Date(tabela.vigencia_inicio).toLocaleDateString('pt-BR')}`
                              : '-'}
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{tabela.total_itens ?? 0} itens</span>
                        </div>
                        <button
                          onClick={() => toggleExpand(tabela.id)}
                          className="mt-3 w-full py-2 text-sm font-medium text-[#FFAA11] border border-[#FFAA11] rounded-xl hover:bg-[#FFAA11]/10 transition-colors"
                        >
                          {isExpanded ? 'Fechar' : 'Ver detalhes'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                          {loadingItens ? (
                            <div className="py-4 text-center">
                              <div className="animate-spin h-5 w-5 border-2 border-[#336FB6] border-t-transparent rounded-full mx-auto" />
                              <p className="text-xs text-gray-500 mt-2">Carregando itens...</p>
                            </div>
                          ) : expandedItens.length === 0 ? (
                            <div className="py-4 text-center text-sm text-gray-500">
                              Nenhum item nesta tabela
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {expandedItens.map((item) => (
                                <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.nome || '-'}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    <span className="font-mono">{item.codigo || '-'}</span>
                                    {item.unidade && (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span>{item.unidade}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                      {item.preco_original && (
                                        <span className="text-xs text-gray-400 line-through">{formatCurrency(item.preco_original)}</span>
                                      )}
                                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.preco_tabela)}</span>
                                    </div>
                                    {item.desconto_percentual ? (
                                      <span className="text-xs font-medium text-green-600">-{item.desconto_percentual.toFixed(1)}%</span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {tabela.observacao && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Obs:</span> {tabela.observacao}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6Z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nenhuma tabela de preco encontrada.</p>
              <p className="text-sm text-gray-400 mt-1">Clique em &quot;Nova Tabela&quot; para criar uma.</p>
            </div>
          )}
        </div>
      </div>
    </FornecedorLayout>
  )
}
