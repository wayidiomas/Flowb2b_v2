'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { LogoMark } from '@/components/ui'
import type { ProdutoFormData } from '@/types/produto'
import {
  FORMATO_OPTIONS,
  TIPO_OPTIONS,
  SITUACAO_OPTIONS,
  CONDICAO_OPTIONS,
  PRODUCAO_OPTIONS,
  UNIDADE_MEDIDA_OPTIONS
} from '@/types/produto'

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

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

type TabType = 'caracteristicas' | 'estoque' | 'fornecedores'

export default function NovoProdutoPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('caracteristicas')

  // Dados do produto
  const [formData, setFormData] = useState<ProdutoFormData>({
    nome: '',
    codigo: '',
    formato: 'S',
    situacao: 'A',
    tipo: 'P',
    preco: 0,
    unidade: 'UN',
    condicao: '0',
    marca: '',
    producao: 'P',
    data_validade: '',
    peso_liquido: 0,
    peso_bruto: 0,
    volumes: 0,
    itens_por_caixa: 0,
    unidade_medida: '',
    gtin: '',
    gtin_embalagem: ''
  })

  // Handle form changes
  const handleChange = (field: keyof ProdutoFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Save produto via API (integra com Bling)
  const handleSave = async () => {
    if (!formData.nome) {
      alert('O nome do produto e obrigatorio')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          codigo: formData.codigo,
          formato: formData.formato,
          situacao: formData.situacao,
          tipo: formData.tipo,
          preco: formData.preco,
          unidade: formData.unidade,
          condicao: formData.condicao,
          marca: formData.marca,
          producao: formData.producao,
          data_validade: formData.data_validade,
          peso_liquido: formData.peso_liquido,
          peso_bruto: formData.peso_bruto,
          volumes: formData.volumes,
          itens_por_caixa: formData.itens_por_caixa,
          unidade_medida: formData.unidade_medida,
          gtin: formData.gtin,
          gtin_embalagem: formData.gtin_embalagem,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar produto')
      }

      // Mostra warning se houver (ex: Bling nao conectado)
      if (result.warning) {
        console.warn(result.warning)
      }

      // Redireciona para a lista de produtos
      router.push('/cadastros/produtos')
    } catch (err) {
      console.error('Erro ao criar produto:', err)
      alert(err instanceof Error ? err.message : 'Erro ao criar produto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/cadastros/produtos" className="hover:text-[#336FB6]">
          Produtos
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Novo Produto</span>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-t-[20px] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-[#344054]">Adicionar produtos</h2>
              <p className="text-xs text-[#838383]">
                Cadastre um novo produto para sua empresa
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/cadastros/produtos"
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do produto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Nome do produto"
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Codigo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codigo (SKU) <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="SKU-001"
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
                  <select
                    value={formData.formato}
                    onChange={(e) => handleChange('formato', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  >
                    {FORMATO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status (Situacao) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="situacao"
                        value="A"
                        checked={formData.situacao === 'A'}
                        onChange={(e) => handleChange('situacao', e.target.value)}
                        className="w-4 h-4 text-[#22C55E] border-gray-300 focus:ring-[#22C55E]"
                      />
                      <span className="text-sm text-gray-700">Ativo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="situacao"
                        value="I"
                        checked={formData.situacao === 'I'}
                        onChange={(e) => handleChange('situacao', e.target.value)}
                        className="w-4 h-4 text-gray-500 border-gray-300 focus:ring-gray-500"
                      />
                      <span className="text-sm text-gray-700">Inativo</span>
                    </label>
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  >
                    {TIPO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Preco de venda */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preco de venda</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco}
                      onChange={(e) => handleChange('preco', parseFloat(e.target.value) || 0)}
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                    />
                  </div>
                </div>

                {/* Unidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formData.unidade}
                    onChange={(e) => handleChange('unidade', e.target.value)}
                    placeholder="UN"
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>

                {/* Condicao */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condicao</label>
                  <select
                    value={formData.condicao}
                    onChange={(e) => handleChange('condicao', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  >
                    {CONDICAO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6">
              {[
                { id: 'caracteristicas', label: 'Caracteristicas' },
                { id: 'estoque', label: 'Estoque' },
                { id: 'fornecedores', label: 'Fornecedores' }
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

          {/* Tab Content - Caracteristicas */}
          {activeTab === 'caracteristicas' && (
            <div className="grid grid-cols-3 gap-4">
              {/* Marca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  placeholder="Nome da marca"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Producao */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producao</label>
                <select
                  value={formData.producao}
                  onChange={(e) => handleChange('producao', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                >
                  {PRODUCAO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Data de validade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de validade</label>
                <input
                  type="date"
                  value={formData.data_validade}
                  onChange={(e) => handleChange('data_validade', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Peso Liquido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso liquido (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.peso_liquido}
                  onChange={(e) => handleChange('peso_liquido', parseFloat(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Peso Bruto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso bruto (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.peso_bruto}
                  onChange={(e) => handleChange('peso_bruto', parseFloat(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Volumes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volumes</label>
                <input
                  type="number"
                  min="0"
                  value={formData.volumes}
                  onChange={(e) => handleChange('volumes', parseInt(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Itens por caixa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Itens por caixa</label>
                <input
                  type="number"
                  min="0"
                  value={formData.itens_por_caixa}
                  onChange={(e) => handleChange('itens_por_caixa', parseInt(e.target.value) || 0)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* Unidade de medida */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de medida</label>
                <select
                  value={formData.unidade_medida}
                  onChange={(e) => handleChange('unidade_medida', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                >
                  <option value="">Selecione</option>
                  {UNIDADE_MEDIDA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* GTIN/EAN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GTIN/EAN</label>
                <input
                  type="text"
                  value={formData.gtin}
                  onChange={(e) => handleChange('gtin', e.target.value)}
                  placeholder="Codigo de barras"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>

              {/* GTIN Tributario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GTIN tributario da embalagem</label>
                <input
                  type="text"
                  value={formData.gtin_embalagem}
                  onChange={(e) => handleChange('gtin_embalagem', e.target.value)}
                  placeholder="Codigo de barras tributario"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
            </div>
          )}

          {/* Tab Content - Estoque */}
          {activeTab === 'estoque' && (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <InfoIcon />
                <p className="text-sm text-gray-500">
                  Informacoes de estoque estarao disponiveis apos salvar o produto.
                </p>
                <p className="text-xs text-gray-400">
                  O estoque sera atualizado automaticamente atraves da sincronizacao com o Bling.
                </p>
              </div>
            </div>
          )}

          {/* Tab Content - Fornecedores */}
          {activeTab === 'fornecedores' && (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <InfoIcon />
                <p className="text-sm text-gray-500">
                  Voce podera vincular fornecedores apos salvar o produto.
                </p>
                <p className="text-xs text-gray-400">
                  Na edicao do produto, sera possivel adicionar fornecedores e definir precos de compra.
                </p>
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
                Apos salvar, voce podera vincular fornecedores e visualizar movimentacoes de estoque.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
