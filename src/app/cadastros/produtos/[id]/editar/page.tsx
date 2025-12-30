'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ProdutoFormData, ProdutoFornecedor, MovimentacaoEstoqueProduto } from '@/types/produto'
import {
  FORMATO_OPTIONS,
  TIPO_OPTIONS,
  CONDICAO_OPTIONS,
  PRODUCAO_OPTIONS,
  UNIDADE_MEDIDA_OPTIONS
} from '@/types/produto'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

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

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

type TabType = 'caracteristicas' | 'estoque' | 'fornecedores'

// Interface para dados do grafico
interface ChartData {
  month: string
  entradas: number
  saidas: number
}

export default function EditarProdutoPage() {
  const router = useRouter()
  const params = useParams()
  const produtoId = params?.id as string
  const { user, empresa } = useAuth()

  const [loading, setLoading] = useState(true)
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

  // Dados do produto original (para id_produto_bling)
  const [idProdutoBling, setIdProdutoBling] = useState<string | null>(null)

  // Movimentacoes de estoque
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoqueProduto[]>([])
  const [movPage, setMovPage] = useState(1)
  const movPerPage = 10

  // Fornecedores vinculados
  const [fornecedores, setFornecedores] = useState<ProdutoFornecedor[]>([])

  // Modal de adicionar fornecedor
  const [showAddFornecedorModal, setShowAddFornecedorModal] = useState(false)
  const [searchFornecedor, setSearchFornecedor] = useState('')
  const [searchFornecedorResults, setSearchFornecedorResults] = useState<Array<{
    id: number
    id_bling: number
    nome: string
    cnpj?: string
  }>>([])
  const [searchingFornecedores, setSearchingFornecedores] = useState(false)
  const [selectedFornecedor, setSelectedFornecedor] = useState<{
    id: number
    id_bling: number
    nome: string
    cnpj?: string
  } | null>(null)
  const [precoCompraFornecedor, setPrecoCompraFornecedor] = useState('')
  const [addingFornecedor, setAddingFornecedor] = useState(false)

  // Dados para o grafico
  const [chartData, setChartData] = useState<ChartData[]>([])

  // Fetch produto data
  useEffect(() => {
    const fetchProduto = async () => {
      if (!produtoId || !user?.id) return

      try {
        const empresaId = empresa?.id || user?.empresa_id

        // Buscar dados do produto
        const { data: produto, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('id', produtoId)
          .eq('empresa_id', empresaId)
          .single()

        if (error) throw error

        if (produto) {
          setFormData({
            id: produto.id,
            nome: produto.nome || '',
            codigo: produto.codigo || '',
            formato: produto.formato || 'S',
            situacao: produto.situacao || 'A',
            tipo: produto.tipo || 'P',
            preco: produto.preco || 0,
            unidade: produto.unidade || 'UN',
            condicao: produto.condicao || '0',
            marca: produto.marca || '',
            producao: produto.producao || 'P',
            data_validade: produto.data_validade || '',
            peso_liquido: produto.peso_liquido || 0,
            peso_bruto: produto.peso_bruto || 0,
            volumes: produto.volumes || 0,
            itens_por_caixa: produto.itens_por_caixa || 0,
            unidade_medida: produto.unidade_medida || '',
            gtin: produto.gtin || '',
            gtin_embalagem: produto.gtin_embalagem || ''
          })

          setIdProdutoBling(produto.id_produto_bling)
        }

        // Buscar movimentacoes de estoque
        const { data: movData } = await supabase
          .from('movimentacao_estoque')
          .select('*')
          .eq('produto_id', produtoId)
          .eq('empresa_id', empresaId)
          .order('data', { ascending: false })
          .limit(100)

        if (movData) {
          setMovimentacoes(movData.map(m => ({
            id: m.id,
            data: m.data,
            tipo: m.tipo as 'Entrada' | 'Saida',
            quantidade: m.quantidade,
            origem: m.origem,
            observacao: m.observacao,
            preco_venda: m.preco_venda,
            valor_de_compra: m.valor_de_compra,
            preco_custo: m.preco_custo
          })))

          // Preparar dados para o grafico (ultimos 6 meses)
          const chartDataMap: Record<string, { entradas: number; saidas: number }> = {}
          const now = new Date()

          // Inicializar ultimos 6 meses
          for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            chartDataMap[monthKey] = { entradas: 0, saidas: 0 }
          }

          // Acumular movimentacoes
          movData.forEach(m => {
            const date = new Date(m.data)
            const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            if (chartDataMap[monthKey]) {
              if (m.tipo === 'Entrada') {
                chartDataMap[monthKey].entradas += m.quantidade
              } else {
                chartDataMap[monthKey].saidas += m.quantidade
              }
            }
          })

          setChartData(
            Object.entries(chartDataMap).map(([month, data]) => ({
              month,
              entradas: data.entradas,
              saidas: data.saidas
            }))
          )
        }

        // Buscar fornecedores vinculados
        const { data: fornecedoresData } = await supabase
          .from('fornecedores_produtos')
          .select(`
            fornecedor_id,
            valor_de_compra,
            qtd_ultima_compra,
            fornecedores (
              id, codigo, nome, cnpj, telefone
            )
          `)
          .eq('produto_id', produtoId)
          .eq('empresa_id', empresaId)

        if (fornecedoresData) {
          setFornecedores(fornecedoresData.map(fp => ({
            fornecedor_id: fp.fornecedor_id,
            codigo: (fp.fornecedores as any)?.codigo,
            nome: (fp.fornecedores as any)?.nome || '',
            cnpj: (fp.fornecedores as any)?.cnpj,
            telefone: (fp.fornecedores as any)?.telefone,
            valor_de_compra: fp.valor_de_compra || 0,
            qtd_ultima_compra: fp.qtd_ultima_compra
          })))
        }

      } catch (err) {
        console.error('Erro ao carregar produto:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProduto()
  }, [produtoId, user?.id, empresa?.id])

  // Handle form changes
  const handleChange = (field: keyof ProdutoFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Save produto via API (apenas Supabase)
  const handleSave = async () => {
    if (!formData.nome) {
      alert('O nome do produto e obrigatorio')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/produtos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(produtoId),
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
        throw new Error(result.error || 'Erro ao salvar produto')
      }

      router.push('/cadastros/produtos')
    } catch (err) {
      console.error('Erro ao salvar produto:', err)
      alert(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  // Buscar fornecedores para adicionar
  const handleSearchFornecedores = async () => {
    if (!searchFornecedor.trim() || searchFornecedor.length < 2) return

    setSearchingFornecedores(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Buscar fornecedores que tem id_bling e nao estao vinculados a este produto
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, id_bling, nome, cnpj')
        .eq('empresa_id', empresaId)
        .not('id_bling', 'is', null)
        .or(`nome.ilike.%${searchFornecedor}%,cnpj.ilike.%${searchFornecedor}%`)
        .limit(20)

      if (error) throw error

      // Filtrar fornecedores ja vinculados
      const fornecedoresJaVinculados = fornecedores.map(f => f.fornecedor_id)
      const fornecedoresDisponiveis = (data || []).filter(
        f => !fornecedoresJaVinculados.includes(f.id)
      )

      setSearchFornecedorResults(fornecedoresDisponiveis)
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    } finally {
      setSearchingFornecedores(false)
    }
  }

  // Adicionar fornecedor ao produto
  const handleAddFornecedor = async () => {
    if (!selectedFornecedor || !idProdutoBling) {
      alert('Este produto precisa estar sincronizado com o Bling para vincular fornecedores.')
      return
    }

    setAddingFornecedor(true)
    try {
      const response = await fetch('/api/fornecedores/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto_id: parseInt(produtoId),
          fornecedor_id: selectedFornecedor.id,
          preco_compra: precoCompraFornecedor ? parseFloat(precoCompraFornecedor) : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao adicionar fornecedor')
      }

      // Recarregar lista de fornecedores
      const empresaId = empresa?.id || user?.empresa_id
      const { data: fornecedoresData } = await supabase
        .from('fornecedores_produtos')
        .select(`
          fornecedor_id,
          valor_de_compra,
          qtd_ultima_compra,
          fornecedores (
            id, codigo, nome, cnpj, telefone
          )
        `)
        .eq('produto_id', produtoId)
        .eq('empresa_id', empresaId)

      if (fornecedoresData) {
        setFornecedores(fornecedoresData.map(fp => ({
          fornecedor_id: fp.fornecedor_id,
          codigo: (fp.fornecedores as any)?.codigo,
          nome: (fp.fornecedores as any)?.nome || '',
          cnpj: (fp.fornecedores as any)?.cnpj,
          telefone: (fp.fornecedores as any)?.telefone,
          valor_de_compra: fp.valor_de_compra || 0,
          qtd_ultima_compra: fp.qtd_ultima_compra
        })))
      }

      // Fechar modal e limpar
      setShowAddFornecedorModal(false)
      setSelectedFornecedor(null)
      setSearchFornecedor('')
      setSearchFornecedorResults([])
      setPrecoCompraFornecedor('')

    } catch (err) {
      console.error('Erro ao adicionar fornecedor:', err)
      alert(err instanceof Error ? err.message : 'Erro ao adicionar fornecedor')
    } finally {
      setAddingFornecedor(false)
    }
  }

  // Paginacao movimentacoes
  const paginatedMovimentacoes = movimentacoes.slice(
    (movPage - 1) * movPerPage,
    movPage * movPerPage
  )
  const totalMovPages = Math.ceil(movimentacoes.length / movPerPage)

  // Formatar data
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  // Formatar valor monetario
  const formatCurrency = (value?: number) => {
    if (!value && value !== 0) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Formatar CNPJ
  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj) return '-'
    const cleaned = cnpj.replace(/\D/g, '')
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return cnpj
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin h-8 w-8 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/cadastros/produtos" className="hover:text-[#336FB6]">
          Produtos
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">{formData.nome || 'Produto'}</span>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-t-[20px] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-[#344054]">Editar produto</h2>
              <p className="text-xs text-[#838383]">
                Gerencie as informacoes do produto
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
                    Codigo (SKU)
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value)}
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
                { id: 'estoque', label: `Estoque (${movimentacoes.length})` },
                { id: 'fornecedores', label: `Fornecedores (${fornecedores.length})` }
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
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                />
              </div>
            </div>
          )}

          {/* Tab Content - Estoque */}
          {activeTab === 'estoque' && (
            <div>
              {/* Grafico de movimentacao */}
              {chartData.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Movimentacao dos ultimos 6 meses</h4>
                  <div className="h-64 bg-gray-50 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="entradas" fill="#22C55E" name="Entradas" />
                        <Bar dataKey="saidas" fill="#EF4444" name="Saidas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tabela de movimentacoes */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Tipo</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Quantidade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Origem</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Preco venda</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor compra</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovimentacoes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          Nenhuma movimentacao de estoque registrada.
                        </td>
                      </tr>
                    ) : (
                      paginatedMovimentacoes.map((mov, index) => (
                        <tr key={mov.id} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(mov.data)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              mov.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
                            {mov.tipo === 'Entrada' ? '+' : '-'}{mov.quantidade}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{mov.origem || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(mov.preco_venda)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(mov.valor_de_compra)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={mov.observacao}>
                            {mov.observacao || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {movimentacoes.length > movPerPage && (
                <div className="px-4 py-4 flex items-center justify-between">
                  <button
                    onClick={() => setMovPage(prev => Math.max(1, prev - 1))}
                    disabled={movPage === 1}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeftIcon />
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500">
                    Pagina {movPage} de {totalMovPages}
                  </span>
                  <button
                    onClick={() => setMovPage(prev => Math.min(totalMovPages, prev + 1))}
                    disabled={movPage === totalMovPages}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Proximo
                    <ChevronRightIcon />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab Content - Fornecedores */}
          {activeTab === 'fornecedores' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAddFornecedorModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                >
                  <PlusIcon />
                  Adicionar fornecedor
                </button>
              </div>

              {/* Tabela de fornecedores */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nome do fornecedor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">CNPJ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Telefone</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor de compra</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Qtd ult. compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedores.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Nenhum fornecedor vinculado a este produto.
                          {!idProdutoBling && (
                            <p className="text-xs mt-1">
                              Este produto precisa ser sincronizado com o Bling para vincular fornecedores.
                            </p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      fornecedores.map((forn, index) => (
                        <tr key={forn.fornecedor_id} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{forn.nome}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCNPJ(forn.cnpj)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{forn.telefone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(forn.valor_de_compra)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{forn.qtd_ultima_compra || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Adicionar Fornecedor */}
      {showAddFornecedorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddFornecedorModal(false)
              setSelectedFornecedor(null)
              setSearchFornecedor('')
              setSearchFornecedorResults([])
              setPrecoCompraFornecedor('')
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Adicionar Fornecedor ao Produto</h3>
                <button
                  onClick={() => {
                    setShowAddFornecedorModal(false)
                    setSelectedFornecedor(null)
                    setSearchFornecedor('')
                    setSearchFornecedorResults([])
                    setPrecoCompraFornecedor('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Busque um fornecedor para vincular a este produto no Bling
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {!idProdutoBling && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Este produto precisa estar sincronizado com o Bling para vincular fornecedores.
                  </p>
                </div>
              )}

              {/* Campo de busca */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar fornecedor
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchFornecedor}
                    onChange={(e) => setSearchFornecedor(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchFornecedores()}
                    placeholder="Digite o nome ou CNPJ do fornecedor..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <button
                    onClick={handleSearchFornecedores}
                    disabled={searchingFornecedores || searchFornecedor.length < 2}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                  >
                    {searchingFornecedores ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Apenas fornecedores sincronizados com o Bling serao exibidos
                </p>
              </div>

              {/* Resultados da busca */}
              {searchFornecedorResults.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione um fornecedor ({searchFornecedorResults.length} encontrados)
                  </label>
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchFornecedorResults.map((forn) => (
                      <button
                        key={forn.id}
                        onClick={() => setSelectedFornecedor(forn)}
                        className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                          selectedFornecedor?.id === forn.id ? 'bg-[#336FB6]/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{forn.nome}</p>
                            <p className="text-xs text-gray-500">CNPJ: {formatCNPJ(forn.cnpj)}</p>
                          </div>
                          {selectedFornecedor?.id === forn.id && (
                            <span className="text-xs text-[#336FB6] font-medium">Selecionado</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fornecedor selecionado - campos adicionais */}
              {selectedFornecedor && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Fornecedor selecionado</h4>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{selectedFornecedor.nome}</p>
                      <p className="text-xs text-gray-500">CNPJ: {formatCNPJ(selectedFornecedor.cnpj)}</p>
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Preco de compra (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={precoCompraFornecedor}
                        onChange={(e) => setPrecoCompraFornecedor(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem quando nao ha resultados */}
              {searchFornecedor.length >= 2 && searchFornecedorResults.length === 0 && !searchingFornecedores && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum fornecedor encontrado</p>
                  <p className="text-sm mt-1">Verifique se o fornecedor esta sincronizado com o Bling</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddFornecedorModal(false)
                  setSelectedFornecedor(null)
                  setSearchFornecedor('')
                  setSearchFornecedorResults([])
                  setPrecoCompraFornecedor('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddFornecedor}
                disabled={!selectedFornecedor || addingFornecedor || !idProdutoBling}
                className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
              >
                {addingFornecedor ? 'Vinculando...' : 'Vincular Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
