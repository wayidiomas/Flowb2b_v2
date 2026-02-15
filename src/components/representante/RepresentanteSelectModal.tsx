'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface Fornecedor {
  id: number
  nome: string
  cnpj?: string
}

interface Representante {
  id: number
  nome: string
  telefone?: string
  codigo_acesso: string
  cadastrado: boolean
  fornecedores_count: number
}

interface RepresentanteSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectExistente: (representante: Representante) => void
  onCreateNovo: (data: { nome: string; telefone: string; fornecedor_ids: number[] }) => Promise<void>
  representantes: Representante[]
  fornecedores: Fornecedor[]
  fornecedorAtual?: Fornecedor
  loading?: boolean
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

export function RepresentanteSelectModal({
  isOpen,
  onClose,
  onSelectExistente,
  onCreateNovo,
  representantes,
  fornecedores,
  fornecedorAtual,
  loading = false,
}: RepresentanteSelectModalProps) {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [search, setSearch] = useState('')
  const [selectedRepresentante, setSelectedRepresentante] = useState<Representante | null>(null)

  // Form para criar novo
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [selectedFornecedores, setSelectedFornecedores] = useState<number[]>([])
  const [fornecedorSearch, setFornecedorSearch] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setMode('select')
      setSearch('')
      setSelectedRepresentante(null)
      setNome('')
      setTelefone('')
      setSelectedFornecedores(fornecedorAtual ? [fornecedorAtual.id] : [])
      setFornecedorSearch('')
      setCreating(false)
    }
  }, [isOpen, fornecedorAtual])

  const filteredRepresentantes = representantes.filter(r =>
    r.nome.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo_acesso.toLowerCase().includes(search.toLowerCase())
  )

  const filteredFornecedores = fornecedores.filter(f =>
    (f.nome && f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase())) ||
    (f.cnpj && f.cnpj.includes(fornecedorSearch))
  )

  const toggleFornecedor = (id: number) => {
    setSelectedFornecedores(prev =>
      prev.includes(id)
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    )
  }

  const handleCreate = async () => {
    if (!nome.trim()) return
    if (selectedFornecedores.length === 0) return

    setCreating(true)
    try {
      await onCreateNovo({
        nome: nome.trim(),
        telefone: telefone.trim(),
        fornecedor_ids: selectedFornecedores,
      })
    } finally {
      setCreating(false)
    }
  }

  const handleConfirm = () => {
    if (selectedRepresentante) {
      onSelectExistente(selectedRepresentante)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[680px] animate-in zoom-in-95 fade-in duration-200 overflow-hidden rounded-[20px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.35)]">
        {/* Header */}
        <div className="bg-[#336FB6] px-8 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>

          <div className="mb-4">
            <Image
              src="/assets/branding/logo-white.png"
              alt="FlowB2B"
              width={100}
              height={32}
              className="object-contain"
            />
          </div>

          <h2 className="text-[24px] font-bold text-white leading-tight">
            {mode === 'select' ? 'Selecionar Representante' : 'Novo Representante'}
          </h2>

          <p className="mt-2 text-[15px] text-white/80 leading-relaxed max-w-[500px]">
            {mode === 'select'
              ? 'Selecione um representante existente ou crie um novo.'
              : 'Preencha os dados do representante e selecione os fornecedores que ele representa.'}
          </p>
        </div>

        {/* Corpo */}
        <div className="bg-white px-8 py-6">
          {mode === 'select' ? (
            <>
              {/* Busca e Novo */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94a3b8]">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nome ou codigo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-[15px] text-[#1e293b] placeholder-[#94a3b8] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
                  />
                </div>

                <button
                  onClick={() => setMode('create')}
                  className="px-5 py-3 flex items-center gap-2 text-[14px] font-medium text-white bg-[#FFAA11] rounded-xl hover:bg-[#E69900] transition-all shadow-sm"
                >
                  <PlusIcon />
                  <span>Novo</span>
                </button>
              </div>

              {/* Lista */}
              <div className="mt-5 border border-[#e2e8f0] rounded-xl overflow-hidden bg-white">
                <div className="max-h-[300px] overflow-y-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="text-[#336FB6]">
                        <SpinnerIcon />
                      </div>
                      <span className="mt-3 text-[14px] text-[#64748b]">Carregando...</span>
                    </div>
                  ) : filteredRepresentantes.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#94a3b8]">
                        <SearchIcon />
                      </div>
                      <p className="text-[14px] text-[#64748b]">
                        {representantes.length === 0
                          ? 'Nenhum representante cadastrado'
                          : 'Nenhum representante encontrado'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {filteredRepresentantes.map((rep, index) => (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => setSelectedRepresentante(rep)}
                          className={`w-full px-5 py-4 text-left transition-all flex items-center justify-between group ${
                            index !== filteredRepresentantes.length - 1 ? 'border-b border-[#f1f5f9]' : ''
                          } ${
                            selectedRepresentante?.id === rep.id
                              ? 'bg-[#336FB6]/5 border-l-4 border-l-[#336FB6]'
                              : 'hover:bg-[#f8fafc] border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[15px] font-semibold leading-tight truncate ${
                                selectedRepresentante?.id === rep.id ? 'text-[#336FB6]' : 'text-[#1e293b]'
                              }`}>
                                {rep.nome}
                              </p>
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                                rep.cadastrado
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {rep.cadastrado ? 'Cadastrado' : 'Pendente'}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] text-[#64748b]">
                              Codigo: {rep.codigo_acesso}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                              <p className="text-[11px] text-[#94a3b8] uppercase tracking-wide">Fornecedores</p>
                              <p className="text-[14px] font-semibold text-[#475569]">{rep.fornecedores_count}</p>
                            </div>

                            {selectedRepresentante?.id === rep.id && (
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

              {/* Footer */}
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
                  disabled={!selectedRepresentante}
                  className="px-6 py-2.5 text-[14px] font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2660A5] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Selecionar
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Voltar */}
              <button
                onClick={() => setMode('select')}
                className="flex items-center gap-2 text-[14px] font-medium text-[#64748b] hover:text-[#336FB6] transition-colors mb-5"
              >
                <ArrowLeftIcon />
                <span>Voltar para lista</span>
              </button>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                    Nome do Representante *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Joao Silva"
                    className="w-full px-4 py-3 text-[15px] text-[#1e293b] placeholder-[#94a3b8] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-4 py-3 text-[15px] text-[#1e293b] placeholder-[#94a3b8] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
                  />
                </div>

                {/* Selecao de Fornecedores */}
                <div>
                  <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                    Fornecedores Vinculados * <span className="text-[#64748b] font-normal">({selectedFornecedores.length} selecionados)</span>
                  </label>

                  <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      value={fornecedorSearch}
                      onChange={(e) => setFornecedorSearch(e.target.value)}
                      placeholder="Buscar fornecedor..."
                      className="w-full pl-10 pr-4 py-2.5 text-[14px] text-[#1e293b] placeholder-[#94a3b8] bg-white border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
                    />
                  </div>

                  <div className="border border-[#e2e8f0] rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    {filteredFornecedores.length === 0 ? (
                      <div className="py-8 text-center text-[14px] text-[#64748b]">
                        Nenhum fornecedor encontrado
                      </div>
                    ) : (
                      filteredFornecedores.map((forn, index) => (
                        <button
                          key={forn.id}
                          type="button"
                          onClick={() => toggleFornecedor(forn.id)}
                          className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all ${
                            index !== filteredFornecedores.length - 1 ? 'border-b border-[#f1f5f9]' : ''
                          } ${
                            selectedFornecedores.includes(forn.id)
                              ? 'bg-[#336FB6]/5'
                              : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#1e293b] truncate">
                              {forn.nome}
                            </p>
                            {forn.cnpj && (
                              <p className="text-[12px] text-[#64748b]">
                                {forn.cnpj}
                              </p>
                            )}
                          </div>

                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedFornecedores.includes(forn.id)
                              ? 'bg-[#336FB6] border-[#336FB6] text-white'
                              : 'border-[#cbd5e1]'
                          }`}>
                            {selectedFornecedores.includes(forn.id) && <CheckIcon />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="px-6 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!nome.trim() || selectedFornecedores.length === 0 || creating}
                  className="px-6 py-2.5 text-[14px] font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2660A5] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                >
                  {creating && <SpinnerIcon />}
                  <span>{creating ? 'Criando...' : 'Criar Representante'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
