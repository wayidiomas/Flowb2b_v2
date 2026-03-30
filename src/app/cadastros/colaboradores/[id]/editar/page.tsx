'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { FormActions } from '@/components/ui'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'

// Icons
function UploadIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

interface Permissoes {
  cadastros: boolean
  pedidos: boolean
  relatorios: boolean
  configuracoes: boolean
  financeiro: boolean
  estoque: boolean
}

interface ColaboradorFormData {
  nome: string
  email: string
  telefone: string
  novaSenha: string
  confirmarNovaSenha: string
  foto: string
}

interface EmpresaVinculo {
  empresa_id: number
  empresa_nome: string
  role: string
  ativo: boolean
  permissoes: Permissoes
}

const CARGO_LABELS: Record<string, string> = {
  admin: 'Administrador',
  user: 'Usuario',
  viewer: 'Visualizador',
}

const DEFAULT_PERMISSOES: Permissoes = {
  cadastros: true,
  pedidos: true,
  relatorios: true,
  configuracoes: false,
  financeiro: false,
  estoque: true,
}

const PERMISSOES_OPTIONS = [
  { key: 'cadastros', label: 'Cadastros', description: 'Acesso a cadastros de empresas, produtos e fornecedores' },
  { key: 'pedidos', label: 'Pedidos', description: 'Acesso a pedidos de compra e venda' },
  { key: 'relatorios', label: 'Relatorios', description: 'Acesso a relatorios e dashboards' },
  { key: 'configuracoes', label: 'Configuracoes', description: 'Acesso as configuracoes do sistema' },
  { key: 'financeiro', label: 'Financeiro', description: 'Acesso a dados financeiros' },
  { key: 'estoque', label: 'Estoque', description: 'Acesso a gestao de estoque' },
]

