'use client'

import { useState } from 'react'
import type { StatusInterno, SugestaoFornecedor, SugestaoItem } from '@/types/pedido-compra'
import { ESTADOS_FINAIS } from '@/types/pedido-compra'

interface ContraPropostaItem {
  item_pedido_compra_id: number
  quantidade_contra_proposta: number
  desconto_percentual: number
  bonificacao_percentual: number
}

interface StatusActionCardProps {
  statusInterno: StatusInterno
  sugestoes: SugestaoFornecedor[]
  sugestaoItens: SugestaoItem[] | null
  itens: { id: number; descricao: string; quantidade: number; valor: number }[]
  onEnviarFornecedor: () => void
  onAceitarSugestao: () => void
  onRejeitarSugestao: () => void
  onEnviarContraProposta?: (itens: ContraPropostaItem[], observacao: string) => Promise<void>
  onCancelar?: () => void
  onFinalizar?: () => void
  enviandoFornecedor: boolean
  processandoSugestao: boolean
  finalizando?: boolean
  observacaoResposta: string
  setObservacaoResposta: (value: string) => void
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
  // Indica se pedido ja esta em estado final no Bling (situacao 1 ou 2)
  situacaoBling?: number
}

export function StatusActionCard({
  statusInterno,
  sugestoes,
  sugestaoItens,
  itens,
  onEnviarFornecedor,
  onAceitarSugestao,
  onRejeitarSugestao,
  onEnviarContraProposta,
  onCancelar,
  onFinalizar,
  enviandoFornecedor,
  processandoSugestao,
  finalizando,
  observacaoResposta,
  setObservacaoResposta,
  formatCurrency,
  formatDate,
  situacaoBling,
}: StatusActionCardProps) {
  // Estado para modo negociacao
  const [modoNegociacao, setModoNegociacao] = useState(false)
  const [contraPropostaItens, setContraPropostaItens] = useState<ContraPropostaItem[]>([])
  const [observacaoContraProposta, setObservacaoContraProposta] = useState('')
  const [enviandoContraProposta, setEnviandoContraProposta] = useState(false)
  const pendenteSugestao = sugestoes.find(s => s.status === 'pendente')

  // Verifica se pode cancelar (nao esta em estado final e Bling nao esta finalizado/cancelado)
  const podeCancelar = !ESTADOS_FINAIS.includes(statusInterno) && situacaoBling !== 1 && situacaoBling !== 2

  // Verifica se pode finalizar (apenas quando aceito e Bling nao esta finalizado/cancelado)
  const podeFinalizar = statusInterno === 'aceito' && situacaoBling !== 1 && situacaoBling !== 2

  // Botao de cancelar compartilhado para estados que permitem
  const CancelarButton = () => (
    podeCancelar && onCancelar ? (
      <button
        onClick={onCancelar}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancelar Pedido
      </button>
    ) : null
  )

  // Rascunho - Enviar ao Fornecedor
  if (statusInterno === 'rascunho') {
    return (
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Enviar ao Fornecedor</h3>
            <p className="text-sm text-gray-600 mt-1">
              Envie este pedido para o fornecedor revisar e sugerir ajustes comerciais como quantidade, desconto, bonificacao e validade.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={onEnviarFornecedor}
                disabled={enviandoFornecedor}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                {enviandoFornecedor ? 'Enviando...' : 'Enviar ao Fornecedor'}
              </button>
              <CancelarButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Enviado - Aguardando
  if (statusInterno === 'enviado_fornecedor') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Aguardando Fornecedor</h3>
            <p className="text-sm text-gray-600 mt-1">
              O pedido foi enviado e esta aguardando a analise do fornecedor. Voce sera notificado quando houver uma resposta.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Aguardando resposta do fornecedor</span>
              </div>
              <CancelarButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Sugestao Pendente - Analisar
  if (statusInterno === 'sugestao_pendente' && sugestaoItens && sugestaoItens.length > 0) {
    // Calcular totais e economia
    let totalOriginal = 0
    let totalComDescontoItem = 0
    let totalBonificacaoUnidades = 0

    const itensCalculados = sugestaoItens.map((sItem) => {
      const itemOriginal = itens.find(i => i.id === sItem.item_pedido_compra_id)
      const valorUnitario = itemOriginal?.valor || 0
      const qtdOriginal = itemOriginal?.quantidade || 0
      const qtdSugerida = sItem.quantidade_sugerida
      const descontoItem = sItem.desconto_percentual || 0
      const bonifItem = sItem.bonificacao_percentual || 0

      // Calculos
      const subtotalOriginal = valorUnitario * qtdOriginal
      const valorComDesconto = valorUnitario * (1 - descontoItem / 100)
      const subtotalSugerido = valorComDesconto * qtdSugerida
      const unidadesBonificadas = Math.floor(qtdSugerida * bonifItem / 100)

      totalOriginal += subtotalOriginal
      totalComDescontoItem += subtotalSugerido
      totalBonificacaoUnidades += unidadesBonificadas

      return {
        ...sItem,
        itemOriginal,
        valorUnitario,
        qtdOriginal,
        valorComDesconto,
        subtotalOriginal,
        subtotalSugerido,
        unidadesBonificadas,
      }
    })

    // Condicoes comerciais gerais
    const valorMinimo = pendenteSugestao?.valor_minimo_pedido || 0
    const descontoGeral = pendenteSugestao?.desconto_geral || 0
    const bonificacaoGeral = pendenteSugestao?.bonificacao_geral || 0
    const prazoEntrega = pendenteSugestao?.prazo_entrega_dias
    const validadeProposta = pendenteSugestao?.validade_proposta

    // Aplicar desconto geral se atingir valor minimo
    let descontoGeralValor = 0
    let totalFinal = totalComDescontoItem
    if (valorMinimo > 0 && totalComDescontoItem >= valorMinimo && descontoGeral > 0) {
      descontoGeralValor = totalComDescontoItem * (descontoGeral / 100)
      totalFinal = totalComDescontoItem - descontoGeralValor
    }

    // Calcular economia
    const economia = totalOriginal - totalFinal
    const economiaPercent = totalOriginal > 0 ? (economia / totalOriginal) * 100 : 0

    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 overflow-hidden">
        <div className="px-6 py-4 border-b border-amber-200 bg-amber-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Sugestao do Fornecedor</h3>
              {pendenteSugestao && (
                <p className="text-sm text-amber-700">
                  Enviada por {pendenteSugestao.users_fornecedor?.nome || 'Fornecedor'}
                  {pendenteSugestao.observacao_fornecedor && (
                    <span className="italic"> - &quot;{pendenteSugestao.observacao_fornecedor}&quot;</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Condicoes comerciais gerais (se houver) */}
        {(valorMinimo > 0 || prazoEntrega || validadeProposta) && (
          <div className="px-6 py-3 bg-blue-50 border-b border-amber-200">
            <div className="flex flex-wrap gap-4 text-sm">
              {valorMinimo > 0 && (
                <div>
                  <span className="text-gray-500">Compra acima de:</span>{' '}
                  <span className="font-medium text-blue-700">{formatCurrency(valorMinimo)}</span>
                  {descontoGeral > 0 && (
                    <span className="text-green-600 ml-1">({descontoGeral}% desc)</span>
                  )}
                  {bonificacaoGeral > 0 && (
                    <span className="text-purple-600 ml-1">(+{bonificacaoGeral}% bonif)</span>
                  )}
                </div>
              )}
              {prazoEntrega && (
                <div>
                  <span className="text-gray-500">Prazo:</span>{' '}
                  <span className="font-medium">{prazoEntrega} dias uteis</span>
                </div>
              )}
              {validadeProposta && (
                <div>
                  <span className="text-gray-500">Valida ate:</span>{' '}
                  <span className="font-medium">{formatDate(validadeProposta)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabela comparativa com valores calculados */}
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-amber-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Produto</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd Orig</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 uppercase">Qtd Sug</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 uppercase">Desc%</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 uppercase">Bonif</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor c/Desc</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal Orig</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-green-700 uppercase">Subtotal Sug</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {itensCalculados.map((item) => {
                const qtdMudou = item.qtdOriginal !== item.quantidade_sugerida
                return (
                  <tr key={item.id} className="hover:bg-amber-50/50">
                    <td className="px-3 py-2 text-gray-900 truncate max-w-[150px]" title={item.itemOriginal?.descricao}>
                      {item.itemOriginal?.descricao || `Item #${item.item_pedido_compra_id}`}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-right">{item.qtdOriginal}</td>
                    <td className={`px-3 py-2 text-right font-medium ${qtdMudou ? 'text-amber-700' : 'text-gray-900'}`}>
                      {item.quantidade_sugerida}
                      {qtdMudou && (
                        <span className="ml-1 text-xs">
                          ({item.quantidade_sugerida > item.qtdOriginal ? '+' : ''}
                          {item.quantidade_sugerida - item.qtdOriginal})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.desconto_percentual > 0 ? (
                        <span className="text-green-600 font-medium">{item.desconto_percentual}%</span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.unidadesBonificadas > 0 ? (
                        <span className="text-purple-600 font-medium">+{item.unidadesBonificadas}</span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {item.desconto_percentual > 0 ? formatCurrency(item.valorComDesconto) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">
                      {formatCurrency(item.subtotalOriginal)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-green-700">
                      {formatCurrency(item.subtotalSugerido)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Resumo da sugestao */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-amber-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Original</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(totalOriginal)}</p>
            </div>
            <div>
              <p className="text-gray-500">Total c/ Desconto Item</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(totalComDescontoItem)}</p>
            </div>
            {descontoGeralValor > 0 && (
              <div>
                <p className="text-gray-500">Desconto Geral ({descontoGeral}%)</p>
                <p className="text-lg font-semibold text-green-600">-{formatCurrency(descontoGeralValor)}</p>
              </div>
            )}
            <div className="bg-green-100 rounded-lg p-2 -m-1">
              <p className="text-green-700 font-medium">Total Final</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalFinal)}</p>
              {economia > 0 && (
                <p className="text-xs text-green-600">
                  Economia: {formatCurrency(economia)} (-{economiaPercent.toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
          {totalBonificacaoUnidades > 0 && (
            <div className="mt-3 p-2 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Bonificacao:</span> +{totalBonificacaoUnidades} unidade{totalBonificacaoUnidades > 1 ? 's' : ''} gratis
              </p>
            </div>
          )}
        </div>

        {/* Acoes ou Modo Negociacao */}
        {!modoNegociacao ? (
          <div className="px-6 py-4 border-t border-amber-200 bg-amber-50/50">
            <div className="mb-3">
              <input
                type="text"
                value={observacaoResposta}
                onChange={(e) => setObservacaoResposta(e.target.value)}
                placeholder="Observacao para o fornecedor (opcional)"
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onAceitarSugestao}
                  disabled={processandoSugestao}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {processandoSugestao ? 'Processando...' : 'Aceitar Sugestao'}
                </button>
                {onEnviarContraProposta && (
                  <button
                    onClick={() => {
                      // Inicializar contra-proposta com valores da sugestao
                      const inicial = sugestaoItens?.map(sItem => ({
                        item_pedido_compra_id: sItem.item_pedido_compra_id,
                        quantidade_contra_proposta: sItem.quantidade_sugerida,
                        desconto_percentual: sItem.desconto_percentual,
                        bonificacao_percentual: sItem.bonificacao_percentual,
                      })) || []
                      setContraPropostaItens(inicial)
                      setModoNegociacao(true)
                    }}
                    disabled={processandoSugestao}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Negociar
                  </button>
                )}
                <button
                  onClick={onRejeitarSugestao}
                  disabled={processandoSugestao}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rejeitar
                </button>
              </div>
              <CancelarButton />
            </div>
          </div>
        ) : (
          // Formulario de contra-proposta
          <div className="px-6 py-4 border-t border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h4 className="font-semibold text-blue-900">Sua Contra-Proposta</h4>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Produto</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-blue-800 uppercase">Sugerido</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-blue-800 uppercase">Sua Qtd</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-blue-800 uppercase">Desc%</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-blue-800 uppercase">Bonif%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {contraPropostaItens.map((cpItem, idx) => {
                    const itemOriginal = itens.find(i => i.id === cpItem.item_pedido_compra_id)
                    const sItem = sugestaoItens?.find(s => s.item_pedido_compra_id === cpItem.item_pedido_compra_id)
                    return (
                      <tr key={cpItem.item_pedido_compra_id} className="hover:bg-blue-50/50">
                        <td className="px-3 py-2 text-gray-900 truncate max-w-[150px]" title={itemOriginal?.descricao}>
                          {itemOriginal?.descricao || `Item #${cpItem.item_pedido_compra_id}`}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {sItem?.quantidade_sugerida}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={cpItem.quantidade_contra_proposta}
                            onChange={(e) => {
                              const newItens = [...contraPropostaItens]
                              newItens[idx].quantidade_contra_proposta = Number(e.target.value)
                              setContraPropostaItens(newItens)
                            }}
                            className="w-20 px-2 py-1 text-sm text-right border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={cpItem.desconto_percentual}
                            onChange={(e) => {
                              const newItens = [...contraPropostaItens]
                              newItens[idx].desconto_percentual = Number(e.target.value)
                              setContraPropostaItens(newItens)
                            }}
                            className="w-20 px-2 py-1 text-sm text-right border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={cpItem.bonificacao_percentual}
                            onChange={(e) => {
                              const newItens = [...contraPropostaItens]
                              newItens[idx].bonificacao_percentual = Number(e.target.value)
                              setContraPropostaItens(newItens)
                            }}
                            className="w-20 px-2 py-1 text-sm text-right border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <textarea
                value={observacaoContraProposta}
                onChange={(e) => setObservacaoContraProposta(e.target.value)}
                placeholder="Justifique sua contra-proposta para o fornecedor..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!onEnviarContraProposta) return
                  setEnviandoContraProposta(true)
                  try {
                    await onEnviarContraProposta(contraPropostaItens, observacaoContraProposta)
                    setModoNegociacao(false)
                    setObservacaoContraProposta('')
                  } finally {
                    setEnviandoContraProposta(false)
                  }
                }}
                disabled={enviandoContraProposta}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                {enviandoContraProposta ? 'Enviando...' : 'Enviar Contra-Proposta'}
              </button>
              <button
                onClick={() => {
                  setModoNegociacao(false)
                  setObservacaoContraProposta('')
                }}
                disabled={enviandoContraProposta}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Aceito
  if (statusInterno === 'aceito') {
    const ultimaSugestao = sugestoes.find(s => s.status === 'aceita')
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Sugestao Aceita</h3>
            <p className="text-sm text-gray-600 mt-1">
              Voce aceitou a sugestao do fornecedor. Os itens do pedido foram atualizados com os novos valores.
            </p>
            {ultimaSugestao?.observacao_lojista && (
              <p className="mt-2 text-sm text-green-700 italic">
                &quot;{ultimaSugestao.observacao_lojista}&quot;
              </p>
            )}
            <div className="mt-4 flex items-center gap-3">
              {podeFinalizar && onFinalizar && (
                <button
                  onClick={onFinalizar}
                  disabled={finalizando}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  {finalizando ? 'Finalizando...' : 'Finalizar Pedido'}
                </button>
              )}
              <CancelarButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Rejeitado
  if (statusInterno === 'rejeitado') {
    const ultimaSugestao = sugestoes.find(s => s.status === 'rejeitada')
    return (
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Sugestao Rejeitada</h3>
            <p className="text-sm text-gray-600 mt-1">
              Voce rejeitou a sugestao do fornecedor. O fornecedor pode enviar uma nova proposta.
            </p>
            {ultimaSugestao?.observacao_lojista && (
              <p className="mt-2 text-sm text-red-700 italic">
                Motivo: &quot;{ultimaSugestao.observacao_lojista}&quot;
              </p>
            )}
            {podeCancelar && onCancelar && (
              <div className="mt-4">
                <CancelarButton />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Cancelado
  if (statusInterno === 'cancelado') {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border border-gray-300 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Pedido Cancelado</h3>
            <p className="text-sm text-gray-600 mt-1">
              Este pedido foi cancelado e nao pode mais ser alterado.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Finalizado
  if (statusInterno === 'finalizado') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Pedido Finalizado</h3>
            <p className="text-sm text-gray-600 mt-1">
              Este pedido foi concluido com sucesso. Todas as negociacoes foram finalizadas.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
