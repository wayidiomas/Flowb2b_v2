'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type {
  Fornecedor,
  FornecedorFormData,
  PoliticaCompra,
  PoliticaCompraFormData,
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

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function ExternalLinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
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

function ImageIcon() {
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

type TabType = 'contato' | 'endereco' | 'politica' | 'produtos'

// Interface baseada na view fornecedor_produtos_detalhados
interface ProdutoFornecedorDetalhado {
  produto_id: number
  codigo_produto: string
  nome_produto: string
  itens_por_caixa?: number
  data_ultima_compra?: string
  qtd_ultima_compra?: number
  data_ultima_venda?: string
  estoque_atual?: number
  quantidade_vendida?: number
  dias_estoque?: number
  perc_estoque_atual?: number
  periodo_ultima_venda?: number
  dias_sem_venda?: number  // NOVO: dias desde a última venda
  fornecedor_id: number
  valor_de_compra?: number
  precocusto?: number
}

export default function EditarFornecedorPage() {
  const router = useRouter()
  const params = useParams()
  const fornecedorId = params?.id as string
  const { user, empresa } = useAuth()

  const [loading, setLoading] = useState(true)
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

  // Políticas de compra
  const [politicas, setPoliticas] = useState<PoliticaCompra[]>([])
  const [novaPolitica, setNovaPolitica] = useState<PoliticaCompraFormData>({
    forma_pagamento_dias: [],
    prazo_entrega: 0,
    prazo_estoque: 0,
    valor_minimo: 0,
    peso: 0,
    desconto: 0,
    bonificacao: 0,
    observacao: '',
    estoque_eficiente: true
  })

  // Estado para novo dia de pagamento
  const [novoDiaPagamento, setNovoDiaPagamento] = useState<string>('')

  // Adicionar dia de pagamento
  const handleAddDiaPagamento = () => {
    const dia = parseInt(novoDiaPagamento)
    if (dia > 0 && !novaPolitica.forma_pagamento_dias.includes(dia)) {
      setNovaPolitica(prev => ({
        ...prev,
        forma_pagamento_dias: [...prev.forma_pagamento_dias, dia].sort((a, b) => a - b)
      }))
      setNovoDiaPagamento('')
    }
  }

  // Remover dia de pagamento
  const handleRemoveDiaPagamento = (dia: number) => {
    setNovaPolitica(prev => ({
      ...prev,
      forma_pagamento_dias: prev.forma_pagamento_dias.filter(d => d !== dia)
    }))
  }

  // Produtos (usando view fornecedor_produtos_detalhados)
  const [produtos, setProdutos] = useState<ProdutoFornecedorDetalhado[]>([])
  const [produtosPage, setProdutosPage] = useState(1)
  const produtosPerPage = 8

  // Modal de adicionar produto
  const [showAddProdutoModal, setShowAddProdutoModal] = useState(false)
  const [searchProduto, setSearchProduto] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    id: number
    id_produto_bling: number
    codigo: string
    nome: string
    preco: number
  }>>([])
  const [searchingProdutos, setSearchingProdutos] = useState(false)
  const [selectedProduto, setSelectedProduto] = useState<{
    id: number
    id_produto_bling: number
    codigo: string
    nome: string
    preco: number
  } | null>(null)
  const [precoCompra, setPrecoCompra] = useState('')
  const [addingProduto, setAddingProduto] = useState(false)

  // Buscar produtos para adicionar
  const handleSearchProdutos = async () => {
    if (!searchProduto.trim() || searchProduto.length < 2) return

    setSearchingProdutos(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Buscar produtos que tem id_produto_bling e não estão vinculados a este fornecedor
      const { data, error } = await supabase
        .from('produtos')
        .select('id, id_produto_bling, codigo, nome, preco')
        .eq('empresa_id', empresaId)
        .not('id_produto_bling', 'is', null)
        .or(`codigo.ilike.%${searchProduto}%,nome.ilike.%${searchProduto}%`)
        .limit(20)

      if (error) throw error

      // Filtrar produtos já vinculados
      const produtosJaVinculados = produtos.map(p => p.produto_id)
      const produtosDisponiveis = (data || []).filter(
        p => !produtosJaVinculados.includes(p.id)
      )

      setSearchResults(produtosDisponiveis)
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    } finally {
      setSearchingProdutos(false)
    }
  }

  // Adicionar produto ao fornecedor
  const handleAddProduto = async () => {
    if (!selectedProduto) return

    setAddingProduto(true)
    try {
      const response = await fetch('/api/fornecedores/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto_id: selectedProduto.id,
          fornecedor_id: parseInt(fornecedorId),
          preco_compra: precoCompra ? parseFloat(precoCompra) : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao adicionar produto')
      }

      // Recarregar lista de produtos
      const empresaId = empresa?.id || user?.empresa_id
      const { data: produtosData } = await supabase
        .from('fornecedor_produtos_detalhados')
        .select('*')
        .eq('fornecedor_id', parseInt(fornecedorId))
        .order('nome_produto')

      if (produtosData) {
        setProdutos(produtosData as ProdutoFornecedorDetalhado[])
      }

      // Fechar modal e limpar
      setShowAddProdutoModal(false)
      setSelectedProduto(null)
      setSearchProduto('')
      setSearchResults([])
      setPrecoCompra('')

    } catch (err) {
      console.error('Erro ao adicionar produto:', err)
      alert(err instanceof Error ? err.message : 'Erro ao adicionar produto')
    } finally {
      setAddingProduto(false)
    }
  }

  // Fetch fornecedor data
  useEffect(() => {
    const fetchFornecedor = async () => {
      if (!fornecedorId || !user?.id) return

      try {
        const empresaId = empresa?.id || user?.empresa_id

        // Buscar dados do fornecedor
        const { data: fornecedor, error } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('id', fornecedorId)
          .eq('empresa_id', empresaId)
          .single()

        if (error) throw error

        if (fornecedor) {
          // Parse endereco JSON se existir
          let enderecoData: EnderecoFornecedor = {}
          if (fornecedor.endereco) {
            try {
              enderecoData = typeof fornecedor.endereco === 'string'
                ? JSON.parse(fornecedor.endereco)
                : fornecedor.endereco
            } catch {
              enderecoData = {}
            }
          }

          setFormData({
            nome: fornecedor.nome || '',
            nome_fantasia: fornecedor.nome_fantasia || '',
            codigo: fornecedor.codigo || '',
            tipo_pessoa: (fornecedor.tipo_pessoa as TipoPessoa) || 'J',
            cnpj: fornecedor.cnpj || '',
            cpf: fornecedor.cpf || '',
            rg: fornecedor.rg || '',
            inscricao_estadual: fornecedor.inscricao_estadual || '',
            ie_isento: fornecedor.ie_isento || false,
            contribuinte: (fornecedor.contribuinte as Contribuinte) || '1',
            codigo_regime_tributario: fornecedor.cd_regime_tributario || '',
            orgao_emissor: fornecedor.orgao_emissor || '',
            relacao_venda: (fornecedor.relacao_venda_fornecedores as RelacaoVenda[]) || [],
            cliente_desde: fornecedor.cliente_desde || '',
            telefone: fornecedor.telefone || '',
            celular: fornecedor.celular || '',
            email: fornecedor.email || '',
            endereco: enderecoData
          })
        }

        // Buscar políticas de compra via RPC
        const { data: politicasData } = await supabase
          .rpc('flowb2b_fetch_politica_compra', { f_id: parseInt(fornecedorId) })

        if (politicasData) {
          setPoliticas(politicasData as PoliticaCompra[])
        }

        // Buscar produtos usando a view fornecedor_produtos_detalhados
        const { data: produtosData } = await supabase
          .from('fornecedor_produtos_detalhados')
          .select('*')
          .eq('fornecedor_id', parseInt(fornecedorId))
          .order('nome_produto')

        if (produtosData) {
          setProdutos(produtosData as ProdutoFornecedorDetalhado[])
        }

      } catch (err) {
        console.error('Erro ao carregar fornecedor:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFornecedor()
  }, [fornecedorId, user?.id, empresa?.id])

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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(fornecedorId),
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
        throw new Error(result.error || 'Erro ao salvar fornecedor')
      }

      router.push('/cadastros/fornecedores')
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err)
      alert(err instanceof Error ? err.message : 'Erro ao salvar fornecedor')
    } finally {
      setSaving(false)
    }
  }

  // Add política de compra
  const handleAddPolitica = async () => {
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Não enviar prazo_estoque - calculado pelo trigger no Supabase
      const { prazo_estoque: _, ...politicaData } = novaPolitica

      const { data, error } = await supabase
        .from('politica_compra')
        .insert({
          fornecedor_id: parseInt(fornecedorId),
          empresa_id: empresaId,
          ...politicaData
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setPoliticas(prev => [...prev, data])
        setNovaPolitica({
          forma_pagamento_dias: [],
          prazo_entrega: 0,
          prazo_estoque: 0,
          valor_minimo: 0,
          peso: 0,
          desconto: 0,
          bonificacao: 0,
          observacao: '',
          estoque_eficiente: true
        })
        setNovoDiaPagamento('')
      }
    } catch (err) {
      console.error('Erro ao adicionar política:', err)
    }
  }

  // Delete política
  const handleDeletePolitica = async (politicaId: number) => {
    if (!confirm('Deseja realmente excluir esta política?')) return

    try {
      const { error } = await supabase
        .from('politica_compra')
        .update({ isdeleted: true })
        .eq('id', politicaId)

      if (error) throw error

      setPoliticas(prev => prev.filter(p => p.id !== politicaId))
    } catch (err) {
      console.error('Erro ao excluir política:', err)
    }
  }

  // Pagination for produtos
  const paginatedProdutos = produtos.slice(
    (produtosPage - 1) * produtosPerPage,
    produtosPage * produtosPerPage
  )
  const totalProdutosPages = Math.ceil(produtos.length / produtosPerPage)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalProdutosPages <= 7) {
      for (let i = 1; i <= totalProdutosPages; i++) pages.push(i)
    } else {
      if (produtosPage <= 3) {
        pages.push(1, 2, 3, '...', totalProdutosPages)
      } else if (produtosPage >= totalProdutosPages - 2) {
        pages.push(1, '...', totalProdutosPages - 2, totalProdutosPages - 1, totalProdutosPages)
      } else {
        pages.push(1, '...', produtosPage - 1, produtosPage, produtosPage + 1, '...', totalProdutosPages)
      }
    }
    return pages
  }

  if (loading) {
    return (
      <RequirePermission permission="cadastros">
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin h-8 w-8 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="cadastros">
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/cadastros/fornecedores" className="hover:text-[#336FB6]">
          Fornecedores
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">{formData.nome || 'Fornecedor'}</span>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-t-[20px] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-[#344054]">Editar fornecedor</h2>
              <p className="text-xs text-[#838383]">
                Gerencie seus fornecedores e a forma de pagamento de cada um deles
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do fornecedor</label>
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

                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codigo <span className="text-gray-400 text-xs">(auto)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.codigo || ''}
                    readOnly
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
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
                { id: 'endereco', label: 'Endereco' },
                { id: 'politica', label: `Politica de compras (${politicas.length})` },
                { id: 'produtos', label: `Produtos (${produtos.length})` }
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

          {activeTab === 'politica' && (
            <div>
              {/* Form para adicionar política */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formas de Pagamento (dias)</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      {novaPolitica.forma_pagamento_dias.length === 0 ? (
                        <span className="text-sm text-gray-400">Adicione os dias...</span>
                      ) : (
                        novaPolitica.forma_pagamento_dias.map(dia => (
                          <span
                            key={dia}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#336FB6] text-white text-sm rounded-full"
                          >
                            {dia}d
                            <button
                              type="button"
                              onClick={() => handleRemoveDiaPagamento(dia)}
                              className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={novoDiaPagamento}
                        onChange={(e) => setNovoDiaPagamento(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDiaPagamento())}
                        placeholder="Dias"
                        min="1"
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                      />
                      <button
                        type="button"
                        onClick={handleAddDiaPagamento}
                        className="p-2 bg-[#336FB6] text-white rounded-lg hover:bg-[#2660A5] transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de entrega (dias)</label>
                  <input
                    type="number"
                    value={novaPolitica.prazo_entrega}
                    onChange={(e) => setNovaPolitica(prev => ({ ...prev, prazo_entrega: parseInt(e.target.value) || 0 }))}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prazo de estoque (dias) <span className="text-gray-400 text-xs">(calculado)</span>
                  </label>
                  <div className="flex items-center h-[42px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50">
                    {(() => {
                      const mediaPagamento = novaPolitica.forma_pagamento_dias.length > 0
                        ? novaPolitica.forma_pagamento_dias.reduce((a, b) => a + b, 0) / novaPolitica.forma_pagamento_dias.length
                        : 0
                      const prazoEstoque = Math.round(mediaPagamento + novaPolitica.prazo_entrega)
                      return prazoEstoque > 0 ? (
                        <span className="text-gray-900 font-medium">{prazoEstoque} dias</span>
                      ) : (
                        <span className="text-gray-400">Preencha pagamento e entrega</span>
                      )
                    })()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor minimo do pedido (R$)</label>
                  <input
                    type="number"
                    value={novaPolitica.valor_minimo}
                    onChange={(e) => setNovaPolitica(prev => ({ ...prev, valor_minimo: parseFloat(e.target.value) || 0 }))}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={novaPolitica.peso || ''}
                    onChange={(e) => setNovaPolitica(prev => ({ ...prev, peso: parseFloat(e.target.value) || 0 }))}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                  <input
                    type="number"
                    value={novaPolitica.desconto || ''}
                    onChange={(e) => setNovaPolitica(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonificacao (%)</label>
                  <input
                    type="number"
                    value={novaPolitica.bonificacao || ''}
                    onChange={(e) => setNovaPolitica(prev => ({ ...prev, bonificacao: parseFloat(e.target.value) || 0 }))}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
                  <input
                    type="text"
                    value={novaPolitica.observacao || ''}
                    onChange={(e) => setNovaPolitica(prev => ({ ...prev, observacao: e.target.value }))}
                    placeholder="Produtos da linha Pet"
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end mb-6">
                <button
                  onClick={handleAddPolitica}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                >
                  <PlusIcon />
                  Adicionar item
                </button>
              </div>

              {/* Tabela de políticas */}
              {politicas.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Forma de pagamento (dias)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Prazo de entrega (dias)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Prazo de estoque (dias)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Valor minimo do pedido (R$)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Peso (kg)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Desconto (%)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Bonificacao (%)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Observacao</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {politicas.map((pol, index) => (
                        <tr key={pol.id} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{pol.forma_pagamento_dias?.join(' ') || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{pol.prazo_entrega || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{pol.prazo_estoque || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{pol.valor_minimo || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{pol.peso || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{pol.desconto || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{pol.bonificacao || '-'}</td>
                          <td className="px-4 py-3 text-sm text-[#336FB6]">{pol.observacao || '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => pol.id && handleDeletePolitica(pol.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'produtos' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAddProdutoModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                >
                  <PlusIcon />
                  Adicionar produto
                </button>
              </div>

              {/* Tabela de produtos */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Codigo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nome do produto</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Item p/ caixa</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor de compra</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Data ult. compra</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Qtd. ult. compra</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Data ult. venda</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Dias de estoque</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Estoque atual</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Dias sem venda</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProdutos.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                          Nenhum produto vinculado a este fornecedor.
                        </td>
                      </tr>
                    ) : (
                      paginatedProdutos.map((prod, index) => {
                        // Formatar datas
                        const formatDate = (dateStr?: string) => {
                          if (!dateStr) return '-'
                          try {
                            return new Date(dateStr).toLocaleDateString('pt-BR')
                          } catch {
                            return dateStr
                          }
                        }

                        // Formatar valor monetário
                        const formatCurrency = (value?: number) => {
                          if (!value) return '-'
                          return new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(value))
                        }

                        // Valores calculados da view
                        const diasEstoque = prod.dias_estoque ? Number(prod.dias_estoque) : 0
                        const estoqueAtual = prod.estoque_atual ? Number(prod.estoque_atual) : 0
                        const diasSemVenda = prod.dias_sem_venda ? Number(prod.dias_sem_venda) : null

                        return (
                          <tr key={prod.produto_id} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                            <td className="px-4 py-3 text-sm text-gray-900">{prod.codigo_produto || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={prod.nome_produto}>
                              {prod.nome_produto || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{prod.itens_por_caixa || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(prod.valor_de_compra)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{formatDate(prod.data_ultima_compra)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{prod.qtd_ultima_compra || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{formatDate(prod.data_ultima_venda)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                diasEstoque > 60 ? 'bg-green-100 text-green-700' :
                                diasEstoque > 30 ? 'bg-yellow-100 text-yellow-700' :
                                diasEstoque > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {diasEstoque > 0 ? `${diasEstoque} dias` : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                estoqueAtual > 10 ? 'bg-green-100 text-green-700' :
                                estoqueAtual > 0 ? 'bg-yellow-100 text-yellow-700' :
                                estoqueAtual < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {estoqueAtual}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                diasSemVenda === null ? 'bg-gray-100 text-gray-500' :
                                diasSemVenda <= 7 ? 'bg-green-100 text-green-700' :
                                diasSemVenda <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {diasSemVenda !== null ? `${diasSemVenda} dias` : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link href={`/estoque/produtos/${prod.produto_id}`} className="text-gray-400 hover:text-gray-600">
                                <ExternalLinkIcon />
                              </Link>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {produtos.length > produtosPerPage && (
                <div className="px-4 py-4 flex items-center justify-between">
                  <button
                    onClick={() => setProdutosPage(prev => Math.max(1, prev - 1))}
                    disabled={produtosPage === 1}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeftIcon />
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setProdutosPage(page as number)}
                          className={`w-10 h-10 text-sm font-medium rounded-lg ${
                            produtosPage === page
                              ? 'bg-[#ECECEC] text-[#1D2939]'
                              : 'text-[#475467] hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setProdutosPage(prev => Math.min(totalProdutosPages, prev + 1))}
                    disabled={produtosPage === totalProdutosPages}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Proximo
                    <ChevronRightIcon />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Adicionar Produto */}
      {showAddProdutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddProdutoModal(false)
              setSelectedProduto(null)
              setSearchProduto('')
              setSearchResults([])
              setPrecoCompra('')
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Adicionar Produto ao Fornecedor</h3>
                <button
                  onClick={() => {
                    setShowAddProdutoModal(false)
                    setSelectedProduto(null)
                    setSearchProduto('')
                    setSearchResults([])
                    setPrecoCompra('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Busque um produto para vincular a este fornecedor no Bling
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Campo de busca */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar produto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchProdutos()}
                    placeholder="Digite o codigo ou nome do produto..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <button
                    onClick={handleSearchProdutos}
                    disabled={searchingProdutos || searchProduto.length < 2}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                  >
                    {searchingProdutos ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Apenas produtos sincronizados com o Bling serao exibidos
                </p>
              </div>

              {/* Resultados da busca */}
              {searchResults.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione um produto ({searchResults.length} encontrados)
                  </label>
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => setSelectedProduto(prod)}
                        className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                          selectedProduto?.id === prod.id ? 'bg-[#336FB6]/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{prod.nome}</p>
                            <p className="text-xs text-gray-500">Codigo: {prod.codigo || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {prod.preco ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.preco) : '-'}
                            </p>
                            {selectedProduto?.id === prod.id && (
                              <span className="text-xs text-[#336FB6] font-medium">Selecionado</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Produto selecionado - campos adicionais */}
              {selectedProduto && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Produto selecionado</h4>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{selectedProduto.nome}</p>
                      <p className="text-xs text-gray-500">Codigo: {selectedProduto.codigo || '-'}</p>
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Preco de compra (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={precoCompra}
                        onChange={(e) => setPrecoCompra(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem quando não há resultados */}
              {searchProduto.length >= 2 && searchResults.length === 0 && !searchingProdutos && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum produto encontrado</p>
                  <p className="text-sm mt-1">Verifique se o produto esta sincronizado com o Bling</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddProdutoModal(false)
                  setSelectedProduto(null)
                  setSearchProduto('')
                  setSearchResults([])
                  setPrecoCompra('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProduto}
                disabled={!selectedProduto || addingProduto}
                className="px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
              >
                {addingProduto ? 'Vinculando...' : 'Vincular Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </RequirePermission>
  )
}
