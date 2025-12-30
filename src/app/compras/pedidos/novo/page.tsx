'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type {
  ItemPedidoCompra,
  PoliticaCompra,
  ProdutoFornecedor,
  FRETE_POR_CONTA_OPTIONS
} from '@/types/pedido-compra'

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

// Frete options
const FRETE_OPTIONS = [
  { value: 'CIF', label: 'CIF - Frete por conta do remetente' },
  { value: 'FOB', label: 'FOB - Frete por conta do destinatario' },
  { value: 'Terceiros', label: 'Terceiros' },
  { value: 'Sem transporte', label: 'Sem transporte' },
]

function NovoPedidoContent() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fornecedorIdParam = searchParams.get('fornecedor_id')

  // Form state
  const [fornecedorId, setFornecedorId] = useState<number | null>(null)
  const [fornecedorNome, setFornecedorNome] = useState('')
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0])
  const [dataPrevista, setDataPrevista] = useState('')
  const [ordemCompra, setOrdemCompra] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [observacoesInternas, setObservacoesInternas] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [frete, setFrete] = useState(0)
  const [totalIcms, setTotalIcms] = useState(0)
  const [transportador, setTransportador] = useState('')
  const [fretePorConta, setFretePorConta] = useState('CIF')
  const [itens, setItens] = useState<ItemPedidoCompra[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'produtos' | 'politicas'>('produtos')
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [produtoSearch, setProdutoSearch] = useState('')
  const [produtosFornecedor, setProdutosFornecedor] = useState<ProdutoFornecedor[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [politica, setPolitica] = useState<PoliticaCompra | null>(null)

  // Carregar dados do fornecedor
  useEffect(() => {
    const fetchFornecedor = async () => {
      if (!fornecedorIdParam || !user?.id) {
        setLoading(false)
        return
      }

      try {
        const empresaId = empresa?.id || user?.empresa_id
        if (!empresaId) {
          setLoading(false)
          return
        }

        const fId = parseInt(fornecedorIdParam)
        setFornecedorId(fId)

        // Buscar dados do fornecedor
        const { data: fornecedor, error: fError } = await supabase
          .from('fornecedores')
          .select('id, nome')
          .eq('id', fId)
          .eq('empresa_id', empresaId)
          .single()

        if (fError) throw fError
        if (fornecedor) {
          setFornecedorNome(fornecedor.nome)
        }

        // Buscar politica de compra do fornecedor
        const { data: politicas } = await supabase
          .from('politica_compra')
          .select('*')
          .eq('fornecedor_id', fId)
          .eq('empresa_id', empresaId)
          .eq('status', 'ativa')
          .single()

        if (politicas) {
          setPolitica(politicas)
          // Se tiver prazo de entrega na politica, calcular data prevista
          if (politicas.prazo_entrega) {
            const prevista = new Date()
            prevista.setDate(prevista.getDate() + politicas.prazo_entrega)
            setDataPrevista(prevista.toISOString().split('T')[0])
          }
        }

      } catch (err) {
        console.error('Erro ao carregar fornecedor:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFornecedor()
  }, [fornecedorIdParam, user?.id, user?.empresa_id, empresa?.id])

  // Buscar produtos do fornecedor
  const fetchProdutosFornecedor = async (search: string = '') => {
    if (!fornecedorId || !user?.id) return

    setLoadingProdutos(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      let query = supabase
        .from('fornecedores_produtos')
        .select(`
          produto_id,
          valor_de_compra,
          produtos!inner(id, codigo, nome, unidade, estoque_atual, gtin)
        `)
        .eq('fornecedor_id', fornecedorId)
        .eq('empresa_id', empresaId)

      if (search) {
        query = query.or(`produtos.nome.ilike.%${search}%,produtos.codigo.ilike.%${search}%`)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error

      if (data) {
        const formatted: ProdutoFornecedor[] = data.map((item: any) => ({
          produto_id: item.produto_id,
          codigo: item.produtos.codigo || '',
          nome: item.produtos.nome || '',
          unidade: item.produtos.unidade || 'UN',
          valor_de_compra: item.valor_de_compra || 0,
          estoque_atual: item.produtos.estoque_atual || 0,
          gtin: item.produtos.gtin
        }))
        setProdutosFornecedor(formatted)
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    } finally {
      setLoadingProdutos(false)
    }
  }

  // Buscar produtos quando abrir modal
  useEffect(() => {
    if (showProdutoModal) {
      fetchProdutosFornecedor(produtoSearch)
    }
  }, [showProdutoModal, produtoSearch])

  // Adicionar produto ao pedido
  const handleAddProduto = (produto: ProdutoFornecedor) => {
    // Verificar se ja existe
    if (itens.some(i => i.produto_id === produto.produto_id)) {
      return
    }

    const novoItem: ItemPedidoCompra = {
      produto_id: produto.produto_id,
      descricao: produto.nome,
      codigo_produto: produto.codigo,
      unidade: produto.unidade,
      quantidade: 1,
      valor: produto.valor_de_compra,
      aliquota_ipi: 0,
      estoque_atual: produto.estoque_atual,
      ean: produto.gtin
    }

    setItens([...itens, novoItem])
    setShowProdutoModal(false)
    setProdutoSearch('')
  }

  // Remover item
  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  // Atualizar item
  const handleUpdateItem = (index: number, field: keyof ItemPedidoCompra, value: number) => {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }
    setItens(newItens)
  }

  // Calculos
  const totalProdutos = itens.reduce((acc, item) => {
    const subtotal = item.quantidade * item.valor
    const ipi = subtotal * (item.aliquota_ipi / 100)
    return acc + subtotal + ipi
  }, 0)

  const descontoValor = totalProdutos * (desconto / 100)
  const totalPedido = totalProdutos - descontoValor + frete + totalIcms

  const totalItens = itens.length
  const somaQuantidades = itens.reduce((acc, item) => acc + item.quantidade, 0)

  // Formatar valor
  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Salvar pedido
  const handleSave = async () => {
    if (!fornecedorId || itens.length === 0) {
      alert('Adicione pelo menos um produto ao pedido.')
      return
    }

    setSaving(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) throw new Error('Empresa nao identificada')

      const itensPayload = itens.map(item => ({
        descricao: item.descricao,
        codigo_fornecedor: item.codigo_produto,
        unidade: item.unidade,
        valor: item.valor,
        quantidade: item.quantidade,
        aliquotaIPI: item.aliquota_ipi,
        produto: item.produto_id ? { id: item.produto_id, codigo: item.codigo_produto } : null
      }))

      const { data, error } = await supabase.rpc('flowb2b_add_pedido_compra', {
        p_empresa_id: empresaId,
        p_fornecedor_id: fornecedorId,
        p_data: dataPedido,
        p_data_prevista: dataPrevista || null,
        p_situacao: 5, // Rascunho
        p_total_produtos: totalProdutos,
        p_total: totalPedido,
        p_desconto: desconto,
        p_frete: frete,
        p_total_icms: totalIcms,
        p_transportador: transportador || null,
        p_frete_por_conta: fretePorConta,
        p_politica_compra_id: politica?.id || null,
        p_observacoes: observacoes || null,
        p_observacoes_internas: observacoesInternas || null,
        p_itens: JSON.stringify(itensPayload)
      })

      if (error) throw error

      router.push('/compras/pedidos')
    } catch (err) {
      console.error('Erro ao salvar pedido:', err)
      alert('Erro ao salvar pedido. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#336FB6]"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!fornecedorId) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-[20px] p-8 text-center">
          <p className="text-gray-600 mb-4">Fornecedor nao encontrado.</p>
          <Link href="/compras/pedidos" className="text-[#336FB6] hover:underline">
            Voltar para lista
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/compras/pedidos"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#344054]">Novo Pedido de Compra</h1>
          <p className="text-sm text-[#667085]">{fornecedorNome}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Form */}
        <div className="col-span-8">
          {/* Alert Politica */}
          {politica && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <InfoIcon />
              <div>
                <p className="text-sm font-medium text-blue-800">Politica de compra aplicada</p>
                <p className="text-sm text-blue-600">
                  Valor minimo: {formatCurrency(politica.valor_minimo || 0)} |
                  Desconto: {politica.desconto || 0}% |
                  Prazo entrega: {politica.prazo_entrega || 0} dias
                </p>
              </div>
            </div>
          )}

          {/* Dados do Pedido */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 mb-6">
            <h2 className="text-base font-semibold text-[#344054] mb-4">Detalhes da Compra</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de Compra</label>
                <input
                  type="text"
                  value={ordemCompra}
                  onChange={(e) => setOrdemCompra(e.target.value)}
                  placeholder="Numero da OC"
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pedido</label>
                <input
                  type="date"
                  value={dataPedido}
                  readOnly
                  className="block w-full px-3 py-2 text-sm text-gray-500 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Prevista</label>
                <input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frete por Conta</label>
                <select
                  value={fretePorConta}
                  onChange={(e) => setFretePorConta(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FRETE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Transportador</label>
              <input
                type="text"
                value={transportador}
                onChange={(e) => setTransportador(e.target.value)}
                placeholder="Nome do transportador"
                className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observacoes para o fornecedor..."
                  rows={3}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes Internas</label>
                <textarea
                  value={observacoesInternas}
                  onChange={(e) => setObservacoesInternas(e.target.value)}
                  placeholder="Notas internas..."
                  rows={3}
                  className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
            {/* Tab Header */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('produtos')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'produtos'
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Produtos
                </button>
                <button
                  onClick={() => setActiveTab('politicas')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'politicas'
                      ? 'border-[#336FB6] text-[#336FB6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Politicas de Compra
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'produtos' && (
                <div>
                  {/* Botao Adicionar */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setShowProdutoModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                    >
                      <PlusIcon />
                      Adicionar produto
                    </button>
                  </div>

                  {/* Tabela de produtos */}
                  {itens.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Nenhum produto adicionado.</p>
                      <button
                        onClick={() => setShowProdutoModal(true)}
                        className="mt-2 text-sm text-[#336FB6] hover:underline"
                      >
                        Adicionar primeiro produto
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">SKU</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">Un</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Qtde</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Preco</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">IPI%</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Total</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">Estq</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map((item, index) => {
                            const subtotal = item.quantidade * item.valor
                            const ipi = subtotal * (item.aliquota_ipi / 100)
                            const total = subtotal + ipi

                            return (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-600">{index + 1}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{item.descricao}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{item.codigo_produto || '-'}</td>
                                <td className="px-3 py-2 text-center text-sm text-gray-600">{item.unidade}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantidade}
                                    onChange={(e) => handleUpdateItem(index, 'quantidade', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.valor}
                                    onChange={(e) => handleUpdateItem(index, 'valor', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={item.aliquota_ipi}
                                    onChange={(e) => handleUpdateItem(index, 'aliquota_ipi', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(total)}
                                </td>
                                <td className="px-3 py-2 text-center text-sm text-gray-600">
                                  {item.estoque_atual || 0}
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <TrashIcon />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'politicas' && (
                <div>
                  {politica ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Politica Aplicada</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Valor minimo:</span>
                          <span className="ml-2 font-medium">{formatCurrency(politica.valor_minimo || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Desconto:</span>
                          <span className="ml-2 font-medium">{politica.desconto || 0}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bonificacao:</span>
                          <span className="ml-2 font-medium">{politica.bonificacao || 0}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Prazo de entrega:</span>
                          <span className="ml-2 font-medium">{politica.prazo_entrega || 0} dias</span>
                        </div>
                        {politica.forma_pagamento_dias && politica.forma_pagamento_dias.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Dias de pagamento:</span>
                            <span className="ml-2 font-medium">{politica.forma_pagamento_dias.join(', ')} dias</span>
                          </div>
                        )}
                        {politica.observacao && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Observacao:</span>
                            <span className="ml-2">{politica.observacao}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Nenhuma politica de compra cadastrada para este fornecedor.</p>
                      <Link
                        href="/suprimentos/politica-compra"
                        className="mt-2 inline-block text-sm text-[#336FB6] hover:underline"
                      >
                        Cadastrar politica
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Totals */}
        <div className="col-span-4">
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6 sticky top-4">
            <h2 className="text-base font-semibold text-[#344054] mb-4">Totais da Compra</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total dos produtos</span>
                <span className="font-medium">{formatCurrency(totalProdutos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">No de itens</span>
                <span className="font-medium">{totalItens}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Soma das quantidades</span>
                <span className="font-medium">{somaQuantidades}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Desconto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                  className="block w-full px-3 py-2 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Frete (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={frete}
                  onChange={(e) => setFrete(Number(e.target.value))}
                  className="block w-full px-3 py-2 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">ICMS ST (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalIcms}
                  onChange={(e) => setTotalIcms(Number(e.target.value))}
                  className="block w-full px-3 py-2 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-gray-900">Total do Pedido</span>
                <span className="text-[#336FB6]">{formatCurrency(totalPedido)}</span>
              </div>
            </div>

            {/* Botoes */}
            <div className="mt-6 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving || itens.length === 0}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-[#009E3F] hover:bg-[#008A36] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Pedido'}
              </button>
              <Link
                href="/compras/pedidos"
                className="block w-full px-4 py-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Produto */}
      <Modal isOpen={showProdutoModal} onClose={() => setShowProdutoModal(false)}>
        <ModalHeader>
          <ModalTitle>Adicionar Produto</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600 mb-4">
            Selecione um produto do fornecedor para adicionar ao pedido.
          </p>

          {/* Busca */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#898989]">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou codigo..."
              value={produtoSearch}
              onChange={(e) => setProdutoSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Lista de produtos */}
          <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
            {loadingProdutos ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : produtosFornecedor.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhum produto encontrado para este fornecedor
              </div>
            ) : (
              produtosFornecedor.map(p => {
                const jaAdicionado = itens.some(i => i.produto_id === p.produto_id)
                return (
                  <button
                    key={p.produto_id}
                    onClick={() => !jaAdicionado && handleAddProduto(p)}
                    disabled={jaAdicionado}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                      jaAdicionado ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[#344054]">{p.nome}</p>
                        <p className="text-xs text-gray-500">
                          Codigo: {p.codigo || '-'} | Un: {p.unidade} | Estoque: {p.estoque_atual}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#336FB6]">{formatCurrency(p.valor_de_compra)}</p>
                        {jaAdicionado && (
                          <span className="text-xs text-gray-400">Ja adicionado</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setShowProdutoModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}

export default function NovoPedidoCompraPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#336FB6]"></div>
        </div>
      </DashboardLayout>
    }>
      <NovoPedidoContent />
    </Suspense>
  )
}
