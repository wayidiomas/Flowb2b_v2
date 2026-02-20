'use client'

import { useState, useEffect } from 'react'
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

interface DashboardStats {
  total_pedidos: number
  pedidos_pendentes: number
  pedidos_aprovados: number
  pedidos_recusados: number
  valor_total: number
  fornecedores_ativos: number
}

export default function RepresentanteDashboardPage() {
  const { user, fornecedoresVinculados, loading: authLoading } = useRepresentanteAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

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
                  {stats?.fornecedores_ativos || 0}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              href="/representante/pedidos?status=enviado_ao_fornecedor"
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
          </div>
        </div>

        {/* Fornecedores Vinculados */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Fornecedores Vinculados
          </h2>
          {fornecedoresVinculados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum fornecedor vinculado
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {fornecedoresVinculados.map((forn) => (
                <div
                  key={`${forn.representante_id}-${forn.fornecedor_id}`}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{forn.fornecedor_nome}</p>
                    <p className="text-sm text-gray-500">
                      {forn.empresa_nome} {forn.fornecedor_cnpj && `- ${forn.fornecedor_cnpj}`}
                    </p>
                  </div>
                  <Link
                    href={`/representante/pedidos?fornecedor_id=${forn.fornecedor_id}`}
                    className="text-sm text-[#336FB6] hover:text-[#2660A5] font-medium"
                  >
                    Ver pedidos
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RepresentanteLayout>
  )
}
