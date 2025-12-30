'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Types
interface Fornecedor {
  id: number
  nome: string
  cnpj?: string
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

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedFornecedor(null)
    }
  }, [isOpen])

  // Filter fornecedores
  const filteredFornecedores = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.cnpj && f.cnpj.includes(search))
  )

  const handleConfirm = () => {
    if (selectedFornecedor) {
      onSelect(selectedFornecedor)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[24px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[560px] animate-in zoom-in-95 fade-in duration-200">
        {/* Content */}
        <div className="p-8">
          {/* Titulo */}
          <h2 className="text-[24px] font-semibold text-[#1a1a2e] leading-[1.2]">
            {title}
          </h2>

          {/* Subtitulo */}
          <p className="mt-4 text-[15px] text-[#64748b] leading-[1.6]">
            {subtitle}
          </p>

          {/* Search e Filtros */}
          <div className="mt-6 flex gap-3">
            {/* Campo de busca */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94a3b8]">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-[15px] text-[#1e293b] placeholder-[#cbd5e1] bg-white border border-[#e2e8f0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-all"
              />
            </div>

            {/* Botao Filtros */}
            <button
              type="button"
              className="px-5 py-3 flex items-center gap-2 text-[14px] font-medium text-white bg-[#FFAA11] rounded-lg hover:bg-[#E69900] transition-all shadow-sm"
            >
              <span>Filtros</span>
              <FilterIcon />
            </button>
          </div>

          {/* Lista de fornecedores */}
          <div className="mt-4 border border-[#e2e8f0] rounded-[16px] overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <SpinnerIcon />
                  <span className="ml-3 text-[14px] text-[#64748b]">Carregando fornecedores...</span>
                </div>
              ) : filteredFornecedores.length === 0 ? (
                <div className="py-12 text-center text-[14px] text-[#64748b]">
                  Nenhum fornecedor encontrado
                </div>
              ) : (
                <div>
                  {filteredFornecedores.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFornecedor(f)}
                      className={`w-full px-5 py-4 text-left border-b border-[#f1f5f9] last:border-b-0 transition-all ${
                        selectedFornecedor?.id === f.id
                          ? 'bg-[#f0f7ff]'
                          : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <p className="text-[15px] font-semibold text-[#1e293b] leading-[1.4] uppercase">
                        {f.nome}
                      </p>
                      {f.cnpj && (
                        <p className="mt-0.5 text-[14px] text-[#64748b] leading-[1.4]">
                          {f.cnpj}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer com botoes */}
        <div className="px-8 pb-8 pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-7 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-full hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedFornecedor}
            className="px-7 py-2.5 text-[14px] font-medium text-white bg-[#94a8c7] rounded-full hover:bg-[#8299ba] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
