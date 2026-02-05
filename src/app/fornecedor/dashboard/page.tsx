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
  enviado_fornecedor: 'bg-blue-100 text-blue-700',
  sugestao_pendente: 'bg-amber-100 text-amber-700',
  aceito: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
  finalizado: 'bg-purple-100 text-purple-700',
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_fornecedor: 'Aguardando resposta',
  sugestao_pendente: 'Sugestao enviada',
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Ola, {user?.nome}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe seus pedidos e negocie com seus clientes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Pedidos pendentes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? <Skeleton className="h-9 w-16" /> : data?.pedidosPendentes || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total em aberto</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                `R$ ${(data?.totalEmAberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Sugestoes enviadas</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? <Skeleton className="h-9 w-16" /> : data?.sugestoesEnviadas || 0}
            </p>
          </div>
        </div>

        {/* Lojistas vinculados */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lojistas vinculados</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : data?.empresasVinculadas && data.empresasVinculadas.length > 0 ? (
              <div className="space-y-3">
                {data.empresasVinculadas.map((emp) => (
                  <div key={emp.empresaId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{emp.nomeFantasia || emp.razaoSocial}</p>
                      <p className="text-sm text-gray-500">{emp.razaoSocial}</p>
                    </div>
                    <span className="text-sm text-gray-500">{emp.totalPedidos} pedidos</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum lojista vinculado ainda.</p>
            )}
          </div>
        </div>

        {/* Pedidos recentes */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pedidos recentes</h2>
            <Link href="/fornecedor/pedidos" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : data?.pedidosRecentes && data.pedidosRecentes.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Numero</th>
                    <th className="px-6 py-3">Lojista</th>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.pedidosRecentes.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{pedido.numero}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{pedido.empresa_nome}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(pedido.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[pedido.status_interno] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[pedido.status_interno] || pedido.status_interno}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/fornecedor/pedidos/${pedido.id}`}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <p className="text-sm text-gray-500">Nenhum pedido recente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </FornecedorLayout>
  )
}
