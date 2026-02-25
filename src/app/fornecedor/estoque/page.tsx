'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { LojistaSelectorDropdown } from '@/components/fornecedor/LojistaSelectorDropdown'
import { Skeleton } from '@/components/ui'

interface ProdutoEstoque {
  id: number
  codigo: string
  nome: string
  marca: string | null
  gtin: string | null
  estoque_atual: number
  estoque_minimo: number | null
  unidade: string | null
  itens_por_caixa: number | null
  curva: string | null
  valor_de_compra: number | null
  precocusto: number | null
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export default function FornecedorEstoquePage() {
  const { loading: authLoading } = useFornecedorAuth()
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchEstoque = useCallback(async () => {
    if (!empresaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/fornecedor/estoque?empresa_id=${empresaId}`)
      if (res.ok) {
        const data = await res.json()
        setProdutos(data.produtos || [])
      }
    } catch (err) {
      console.error('Erro ao carregar estoque:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    fetchEstoque()
  }, [fetchEstoque])

  const produtosFiltrados = debouncedSearch
    ? produtos.filter(
        (p) =>
          p.nome?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.codigo?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.gtin?.includes(debouncedSearch)
      )
    : produtos

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
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Estoque</h1>
            <p className="text-sm text-gray-500 mt-1">
              Visualize o estoque dos seus produtos nos lojistas
            </p>
          </div>
          <LojistaSelectorDropdown
            onSelect={(sel) => setEmpresaId(sel?.empresaId ?? null)}
          />
        </div>

        {/* Search */}
        {empresaId && (
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, codigo ou EAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
            />
          </div>
        )}

        {/* Table */}
        {!empresaId ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Selecione um lojista para ver o estoque.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : produtosFiltrados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                      <th className="px-6 py-4">Codigo</th>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Marca</th>
                      <th className="px-6 py-4">EAN</th>
                      <th className="px-6 py-4 text-right">Estoque Atual</th>
                      <th className="px-6 py-4 text-right">Estoque Min</th>
                      <th className="px-6 py-4 text-center">Curva</th>
                      <th className="px-6 py-4 text-right">Preco Compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produtosFiltrados.map((produto) => {
                      const estoqueAbaixo = produto.estoque_minimo != null && produto.estoque_atual < produto.estoque_minimo
                      return (
                        <tr key={produto.id} className="hover:bg-[#336FB6]/5 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-gray-700">{produto.codigo || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium max-w-xs truncate">{produto.nome}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{produto.marca || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">{produto.gtin || '-'}</td>
                          <td className={`px-6 py-4 text-sm text-right font-semibold ${estoqueAbaixo ? 'text-red-600' : 'text-gray-900'}`}>
                            {produto.estoque_atual}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-500">{produto.estoque_minimo ?? '-'}</td>
                          <td className="px-6 py-4 text-center">
                            {produto.curva ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                produto.curva === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                produto.curva === 'B' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {produto.curva}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-900">
                            {produto.valor_de_compra != null
                              ? `R$ ${produto.valor_de_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Nenhum produto encontrado.</p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mt-1">Tente buscar com outros termos</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
