'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Empresa {
  id: number
  nome_fantasia: string | null
  razao_social: string | null
  cnpj: string | null
}

interface Fornecedor {
  id: number
  nome: string
  cnpj: string | null
}

interface RepresentanteEntity {
  id: number
  nome: string | null
  empresa_id: number | null
  codigo_acesso: string | null
  ativo: boolean
  created_at: string
  empresa: Empresa | null
  fornecedores: Fornecedor[]
}

interface UserRepresentante {
  id: number
  nome: string | null
  email: string
  telefone: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

interface PedidoRecente {
  id: number
  numero: string | null
  data: string | null
  total: number | null
  status_interno: string | null
  situacao: string | null
  fornecedor_id: number | null
  fornecedores: { id: number; nome: string } | null
  empresa_id: number | null
  empresas: { id: number; nome_fantasia: string | null } | null
}

interface Stats {
  empresas_count: number
  fornecedores_count: number
  pedidos_count: number
}

interface DetailData {
  user: UserRepresentante
  representante_entities: RepresentanteEntity[]
  stats: Stats
  pedidos_recentes: PedidoRecente[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return '-'
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// ---------------------------------------------------------------------------
// Icons (inline SVG - heroicons style)
// ---------------------------------------------------------------------------

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 6h1.5M5.25 9h1.5M5.25 12h1.5m7.5-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  )
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Status badge for pedidos
// ---------------------------------------------------------------------------

function PedidoStatusBadge({ status, situacao }: { status: string | null; situacao: string | null }) {
  const label = status || situacao || 'Desconhecido'

  const colorMap: Record<string, string> = {
    aprovado: 'bg-emerald-100 text-emerald-800',
    finalizado: 'bg-emerald-100 text-emerald-800',
    concluido: 'bg-emerald-100 text-emerald-800',
    pendente: 'bg-yellow-100 text-yellow-800',
    em_andamento: 'bg-primary-100 text-primary-800',
    cancelado: 'bg-gray-100 text-gray-800',
    recusado: 'bg-gray-100 text-gray-800',
    rascunho: 'bg-gray-100 text-gray-600',
  }

  const normalized = label.toLowerCase().replace(/\s+/g, '_')
  const classes = colorMap[normalized] || 'bg-gray-100 text-gray-700'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link */}
      <div className="h-5 bg-gray-200 rounded w-32" />

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-7 bg-gray-200 rounded w-64" />
            <div className="h-4 bg-gray-200 rounded w-48" />
            <div className="h-4 bg-gray-200 rounded w-36" />
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-5 bg-gray-200 rounded w-48" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <h2 className="text-lg font-semibold text-gray-700 mb-1">Erro</h2>
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Voltar para Usuarios
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RepresentanteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/usuarios/representantes/${id}`)
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError(json.error || `Erro ${res.status}`)
          return
        }
        const json: DetailData = await res.json()
        setData(json)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Erro ao carregar dados do representante')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  // Collect all unique fornecedores across all entities
  const allFornecedores: Fornecedor[] = []
  if (data) {
    const seen = new Set<number>()
    for (const entity of data.representante_entities) {
      for (const f of entity.fornecedores) {
        if (!seen.has(f.id)) {
          seen.add(f.id)
          allFornecedores.push(f)
        }
      }
    }
  }

  // Get first codigo_acesso found
  const codigoAcesso = data?.representante_entities.find((e) => e.codigo_acesso)?.codigo_acesso || null

  return (
    <AdminLayout>
      {loading ? (
        <LoadingSkeleton />
      ) : error || !data ? (
        <ErrorState message={error || 'Representante nao encontrado'} />
      ) : (
        <div className="space-y-6">
          {/* Back link */}
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Voltar para Usuarios
          </Link>

          {/* Header section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {data.user.nome || 'Sem nome'}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      data.user.ativo
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {data.user.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <EnvelopeIcon className="w-4 h-4" />
                    {data.user.email}
                  </div>
                  {data.user.telefone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <PhoneIcon className="w-4 h-4" />
                      {data.user.telefone}
                    </div>
                  )}
                </div>

                {codigoAcesso && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">Codigo de acesso:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {codigoAcesso}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-400 text-right shrink-0">
                <p>Criado em {formatDate(data.user.created_at)}</p>
                {data.user.updated_at && (
                  <p>Atualizado em {formatDate(data.user.updated_at)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Empresas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <BuildingIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Empresas Vinculadas</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.empresas_count}</p>
                </div>
              </div>
            </div>

            {/* Fornecedores */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                  <TruckIcon className="w-5 h-5 text-secondary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fornecedores</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.fornecedores_count}</p>
                </div>
              </div>
            </div>

            {/* Pedidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <ClipboardIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pedidos</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.pedidos_count}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Empresas Vinculadas section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Empresas Vinculadas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNPJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Codigo Acesso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.representante_entities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        Nenhuma empresa vinculada.
                      </td>
                    </tr>
                  ) : (
                    data.representante_entities
                      .filter((e) => e.empresa !== null)
                      .map((entity) => (
                        <tr
                          key={entity.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/admin/empresas/${entity.empresa!.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {entity.empresa!.nome_fantasia || entity.empresa!.razao_social || `Empresa #${entity.empresa!.id}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600 font-mono">
                              {formatCNPJ(entity.empresa!.cnpj)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {entity.codigo_acesso ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                {entity.codigo_acesso}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entity.ativo
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {entity.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fornecedores Vinculados section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Fornecedores Vinculados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNPJ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allFornecedores.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-sm text-gray-500">
                        Nenhum fornecedor vinculado.
                      </td>
                    </tr>
                  ) : (
                    allFornecedores.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{f.nome}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 font-mono">
                            {formatCNPJ(f.cnpj)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pedidos Recentes section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numero
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fornecedor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.pedidos_recentes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
                  ) : (
                    data.pedidos_recentes.map((pedido) => (
                      <tr
                        key={pedido.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {pedido.numero || `#${pedido.id}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{formatDate(pedido.data)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {pedido.empresas?.nome_fantasia || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {pedido.fornecedores?.nome || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(pedido.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PedidoStatusBadge
                            status={pedido.status_interno}
                            situacao={pedido.situacao}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
