'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Icons
function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4H7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 14h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 18h6" />
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

function UploadIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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

function UserPlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

export interface EmpresaFormData {
  id?: number
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual: string
  ie_isento: boolean
  inscricao_municipal: string
  lista_cnae: string[]
  email_cobranca: string
  atividade_principal: string
  cd_regime_tributario: string
  segmento: string[]
  tamanho_empresa: string
  ramo_atuacao: string
  relacao_venda: string[]
  faturamento_ano_pass: string
  qnt_funcionarios: string
  observacao: string
  // Contato
  contato: string
  telefone: string
  celular: string
  email: string
  site: string
  // Endereco
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  // Logotipo
  logotipo: string
}

interface Colaborador {
  id: number
  nome: string
  email: string
  cargo?: string
}

interface EmpresaFormProps {
  initialData?: Partial<EmpresaFormData>
  isEditing?: boolean
  colaboradores?: Colaborador[]
  onAddColaborador?: () => void
}

const segmentOptions = ['Industria', 'Servico', 'Varejo', 'E-commerce']
const relacaoVendaOptions = ['Fabricante', 'Distribuidor', 'Atacadista', 'Representante', 'Varejista']
const tamanhoOptions = ['MEI', 'Microempresa', 'Pequena empresa', 'Media empresa', 'Grande empresa']
const regimeTributarioOptions = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real']
const faturamentoOptions = ['Ate R$ 81.000', 'R$ 81.000 a R$ 360.000', 'R$ 360.000 a R$ 4.800.000', 'Acima de R$ 4.800.000']
const funcionariosOptions = ['1-10', '11-50', '51-200', '201-500', '500+']

type TabType = 'contato' | 'endereco' | 'logotipo' | 'colaboradores'

