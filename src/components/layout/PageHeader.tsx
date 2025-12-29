'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Icone de seta para baixo
function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { empresa } = useAuth()
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
          className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {empresa?.nome_fantasia || empresa?.razao_social || 'Selecione uma empresa'}
            </p>
            <p className="text-xs text-gray-500">Trocar empresa</p>
          </div>
          <ChevronDownIcon />
        </button>

        {/* Company dropdown */}
        {companyMenuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[220px] z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase">Empresa atual</p>
            </div>
            <div className="px-4 py-2 bg-primary-50">
              <p className="text-sm font-medium text-primary-700">
                {empresa?.nome_fantasia || empresa?.razao_social || 'Empresa'}
              </p>
              <p className="text-xs text-primary-600">
                CNPJ: {empresa?.cnpj || '-'}
              </p>
            </div>
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => setCompanyMenuOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Minhas empresas
              </button>
              <button
                onClick={() => setCompanyMenuOpen(false)}
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
