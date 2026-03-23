'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRepresentanteAuth } from '@/contexts/RepresentanteAuthContext'
import { RepresentanteLayout } from '@/components/layout/RepresentanteLayout'

// Icons
function PackageIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

function XMarkIcon() {
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

interface DashboardStats {
  total_pedidos: number
  pedidos_pendentes: number
  pedidos_aprovados: number
  pedidos_recusados: number
  valor_total: number
  fornecedores_ativos: number
}

// Modal para adicionar fornecedor via CNPJ
function AdicionarFornecedorModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [cnpj, setCnpj] = useState('')
  const [validandoCnpj, setValidandoCnpj] = useState(false)
  const [fornecedorEncontrado, setFornecedorEncontrado] = useState<string | null>(null)
  const [cnpjError, setCnpjError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCnpj('')
      setFornecedorEncontrado(null)
      setCnpjError('')
      setError('')
      setSuccess('')
      setValidandoCnpj(false)
      setLoading(false)
    }
  }, [isOpen])

  const formatCnpj = (digits: string) => {
    let formatted = digits
    if (digits.length > 12) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
    } else if (digits.length > 8) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    } else if (digits.length > 5) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`
    }
    return formatted
  }

  const validarCnpj = useCallback(async (digits: string) => {
    if (digits.length !== 14) return

    setValidandoCnpj(true)
    setCnpjError('')
    setFornecedorEncontrado(null)

    try {
      const res = await fetch(`/api/auth/representante/validar-cnpj?cnpj=${digits}`)
      const data = await res.json()
      if (data.fornecedor) {
        setFornecedorEncontrado(data.fornecedor.nome)
      } else {
        setCnpjError('Fornecedor nao encontrado com este CNPJ')
      }
    } catch {
      setCnpjError('Erro ao validar CNPJ')
    } finally {
      setValidandoCnpj(false)
    }
  }, [])

  const handleCnpjChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    setCnpj(formatCnpj(digits))
    setError('')
    setSuccess('')

    if (digits.length < 14) {
      setFornecedorEncontrado(null)
      setCnpjError('')
    }

    if (digits.length === 14) {
      validarCnpj(digits)
    }
  }

  const handleSubmit = async () => {
    const cnpjDigits = cnpj.replace(/\D/g, '')
    if (cnpjDigits.length !== 14 || !fornecedorEncontrado) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/representante/fornecedores/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cnpjDigits }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(data.message || 'Fornecedor vinculado com sucesso!')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(data.error || 'Erro ao vincular fornecedor')
      }
    } catch {
      setError('Erro de conexao')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Adicionar fornecedor
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CNPJ do fornecedor
            </label>
            <div className="relative">
              <input
                type="text"
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-transparent"
              />
              {validandoCnpj && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              {fornecedorEncontrado && !validandoCnpj && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                  <CheckIcon />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Informe o CNPJ do fornecedor que deseja vincular
            </p>
          </div>

          {/* Fornecedor encontrado */}
          {fornecedorEncontrado && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-emerald-600">
                <CheckIcon />
              </span>
              <span className="text-sm text-emerald-700 font-medium">
                {fornecedorEncontrado}
              </span>
            </div>
          )}

          {/* CNPJ Error */}
          {cnpjError && (
            <p className="text-sm text-red-500">{cnpjError}</p>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm border border-green-100">
              {success}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !fornecedorEncontrado}
            className="flex-1 py-2.5 px-4 bg-[#336FB6] hover:bg-[#2b5e9e] text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Vinculando...
              </>
            ) : (
              'Vincular'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepresentanteDashboardPage() {
  const { user, fornecedoresVinculados, loading: authLoading, refreshUser } = useRepresentanteAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/representante/dashboard')
        const data = await response.json()
        if (data.success) {
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Erro ao buscar stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) {
      fetchStats()
    }
  }, [authLoading, user])

  // Agrupar fornecedores por CNPJ (ou nome se CNPJ nao existir)
  // O mesmo fornecedor pode ter IDs diferentes em empresas diferentes (multi-tenant)
  const fornecedoresAgrupados = useMemo(() => {
    const map = new Map<string, { nome: string; cnpj?: string; lojas: Array<{ empresa_nome: string; fornecedor_id: number }> }>()
    fornecedoresVinculados.forEach((f) => {
      const chave = f.fornecedor_cnpj || f.fornecedor_nome
      let grupo = map.get(chave)
      if (!grupo) {
        grupo = { nome: f.fornecedor_nome, cnpj: f.fornecedor_cnpj, lojas: [] }
        map.set(chave, grupo)
      }
      grupo.lojas.push({ empresa_nome: f.empresa_nome, fornecedor_id: f.fornecedor_id })
    })
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [fornecedoresVinculados])

  const handleAddSuccess = () => {
    // Refresh user data to get updated fornecedoresVinculados
    refreshUser()
  }

  if (authLoading || loading) {
    return (
      <RepresentanteLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#336FB6]" />
        </div>
      </RepresentanteLayout>
    )
  }

  return (
    <RepresentanteLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visao geral dos seus pedidos e fornecedores
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.total_pedidos || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#336FB6]/10 rounded-xl flex items-center justify-center text-[#336FB6]">
                <PackageIcon />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {stats?.pedidos_pendentes || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <ClockIcon />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aprovados</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {stats?.pedidos_aprovados || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <CheckCircleIcon />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fornecedores</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {fornecedoresAgrupados.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#336FB6]/10 rounded-xl flex items-center justify-center text-[#336FB6]">
                <BuildingIcon />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acoes Rapidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/representante/pedidos"
              className="flex items-center justify-between p-4 bg-[#336FB6]/5 rounded-xl hover:bg-[#336FB6]/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#336FB6]/10 rounded-xl flex items-center justify-center text-[#336FB6] group-hover:bg-[#336FB6]/20">
                  <PackageIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ver Pedidos</p>
                  <p className="text-sm text-gray-500">Gerenciar pedidos de todos os fornecedores</p>
                </div>
              </div>
              <ArrowRightIcon />
            </Link>

            <Link
              href="/representante/pedidos?status=enviado_fornecedor"
              className="flex items-center justify-between p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-200">
                  <ClockIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pedidos Pendentes</p>
                  <p className="text-sm text-gray-500">
                    {stats?.pedidos_pendentes || 0} pedidos aguardando resposta
                  </p>
                </div>
              </div>
              <ArrowRightIcon />
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200">
                  <PlusIcon />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Adicionar Fornecedor</p>
                  <p className="text-sm text-gray-500">Vincular novo fornecedor via CNPJ</p>
                </div>
              </div>
              <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Fornecedores Vinculados */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Fornecedores Vinculados
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#336FB6] bg-[#336FB6]/5 rounded-lg hover:bg-[#336FB6]/10 transition-colors"
            >
              <PlusIcon />
              Adicionar
            </button>
          </div>
          {fornecedoresAgrupados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">
                Nenhum fornecedor vinculado
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2b5e9e] transition-colors"
              >
                <PlusIcon />
                Adicionar fornecedor
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {fornecedoresAgrupados.map((forn) => (
                <div
                  key={forn.cnpj || forn.nome}
                  className="py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{forn.nome}</p>
                      {forn.cnpj && (
                        <p className="text-xs text-gray-400">{forn.cnpj}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {forn.lojas.length} {forn.lojas.length === 1 ? 'loja' : 'lojas'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {forn.lojas.map((loja) => (
                      <Link
                        key={loja.fornecedor_id}
                        href={`/representante/pedidos?fornecedor_id=${loja.fornecedor_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#336FB6] bg-[#336FB6]/5 rounded-lg hover:bg-[#336FB6]/10 transition-colors"
                      >
                        {loja.empresa_nome}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para adicionar fornecedor */}
      <AdicionarFornecedorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </RepresentanteLayout>
  )
}