export function EmpresaForm({ initialData, isEditing = false, colaboradores = [], onAddColaborador }: EmpresaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('contato')
  const [cnaeInput, setCnaeInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<EmpresaFormData>({
    razao_social: initialData?.razao_social || '',
    nome_fantasia: initialData?.nome_fantasia || '',
    cnpj: initialData?.cnpj || '',
    inscricao_estadual: initialData?.inscricao_estadual || '',
    ie_isento: initialData?.ie_isento || false,
    inscricao_municipal: initialData?.inscricao_municipal || '',
    lista_cnae: initialData?.lista_cnae || [],
    email_cobranca: initialData?.email_cobranca || '',
    atividade_principal: initialData?.atividade_principal || '',
    cd_regime_tributario: initialData?.cd_regime_tributario || '',
    segmento: initialData?.segmento || [],
    tamanho_empresa: initialData?.tamanho_empresa || '',
    ramo_atuacao: initialData?.ramo_atuacao || '',
    relacao_venda: initialData?.relacao_venda || [],
    faturamento_ano_pass: initialData?.faturamento_ano_pass || '',
    qnt_funcionarios: initialData?.qnt_funcionarios || '',
    observacao: initialData?.observacao || '',
    contato: initialData?.contato || '',
    telefone: '',
    celular: '',
    email: '',
    site: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    logotipo: initialData?.logotipo || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleCheckboxArray = (field: 'segmento' | 'relacao_venda', value: string) => {
    setFormData((prev) => {
      const current = prev[field]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) }
      } else {
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  const handleAddCnae = () => {
    if (cnaeInput.trim() && !formData.lista_cnae.includes(cnaeInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        lista_cnae: [...prev.lista_cnae, cnaeInput.trim()],
      }))
      setCnaeInput('')
    }
  }

  const handleRemoveCnae = (cnae: string) => {
    setFormData((prev) => ({
      ...prev,
      lista_cnae: prev.lista_cnae.filter((c) => c !== cnae),
    }))
  }

  // Upload de logotipo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Formato de arquivo invalido. Use JPG, PNG, GIF ou WebP.')
      return
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho maximo: 2MB.')
      return
    }

    setUploadingLogo(true)

    try {
      // Gerar nome unico para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `logotipos/${fileName}`

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('empresas')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Obter URL publica
      const { data: { publicUrl } } = supabase.storage
        .from('empresas')
        .getPublicUrl(filePath)

      setFormData((prev) => ({ ...prev, logotipo: publicUrl }))
    } catch (err) {
      console.error('Erro ao fazer upload do logotipo:', err)
      alert('Erro ao fazer upload do logotipo. Tente novamente.')
    } finally {
      setUploadingLogo(false)
      // Limpar input para permitir reenvio do mesmo arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = async () => {
    if (!formData.logotipo) return

    try {
      // Extrair o path do arquivo da URL
      const url = new URL(formData.logotipo)
      const pathParts = url.pathname.split('/empresas/')
      if (pathParts.length > 1) {
        const filePath = pathParts[1]

        // Remover do Storage
        await supabase.storage.from('empresas').remove([filePath])
      }
    } catch (err) {
      console.error('Erro ao remover logotipo anterior:', err)
    }

    setFormData((prev) => ({ ...prev, logotipo: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = {
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia || null,
        cnpj: formData.cnpj || null,
        inscricao_estadual: formData.inscricao_estadual || null,
        ie_isento: formData.ie_isento,
        inscricao_municipal: formData.inscricao_municipal || null,
        lista_cnae: formData.lista_cnae.length > 0 ? formData.lista_cnae : null,
        email_cobranca: formData.email_cobranca || null,
        atividade_principal: formData.atividade_principal || null,
        cd_regime_tributario: formData.cd_regime_tributario || null,
        segmento: formData.segmento.length > 0 ? formData.segmento : null,
        tamanho_empresa: formData.tamanho_empresa || null,
        ramo_atuacao: formData.ramo_atuacao || null,
        relacao_venda: formData.relacao_venda.length > 0 ? formData.relacao_venda : null,
        faturamento_text: formData.faturamento_ano_pass || null,
        qnt_funcionarios: formData.qnt_funcionarios || null,
        observacao: formData.observacao || null,
        contato: formData.contato || null,
        logotipo: formData.logotipo || null,
        ativo: true,
      }

      if (isEditing && initialData?.id) {
        const { error } = await supabase
          .from('empresas')
          .update(dataToSave)
          .eq('id', initialData.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('empresas')
          .insert(dataToSave)

        if (error) throw error
      }

      router.push('/cadastros/empresas')
    } catch (err) {
      console.error('Erro ao salvar empresa:', err)
      alert('Erro ao salvar empresa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'contato', label: 'Contato' },
    { key: 'endereco', label: 'Endereco' },
    { key: 'logotipo', label: 'Logotipo' },
    { key: 'colaboradores', label: 'Colaboradores', count: colaboradores.length },
  ]

  return (
    <form onSubmit={handleSubmit}>
      {/* Card Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isEditing ? 'Editar empresa' : 'Nova empresa'}
              </h2>
              <p className="text-sm text-gray-500">
                Aqui voce gerencia ua empresas e filiais para que possa gerenciar todas de forma otimizada
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/cadastros/empresas"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XIcon />
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <SaveIcon />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Dados Gerais */}
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Dados Gerais</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                name="razao_social"
                value={formData.razao_social}
                onChange={handleChange}
                placeholder="Nome da empresa"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Nome Fantasia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome fantasia</label>
              <input
                type="text"
                name="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Inscricao Estadual */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Inscricao Estadual</label>
                <input
                  type="text"
                  name="inscricao_estadual"
                  value={formData.inscricao_estadual}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                  disabled={formData.ie_isento}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="ie_isento"
                    checked={formData.ie_isento}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  IE Isento
                </label>
              </div>
            </div>

            {/* Inscricao Municipal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inscricao Municipal</label>
              <input
                type="text"
                name="inscricao_municipal"
                value={formData.inscricao_municipal}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* CNAE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNAE</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cnaeInput}
                  onChange={(e) => setCnaeInput(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleAddCnae}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                >
                  <PlusIcon />
                  Adicionar item
                </button>
              </div>
            </div>

            {/* E-mail de cobranca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de cobranca</label>
              <input
                type="email"
                name="email_cobranca"
                value={formData.email_cobranca}
                onChange={handleChange}
                placeholder="E-mail de cobranca"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* CNAE Tags */}
          {formData.lista_cnae.length > 0 && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">CNAE</label>
              <div className="flex flex-wrap gap-2">
                {formData.lista_cnae.map((cnae) => (
                  <span
                    key={cnae}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
                  >
                    {cnae}
                    <button
                      type="button"
                      onClick={() => handleRemoveCnae(cnae)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XIcon />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Atividade Principal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Atividade principal</label>
              <select
                name="atividade_principal"
                value={formData.atividade_principal}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                <option value="Comercio">Comercio</option>
                <option value="Industria">Industria</option>
                <option value="Servicos">Servicos</option>
              </select>
            </div>

            {/* Codigo de Regime Tributario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codigo de Regime Tributario</label>
              <select
                name="cd_regime_tributario"
                value={formData.cd_regime_tributario}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                {regimeTributarioOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Segmento */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Segmento</label>
            <div className="flex flex-wrap gap-4">
              {segmentOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={formData.segmento.includes(opt)}
                    onChange={() => handleCheckboxArray('segmento', opt)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Tamanho da Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da Empresa</label>
              <select
                name="tamanho_empresa"
                value={formData.tamanho_empresa}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                {tamanhoOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Ramo de atuacao */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ramo de atuacao</label>
              <select
                name="ramo_atuacao"
                value={formData.ramo_atuacao}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                <option value="Pet Shop">Pet Shop</option>
                <option value="Agropecuaria">Agropecuaria</option>
                <option value="Alimentacao">Alimentacao</option>
                <option value="Tecnologia">Tecnologia</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Relacao de venda */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Relacao de venda</label>
            <div className="flex flex-wrap gap-4">
              {relacaoVendaOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={formData.relacao_venda.includes(opt)}
                    onChange={() => handleCheckboxArray('relacao_venda', opt)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* E-mail de cobranca (duplicate in design, keeping for layout) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de cobranca</label>
              <input
                type="email"
                name="email_cobranca"
                value={formData.email_cobranca}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Faturamento do ultimo ano */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faturamento do ultimo ano</label>
              <select
                name="faturamento_ano_pass"
                value={formData.faturamento_ano_pass}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                {faturamentoOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Quantidade de funcionarios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de funcionarios</label>
              <select
                name="qnt_funcionarios"
                value={formData.qnt_funcionarios}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                {funcionariosOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Observacoes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes:</label>
            <textarea
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && ` (${tab.count})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'contato' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do contato</label>
                <input
                  type="text"
                  name="contato"
                  value={formData.contato}
                  onChange={handleChange}
                  placeholder="Nome do contato"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="Telefone do contato"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                <input
                  type="text"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  placeholder="Celular do contato"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="E-mail"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <input
                  type="text"
                  name="site"
                  value={formData.site}
                  onChange={handleChange}
                  placeholder="Site da empresa"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                <input
                  type="text"
                  name="logradouro"
                  value={formData.logradouro}
                  onChange={handleChange}
                  placeholder="Rua, Avenida..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
                <input
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input
                  type="text"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input
                  type="text"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input
                  type="text"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  placeholder="UF"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'logotipo' && (
            <div className="py-4">
              {/* Input de arquivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {formData.logotipo ? (
                // Exibir logotipo atual
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-4">
                    <Image
                      src={formData.logotipo}
                      alt="Logotipo da empresa"
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploadingLogo ? 'Enviando...' : 'Alterar logotipo'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <TrashIcon />
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                // Area de upload
                <div
                  onClick={() => !uploadingLogo && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed border-gray-300 rounded-lg p-12
                    flex flex-col items-center justify-center cursor-pointer
                    hover:border-[#336FB6] hover:bg-gray-50 transition-colors
                    ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {uploadingLogo ? (
                    <>
                      <svg className="animate-spin h-8 w-8 text-[#336FB6] mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="text-sm text-gray-600">Enviando...</p>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-400 mb-4">
                        <UploadIcon />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Clique para fazer upload
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG, GIF ou WebP (max. 2MB)
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'colaboradores' && (
            <div className="py-4">
              {/* Botao Adicionar Colaborador */}
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={onAddColaborador}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                >
                  <UserPlusIcon />
                  Adicionar colaborador
                </button>
              </div>

              {/* Lista de Colaboradores */}
              {colaboradores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          E-mail
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cargo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {colaboradores.map((colab) => (
                        <tr key={colab.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {colab.nome}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {colab.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {colab.cargo || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="text-gray-400 mb-3">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Nenhum colaborador cadastrado</p>
                  <p className="text-xs text-gray-400">Clique no botao acima para adicionar colaboradores</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
