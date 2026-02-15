'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

interface FornecedorVinculado {
  id: number
  nome: string
  cnpj?: string
  vinculado_em: string
}

interface RepresentanteDetalhes {
  id: number
  nome: string
  telefone?: string
  codigo_acesso: string
  cadastrado: boolean
  email?: string
  ativo: boolean
  created_at: string
  fornecedores: FornecedorVinculado[]
  fornecedores_count: number
}

interface Fornecedor {
  id: number
  nome: string
  cnpj?: string
}

export default function RepresentanteDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, empresa } = useAuth()
  const [representante, setRepresentante] = useState<RepresentanteDetalhes | null>(null)
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFornecedor, setSelectedFornecedor] = useState<number | null>(null)

  // Form
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  const fetchRepresentante = async () => {
    try {
      const response = await fetch(`/api/representantes/${id}`)
      const data = await response.json()

      if (data.success) {
        setRepresentante(data.representante)
        setNome(data.representante.nome)
        setTelefone(data.representante.telefone || '')
      } else {
        router.push('/cadastros/representantes')
      }
    } catch (err) {
      console.error('Erro:', err)
      router.push('/cadastros/representantes')
    } finally {
      setLoading(false)
    }
  }

  const fetchFornecedores = async () => {
    const empresaId = empresa?.id || user?.empresa_id
    if (!empresaId) return

    try {
      const response = await fetch(`/api/fornecedores/produtos?empresa_id=${empresaId}`)
      const data = await response.json()

      if (data.fornecedores) {
        setFornecedoresDisponiveis(data.fornecedores.map((f: Fornecedor) => ({
          id: f.id,
          nome: f.nome,
          cnpj: f.cnpj,
        })))
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchRepresentante()
      fetchFornecedores()
    }
  }, [user?.id, id])

  const handleCopyCode = () => {
    if (representante) {
      navigator.clipboard.writeText(representante.codigo_acesso)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/representantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone }),
      })

      const data = await response.json()

      if (data.success) {
        fetchRepresentante()
      } else {
        alert(data.error || 'Erro ao salvar')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveFornecedor = async (fornecedorId: number) => {
    if (!confirm('Remover vinculo com este fornecedor?')) return

    try {
      const response = await fetch(`/api/representantes/${id}/fornecedores/${fornecedorId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        fetchRepresentante()
      } else {
        alert(data.error || 'Erro ao remover')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao remover')
    }
  }

  const handleAddFornecedor = async () => {
    if (!selectedFornecedor) return

    try {
      const response = await fetch(`/api/representantes/${id}/fornecedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fornecedor_id: selectedFornecedor }),
      })

      const data = await response.json()

      if (data.success) {
        setShowAddModal(false)
        setSelectedFornecedor(null)
        fetchRepresentante()
      } else {
        alert(data.error || 'Erro ao vincular')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao vincular')
    }
  }

  const handleDesativar = async () => {
    if (!confirm('Deseja desativar este representante?')) return

    try {
      const response = await fetch(`/api/representantes/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        router.push('/cadastros/representantes')
      } else {
        alert(data.error || 'Erro ao desativar')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao desativar')
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Fornecedores disponiveis para adicionar (excluindo os ja vinculados)
  const fornecedoresParaAdicionar = fornecedoresDisponiveis.filter(
    f => !representante?.fornecedores.some(rf => rf.id === f.id)
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <SpinnerIcon />
        </div>
      </DashboardLayout>
    )
  }

  if (!representante) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Representante nao encontrado</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={representante.nome}
        subtitle="Detalhes do representante"
      />

      {/* Voltar */}
      <Link
        href="/cadastros/representantes"
        className="inline-flex items-center gap-2 text-[14px] font-medium text-[#64748b] hover:text-[#336FB6] transition-colors mb-6"
      >
        <ArrowLeftIcon />
        <span>Voltar para lista</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados do Representante */}
        <div className="lg:col-span-2 bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#1e293b]">Dados do Representante</h2>
            <span className={`px-3 py-1 text-[12px] font-medium rounded-full ${
              representante.cadastrado
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {representante.cadastrado ? 'Cadastrado' : 'Pendente'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 text-[15px] text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                Telefone/WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="w-full px-4 py-3 text-[15px] text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                Codigo de Acesso
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-[#f1f5f9] rounded-xl text-[15px] font-mono text-[#336FB6]">
                  {representante.codigo_acesso}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 text-[#64748b] hover:text-[#336FB6] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl transition-colors"
                  title="Copiar codigo"
                >
                  {copiedCode ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-[#64748b]">
                Compartilhe este codigo com o representante para que ele possa se cadastrar
              </p>
            </div>

            {representante.email && (
              <div>
                <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                  Email
                </label>
                <p className="px-4 py-3 text-[15px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                  {representante.email}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e2e8f0]">
            <button
              onClick={handleDesativar}
              className="px-4 py-2 text-[13px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Desativar representante
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-[14px] font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2660A5] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <SpinnerIcon />}
              <span>Salvar alteracoes</span>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 h-fit">
          <h3 className="text-[15px] font-semibold text-[#1e293b] mb-4">Informacoes</h3>

          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748b]">Criado em</span>
              <span className="text-[#1e293b] font-medium">
                {formatDate(representante.created_at)}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748b]">Status</span>
              <span className="text-[#1e293b] font-medium">
                {representante.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748b]">Fornecedores</span>
              <span className="text-[#1e293b] font-medium">
                {representante.fornecedores_count}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fornecedores Vinculados */}
      <div className="mt-6 bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1e293b]">
            Fornecedores Vinculados
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={fornecedoresParaAdicionar.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#336FB6] rounded-lg hover:bg-[#2660A5] transition-colors disabled:opacity-50"
          >
            <PlusIcon />
            Adicionar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EFEFEF]">
                <th className="px-6 py-3 text-left text-sm font-medium text-[#344054]">
                  Fornecedor
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-[#344054]">
                  CNPJ
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-[#344054]">
                  Vinculado em
                </th>
                <th className="px-6 py-3 w-16">
                  <span className="sr-only">Acoes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {representante.fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#64748b]">
                    Nenhum fornecedor vinculado
                  </td>
                </tr>
              ) : (
                representante.fornecedores.map((forn, index) => (
                  <tr
                    key={forn.id}
                    className={`border-b border-[#EFEFEF] hover:bg-gray-50 ${
                      index % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'
                    }`}
                  >
                    <td className="px-6 py-3">
                      <span className="text-[13px] font-medium text-[#344054]">
                        {forn.nome}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[13px] text-[#64748b]">
                        {forn.cnpj || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[13px] text-[#64748b]">
                        {formatDate(forn.vinculado_em)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleRemoveFornecedor(forn.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover vinculo"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Adicionar Fornecedor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
            onClick={() => setShowAddModal(false)}
          />

          <div className="relative w-full max-w-[400px] bg-white rounded-[20px] shadow-xl p-6">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-4">
              Adicionar Fornecedor
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                  Selecione um fornecedor
                </label>
                <select
                  value={selectedFornecedor || ''}
                  onChange={(e) => setSelectedFornecedor(Number(e.target.value) || null)}
                  className="w-full px-4 py-3 text-[15px] text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#336FB6]/30 focus:border-[#336FB6] transition-all"
                >
                  <option value="">Selecione...</option>
                  {fornecedoresParaAdicionar.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f8fafc] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddFornecedor}
                disabled={!selectedFornecedor}
                className="px-5 py-2.5 text-[14px] font-medium text-white bg-[#336FB6] rounded-xl hover:bg-[#2660A5] transition-colors disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
