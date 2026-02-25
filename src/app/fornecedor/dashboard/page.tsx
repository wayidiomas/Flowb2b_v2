'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'

interface DashboardData {
  pedidosPendentes: number
  totalEmAberto: number
  sugestoesEnviadas: number
  pedidosRecentes: {
    id: number
    numero: string
    data: string
    total: number
    status_interno: string
    empresa_nome: string
  }[]
  empresasVinculadas: {
    empresaId: number
    razaoSocial: string
    nomeFantasia: string
    totalPedidos: number
  }[]
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado_fornecedor: 'bg-amber-100 text-amber-700',
  sugestao_pendente: 'bg-orange-100 text-orange-700',
  aceito: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
  finalizado: 'bg-purple-100 text-purple-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Aguardando resposta',
  sugestao_pendente: 'Sugestao enviada',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

// Icones
function PendingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MoneyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SugestaoIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

export default function FornecedorDashboardPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/fornecedor/dashboard')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [user])

  if (authLoading) {
    return (
      <FornecedorLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 2xl:gap-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ola, {user?.nome}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Acompanhe seus pedidos e negocie com seus clientes
            </p>
          </div>
          <Link
            href="/fornecedor/pedidos"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#FFAA11] hover:bg-[#E59A0F] text-white font-medium rounded-xl shadow-md transition-all"
          >
            Ver pedidos
            <ArrowRightIcon />
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Pedidos Pendentes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pedidos pendentes</p>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? <Skeleton className="h-9 w-16" /> : data?.pedidosPendentes || 0}
                </div>
              </div>
              <div className="w-14 h-14 bg-[#FFAA11]/15 rounded-2xl flex items-center justify-center text-[#FFAA11]">
                <PendingIcon />
              </div>
            </div>
          </div>

          {/* Total em Aberto */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total em aberto</p>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    `R$ ${(data?.totalEmAberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <MoneyIcon />
              </div>
            </div>
          </div>

          {/* Sugestoes Enviadas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Sugestoes enviadas</p>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? <Skeleton className="h-9 w-16" /> : data?.sugestoesEnviadas || 0}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center text-purple-600">
                <SugestaoIcon />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pedidos recentes - 2 colunas */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#336FB6]/5">
              <h2 className="text-lg font-semibold text-gray-900">Pedidos recentes</h2>
              <Link href="/fornecedor/pedidos" className="text-sm text-[#336FB6] hover:text-[#2660A5] font-semibold flex items-center gap-1">
                Ver todos
                <ArrowRightIcon />
              </Link>
            </div>
            <div>
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : data?.pedidosRecentes && data.pedidosRecentes.length > 0 ? (
                <>
                  {/* Desktop: tabela */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-3">Numero</th>
                          <th className="px-6 py-3">Lojista</th>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3">Total</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.pedidosRecentes.map((pedido) => (
                          <tr key={pedido.id} className="hover:bg-[#336FB6]/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">#{pedido.numero}</td>
                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{pedido.empresa_nome}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(pedido.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                              R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                                {statusLabels[pedido.status_interno] || pedido.status_interno}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/fornecedor/pedidos/${pedido.id}`}
                                className="text-sm text-[#336FB6] hover:text-[#2660A5] font-semibold"
                              >
                                Ver
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {data.pedidosRecentes.map((pedido) => (
                      <Link
                        key={pedido.id}
                        href={`/fornecedor/pedidos/${pedido.id}`}
                        className="block p-4 hover:bg-[#336FB6]/5 active:bg-[#336FB6]/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold text-gray-900">#{pedido.numero}</span>
                            <p className="text-sm text-gray-600 mt-0.5 truncate">{pedido.empresa_nome}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[pedido.status_interno] || pedido.status_interno}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{new Date(pedido.data).toLocaleDateString('pt-BR')}</span>
                          <span className="text-sm font-bold text-gray-900">
                            R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Nenhum pedido recente</p>
                </div>
              )}
            </div>
          </div>

          {/* Lojistas vinculados - 1 coluna */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-[#336FB6]/5">
              <h2 className="text-lg font-semibold text-gray-900">Lojistas vinculados</h2>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : data?.empresasVinculadas && data.empresasVinculadas.length > 0 ? (
                <div className="space-y-3">
                  {data.empresasVinculadas.map((emp) => (
                    <div key={emp.empresaId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-[#336FB6]/5 transition-colors">
                      <div className="w-10 h-10 bg-[#336FB6]/10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#336FB6]">
                        <StoreIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{emp.nomeFantasia || emp.razaoSocial}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.razaoSocial}</p>
                      </div>
                      <span className="text-xs font-semibold text-[#336FB6] bg-[#336FB6]/10 px-2 py-1 rounded-full flex-shrink-0">
                        {emp.totalPedidos} pedidos
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <StoreIcon />
                  </div>
                  <p className="text-sm text-gray-500">Nenhum lojista vinculado ainda</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FornecedorLayout>
  )
}
