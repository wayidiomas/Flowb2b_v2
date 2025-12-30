'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function AutoFixIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.996.996 0 0 0-1.41 0L1.29 18.96a.996.996 0 0 0 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05a.996.996 0 0 0 0-1.41l-2.33-2.35zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

interface SugestaoItem {
  produto_id: number
  codigo: string
  nome: string
  estoque_atual: number
  media_vendas_dia: number
  sugestao_quantidade: number
  quantidade_ajustada: number
  valor_unitario: number
  valor_total: number
  itens_por_caixa: number
  caixas: number
}

interface Fornecedor {
  id: number
  nome: string
  cnpj: string | null
}

interface FornecedorOption {
  id: number
  nome: string
  cnpj?: string
}

interface PoliticaCompra {
  id: number
  valor_minimo: number | null
  desconto: number | null
  prazo_entrega: number | null
  prazo_estoque: number | null
}

function GerarAutomaticoContent() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fornecedorIdParam = searchParams.get('fornecedor_id')

  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  const [politica, setPolitica] = useState<PoliticaCompra | null>(null)
  const [sugestoes, setSugestoes] = useState<SugestaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para modal de fornecedor
  const [showFornecedorModal, setShowFornecedorModal] = useState(false)
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [fornecedorSearch, setFornecedorSearch] = useState('')
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorOption | null>(null)

  // Buscar fornecedores para o modal
  const fetchFornecedores = async () => {
    if (!user?.id) return
    setLoadingFornecedores(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome, cnpj')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true })
        .limit(100)

      if (error) throw error
      setFornecedores(data || [])
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // Carregar dados do fornecedor e politica
  useEffect(() => {
    const fetchData = async () => {
      // Se nao tiver fornecedor_id, mostrar modal de selecao
      if (!fornecedorIdParam) {
        setLoading(false)
        setShowFornecedorModal(true)
        fetchFornecedores()
        return
      }

      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const empresaId = empresa?.id || user?.empresa_id
        if (!empresaId) return

        // Buscar fornecedor
        const { data: fornecedorData, error: fornecedorError } = await supabase
          .from('fornecedores')
          .select('id, nome, cnpj')
          .eq('id', parseInt(fornecedorIdParam))
          .eq('empresa_id', empresaId)
          .single()

        if (fornecedorError || !fornecedorData) {
          setError('Fornecedor nao encontrado')
          setLoading(false)
          return
        }

        setFornecedor(fornecedorData)

        // Buscar politica de compra
        const { data: politicaData } = await supabase
          .from('politica_compra')
          .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque')
          .eq('fornecedor_id', parseInt(fornecedorIdParam))
          .eq('empresa_id', empresaId)
          .eq('status', true)
          .single()

        setPolitica(politicaData || null)
        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados do fornecedor')
        setLoading(false)
      }
    }

    fetchData()
  }, [fornecedorIdParam, user?.id, user?.empresa_id, empresa?.id])

  // Selecionar fornecedor do modal
  const handleSelectFornecedor = async (selected: FornecedorOption) => {
    setFornecedor({ id: selected.id, nome: selected.nome, cnpj: selected.cnpj || null })
    setShowFornecedorModal(false)

    // Buscar politica do fornecedor selecionado
    const empresaId = empresa?.id || user?.empresa_id
    if (empresaId) {
      const { data: politicaData } = await supabase
        .from('politica_compra')
        .select('id, valor_minimo, desconto, prazo_entrega, prazo_estoque')
        .eq('fornecedor_id', selected.id)
        .eq('empresa_id', empresaId)
        .eq('status', true)
        .single()

      setPolitica(politicaData || null)
    }
  }

  // Filtrar fornecedores no modal
  const filteredFornecedores = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase()) ||
    (f.cnpj && f.cnpj.includes(fornecedorSearch))
  )

  // Calcular sugestoes via API externa
  const calcularSugestoes = async () => {
    if (!fornecedor) return

    setCalculando(true)
    setError(null)

    try {
      const response = await fetch('/api/pedidos-compra/calcular-automatico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fornecedor_id: fornecedor.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao calcular sugestoes')
      }

      const data = await response.json()

      // Verificar se retornou sugestoes
      if (!data.sugestoes || data.sugestoes.length === 0) {
        setError('Nenhuma sugestao de compra para este fornecedor. Verifique se ha produtos com vendas recentes.')
        setCalculando(false)
        return
      }

      // Mapear resposta da API para SugestaoItem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sugestoesCalculadas: SugestaoItem[] = data.sugestoes.map((item: any) => ({
        produto_id: item.produto_id,
        codigo: item.codigo || '-',
        nome: item.nome,
        estoque_atual: item.estoque_atual || 0,
        media_vendas_dia: item.media_venda_dia || 0,
        sugestao_quantidade: item.quantidade_sugerida,
        quantidade_ajustada: item.quantidade_sugerida,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        itens_por_caixa: item.itens_por_caixa || 1,
        caixas: Math.ceil(item.quantidade_sugerida / (item.itens_por_caixa || 1))
      }))

      // Ordenar por valor total decrescente
      sugestoesCalculadas.sort((a, b) => b.valor_total - a.valor_total)
      setSugestoes(sugestoesCalculadas)
    } catch (err) {
      console.error('Erro ao calcular sugestoes:', err)
      setError(err instanceof Error ? err.message : 'Erro ao calcular sugestoes de compra')
    } finally {
      setCalculando(false)
    }
  }

  // Atualizar quantidade de um item
  const handleQuantidadeChange = (index: number, novaQuantidade: number) => {
    setSugestoes(prev => prev.map((item, i) => {
      if (i === index) {
        const caixas = Math.ceil(novaQuantidade / item.itens_por_caixa)
        const quantidadeAjustada = caixas * item.itens_por_caixa
        return {
          ...item,
          quantidade_ajustada: quantidadeAjustada,
          caixas: caixas,
          valor_total: quantidadeAjustada * item.valor_unitario
        }
      }
      return item
    }))
  }

  // Remover item da lista
  const handleRemoverItem = (index: number) => {
    setSugestoes(prev => prev.filter((_, i) => i !== index))
  }

  // Criar pedido com as sugestoes
  const handleCriarPedido = async () => {
    if (sugestoes.length === 0 || !fornecedor) return

    setSaving(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      const dataAtual = new Date().toISOString().split('T')[0]

      // Criar pedido de compra
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos_compra')
        .insert({
          empresa_id: empresaId,
          fornecedor_id: fornecedor.id,
          data: dataAtual,
          situacao: 5, // Rascunho
          total_produtos: sugestoes.reduce((acc, item) => acc + item.valor_total, 0),
          total: sugestoes.reduce((acc, item) => acc + item.valor_total, 0),
          desconto: politica?.desconto || 0,
          observacoes_internas: 'Pedido gerado automaticamente'
        })
        .select('id')
        .single()

      if (pedidoError) throw pedidoError

      // Criar itens do pedido
      const itensParaInserir = sugestoes.map(item => ({
        pedido_compra_id: pedido.id,
        produto_id: item.produto_id,
        codigo: item.codigo,
        descricao: item.nome,
        quantidade: item.quantidade_ajustada,
        valor: item.valor_unitario,
        unidade: 'UN'
      }))

      const { error: itensError } = await supabase
        .from('itens_pedido_compra')
        .insert(itensParaInserir)

      if (itensError) throw itensError

      // Redirecionar para edicao do pedido
      router.push(`/compras/pedidos/${pedido.id}/editar`)
    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      setError('Erro ao criar pedido de compra')
    } finally {
      setSaving(false)
    }
  }

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Calcular totais
  const totalItens = sugestoes.reduce((acc, item) => acc + item.quantidade_ajustada, 0)
  const valorTotal = sugestoes.reduce((acc, item) => acc + item.valor_total, 0)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <SpinnerIcon />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Gerar Pedido Automatico"
        subtitle={fornecedor?.nome || ''}
      />

      {/* Navegacao */}
      <div className="mb-6">
        <Link
          href="/compras/pedidos"
          className="inline-flex items-center gap-2 text-sm text-[#336FB6] hover:text-[#2660A5]"
        >
          <ArrowLeftIcon />
          Voltar para pedidos
        </Link>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border-b border-[#EDEDED] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#4684CD]/10 flex items-center justify-center text-[#4684CD]">
                <AutoFixIcon />
              </div>
              <div>
                <h2 className="text-base font-medium text-[#344054]">
                  {fornecedor?.nome}
                </h2>
                {fornecedor?.cnpj && (
                  <p className="text-sm text-gray-500">{fornecedor.cnpj}</p>
                )}
              </div>
            </div>

            {/* Botao calcular */}
            {sugestoes.length === 0 && (
              <button
                onClick={calcularSugestoes}
                disabled={calculando}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#4684CD] hover:bg-[#3A75B8] rounded-lg transition-colors disabled:opacity-50"
              >
                {calculando ? (
                  <>
                    <SpinnerIcon />
                    Calculando...
                  </>
                ) : (
                  <>
                    <AutoFixIcon />
                    Calcular Sugestoes
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info da politica */}
          {politica && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Politica de compra:</strong>{' '}
                {politica.valor_minimo && `Valor minimo: ${formatCurrency(politica.valor_minimo)}`}
                {politica.desconto && ` | Desconto: ${politica.desconto}%`}
                {politica.prazo_estoque && ` | Prazo estoque: ${politica.prazo_estoque} dias`}
              </p>
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Estado inicial - sem sugestoes */}
        {!calculando && sugestoes.length === 0 && !error && (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AutoFixIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Gerar sugestoes de compra
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Clique em &quot;Calcular Sugestoes&quot; para analisar as vendas e estoque
              e receber sugestoes de quantidades a comprar.
            </p>
          </div>
        )}

        {/* Calculando */}
        {calculando && (
          <div className="px-6 py-12 text-center">
            <div className="flex justify-center">
              <SpinnerIcon />
            </div>
            <p className="mt-4 text-sm text-gray-700 font-medium">
              Analisando vendas e calculando sugestoes...
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Este processo pode levar alguns minutos. Por favor, aguarde.
            </p>
          </div>
        )}

        {/* Tabela de sugestoes */}
        {sugestoes.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#F9F9F9]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Codigo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">Produto</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Estoque</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Media/dia</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Sugestao</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">Qtd</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">Valor Unit.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054]">Total</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sugestoes.map((item, index) => (
                    <tr key={item.produto_id} className="border-b border-[#EFEFEF] hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-[#344054]">{item.codigo}</td>
                      <td className="px-4 py-3 text-sm text-[#344054] max-w-[200px] truncate" title={item.nome}>
                        {item.nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-[#667085]">{item.estoque_atual}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#667085]">{item.media_vendas_dia}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#4684CD] font-medium">
                        {item.sugestao_quantidade}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step={item.itens_por_caixa}
                          value={item.quantidade_ajustada}
                          onChange={(e) => handleQuantidadeChange(index, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#336FB6]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#667085]">
                        {formatCurrency(item.valor_unitario)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-[#344054]">
                        {formatCurrency(item.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoverItem(index)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer com totais */}
            <div className="px-6 py-4 bg-[#FBFBFB] border-t border-[#EDEDED] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500">Itens</p>
                  <p className="text-lg font-semibold text-[#344054]">{sugestoes.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantidade total</p>
                  <p className="text-lg font-semibold text-[#344054]">{totalItens}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valor total</p>
                  <p className="text-lg font-semibold text-[#336FB6]">{formatCurrency(valorTotal)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={calcularSugestoes}
                  disabled={calculando}
                  className="px-4 py-2.5 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Recalcular
                </button>
                <button
                  onClick={handleCriarPedido}
                  disabled={saving || sugestoes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#009E3F] hover:bg-[#008735] rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <SpinnerIcon />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckIcon />
                      Criar Pedido
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de selecao de fornecedor */}
      {showFornecedorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => router.push('/compras/pedidos')}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-[24px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[520px]">
            {/* Content */}
            <div className="p-8">
              {/* Titulo */}
              <h2 className="text-[24px] font-semibold text-[#1a1a2e] leading-[1.2]">
                Gerar Pedido Automatico
              </h2>

              {/* Subtitulo */}
              <p className="mt-4 text-[15px] text-[#64748b] leading-[1.6]">
                Selecione o fornecedor para gerar o pedido automaticamente com base nas vendas e estoque.
              </p>

              {/* Campo de busca */}
              <div className="mt-6 relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar fornecedor..."
                  value={fornecedorSearch}
                  onChange={(e) => setFornecedorSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 text-[15px] text-[#1e293b] placeholder-[#cbd5e1] bg-white border border-[#e2e8f0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-all"
                />
              </div>

              {/* Lista de fornecedores */}
              <div className="mt-4 border border-[#e2e8f0] rounded-[16px] overflow-hidden">
                <div className="max-h-[280px] overflow-y-auto">
                  {loadingFornecedores ? (
                    <div className="flex items-center justify-center py-12">
                      <SpinnerIcon />
                      <span className="ml-3 text-[14px] text-[#64748b]">Carregando fornecedores...</span>
                    </div>
                  ) : filteredFornecedores.length === 0 ? (
                    <div className="py-12 text-center text-[14px] text-[#64748b]">
                      Nenhum fornecedor encontrado
                    </div>
                  ) : (
                    <div>
                      {filteredFornecedores.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFornecedor(f)}
                          className={`w-full px-5 py-4 text-left border-b border-[#f1f5f9] last:border-b-0 transition-all ${
                            selectedFornecedor?.id === f.id
                              ? 'bg-[#f0f7ff]'
                              : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <p className="text-[15px] font-semibold text-[#1e293b] leading-[1.4] uppercase">
                            {f.nome}
                          </p>
                          {f.cnpj && (
                            <p className="mt-0.5 text-[14px] text-[#64748b] leading-[1.4]">
                              {f.cnpj}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer com botoes */}
            <div className="px-8 pb-8 pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push('/compras/pedidos')}
                className="px-7 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-full hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => selectedFornecedor && handleSelectFornecedor(selectedFornecedor)}
                disabled={!selectedFornecedor}
                className="px-7 py-2.5 text-[14px] font-medium text-white bg-[#94a8c7] rounded-full hover:bg-[#8299ba] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function GerarAutomaticoPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <SpinnerIcon />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      </DashboardLayout>
    }>
      <GerarAutomaticoContent />
    </Suspense>
  )
}
