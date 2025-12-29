'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { LogoMark } from '@/components/ui'
import type {
  FornecedorFormData,
  TipoPessoa,
  Contribuinte,
  RelacaoVenda,
  EnderecoFornecedor
} from '@/types/fornecedor'

// Icons
function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

type TabType = 'contato' | 'endereco'

export default function NovoFornecedorPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('contato')

  // Dados do fornecedor
  const [formData, setFormData] = useState<FornecedorFormData>({
    nome: '',
    nome_fantasia: '',
    codigo: '',
    tipo_pessoa: 'J',
    cnpj: '',
    cpf: '',
    rg: '',
    inscricao_estadual: '',
    ie_isento: false,
    contribuinte: '1',
    codigo_regime_tributario: '',
    orgao_emissor: '',
    relacao_venda: [],
    cliente_desde: '',
    telefone: '',
    celular: '',
    email: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      pais: 'Brasil'
    }
  })

  // Handle form changes
  const handleChange = (field: keyof FornecedorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEnderecoChange = (field: keyof EnderecoFornecedor, value: string) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value }
    }))
  }

  // Buscar endereco via CEP (ViaCEP API)
  const [loadingCep, setLoadingCep] = useState(false)

  const handleCepBlur = async () => {
    const cep = formData.endereco?.cep?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) return

    setLoadingCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()

      if (data.erro) {
        console.warn('CEP nao encontrado')
        return
      }

      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          logradouro: data.logradouro || prev.endereco?.logradouro || '',
          bairro: data.bairro || prev.endereco?.bairro || '',
          cidade: data.localidade || prev.endereco?.cidade || '',
          uf: data.uf || prev.endereco?.uf || '',
        }
      }))
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    } finally {
      setLoadingCep(false)
    }
  }

  const handleRelacaoVendaChange = (relacao: RelacaoVenda) => {
    setFormData(prev => {
      const current = prev.relacao_venda || []
      if (current.includes(relacao)) {
        return { ...prev, relacao_venda: current.filter(r => r !== relacao) }
      }
      return { ...prev, relacao_venda: [...current, relacao] }
    })
  }

  // Save fornecedor via API (integra com Bling)
  const handleSave = async () => {
    if (!formData.nome) {
      alert('O nome do fornecedor e obrigatorio')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          nome_fantasia: formData.nome_fantasia,
          codigo: formData.codigo,
          tipo_pessoa: formData.tipo_pessoa,
          cnpj: formData.tipo_pessoa === 'J' ? formData.cnpj : undefined,
          cpf: formData.tipo_pessoa === 'F' ? formData.cpf : undefined,
          rg: formData.rg,
          inscricao_estadual: formData.inscricao_estadual,
          ie_isento: formData.ie_isento,
          contribuinte: formData.contribuinte,
          codigo_regime_tributario: formData.codigo_regime_tributario,
          orgao_emissor: formData.orgao_emissor,
          relacao_venda: formData.relacao_venda,
          cliente_desde: formData.cliente_desde,
          telefone: formData.telefone,
          celular: formData.celular,
          email: formData.email,
          endereco: formData.endereco,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar fornecedor')
      }

      // Mostra warning se houver (ex: Bling nao conectado)
      if (result.warning) {
        console.warn(result.warning)
      }

      // Redireciona para a pagina de edicao do novo fornecedor
      router.push(`/cadastros/fornecedores/${result.id}/editar`)
    } catch (err) {
      console.error('Erro ao criar fornecedor:', err)
      alert(err instanceof Error ? err.message : 'Erro ao criar fornecedor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/cadastros/fornecedores" className="hover:text-[#336FB6]">
          Fornecedores
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Novo Fornecedor</span>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-t-[20px] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-[#344054]">Novo fornecedor</h2>
              <p className="text-xs text-[#838383]">
                Cadastre um novo fornecedor para sua empresa
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/cadastros/fornecedores"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <XIcon />
                Cancelar
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors disabled:opacity-50"
              >
                <SaveIcon />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Dados Gerais */}
          <div className="mb-8">
            <h3 className="text-base font-medium text-gray-900 mb-4">Dados Gerais</h3>

            <div className="flex gap-6">
              {/* Avatar/Logo */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <ImageIcon />
                </div>
              </div>

              {/* Form fields */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do fornecedor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Fantasia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fantasia</label>
                  <input
                    type="text"
                    value={formData.nome_fantasia || ''}
                    onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Codigo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codigo <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Tipo Pessoa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo da Pessoa</label>
                  <select
                    value={formData.tipo_pessoa}
                    onChange={(e) => handleChange('tipo_pessoa', e.target.value as TipoPessoa)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  >
                    <option value="J">Pessoa Juridica</option>
                    <option value="F">Pessoa Fisica</option>
                  </select>
                </div>

                {/* CNPJ ou CPF */}
                {formData.tipo_pessoa === 'J' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={formData.cnpj || ''}
                      onChange={(e) => handleChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                      className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input
                      type="text"
                      value={formData.cpf || ''}
                      onChange={(e) => handleChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                    />
                  </div>
                )}

                {/* RG */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                  <input
                    type="text"
                    value={formData.rg || ''}
                    onChange={(e) => handleChange('rg', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Cliente desde */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente desde</label>
                  <input
                    type="text"
                    value={formData.cliente_desde || ''}
                    onChange={(e) => handleChange('cliente_desde', e.target.value)}
                    placeholder="Nome do colaborador"
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Inscricao Estadual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inscricao Estadual <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.inscricao_estadual || ''}
                    onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* IE Isento */}
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ie_isento || false}
                      onChange={(e) => handleChange('ie_isento', e.target.checked)}
                      className="w-4 h-4 text-[#336FB6] border-gray-300 rounded focus:ring-[#336FB6]"
                    />
                    <span className="text-sm text-gray-700">IE Isento</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Segunda linha - Relacao de venda, Orgao Emissor, etc */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* Relacao de venda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relacao de venda</label>
                <div className="flex flex-wrap gap-4">
                  {(['fabricante', 'distribuidor', 'atacadista', 'representante', 'varejista'] as RelacaoVenda[]).map((rel) => (
                    <label key={rel} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.relacao_venda?.includes(rel) || false}
                        onChange={() => handleRelacaoVendaChange(rel)}
                        className="w-4 h-4 text-[#336FB6] border-gray-300 rounded focus:ring-[#336FB6]"
                      />
                      <span className="text-sm text-gray-700 capitalize">{rel}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Orgao Emissor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orgao Emissor <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.orgao_emissor || ''}
                  onChange={(e) => handleChange('orgao_emissor', e.target.value)}
                  placeholder="Nome do colaborador"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Codigo Reg. Tributario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codigo de Reg. Tributario <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <select
                  value={formData.codigo_regime_tributario || ''}
                  onChange={(e) => handleChange('codigo_regime_tributario', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                >
                  <option value="">Nao Definido</option>
                  <option value="1">1 - Simples Nacional</option>
                  <option value="2">2 - Simples Nacional - Excesso</option>
                  <option value="3">3 - Regime Normal</option>
                </select>
              </div>

              {/* Contribuinte */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contribuinte <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <select
                  value={formData.contribuinte || '1'}
                  onChange={(e) => handleChange('contribuinte', e.target.value as Contribuinte)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                >
                  <option value="1">1 - Contribuinte ICMS</option>
                  <option value="2">2 - Contribuinte isento</option>
                  <option value="9">9 - Nao contribuinte</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6">
              {[
                { id: 'contato', label: 'Contato' },
                { id: 'endereco', label: 'Endereco' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'contato' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone || ''}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="(00) 0000-0000"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                <input
                  type="text"
                  value={formData.celular || ''}
                  onChange={(e) => handleChange('celular', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.endereco?.cep || ''}
                    onChange={(e) => handleEnderecoChange('cep', e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  {loadingCep && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-4 w-4 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                <input
                  type="text"
                  value={formData.endereco?.logradouro || ''}
                  onChange={(e) => handleEnderecoChange('logradouro', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
                <input
                  type="text"
                  value={formData.endereco?.numero || ''}
                  onChange={(e) => handleEnderecoChange('numero', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input
                  type="text"
                  value={formData.endereco?.complemento || ''}
                  onChange={(e) => handleEnderecoChange('complemento', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input
                  type="text"
                  value={formData.endereco?.bairro || ''}
                  onChange={(e) => handleEnderecoChange('bairro', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={formData.endereco?.cidade || ''}
                  onChange={(e) => handleEnderecoChange('cidade', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                <input
                  type="text"
                  value={formData.endereco?.uf || ''}
                  onChange={(e) => handleEnderecoChange('uf', e.target.value)}
                  maxLength={2}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
            </div>
          )}

          {/* Info message */}
          <div className="mt-8 p-4 bg-[#EBF3FF] border border-[#336FB6]/20 rounded-xl flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
              <LogoMark size={28} color="#336FB6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#336FB6]">
                Dica FlowB2B
              </p>
              <p className="text-sm text-[#5A7BA6]">
                Apos salvar, voce podera adicionar politicas de compra e vincular produtos ao fornecedor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
