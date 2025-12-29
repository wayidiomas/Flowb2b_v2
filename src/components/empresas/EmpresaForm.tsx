'use client'

import { useState } from 'react'
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

interface EmpresaFormProps {
  initialData?: Partial<EmpresaFormData>
  isEditing?: boolean
}

const segmentOptions = ['Industria', 'Servico', 'Varejo', 'E-commerce']
const relacaoVendaOptions = ['Fabricante', 'Distribuidor', 'Atacadista', 'Representante', 'Varejista']
const tamanhoOptions = ['MEI', 'Microempresa', 'Pequena empresa', 'Media empresa', 'Grande empresa']
const regimeTributarioOptions = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real']
const faturamentoOptions = ['Ate R$ 81.000', 'R$ 81.000 a R$ 360.000', 'R$ 360.000 a R$ 4.800.000', 'Acima de R$ 4.800.000']
const funcionariosOptions = ['1-10', '11-50', '51-200', '201-500', '500+']

type TabType = 'contato' | 'endereco' | 'logotipo' | 'colaboradores'

export function EmpresaForm({ initialData, isEditing = false }: EmpresaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('contato')
  const [cnaeInput, setCnaeInput] = useState('')

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
    { key: 'colaboradores', label: 'Colaboradores', count: 0 },
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
            <div className="text-center py-8">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {formData.logotipo ? (
                  <img src={formData.logotipo} alt="Logotipo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-sm">Sem logotipo</span>
                )}
              </div>
              <p className="text-sm text-gray-500">Upload de logotipo em desenvolvimento</p>
            </div>
          )}

          {activeTab === 'colaboradores' && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Gerenciamento de colaboradores em desenvolvimento</p>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
