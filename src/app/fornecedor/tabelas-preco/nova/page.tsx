'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { LojistaSelectorDropdown } from '@/components/fornecedor/LojistaSelectorDropdown'
import { Button, Skeleton } from '@/components/ui'

interface ProdutoLojista {
  id: number
  codigo: string
  nome: string
  unidade: string | null
  itens_por_caixa: number | null
  valor_de_compra: number | null
}

interface ItemTabela {
  produto_id: number
  codigo: string
  nome: string
  unidade: string | null
  itens_por_caixa: number | null
  preco_original: number | null
  preco_tabela: string
  desconto_percentual: string
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export default function NovaTabelaPrecoPage() {
  const { loading: authLoading } = useFornecedorAuth()
  const router = useRouter()

  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [fornecedorId, setFornecedorId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [vigenciaInicio, setVigenciaInicio] = useState('')
  const [vigenciaFim, setVigenciaFim] = useState('')
  const [observacao, setObservacao] = useState('')
  const [itens, setItens] = useState<ItemTabela[]>([])
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<ProdutoLojista[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [searchProduto, setSearchProduto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')

  const fetchProdutos = useCallback(async () => {
    if (!empresaId) return
    setLoadingProdutos(true)
    try {
      const res = await fetch(`/api/fornecedor/estoque?empresa_id=${empresaId}`)
      if (res.ok) {
        const data = await res.json()
        setProdutosDisponiveis(
          (data.produtos || []).map((p: Record<string, unknown>) => ({
            id: p.id,
            codigo: p.codigo,
            nome: p.nome,
            unidade: p.unidade,
            itens_por_caixa: p.itens_por_caixa,
            valor_de_compra: p.valor_de_compra,
          }))
        )
      }
    } catch {
      console.error('Erro ao carregar produtos')
    } finally {
      setLoadingProdutos(false)
    }
  }, [empresaId])

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos])

  const handleSelectLojista = (sel: { empresaId: number; fornecedorId: number } | null) => {
    setEmpresaId(sel?.empresaId ?? null)
    setFornecedorId(sel?.fornecedorId ?? null)
    setItens([])
  }

  const adicionarProduto = (produto: ProdutoLojista) => {
    if (itens.find((i) => i.produto_id === produto.id)) return
    setItens((prev) => [
      ...prev,
      {
        produto_id: produto.id,
        codigo: produto.codigo,
        nome: produto.nome,
        unidade: produto.unidade,
        itens_por_caixa: produto.itens_por_caixa,
        preco_original: produto.valor_de_compra,
        preco_tabela: produto.valor_de_compra?.toFixed(2) || '',
        desconto_percentual: '0',
      },
    ])
    setSearchProduto('')
  }

  const removerItem = (produtoId: number) => {
    setItens((prev) => prev.filter((i) => i.produto_id !== produtoId))
  }

  const atualizarItem = (produtoId: number, field: 'preco_tabela' | 'desconto_percentual', value: string) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.produto_id !== produtoId) return item
        const updated = { ...item, [field]: value }
        // Auto-calcular desconto ou preco
        if (field === 'preco_tabela' && item.preco_original) {
          const precoTabela = parseFloat(value)
          if (!isNaN(precoTabela) && item.preco_original > 0) {
            updated.desconto_percentual = (((item.preco_original - precoTabela) / item.preco_original) * 100).toFixed(1)
          }
        } else if (field === 'desconto_percentual' && item.preco_original) {
          const desconto = parseFloat(value)
          if (!isNaN(desconto)) {
            updated.preco_tabela = (item.preco_original * (1 - desconto / 100)).toFixed(2)
          }
        }
        return updated
      })
    )
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setError('Informe o nome da tabela')
      return
    }
    if (!empresaId || !fornecedorId) {
      setError('Selecione um lojista')
      return
    }
    if (itens.length === 0) {
      setError('Adicione pelo menos um produto')
      return
    }

    setSalvando(true)
    setError('')
    try {
      const res = await fetch('/api/fornecedor/tabelas-preco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          nome: nome.trim(),
          vigencia_inicio: vigenciaInicio || null,
          vigencia_fim: vigenciaFim || null,
          observacao: observacao.trim() || null,
          itens: itens.map((i) => ({
            produto_id: i.produto_id,
            codigo: i.codigo,
            nome: i.nome,
            unidade: i.unidade,
            itens_por_caixa: i.itens_por_caixa,
            preco_original: i.preco_original,
            preco_tabela: parseFloat(i.preco_tabela) || 0,
            desconto_percentual: parseFloat(i.desconto_percentual) || 0,
          })),
        }),
      })

      if (res.ok) {
        router.push('/fornecedor/tabelas-preco')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao salvar tabela')
      }
    } catch {
      setError('Erro ao salvar tabela')
    } finally {
      setSalvando(false)
    }
  }

  const produtosFiltrados = searchProduto
    ? produtosDisponiveis.filter(
        (p) =>
          !itens.find((i) => i.produto_id === p.id) &&
          (p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
           p.codigo.toLowerCase().includes(searchProduto.toLowerCase()))
      )
    : []

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Nova Tabela de Preco</h1>
            <p className="text-sm text-gray-500 mt-1">Crie uma tabela de precos para um lojista</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/fornecedor/tabelas-preco')}>
            Cancelar
          </Button>
        </div>

        {/* Lojista selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <LojistaSelectorDropdown onSelect={handleSelectLojista} />
        </div>

        {empresaId && (
          <>
            {/* Info da tabela */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da tabela *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Tabela Janeiro 2026"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia inicio</label>
                  <input
                    type="date"
                    value={vigenciaInicio}
                    onChange={(e) => setVigenciaInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia fim</label>
                  <input
                    type="date"
                    value={vigenciaFim}
                    onChange={(e) => setVigenciaFim(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observacoes sobre a tabela..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Buscar produtos */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Adicionar Produtos</h2>
              {loadingProdutos ? (
                <Skeleton className="h-10" />
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar produto por nome ou codigo..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                  />
                  {/* Dropdown de resultados */}
                  {produtosFiltrados.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {produtosFiltrados.slice(0, 10).map((produto) => (
                        <button
                          key={produto.id}
                          onClick={() => adicionarProduto(produto)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-[#336FB6]/5 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-900">{produto.nome}</span>
                          <span className="text-gray-400 ml-2 font-mono text-xs">{produto.codigo}</span>
                          {produto.valor_de_compra != null && (
                            <span className="text-gray-500 ml-2 text-xs">
                              R$ {produto.valor_de_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabela de itens */}
            {itens.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                        <th className="px-4 py-3">Codigo</th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3 text-right">Preco Original</th>
                        <th className="px-4 py-3 text-right">Preco Tabela</th>
                        <th className="px-4 py-3 text-right">Desconto %</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itens.map((item) => (
                        <tr key={item.produto_id} className="hover:bg-[#336FB6]/5 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.codigo}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{item.nome}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-500">
                            {item.preco_original != null
                              ? `R$ ${item.preco_original.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.preco_tabela}
                              onChange={(e) => atualizarItem(item.produto_id, 'preco_tabela', e.target.value)}
                              className="w-28 px-2 py-1.5 text-right text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={item.desconto_percentual}
                              onChange={(e) => atualizarItem(item.produto_id, 'desconto_percentual', e.target.value)}
                              className="w-20 px-2 py-1.5 text-right text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removerItem(item.produto_id)}
                              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Erro e botao salvar */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.push('/fornecedor/tabelas-preco')}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                loading={salvando}
                className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
              >
                Salvar Tabela
              </Button>
            </div>
          </>
        )}
      </div>
    </FornecedorLayout>
  )
}
