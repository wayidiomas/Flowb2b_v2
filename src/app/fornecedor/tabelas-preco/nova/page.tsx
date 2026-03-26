'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { LojistaSelectorDropdown } from '@/components/fornecedor/LojistaSelectorDropdown'
import { Button, Skeleton } from '@/components/ui'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogoItemAPI {
  id: number
  produto_id: number
  codigo: string | null
  nome: string
  marca: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_base: number | null
  imagem_url: string | null
}

interface ItemTabela {
  catalogo_item_id: number
  produto_id: number
  codigo: string
  nome: string
  marca: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_original: number | null
  preco_tabela: string
  desconto_percentual: string
  selected: boolean
  imagem_url: string | null
}

type AjusteTipo = 'acrescimo' | 'desconto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}
      >
        {toast.type === 'success' ? (
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
        <span>{toast.message}</span>
        <button onClick={onDismiss} className="ml-2 text-current opacity-60 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function NovaTabelaPrecoPage() {
  const { loading: authLoading } = useFornecedorAuth()
  const router = useRouter()

  // Lojista selection
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [fornecedorId, setFornecedorId] = useState<number | null>(null)

  // Table metadata
  const [nome, setNome] = useState('')
  const [vigenciaInicio, setVigenciaInicio] = useState('')
  const [vigenciaFim, setVigenciaFim] = useState('')
  const [observacao, setObservacao] = useState('')

  // Products
  const [itens, setItens] = useState<ItemTabela[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)

  // Search / filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroMarca, setFiltroMarca] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 200)

  // Bulk adjustment
  const [ajustePercentual, setAjustePercentual] = useState('')
  const [ajusteTipo, setAjusteTipo] = useState<AjusteTipo>('desconto')

  // Save state
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const marcasDisponiveis = useMemo(() => {
    const marcas = new Set<string>()
    itens.forEach((item) => {
      if (item.marca) marcas.add(item.marca)
    })
    return Array.from(marcas).sort()
  }, [itens])

  const itensFiltrados = useMemo(() => {
    let filtered = itens
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.nome.toLowerCase().includes(term) ||
          item.codigo.toLowerCase().includes(term)
      )
    }
    if (filtroMarca) {
      filtered = filtered.filter((item) => item.marca === filtroMarca)
    }
    return filtered
  }, [itens, debouncedSearch, filtroMarca])

  const selectedCount = useMemo(() => itens.filter((i) => i.selected).length, [itens])
  const filteredSelectedCount = useMemo(
    () => itensFiltrados.filter((i) => i.selected).length,
    [itensFiltrados]
  )
  const allFilteredSelected = useMemo(
    () => itensFiltrados.length > 0 && itensFiltrados.every((i) => i.selected),
    [itensFiltrados]
  )
  const someFilteredSelected = useMemo(
    () => itensFiltrados.some((i) => i.selected) && !allFilteredSelected,
    [itensFiltrados, allFilteredSelected]
  )

  // -------------------------------------------------------------------------
  // Fetch catalog products when lojista changes
  // -------------------------------------------------------------------------

  const fetchCatalogoItens = useCallback(async () => {
    if (!empresaId) return
    setLoadingProdutos(true)
    setError('')
    try {
      const res = await fetch(`/api/fornecedor/tabelas-preco/catalogo-itens?empresa_id=${empresaId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao carregar produtos do catalogo')
        setItens([])
        return
      }
      const data = await res.json()
      const catalogoItens: CatalogoItemAPI[] = data.itens || []

      setItens(
        catalogoItens.map((item) => ({
          catalogo_item_id: item.id,
          produto_id: item.produto_id,
          codigo: item.codigo || '',
          nome: item.nome,
          marca: item.marca,
          unidade: item.unidade,
          itens_por_caixa: item.itens_por_caixa,
          preco_original: item.preco_base,
          preco_tabela: item.preco_base != null ? item.preco_base.toFixed(2) : '0.00',
          desconto_percentual: '0',
          selected: true,
          imagem_url: item.imagem_url,
        }))
      )
    } catch {
      setError('Erro ao carregar produtos do catalogo')
      setItens([])
    } finally {
      setLoadingProdutos(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (empresaId) {
      fetchCatalogoItens()
    }
  }, [fetchCatalogoItens, empresaId])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSelectLojista = (sel: { empresaId: number; fornecedorId: number } | null) => {
    const newEmpresaId = sel?.empresaId ?? null
    const newFornecedorId = sel?.fornecedorId ?? null
    if (newEmpresaId !== empresaId) {
      setEmpresaId(newEmpresaId)
      setFornecedorId(newFornecedorId)
      setItens([])
      setSearchTerm('')
      setFiltroMarca('')
      setAjustePercentual('')
      setError('')
    } else {
      setFornecedorId(newFornecedorId)
    }
  }

  const toggleSelectAll = () => {
    const filteredIds = new Set(itensFiltrados.map((i) => i.catalogo_item_id))
    const newState = !allFilteredSelected
    setItens((prev) =>
      prev.map((item) =>
        filteredIds.has(item.catalogo_item_id) ? { ...item, selected: newState } : item
      )
    )
  }

  const toggleSelectItem = (catalogoItemId: number) => {
    setItens((prev) =>
      prev.map((item) =>
        item.catalogo_item_id === catalogoItemId ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const removerItem = (catalogoItemId: number) => {
    setItens((prev) => prev.filter((i) => i.catalogo_item_id !== catalogoItemId))
  }

  const atualizarItem = (
    catalogoItemId: number,
    field: 'preco_tabela' | 'desconto_percentual',
    value: string
  ) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.catalogo_item_id !== catalogoItemId) return item
        const updated = { ...item, [field]: value }

        if (field === 'preco_tabela' && item.preco_original != null && item.preco_original > 0) {
          const precoTabela = parseFloat(value)
          if (!isNaN(precoTabela)) {
            const desconto = ((item.preco_original - precoTabela) / item.preco_original) * 100
            updated.desconto_percentual = desconto.toFixed(2)
          }
        } else if (field === 'desconto_percentual' && item.preco_original != null) {
          const desconto = parseFloat(value)
          if (!isNaN(desconto)) {
            const novoPreco = Math.max(0, item.preco_original * (1 - desconto / 100))
            updated.preco_tabela = novoPreco.toFixed(2)
          }
        }
        return updated
      })
    )
  }

  // -------------------------------------------------------------------------
  // Bulk adjustment
  // -------------------------------------------------------------------------

  const aplicarAjuste = (apenaSelecionados: boolean) => {
    const pct = parseFloat(ajustePercentual)
    if (isNaN(pct) || pct <= 0) return

    setItens((prev) =>
      prev.map((item) => {
        const shouldApply = apenaSelecionados ? item.selected : true
        if (!shouldApply || item.preco_original == null || item.preco_original <= 0) return item

        let novoPreco: number
        let novoDesconto: number
        if (ajusteTipo === 'acrescimo') {
          novoPreco = item.preco_original * (1 + pct / 100)
          novoDesconto = -pct
        } else {
          novoPreco = item.preco_original * (1 - pct / 100)
          novoDesconto = pct
        }

        return {
          ...item,
          preco_tabela: Math.max(0, novoPreco).toFixed(2),
          desconto_percentual: novoDesconto.toFixed(2),
        }
      })
    )
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setError('Informe o nome da tabela')
      return
    }
    if (!empresaId || !fornecedorId) {
      setError('Selecione um lojista')
      return
    }

    const itensSelecionados = itens.filter((i) => i.selected)
    if (itensSelecionados.length === 0) {
      setError('Selecione pelo menos um produto')
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
          fornecedor_id: fornecedorId,
          nome: nome.trim(),
          vigencia_inicio: vigenciaInicio || null,
          vigencia_fim: vigenciaFim || null,
          observacao: observacao.trim() || null,
          itens: itensSelecionados.map((i) => ({
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
        setToast({ message: 'Tabela de preco criada com sucesso!', type: 'success' })
        setTimeout(() => router.push('/fornecedor/tabelas-preco'), 1000)
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

  // -------------------------------------------------------------------------
  // Render: Loading state
  // -------------------------------------------------------------------------

  if (authLoading) {
    return (
      <FornecedorLayout>
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-0">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20" />
          <Skeleton className="h-96" />
        </div>
      </FornecedorLayout>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Main
  // -------------------------------------------------------------------------

  return (
    <FornecedorLayout>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Nova Tabela de Preco</h1>
            <p className="text-sm text-gray-500 mt-1">
              Crie uma tabela de precos personalizada para um lojista
            </p>
          </div>
          <Button variant="outline" size="md" onClick={() => router.push('/fornecedor/tabelas-preco')}>
            Voltar
          </Button>
        </div>

        {/* Lojista selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <LojistaSelectorDropdown onSelect={handleSelectLojista} />
        </div>

        {empresaId && (
          <>
            {/* Table metadata */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Dados da Tabela</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da tabela <span className="text-red-500">*</span>
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vigencia inicio
                  </label>
                  <input
                    type="date"
                    value={vigenciaInicio}
                    onChange={(e) => setVigenciaInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vigencia fim
                  </label>
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

            {/* Products section */}
            {loadingProdutos ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10" />
                <Skeleton className="h-64" />
              </div>
            ) : itens.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <PackageIcon />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Nenhum produto encontrado no catalogo para este lojista.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Verifique se o catalogo possui itens ativos.
                </p>
              </div>
            ) : (
              <>
                {/* Search and filter bar */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                      </div>
                      <input
                        type="text"
                        placeholder="Filtrar por nome ou codigo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                      />
                    </div>
                    {marcasDisponiveis.length > 1 && (
                      <select
                        value={filtroMarca}
                        onChange={(e) => setFiltroMarca(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors sm:w-52"
                      >
                        <option value="">Todas as marcas</option>
                        {marcasDisponiveis.map((marca) => (
                          <option key={marca} value={marca}>
                            {marca}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>
                      {itensFiltrados.length} produto{itensFiltrados.length !== 1 ? 's' : ''} exibido{itensFiltrados.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                      {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''} de {itens.length}
                    </span>
                  </div>
                </div>

                {/* Bulk adjustment bar */}
                <div className="bg-[#336FB6]/5 border border-[#336FB6]/20 rounded-2xl p-4 sm:p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Reajuste em massa
                  </h3>
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    {/* Percentage input */}
                    <div className="flex-shrink-0">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Percentual
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={ajustePercentual}
                          onChange={(e) => setAjustePercentual(e.target.value)}
                          placeholder="0.00"
                          className="w-32 pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Type toggle */}
                    <div className="flex-shrink-0">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                      <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setAjusteTipo('acrescimo')}
                          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                            ajusteTipo === 'acrescimo'
                              ? 'bg-[#336FB6] text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Acrescimo
                        </button>
                        <button
                          type="button"
                          onClick={() => setAjusteTipo('desconto')}
                          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                            ajusteTipo === 'desconto'
                              ? 'bg-[#336FB6] text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Desconto
                        </button>
                      </div>
                    </div>

                    {/* Apply buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="md"
                        variant="outline"
                        onClick={() => aplicarAjuste(false)}
                        disabled={!ajustePercentual || parseFloat(ajustePercentual) <= 0}
                      >
                        Aplicar em todos
                      </Button>
                      <Button
                        size="md"
                        className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
                        onClick={() => aplicarAjuste(true)}
                        disabled={
                          !ajustePercentual ||
                          parseFloat(ajustePercentual) <= 0 ||
                          selectedCount === 0
                        }
                      >
                        Aplicar nos selecionados ({selectedCount})
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Products table - Desktop */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                          <th className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someFilteredSelected
                              }}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 text-[#336FB6] bg-white border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-[#336FB6]/20 focus:ring-offset-0 checked:bg-[#336FB6] checked:border-[#336FB6]"
                            />
                          </th>
                          <th className="px-4 py-3 w-14">Img</th>
                          <th className="px-4 py-3">Codigo</th>
                          <th className="px-4 py-3">Nome</th>
                          <th className="px-4 py-3">Marca</th>
                          <th className="px-4 py-3 text-center">UN/Cx</th>
                          <th className="px-4 py-3 text-right">Preco Base</th>
                          <th className="px-4 py-3 text-right">Preco Tabela</th>
                          <th className="px-4 py-3 text-right">Desc. %</th>
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itensFiltrados.map((item) => {
                          const precoTabela = parseFloat(item.preco_tabela) || 0
                          const precoOriginal = item.preco_original ?? 0
                          const diff = precoTabela - precoOriginal
                          const isAbove = diff > 0.005
                          const isBelow = diff < -0.005

                          return (
                            <tr
                              key={item.catalogo_item_id}
                              className={`transition-colors ${
                                item.selected
                                  ? 'hover:bg-[#336FB6]/5'
                                  : 'opacity-50 hover:opacity-70 bg-gray-50/50'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleSelectItem(item.catalogo_item_id)}
                                  className="w-4 h-4 text-[#336FB6] bg-white border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-[#336FB6]/20 focus:ring-offset-0 checked:bg-[#336FB6] checked:border-[#336FB6]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {item.imagem_url ? (
                                  <img
                                    src={item.imagem_url}
                                    alt={item.nome}
                                    className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <PackageIcon />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                {item.codigo || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate font-medium">
                                {item.nome}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {item.marca || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 text-center">
                                {item.unidade || '-'}
                                {item.itens_por_caixa ? ` / ${item.itens_por_caixa}` : ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">
                                {formatCurrency(item.preco_original)}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.preco_tabela}
                                  onChange={(e) =>
                                    atualizarItem(item.catalogo_item_id, 'preco_tabela', e.target.value)
                                  }
                                  className={`w-28 px-2 py-1.5 text-right text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors ${
                                    isAbove
                                      ? 'border-emerald-300 bg-emerald-50/50'
                                      : isBelow
                                        ? 'border-amber-300 bg-amber-50/50'
                                        : 'border-gray-200'
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.desconto_percentual}
                                    onChange={(e) =>
                                      atualizarItem(
                                        item.catalogo_item_id,
                                        'desconto_percentual',
                                        e.target.value
                                      )
                                    }
                                    className="w-20 px-2 py-1.5 text-right text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removerItem(item.catalogo_item_id)}
                                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                  title="Remover produto"
                                >
                                  <TrashIcon />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {itensFiltrados.length === 0 && (
                    <div className="px-6 py-12 text-center text-sm text-gray-400">
                      Nenhum produto encontrado com os filtros aplicados.
                    </div>
                  )}
                </div>

                {/* Products cards - Mobile */}
                <div className="md:hidden space-y-3">
                  {/* Select all mobile */}
                  <div className="flex items-center gap-3 px-1">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected
                      }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-[#336FB6] bg-white border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-[#336FB6]/20 focus:ring-offset-0 checked:bg-[#336FB6] checked:border-[#336FB6]"
                    />
                    <span className="text-sm text-gray-600">
                      Selecionar todos ({itensFiltrados.length})
                    </span>
                  </div>

                  {itensFiltrados.map((item) => {
                    const precoTabela = parseFloat(item.preco_tabela) || 0
                    const precoOriginal = item.preco_original ?? 0
                    const diff = precoTabela - precoOriginal
                    const isAbove = diff > 0.005
                    const isBelow = diff < -0.005

                    return (
                      <div
                        key={item.catalogo_item_id}
                        className={`bg-white rounded-2xl border border-gray-200 p-4 transition-opacity ${
                          !item.selected ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelectItem(item.catalogo_item_id)}
                            className="mt-1 w-4 h-4 text-[#336FB6] bg-white border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-[#336FB6]/20 focus:ring-offset-0 checked:bg-[#336FB6] checked:border-[#336FB6]"
                          />
                          {item.imagem_url ? (
                            <img
                              src={item.imagem_url}
                              alt={item.nome}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <PackageIcon />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.nome}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {item.codigo || '-'}
                              {item.marca ? ` | ${item.marca}` : ''}
                              {item.unidade ? ` | ${item.unidade}` : ''}
                              {item.itens_por_caixa ? `/${item.itens_por_caixa}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => removerItem(item.catalogo_item_id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          >
                            <TrashIcon />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">
                              Preco Base
                            </label>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(item.preco_original)}
                            </p>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">
                              Preco Tabela
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.preco_tabela}
                              onChange={(e) =>
                                atualizarItem(item.catalogo_item_id, 'preco_tabela', e.target.value)
                              }
                              className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] ${
                                isAbove
                                  ? 'border-emerald-300 bg-emerald-50/50'
                                  : isBelow
                                    ? 'border-amber-300 bg-amber-50/50'
                                    : 'border-gray-200'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">
                              Desc. %
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.desconto_percentual}
                              onChange={(e) =>
                                atualizarItem(
                                  item.catalogo_item_id,
                                  'desconto_percentual',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {itensFiltrados.length === 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
                      Nenhum produto encontrado com os filtros aplicados.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pb-6">
              <p className="text-xs text-gray-400 order-2 sm:order-1">
                {selectedCount > 0
                  ? `${selectedCount} produto${selectedCount !== 1 ? 's' : ''} sera${selectedCount !== 1 ? 'o' : ''} incluido${selectedCount !== 1 ? 's' : ''} na tabela`
                  : 'Nenhum produto selecionado'}
              </p>
              <div className="flex gap-3 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => router.push('/fornecedor/tabelas-preco')}
                >
                  Cancelar
                </Button>
                <Button
                  size="md"
                  onClick={handleSalvar}
                  loading={salvando}
                  disabled={selectedCount === 0 || !nome.trim()}
                  className="bg-[#336FB6] hover:bg-[#2660a5] text-white disabled:bg-[#336FB6]/40"
                >
                  Salvar Tabela ({selectedCount} {selectedCount === 1 ? 'item' : 'itens'})
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </FornecedorLayout>
  )
}
