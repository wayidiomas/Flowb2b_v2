'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
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

interface ColaboradorFormData {
  nome: string
  email: string
  telefone: string
  cargo: 'admin' | 'user' | 'viewer'
  senha: string
  confirmarSenha: string
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

export default function NovoColaboradorPage() {
  const router = useRouter()
  const { user, empresa } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ColaboradorFormData>({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'user',
    senha: '',
    confirmarSenha: '',
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

    if (!formData.senha) {
      setError('Senha e obrigatoria')
      return
    }

    if (formData.senha.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      return
    }

    if (formData.senha !== formData.confirmarSenha) {
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
      // Verificar se email ja existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .single()

      if (existingUser) {
        setError('Ja existe um usuario com este e-mail')
        setLoading(false)
        return
      }

      // Criar usuario via API route (para hash da senha)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email.toLowerCase(),
          password: formData.senha,
          empresa_id: empresaId,
          role: formData.cargo,
          isColaborador: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar colaborador')
      }

      const { userId } = await response.json()

      // Vincular usuario a empresa via users_empresas
      const { error: linkError } = await supabase
        .from('users_empresas')
        .insert({
          user_id: userId,
          empresa_id: empresaId,
          role: formData.cargo,
          ativo: formData.ativo,
          permissoes: formData.permissoes,
        })

      if (linkError) {
        console.error('Erro ao vincular usuario:', linkError)
      }

      // Redirecionar para lista
      router.push('/cadastros/colaboradores')
    } catch (err) {
      console.error('Erro ao criar colaborador:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar colaborador')
    } finally {
      setLoading(false)
    }
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
          <span className="font-medium text-gray-900">Novo Colaborador</span>
        </nav>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Novo Colaborador</h2>
          <p className="text-sm text-gray-500">Preencha os dados para cadastrar um novo colaborador</p>
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

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => handleChange('senha', e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar senha *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmarSenha}
                    onChange={(e) => handleChange('confirmarSenha', e.target.value)}
                    placeholder="Repita a senha"
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
                'Salvar colaborador'
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
