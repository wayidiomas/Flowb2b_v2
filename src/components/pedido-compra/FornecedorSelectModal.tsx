'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

// Types
interface Fornecedor {
  id: number
  nome: string
  cnpj?: string
  total_pedidos?: number
  valor_total_comprado?: number
}

interface FornecedorSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (fornecedor: Fornecedor) => void
  title?: string
  subtitle?: string
  fornecedores: Fornecedor[]
  loading?: boolean
}

// Sort options
type SortOption = 'nome' | 'mais_pedidos' | 'maior_valor'

const SORT_OPTIONS = [
  { value: 'nome' as SortOption, label: 'Nome (A-Z)' },
  { value: 'mais_pedidos' as SortOption, label: 'Mais pedidos' },
  { value: 'maior_valor' as SortOption, label: 'Maior valor comprado' },
]

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export function FornecedorSelectModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Gerar Pedido Automatico',
  subtitle = 'Selecione o fornecedor para gerar o pedido automaticamente com base nas vendas e estoque.',
  fornecedores,
  loading = false,
}: FornecedorSelectModalProps) {
  const [search, setSearch] = useState('')
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null)
  const [mounted, setMounted] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('nome')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedFornecedor(null)
      setSortBy('nome')
      setShowSortDropdown(false)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showSortDropdown) return

    const handleClick = () => setShowSortDropdown(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showSortDropdown])

  // Filter and sort fornecedores
  const filteredAndSortedFornecedores = fornecedores
    .filter(f =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      (f.cnpj && f.cnpj.includes(search))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'mais_pedidos':
          return (b.total_pedidos || 0) - (a.total_pedidos || 0)
        case 'maior_valor':
          return (b.valor_total_comprado || 0) - (a.valor_total_comprado || 0)
        case 'nome':
        default:
          return a.nome.localeCompare(b.nome)
      }
    })

  const handleConfirm = () => {
    if (selectedFornecedor) {
      onSelect(selectedFornecedor)
    }
  }

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor)
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Modal - Mais largo */}
      <div className="relative w-full max-w-[680px] animate-in zoom-in-95 fade-in duration-200 overflow-hidden rounded-[20px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.35)]">

        {/* Header Azul */}
        <div className="bg-[#336FB6] px-8 py-6 relative">
          {/* Botao fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>

          {/* Logo */}
          <div className="mb-4">
            <Image
              src="/assets/branding/logo-white.png"
              alt="FlowB2B"
              width={100}
              height={32}
              className="object-contain"
            />
          </div>

          {/* Titulo */}
          <h2 className="text-[26px] font-bold text-white leading-tight">
            {title}
          </h2>

          {/* Subtitulo */}
          <p className="mt-2 text-[15px] text-white/80 leading-relaxed max-w-[500px]">
            {subtitle}
          </p>
        </div>

        {/* Corpo Branco */}
        <div className="bg-white px-8 py-6">
          {/* Search e Filtros */}
          <div className="flex gap-3">
            {/* Campo de busca */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94a3b8]">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-[15px] text-[#1e293b] placeholder-[#94a3b8] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
              />
            </div>

            {/* Dropdown de Ordenacao */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSortDropdown(!showSortDropdown)
                }}
                className="h-full px-4 py-3 flex items-center gap-2 text-[14px] font-medium text-white bg-[#FFAA11] rounded-xl hover:bg-[#E69900] transition-all shadow-sm min-w-[160px] justify-between"
              >
                <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <ChevronDownIcon />
              </button>

              {/* Dropdown */}
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-1 min-w-[180px] z-10">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value)
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-[14px] flex items-center justify-between hover:bg-[#f8fafc] transition-colors ${
                        sortBy === option.value ? 'text-[#336FB6] font-medium' : 'text-[#475569]'
                      }`}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <span className="text-[#336FB6]">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de fornecedores */}
          <div className="mt-5 border border-[#e2e8f0] rounded-xl overflow-hidden bg-white">
            <div className="max-h-[320px] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-[#336FB6]">
                    <SpinnerIcon />
                  </div>
                  <span className="mt-3 text-[14px] text-[#64748b]">Carregando fornecedores...</span>
                </div>
              ) : filteredAndSortedFornecedores.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#f1f5f9] flex items-center justify-center">
                    <SearchIcon />
                  </div>
                  <p className="text-[14px] text-[#64748b]">Nenhum fornecedor encontrado</p>
                </div>
              ) : (
                <div>
                  {filteredAndSortedFornecedores.map((f, index) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFornecedor(f)}
                      className={`w-full px-5 py-4 text-left transition-all flex items-center justify-between group ${
                        index !== filteredAndSortedFornecedores.length - 1 ? 'border-b border-[#f1f5f9]' : ''
                      } ${
                        selectedFornecedor?.id === f.id
                          ? 'bg-[#336FB6]/5 border-l-4 border-l-[#336FB6]'
                          : 'hover:bg-[#f8fafc] border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold leading-tight truncate ${
                          selectedFornecedor?.id === f.id ? 'text-[#336FB6]' : 'text-[#1e293b]'
                        }`}>
                          {f.nome}
                        </p>
                        {f.cnpj && (
                          <p className="mt-1 text-[13px] text-[#64748b]">
                            CNPJ: {f.cnpj}
                          </p>
                        )}
                      </div>

                      {/* Metricas */}
                      <div className="flex items-center gap-4 ml-4">
                        {f.total_pedidos !== undefined && f.total_pedidos > 0 && (
                          <div className="text-right">
                            <p className="text-[11px] text-[#94a3b8] uppercase tracking-wide">Pedidos</p>
                            <p className="text-[14px] font-semibold text-[#475569]">{f.total_pedidos}</p>
                          </div>
                        )}
                        {f.valor_total_comprado !== undefined && f.valor_total_comprado > 0 && (
                          <div className="text-right">
                            <p className="text-[11px] text-[#94a3b8] uppercase tracking-wide">Comprado</p>
                            <p className="text-[14px] font-semibold text-[#475569]">{formatCurrency(f.valor_total_comprado)}</p>
                          </div>
                        )}

                        {/* Check indicator */}
                        {selectedFornecedor?.id === f.id && (
                          <div className="w-6 h-6 rounded-full bg-[#336FB6] flex items-center justify-center text-white">
                            <CheckIcon />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer com botoes */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedFornecedor}
              className="px-6 py-2.5 text-[14px] font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2660A5] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
