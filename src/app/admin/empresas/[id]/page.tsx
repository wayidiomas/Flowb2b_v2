'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface EmpresaDetail {
  empresa: {
    id: number
    nome_fantasia: string | null
    razao_social: string | null
    cnpj: string | null
    conectadabling: boolean | null
    sync_status: string | null
    created_date: string | null
  }
  users: Array<{
    id: number
    nome: string | null
    email: string
    role: string
    ativo: boolean
    created_at: string | null
  }>
  fornecedores: Array<{
    id: number
    nome: string
    cnpj: string | null
  }>
  bling: {
    token_status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'no_token'
    expires_at: string | null
    is_revoke: boolean | null
    updated_at: string | null
  }
  counts: {
    users: number
    fornecedores: number
    produtos: number
    pedidos: number
  }
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return '-'
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TokenStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    valid: { label: 'Token Ativo', className: 'bg-green-100 text-green-800' },
    expiring: { label: 'Expirando em breve', className: 'bg-yellow-100 text-yellow-800' },
    expired: { label: 'Token Expirado', className: 'bg-red-100 text-red-800' },
    revoked: { label: 'Token Revogado', className: 'bg-red-100 text-red-800' },
    no_token: { label: 'Sem Token', className: 'bg-gray-100 text-gray-600' },
  }
  const { label, className } = config[status] || config.no_token
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function EmpresaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<EmpresaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/empresas/${id}`)
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Erro ao buscar empresa')
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Link href="/admin/empresas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error || 'Empresa nao encontrada'}
          </div>
        </div>
      </AdminLayout>
    )
  }

  const { empresa, users, fornecedores, bling, counts } = data

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link href="/admin/empresas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para Empresas
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`}
              </h1>
              {empresa.razao_social && empresa.nome_fantasia && (
                <p className="text-sm text-gray-500 mt-1">{empresa.razao_social}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="text-sm text-gray-600 font-mono">
                  CNPJ: {formatCnpj(empresa.cnpj)}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  Criada em {formatDate(empresa.created_date)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TokenStatusBadge status={bling.token_status} />
              {empresa.conectadabling && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Bling Conectado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Usuarios"
            value={counts.users}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            }
          />
          <StatCard
            label="Fornecedores"
            value={counts.fornecedores}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75M3.375 14.25h4.875c.621 0 1.125-.504 1.125-1.125v-3.375c0-.621-.504-1.125-1.125-1.125H3.375m0 5.625V7.5A2.25 2.25 0 015.625 5.25h5.25A2.25 2.25 0 0113.125 7.5v6.375" />
              </svg>
            }
          />
          <StatCard
            label="Produtos"
            value={counts.produtos}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
          />
          <StatCard
            label="Pedidos Compra"
            value={counts.pedidos}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/bling/${empresa.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Gerenciar Bling
          </Link>
          <Link
            href={`/admin/relacoes?empresa_id=${empresa.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Ver Mapa de Relacoes
          </Link>
        </div>

        {/* Usuarios Vinculados */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Usuarios Vinculados ({users.length})
            </h2>
          </div>
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nenhum usuario vinculado a esta empresa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-900">
                        {user.nome || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.ativo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fornecedores */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Fornecedores ({fornecedores.length})
            </h2>
          </div>
          {fornecedores.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nenhum fornecedor vinculado a esta empresa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fornecedores.map((fornecedor) => (
                    <tr key={fornecedor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-900">
                        {fornecedor.nome}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                        {formatCnpj(fornecedor.cnpj)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bling Info */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Integracao Bling</h2>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Conectado</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {empresa.conectadabling ? 'Sim' : 'Nao'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Status Token</dt>
                <dd className="mt-1">
                  <TokenStatusBadge status={bling.token_status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Expira em</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(bling.expires_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Ultima Atualizacao</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(bling.updated_at)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