export default function EditarColaboradorPage() {
  const router = useRouter()
  const params = useParams()
  const colaboradorId = params.id as string
  const { user, empresa } = useAuth()
  const { hasPermission, isAdmin, loading: permissionsLoading } = usePermissions()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loading, setLoading] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddToEmpresaModal, setShowAddToEmpresaModal] = useState(false)
  const [empresasVinculadas, setEmpresasVinculadas] = useState<EmpresaVinculo[]>([])
  const [expandedEmpresa, setExpandedEmpresa] = useState<number | null>(null)
  const [savingEmpresa, setSavingEmpresa] = useState<number | null>(null)

  const [formData, setFormData] = useState<ColaboradorFormData>({
    nome: '',
    email: '',
    telefone: '',
    novaSenha: '',
    confirmarNovaSenha: '',
    foto: '',
  })

  // Carregar dados do colaborador
  useEffect(() => {
    async function fetchColaborador() {
      if (!colaboradorId) return

      try {
        const empresaId = empresa?.id || user?.empresa_id

        // Buscar dados do usuario
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', colaboradorId)
          .single()

        if (userError) throw userError

        // Buscar TODOS os vinculos com empresas
        const { data: allLinks } = await supabase
          .from('users_empresas')
          .select('empresa_id, role, ativo, permissoes, empresas(id, nome_fantasia, razao_social)')
          .eq('user_id', colaboradorId)

        if (allLinks && allLinks.length > 0) {
          const vinculos: EmpresaVinculo[] = allLinks.map((link) => {
            const emp = link.empresas as unknown as { id: number; nome_fantasia: string | null; razao_social: string }
            return {
              empresa_id: link.empresa_id,
              empresa_nome: emp?.nome_fantasia || emp?.razao_social || `Empresa ${link.empresa_id}`,
              role: link.role || 'user',
              ativo: link.ativo !== false,
              permissoes: { ...DEFAULT_PERMISSOES, ...(link.permissoes as Partial<Permissoes> || {}) },
            }
          })
          setEmpresasVinculadas(vinculos)
        }

        setFormData({
          nome: userData.nome || '',
          email: userData.email || '',
          telefone: userData.telefone || '',
          novaSenha: '',
          confirmarNovaSenha: '',
          foto: userData.foto || '',
        })
      } catch (err) {
        console.error('Erro ao buscar colaborador:', err)
        setError('Erro ao carregar dados do colaborador')
      } finally {
        setLoadingData(false)
      }
    }

    fetchColaborador()
  }, [colaboradorId, empresa?.id, user?.empresa_id])

  const handleChange = (field: keyof ColaboradorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleEmpresaPermissaoChange = (empresaId: number, permissao: keyof Permissoes) => {
    setEmpresasVinculadas(prev => prev.map(ev =>
      ev.empresa_id === empresaId
        ? { ...ev, permissoes: { ...ev.permissoes, [permissao]: !ev.permissoes[permissao] } }
        : ev
    ))
  }

  const handleEmpresaRoleChange = (empresaId: number, newRole: string) => {
    setEmpresasVinculadas(prev => prev.map(ev =>
      ev.empresa_id === empresaId ? { ...ev, role: newRole } : ev
    ))
  }

  const handleEmpresaAtivoToggle = (empresaId: number) => {
    setEmpresasVinculadas(prev => prev.map(ev =>
      ev.empresa_id === empresaId ? { ...ev, ativo: !ev.ativo } : ev
    ))
  }

  const handleSaveEmpresaPermissoes = async (empresaId: number) => {
    const vinculo = empresasVinculadas.find(ev => ev.empresa_id === empresaId)
    if (!vinculo) return

    setSavingEmpresa(empresaId)
    try {
      const { error: updateError } = await supabase
        .from('users_empresas')
        .update({
          role: vinculo.role,
          ativo: vinculo.ativo,
          permissoes: vinculo.permissoes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', colaboradorId)
        .eq('empresa_id', empresaId)

      if (updateError) throw updateError
      setExpandedEmpresa(null)
    } catch (err) {
      console.error('Erro ao salvar permissoes da empresa:', err)
      alert('Erro ao salvar permissoes')
    } finally {
      setSavingEmpresa(null)
    }
  }

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Formato de imagem invalido. Use JPEG, PNG, GIF ou WebP.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Maximo 2MB.')
      return
    }

    setUploadingFoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `colaboradores/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('empresas')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('empresas')
        .getPublicUrl(filePath)

      setFormData((prev) => ({ ...prev, foto: publicUrl }))
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload da imagem')
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleRemoveFoto = async () => {
    if (!formData.foto) return

    try {
      const urlParts = formData.foto.split('/empresas/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('empresas').remove([filePath])
      }
      setFormData((prev) => ({ ...prev, foto: '' }))
    } catch (err) {
      console.error('Erro ao remover foto:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validacoes
    if (!formData.nome.trim()) {
      setError('Nome e obrigatorio')
      return
    }

    if (!formData.email.trim()) {
      setError('E-mail e obrigatorio')
      return
    }

    if (formData.novaSenha && formData.novaSenha.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres')
      return
    }

    if (formData.novaSenha && formData.novaSenha !== formData.confirmarNovaSenha) {
      setError('As senhas nao conferem')
      return
    }

    setLoading(true)

    try {
      // Atualizar dados basicos do usuario
      const updateData: Record<string, unknown> = {
        nome: formData.nome,
        email: formData.email.toLowerCase(),
        telefone: formData.telefone || null,
        foto: formData.foto || null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', colaboradorId)

      if (updateError) throw updateError

      // Se tem nova senha, atualizar via API route
      if (formData.novaSenha) {
        const response = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: colaboradorId,
            newPassword: formData.novaSenha,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erro ao atualizar senha')
        }
      }

      // Redirecionar para lista
      router.push('/cadastros/colaboradores')
    } catch (err) {
      console.error('Erro ao atualizar colaborador:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar colaborador')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <RequirePermission permission="cadastros">
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-3 text-gray-600">Carregando...</span>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  // Verificar permissao de acesso
  if (!permissionsLoading && !isAdmin && !hasPermission('cadastros')) {
    return (
      <RequirePermission permission="cadastros">
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-500 mb-4">Voce nao tem permissao para acessar esta pagina.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
            >
              Voltar ao inicio
            </Link>
          </div>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="cadastros">
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/cadastros/colaboradores" className="text-gray-500 hover:text-gray-700">
            Colaboradores
          </Link>
          <span className="text-gray-400">&gt;</span>
          <span className="font-medium text-gray-900">Editar Colaborador</span>
        </nav>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar Colaborador</h2>
            <p className="text-sm text-gray-500">Atualize os dados do colaborador</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddToEmpresaModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserPlusIcon />
            Adicionar a outra empresa
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna da Foto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Foto do colaborador
              </label>
              <div className="flex flex-col items-center">
                {formData.foto ? (
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                      <Image
                        src={formData.foto}
                        alt="Foto do colaborador"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFoto}
                      className="absolute -bottom-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFoto}
                    className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                  >
                    {uploadingFoto ? (
                      <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <>
                        <UploadIcon />
                        <span className="text-xs mt-1">Upload</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  JPEG, PNG ou GIF<br />Max 2MB
                </p>
              </div>
            </div>

            {/* Coluna dos Campos */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Digite o nome completo"
                    className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={formData.novaSenha}
                    onChange={(e) => handleChange('novaSenha', e.target.value)}
                    placeholder="Deixe em branco para manter"
                    className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={formData.confirmarNovaSenha}
                    onChange={(e) => handleChange('confirmarNovaSenha', e.target.value)}
                    placeholder="Repita a nova senha"
                    className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Permissoes por empresa */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Acesso por empresa</h3>
                <p className="text-xs text-gray-500 mt-0.5">Gerencie cargo e permissoes em cada empresa vinculada</p>
              </div>
            </div>

            {empresasVinculadas.length === 0 ? (
              <div className="p-4 text-center text-gray-500 border border-gray-200 rounded-lg">
                Nenhuma empresa vinculada
              </div>
            ) : (
              <div className="space-y-3">
                {empresasVinculadas.map((ev) => {
                  const isExpanded = expandedEmpresa === ev.empresa_id
                  const currentEmpresaId = empresa?.id || user?.empresa_id
                  const isCurrent = ev.empresa_id === currentEmpresaId

                  return (
                    <div
                      key={ev.empresa_id}
                      className={`border rounded-lg transition-colors ${isCurrent ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}
                    >
                      {/* Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedEmpresa(isExpanded ? null : ev.empresa_id)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{ev.empresa_nome}</span>
                              {isCurrent && (
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                  Atual
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                ev.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                ev.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {CARGO_LABELS[ev.role] || ev.role}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                ev.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                              }`}>
                                {ev.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {Object.values(ev.permissoes).filter(Boolean).length}/{Object.values(ev.permissoes).length} permissoes
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDownIcon />
                        </span>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          {/* Cargo e Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
                              <select
                                value={ev.role}
                                onChange={(e) => handleEmpresaRoleChange(ev.empresa_id, e.target.value)}
                                className="block w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="admin">Administrador</option>
                                <option value="user">Usuario</option>
                                <option value="viewer">Visualizador</option>
                              </select>
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => handleEmpresaAtivoToggle(ev.empresa_id)}
                                className="flex items-center gap-2"
                              >
                                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  ev.ativo ? 'bg-green-500' : 'bg-gray-300'
                                }`}>
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    ev.ativo ? 'translate-x-4' : 'translate-x-0.5'
                                  }`} />
                                </div>
                                <span className="text-sm text-gray-700">{ev.ativo ? 'Ativo' : 'Inativo'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Permissoes */}
                          <label className="block text-xs font-medium text-gray-600 mb-2">Permissoes</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {PERMISSOES_OPTIONS.map((perm) => (
                              <label
                                key={perm.key}
                                className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={ev.permissoes[perm.key as keyof Permissoes]}
                                  onChange={() => handleEmpresaPermissaoChange(ev.empresa_id, perm.key as keyof Permissoes)}
                                  className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                                />
                                <div>
                                  <span className="block text-sm text-gray-900">{perm.label}</span>
                                  <span className="block text-xs text-gray-500">{perm.description}</span>
                                </div>
                              </label>
                            ))}
                          </div>

                          {/* Salvar */}
                          <div className="flex justify-end mt-4">
                            <button
                              type="button"
                              onClick={() => handleSaveEmpresaPermissoes(ev.empresa_id)}
                              disabled={savingEmpresa === ev.empresa_id}
                              className="px-4 py-1.5 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                            >
                              {savingEmpresa === ev.empresa_id ? 'Salvando...' : 'Salvar permissoes'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Botoes */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <FormActions>
              <Link
                href="/cadastros/colaboradores"
                className="w-full sm:w-auto text-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  'Salvar alteracoes'
                )}
              </button>
            </FormActions>
          </div>
        </form>
      </div>

      {/* Modal de Adicionar a Outra Empresa */}
      {showAddToEmpresaModal && (
        <AddToEmpresaModal
          colaboradorId={colaboradorId}
          colaboradorNome={formData.nome}
          onClose={(added) => {
            setShowAddToEmpresaModal(false)
            if (added) {
              // Recarregar vinculos
              window.location.reload()
            }
          }}
        />
      )}
    </DashboardLayout>
    </RequirePermission>
  )
}

