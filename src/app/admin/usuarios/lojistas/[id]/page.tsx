'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserDetail {
  user: {
    id: string
    nome: string | null
    email: string
    role: string
    ativo: boolean
    created_at: string | null
    updated_at: string | null
    tipo_usuario: 'lojista' | 'colaborador' | 'superadmin' | 'sem_empresa'
  }
  empresas: Array<{
    id: number
    nome_fantasia: string | null
    razao_social: string | null
    cnpj: string | null
    created_date: string | null
    role: string
    pedidos: number
    produtos: number
    fornecedores: number
  }>
  stats: {
    total_empresas: number
    total_pedidos: number
    total_produtos: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return '-'
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TipoBadge({ tipo }: { tipo: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    lojista: { label: 'Lojista', classes: 'bg-primary-100 text-primary-800' },
    colaborador: { label: 'Colaborador', classes: 'bg-cyan-100 text-cyan-800' },
    superadmin: { label: 'Superadmin', classes: 'bg-purple-100 text-purple-800' },
    sem_empresa: { label: 'Sem empresa', classes: 'bg-gray-100 text-gray-600' },
  }
  const { label, classes } = config[tipo] || config.sem_empresa
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    admin: { label: 'Admin', classes: 'bg-primary-100 text-primary-800' },
    user: { label: 'Usuario', classes: 'bg-gray-100 text-gray-700' },
    viewer: { label: 'Viewer', classes: 'bg-yellow-100 text-yellow-800' },
  }
  const { label, classes } = config[role] || { label: role, classes: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
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

function LoadingSkeleton() {
  return (
    <AdminLayout>
      <div className="space-y-6 animate-pulse">
        {/* Back link skeleton */}
        <div className="h-4 bg-gray-200 rounded w-24" />

        {/* Header skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-7 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-20" />
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </div>
        </div>

        {/* Info cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-7 bg-gray-200 rounded w-12 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="h-4 bg-gray-200 rounded w-40" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LojistaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/usuarios/lojistas/${id}`)
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Erro ao buscar usuario')
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
    return <LoadingSkeleton />
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error || 'Usuario nao encontrado'}
          </div>
        </div>
      </AdminLayout>
    )
  }

  const { user, empresas, stats } = data

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para Usuarios
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.nome || 'Usuario sem nome'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <TipoBadge tipo={user.tipo_usuario} />
                <StatusBadge ativo={user.ativo} />
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            label="Role"
            value={user.role || '-'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
          />
          <InfoCard
            label="Criado em"
            value={formatDate(user.created_at)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
          />
          <InfoCard
            label="Atualizado em"
            value={formatDate(user.updated_at)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
              </svg>
            }
          />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Empresas"
            value={stats.total_empresas}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
              </svg>
            }
          />
          <StatCard
            label="Total Pedidos"
            value={stats.total_pedidos}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            }
          />
          <StatCard
            label="Total Produtos"
            value={stats.total_produtos}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
          />
        </div>

        {/* Empresas vinculadas */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Empresas Vinculadas ({empresas.length})
            </h2>
          </div>
          {empresas.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                Nenhuma empresa vinculada a este usuario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome Fantasia
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      CNPJ
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Role na Empresa
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                      Pedidos
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                      Produtos
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                      Fornecedores
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/empresas/${empresa.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          {empresa.nome_fantasia || empresa.razao_social || `Empresa #${empresa.id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                        {formatCnpj(empresa.cnpj)}
                      </td>
                      <td className="px-4 py-2.5">
                        <RoleBadge role={empresa.role} />
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">
                        {empresa.pedidos}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">
                        {empresa.produtos}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">
                        {empresa.fornecedores}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
