'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Lojista {
  id: string
  nome: string | null
  email: string
  role: string
  ativo: boolean
  created_at: string
  empresas: Array<{ id: number; nome: string; role: string }>
  tipo_usuario: 'lojista' | 'colaborador' | 'superadmin' | 'sem_empresa'
}

interface Fornecedor {
  id: number
  nome: string | null
  email: string
  cnpj: string | null
  telefone: string | null
  ativo: boolean
  created_at: string
  lojistas_vinculados: number
  pedidos_recebidos: number
}

interface Representante {
  id: number
  nome: string | null
  email: string
  telefone: string | null
  ativo: boolean
  created_at: string
  empresas: Array<{ id: number; nome: string }>
  fornecedores: Array<{ id: number; nome: string }>
  codigo_acesso: string | null
}

type TabKey = 'lojistas' | 'fornecedores' | 'representantes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsuariosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('lojistas')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Data state
  const [lojistas, setLojistas] = useState<Lojista[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Action menu state
  const [openActionId, setOpenActionId] = useState<string | number | null>(null)
  const [actionLoading, setActionLoading] = useState<string | number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Edit modal state
  const [editModal, setEditModal] = useState<{ tipo: TabKey; id: string | number; nome: string | null; email: string } | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      if (activeTab === 'lojistas' && tipoFilter) params.set('tipo', tipoFilter)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/admin/usuarios/${activeTab}?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        console.error('Fetch error:', json.error)
        return
      }

      if (activeTab === 'lojistas') setLojistas(json.data)
      else if (activeTab === 'fornecedores') setFornecedores(json.data)
      else setRepresentantes(json.data)

      setPagination(json.pagination)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, statusFilter, tipoFilter, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when changing tab or filters
  useEffect(() => {
    setPage(1)
  }, [activeTab, statusFilter, tipoFilter])

  // Actions
  async function handleToggleAtivo(tipo: TabKey, id: string | number) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/usuarios/${tipo}/${id}/toggle-ativo`, {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok) {
        await fetchData()
      } else {
        alert(json.error || 'Erro ao alterar status')
      }
    } catch {
      alert('Erro ao alterar status')
    } finally {
      setActionLoading(null)
      setOpenActionId(null)
    }
  }

  function openEditModal(tipo: TabKey, id: string | number, nome: string | null, email: string) {
    setEditModal({ tipo, id, nome, email })
    setEditEmail(email)
    setEditPassword('')
    setEditPasswordConfirm('')
    setEditError('')
    setEditSuccess('')
    setOpenActionId(null)
  }

  async function handleEditar() {
    if (!editModal) return
    setEditError('')
    setEditSuccess('')

    // Validar
    if (editPassword && editPassword !== editPasswordConfirm) {
      setEditError('As senhas nao coincidem.')
      return
    }

    const emailChanged = editEmail.toLowerCase() !== editModal.email.toLowerCase()
    const passwordChanged = editPassword.length > 0

    if (!emailChanged && !passwordChanged) {
      setEditError('Nenhuma alteracao detectada.')
      return
    }

    setEditLoading(true)
    try {
      const body: Record<string, string> = {}
      if (emailChanged) body.email = editEmail
      if (passwordChanged) body.password = editPassword

      const res = await fetch(`/api/admin/usuarios/${editModal.tipo}/${editModal.id}/editar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setEditSuccess(json.message || 'Atualizado com sucesso!')
        await fetchData()
        setTimeout(() => setEditModal(null), 1200)
      } else {
        setEditError(json.error || 'Erro ao atualizar')
      }
    } catch {
      setEditError('Erro de conexao')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleResetSenha(tipo: TabKey, id: string | number) {
    if (!confirm('Tem certeza que deseja enviar email de reset de senha?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/usuarios/${tipo}/${id}/reset-senha`, {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok) {
        alert(json.message || 'Email enviado com sucesso')
      } else {
        alert(json.error || 'Erro ao resetar senha')
      }
    } catch {
      alert('Erro ao resetar senha')
    } finally {
      setActionLoading(null)
      setOpenActionId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Tab definitions
  // ---------------------------------------------------------------------------
  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'lojistas', label: 'Usuarios', count: activeTab === 'lojistas' ? pagination.total : 0 },
    { key: 'fornecedores', label: 'Fornecedores', count: activeTab === 'fornecedores' ? pagination.total : 0 },
    { key: 'representantes', label: 'Representantes', count: activeTab === 'representantes' ? pagination.total : 0 },
  ]

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function StatusBadge({ ativo }: { ativo: boolean }) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          ativo
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {ativo ? 'Ativo' : 'Inativo'}
      </span>
    )
  }

  function TipoBadge({ tipo }: { tipo: Lojista['tipo_usuario'] }) {
    const config: Record<string, { label: string; classes: string }> = {
      lojista: { label: 'Lojista', classes: 'bg-primary-100 text-primary-800' },
      colaborador: { label: 'Colaborador', classes: 'bg-cyan-100 text-cyan-800' },
      superadmin: { label: 'Superadmin', classes: 'bg-purple-100 text-purple-800' },
      sem_empresa: { label: 'Sem empresa', classes: 'bg-gray-100 text-gray-600' },
    }
    const { label, classes } = config[tipo] || config.sem_empresa
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
      >
        {label}
      </span>
    )
  }

  function ActionMenu({ tipo, id, ativo, nome, email }: { tipo: TabKey; id: string | number; ativo: boolean; nome: string | null; email: string }) {
    const isOpen = openActionId === id
    const isLoading = actionLoading === id

    return (
      <div className="relative" ref={isOpen ? menuRef : undefined}>
        <button
          onClick={() => setOpenActionId(isOpen ? null : id)}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Acoes"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          )}
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => {
                setOpenActionId(null)
                window.location.href = `/admin/usuarios/${tipo}/${id}`
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ver detalhes
            </button>
            <button
              onClick={() => openEditModal(tipo, id, nome, email)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Editar email/senha
            </button>
            <button
              onClick={() => handleResetSenha(tipo, id)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              Resetar senha
            </button>
            <hr className="my-1 border-gray-100" />
            <button
              onClick={() => handleToggleAtivo(tipo, id)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                ativo
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-green-600 hover:bg-green-50'
              }`}
            >
              {ativo ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Desativar
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ativar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  function EmptyState() {
    return (
      <tr>
        <td colSpan={99} className="px-6 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">
            {debouncedSearch || statusFilter || tipoFilter
              ? 'Nenhum usuario encontrado com os filtros aplicados.'
              : 'Nenhum usuario cadastrado.'}
          </p>
        </td>
      </tr>
    )
  }

  function LoadingRows({ cols }: { cols: number }) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <tr key={i} className="animate-pulse">
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </td>
            ))}
          </tr>
        ))}
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Tables
  // ---------------------------------------------------------------------------

  function LojistasTable() {
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresas</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <LoadingRows cols={8} />
          ) : lojistas.length === 0 ? (
            <EmptyState />
          ) : (
            lojistas.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{u.nome || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{u.email}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {u.empresas.length === 0 ? (
                      <span className="text-sm text-gray-400">-</span>
                    ) : (
                      u.empresas.map((e) => (
                        <span
                          key={e.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          title={`Role: ${e.role}`}
                        >
                          {e.nome}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600 capitalize">{u.role || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <TipoBadge tipo={u.tipo_usuario} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge ativo={u.ativo} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{formatDate(u.created_at)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <ActionMenu tipo="lojistas" id={u.id} ativo={u.ativo} nome={u.nome} email={u.email} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )
  }

  function FornecedoresTable() {
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lojistas vinculados</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedidos recebidos</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <LoadingRows cols={7} />
          ) : fornecedores.length === 0 ? (
            <EmptyState />
          ) : (
            fornecedores.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{f.nome || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{f.email}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600 font-mono">{formatCNPJ(f.cnpj)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{f.lojistas_vinculados}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{f.pedidos_recebidos}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge ativo={f.ativo} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <ActionMenu tipo="fornecedores" id={f.id} ativo={f.ativo} nome={f.nome} email={f.email} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )
  }

  function RepresentantesTable() {
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresas</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedores</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Codigo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <LoadingRows cols={7} />
          ) : representantes.length === 0 ? (
            <EmptyState />
          ) : (
            representantes.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{r.nome || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{r.email}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {r.empresas.length === 0 ? (
                      <span className="text-sm text-gray-400">-</span>
                    ) : (
                      r.empresas.map((e) => (
                        <span
                          key={e.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {e.nome}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {r.fornecedores.length === 0 ? (
                      <span className="text-sm text-gray-400">-</span>
                    ) : (
                      r.fornecedores.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          {f.nome}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600 font-mono">
                    {r.codigo_acesso || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge ativo={r.ativo} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <ActionMenu tipo="representantes" id={r.id} ativo={r.ativo} nome={r.nome} email={r.email} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie todos os usuarios da plataforma: lojistas, fornecedores e representantes.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && pagination.total > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    {pagination.total}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>

            {/* Tipo filter (only for lojistas/usuarios tab) */}
            {activeTab === 'lojistas' && (
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">Todos os tipos</option>
                <option value="lojista">Lojista</option>
                <option value="colaborador">Colaborador</option>
                <option value="superadmin">Superadmin</option>
              </select>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'lojistas' && <LojistasTable />}
            {activeTab === 'fornecedores' && <FornecedoresTable />}
            {activeTab === 'representantes' && <RepresentantesTable />}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando{' '}
                <span className="font-medium">{(page - 1) * pagination.limit + 1}</span>
                {' - '}
                <span className="font-medium">
                  {Math.min(page * pagination.limit, pagination.total)}
                </span>
                {' de '}
                <span className="font-medium">{pagination.total}</span>
                {' resultados'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {/* Page numbers */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and pages around current
                    return p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1
                  })
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
                      acc.push('...')
                    }
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`dots-${i}`} className="px-2 py-1.5 text-sm text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                          page === p
                            ? 'bg-primary-700 text-white border-primary-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !editLoading && setEditModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Editar usuario</h3>
                <p className="text-sm text-gray-500 mt-0.5">{editModal.nome || `ID #${editModal.id}`}</p>
              </div>
              <button
                onClick={() => !editLoading && setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => { setEditEmail(e.target.value); setEditError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha <span className="text-gray-400 font-normal">(deixe vazio para manter)</span></label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => { setEditPassword(e.target.value); setEditError('') }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {editPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                  <input
                    type="password"
                    value={editPasswordConfirm}
                    onChange={(e) => { setEditPasswordConfirm(e.target.value); setEditError('') }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}

              {editError && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div className="bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm border border-green-100">
                  {editSuccess}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                disabled={editLoading}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditar}
                disabled={editLoading}
                className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