// Modal de adicionar colaborador a outras empresas
interface AddToEmpresaModalProps {
  colaboradorId: string
  colaboradorNome: string
  onClose: (added?: boolean) => void
}

function AddToEmpresaModal({ colaboradorId, colaboradorNome, onClose }: AddToEmpresaModalProps) {
  const { user } = useAuth()
  const [empresas, setEmpresas] = useState<Array<{ id: number; nome_fantasia: string | null; razao_social: string }>>([])
  const [selectedEmpresas, setSelectedEmpresas] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchEmpresas() {
      if (!user?.id) return

      try {
        // Buscar empresas que o admin atual tem acesso
        const { data: adminEmpresas, error: adminError } = await supabase
          .from('users_empresas')
          .select('empresa_id')
          .eq('user_id', user.id)
          .eq('ativo', true)

        if (adminError) throw adminError

        const adminEmpresaIds = adminEmpresas?.map(ae => ae.empresa_id) || []

        if (adminEmpresaIds.length === 0) {
          setEmpresas([])
          return
        }

        // Buscar dados das empresas que o admin tem acesso
        const { data: allEmpresas, error: empresasError } = await supabase
          .from('empresas')
          .select('id, nome_fantasia, razao_social')
          .in('id', adminEmpresaIds)
          .order('razao_social')

        if (empresasError) throw empresasError

        // Buscar empresas que o colaborador ja esta vinculado
        const { data: linkedEmpresas } = await supabase
          .from('users_empresas')
          .select('empresa_id')
          .eq('user_id', colaboradorId)

        const linkedIds = linkedEmpresas?.map(le => le.empresa_id) || []

        // Filtrar empresas que o colaborador ainda nao esta vinculado
        const availableEmpresas = allEmpresas?.filter(e => !linkedIds.includes(e.id)) || []

        setEmpresas(availableEmpresas)
      } catch (err) {
        console.error('Erro ao buscar empresas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEmpresas()
  }, [colaboradorId, user?.id])

  const filteredEmpresas = empresas.filter(e =>
    e.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleEmpresa = (empresaId: number) => {
    setSelectedEmpresas(prev =>
      prev.includes(empresaId)
        ? prev.filter(id => id !== empresaId)
        : [...prev, empresaId]
    )
  }

  const handleSave = async () => {
    if (selectedEmpresas.length === 0) {
      alert('Selecione pelo menos uma empresa')
      return
    }

    setSaving(true)
    try {
      // Inserir vinculos para cada empresa selecionada
      const inserts = selectedEmpresas.map(empresaId => ({
        user_id: colaboradorId,
        empresa_id: empresaId,
        role: 'user',
        ativo: true,
      }))

      const { error } = await supabase
        .from('users_empresas')
        .insert(inserts)

      if (error) throw error

      onClose(true)
    } catch (err) {
      console.error('Erro ao vincular empresas:', err)
      alert('Erro ao vincular colaborador as empresas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={() => onClose()} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Adicionar a outras empresas</h3>
            <p className="text-sm text-gray-500 mt-1">
              Vincule <strong>{colaboradorNome}</strong> a outras empresas
            </p>
          </div>

          <div className="p-6">
            {/* Busca */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Empresas Selecionadas */}
            {selectedEmpresas.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedEmpresas.map(id => {
                  const emp = empresas.find(e => e.id === id)
                  return emp ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {emp.nome_fantasia || emp.razao_social}
                      <button
                        type="button"
                        onClick={() => handleToggleEmpresa(id)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        &times;
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}

            {/* Lista de Empresas */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Carregando...</div>
              ) : filteredEmpresas.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'Nenhuma empresa encontrada' : 'Colaborador ja esta vinculado a todas as empresas'}
                </div>
              ) : (
                filteredEmpresas.map(emp => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmpresas.includes(emp.id)}
                      onChange={() => handleToggleEmpresa(emp.id)}
                      className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-gray-900">
                        {emp.nome_fantasia || emp.razao_social}
                      </span>
                      {emp.nome_fantasia && (
                        <span className="block text-xs text-gray-500">{emp.razao_social}</span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedEmpresas.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
