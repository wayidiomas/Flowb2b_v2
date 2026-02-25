'use client'

import { useState, useEffect, useRef } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'

interface LojistaSelecionado {
  empresaId: number
  fornecedorId: number
}

interface LojistaSelectorDropdownProps {
  onSelect: (selecionado: LojistaSelecionado | null) => void
}

const STORAGE_KEY = 'flowb2b_fornecedor_lojista_selecionado'

export function LojistaSelectorDropdown({ onSelect }: LojistaSelectorDropdownProps) {
  const { empresasVinculadas } = useFornecedorAuth()
  const [selecionado, setSelecionado] = useState<LojistaSelecionado | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Carregar selecao do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LojistaSelecionado
        const existe = empresasVinculadas.find(
          (e) => e.empresaId === parsed.empresaId && e.fornecedorId === parsed.fornecedorId
        )
        if (existe) {
          setSelecionado(parsed)
          onSelect(parsed)
          return
        }
      } catch { /* ignorar */ }
    }
    // Se nao tinha salvo ou nao encontrou, selecionar primeiro
    if (empresasVinculadas.length > 0) {
      const primeiro: LojistaSelecionado = {
        empresaId: empresasVinculadas[0].empresaId,
        fornecedorId: empresasVinculadas[0].fornecedorId,
      }
      setSelecionado(primeiro)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(primeiro))
      onSelect(primeiro)
    }
  }, [empresasVinculadas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (empresaId: number, fornecedorId: number) => {
    const novo: LojistaSelecionado = { empresaId, fornecedorId }
    setSelecionado(novo)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novo))
    onSelect(novo)
    setOpen(false)
  }

  const empresaSelecionada = empresasVinculadas.find(
    (e) => e.empresaId === selecionado?.empresaId
  )

  if (empresasVinculadas.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
        Nenhum lojista vinculado encontrado.
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Lojista</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full sm:w-80 flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:border-[#336FB6]/40 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#336FB6]/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          </div>
          <span className="truncate font-medium text-gray-800">
            {empresaSelecionada?.nomeFantasia || empresaSelecionada?.razaoSocial || 'Selecionar lojista'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {empresasVinculadas.map((empresa) => (
            <button
              key={empresa.empresaId}
              onClick={() => handleSelect(empresa.empresaId, empresa.fornecedorId)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                selecionado?.empresaId === empresa.empresaId
                  ? 'bg-[#336FB6]/5 text-[#336FB6] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#336FB6]/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-[#336FB6]">
                  {(empresa.nomeFantasia || empresa.razaoSocial).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{empresa.nomeFantasia || empresa.razaoSocial}</p>
                {empresa.nomeFantasia && empresa.razaoSocial && empresa.nomeFantasia !== empresa.razaoSocial && (
                  <p className="text-xs text-gray-400 truncate">{empresa.razaoSocial}</p>
                )}
              </div>
              {selecionado?.empresaId === empresa.empresaId && (
                <svg className="w-4 h-4 text-[#336FB6] ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
