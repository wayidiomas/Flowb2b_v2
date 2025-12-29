'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
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

interface ColaboradorFormData {
  nome: string
  email: string
  telefone: string
  cargo: 'admin' | 'user' | 'viewer'
  novaSenha: string
  confirmarNovaSenha: string
  ativo: boolean
  foto: string
  permissoes: {
    cadastros: boolean
    pedidos: boolean
    relatorios: boolean
    configuracoes: boolean
    financeiro: boolean
    estoque: boolean
  }
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

  const [formData, setFormData] = useState<ColaboradorFormData>({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'user',
    novaSenha: '',
    confirmarNovaSenha: '',
    ativo: true,
    foto: '',
    permissoes: {
      cadastros: true,
      pedidos: true,
      relatorios: true,
      configuracoes: false,
      financeiro: false,
      estoque: true,
    },
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

        // Buscar vinculo com empresa
        let ativo = userData.ativo
        let role = userData.role
        let permissoes = {
          cadastros: true,
          pedidos: true,
          relatorios: true,
          configuracoes: false,
          financeiro: false,
          estoque: true,
        }

        if (empresaId) {
          const { data: ueData } = await supabase
            .from('users_empresas')
            .select('role, ativo, permissoes')
            .eq('user_id', colaboradorId)
            .eq('empresa_id', empresaId)
            .single()

          if (ueData) {
            role = ueData.role
            ativo = ueData.ativo
            if (ueData.permissoes) {
              permissoes = { ...permissoes, ...ueData.permissoes }
            }
          }
        }

        setFormData({
          nome: userData.nome || '',
          email: userData.email || '',
          telefone: '', // Campo nao existe ainda na tabela users
          cargo: (role as 'admin' | 'user' | 'viewer') || 'user',
          novaSenha: '',
          confirmarNovaSenha: '',
          ativo: ativo !== false,
          foto: '', // Campo nao existe ainda na tabela users
          permissoes,
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

  const handleChange = (field: keyof ColaboradorFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePermissaoChange = (permissao: keyof ColaboradorFormData['permissoes']) => {
    setFormData((prev) => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [permissao]: !prev.permissoes[permissao],
      },
    }))
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

    const empresaId = empresa?.id || user?.empresa_id
    if (!empresaId) {
      setError('Empresa nao encontrada')
      return
    }

    setLoading(true)

    try {
      // Atualizar dados basicos do usuario
      const updateData: Record<string, unknown> = {
        nome: formData.nome,
        email: formData.email.toLowerCase(),
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', colaboradorId)

      if (updateError) throw updateError

      // Atualizar vinculo com empresa
      const { error: ueUpdateError } = await supabase
        .from('users_empresas')
        .update({
          role: formData.cargo,
          ativo: formData.ativo,
          permissoes: formData.permissoes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', colaboradorId)
        .eq('empresa_id', empresaId)

      if (ueUpdateError) {
        // Se nao existe vinculo, criar
        if (ueUpdateError.code === 'PGRST116') {
          await supabase
            .from('users_empresas')
            .insert({
              user_id: colaboradorId,
              empresa_id: empresaId,
              role: formData.cargo,
              ativo: formData.ativo,
              permissoes: formData.permissoes,
            })
        } else {
          console.error('Erro ao atualizar vinculo:', ueUpdateError)
        }
      }

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
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-3 text-gray-600">Carregando...</span>
        </div>
      </DashboardLayout>
    )
  }

  // Verificar permissao de acesso
  if (!permissionsLoading && !isAdmin && !hasPermission('cadastros')) {
    return (
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
              href="/"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
            >
              Voltar ao inicio
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar Colaborador</h2>
            <p className="text-sm text-gray-500">Atualize os dados do colaborador</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddToEmpresaModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

                {/* Cargo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.cargo}
                      onChange={(e) => handleChange('cargo', e.target.value as 'admin' | 'user' | 'viewer')}
                      className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                    >
                      <option value="admin">Administrador</option>
                      <option value="user">Usuario</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <ChevronDownIcon />
                    </div>
                  </div>
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

              {/* Status Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('ativo', !formData.ativo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.ativo ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.ativo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  Status: <strong>{formData.ativo ? 'Ativo' : 'Inativo'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Permissoes */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Permissoes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PERMISSOES_OPTIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissoes[perm.key as keyof ColaboradorFormData['permissoes']]}
                    onChange={() => handlePermissaoChange(perm.key as keyof ColaboradorFormData['permissoes'])}
                    className="mt-0.5 w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">{perm.label}</span>
                    <span className="block text-xs text-gray-500">{perm.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Botoes */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <Link
              href="/cadastros/colaboradores"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
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
          </div>
        </form>
      </div>

      {/* Modal de Adicionar a Outra Empresa */}
      {showAddToEmpresaModal && (
        <AddToEmpresaModal
          colaboradorId={colaboradorId}
          colaboradorNome={formData.nome}
          onClose={() => setShowAddToEmpresaModal(false)}
        />
      )}
    </DashboardLayout>
  )
}

// Modal de adicionar colaborador a outras empresas
interface AddToEmpresaModalProps {
  colaboradorId: string
  colaboradorNome: string
  onClose: () => void
}

function AddToEmpresaModal({ colaboradorId, colaboradorNome, onClose }: AddToEmpresaModalProps) {
  const { empresa: currentEmpresa } = useAuth()
  const [empresas, setEmpresas] = useState<Array<{ id: number; nome_fantasia: string | null; razao_social: string }>>([])
  const [selectedEmpresas, setSelectedEmpresas] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchEmpresas() {
      try {
        // Buscar todas as empresas
        const { data: allEmpresas, error: empresasError } = await supabase
          .from('empresas')
          .select('id, nome_fantasia, razao_social')
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
  }, [colaboradorId])

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

      onClose()
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
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

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
              onClick={onClose}
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
