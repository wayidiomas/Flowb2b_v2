'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Icone de seta para baixo
function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const router = useRouter()
  const { empresa, empresas, switchEmpresa, switchingEmpresa } = useAuth()
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCompanyMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Formata data atual
  const today = new Date()
  const formattedDate = today.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleSwitchEmpresa = async (empresaId: number) => {
    if (empresaId === empresa?.id) return
    await switchEmpresa(empresaId)
    setCompanyMenuOpen(false)
  }

  const hasMultipleEmpresas = empresas.length > 1

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Left side - Title and date */}
      <div>
        <h1 className="text-lg font-medium text-gray-900">{title}</h1>
        <p className="text-xs text-gray-500">{subtitle || formattedDate}</p>
      </div>

      {/* Right side - Company switcher */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
          disabled={switchingEmpresa}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
        >
          {switchingEmpresa ? (
            <SpinnerIcon />
          ) : null}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {empresa?.nome_fantasia || empresa?.razao_social || 'Selecione uma empresa'}
            </p>
            <p className="text-xs text-gray-500">
              {hasMultipleEmpresas ? 'Trocar empresa' : 'Empresa ativa'}
            </p>
          </div>
          <ChevronDownIcon />
        </button>

        {/* Company dropdown */}
        {companyMenuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[260px] z-50">
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase">
                {hasMultipleEmpresas ? 'Suas empresas' : 'Empresa atual'}
              </p>
            </div>

            {/* Lista de empresas */}
            <div className="max-h-60 overflow-y-auto">
              {empresas.map((emp) => {
                const isActive = emp.id === empresa?.id
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleSwitchEmpresa(emp.id)}
                    disabled={switchingEmpresa}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors disabled:opacity-50 ${
                      isActive
                        ? 'bg-[#336FB6]/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${isActive ? 'font-medium text-[#336FB6]' : 'text-gray-900'}`}>
                        {emp.nome_fantasia || emp.razao_social}
                      </p>
                      <p className={`text-xs truncate ${isActive ? 'text-[#336FB6]/70' : 'text-gray-500'}`}>
                        {emp.cnpj || 'CNPJ nao informado'}
                      </p>
                    </div>
                    {isActive && <CheckIcon />}
                  </button>
                )
              })}

              {/* Caso so tenha a empresa ativa (sem array populado) */}
              {empresas.length === 0 && empresa && (
                <div className="px-4 py-2.5 bg-[#336FB6]/5">
                  <p className="text-sm font-medium text-[#336FB6]">
                    {empresa.nome_fantasia || empresa.razao_social}
                  </p>
                  <p className="text-xs text-[#336FB6]/70">
                    {empresa.cnpj || 'CNPJ nao informado'}
                  </p>
                </div>
              )}
            </div>

            {/* Links de acao */}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setCompanyMenuOpen(false)
                  router.push('/cadastros/empresas')
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Minhas empresas
              </button>
              <button
                onClick={() => {
                  setCompanyMenuOpen(false)
                  router.push('/cadastros/empresas/nova')
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cadastrar nova empresa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
