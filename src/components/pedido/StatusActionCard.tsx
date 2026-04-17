'use client'

import type { StatusInterno, SugestaoFornecedor, SugestaoItem } from '@/types/pedido-compra'
import { ESTADOS_FINAIS } from '@/types/pedido-compra'

// Botao CTA principal com shimmer animado
function ShimmerButton({ onClick, disabled, children, className }: {
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
  className: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
    >
      <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
      <span
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.25) 55%, transparent 70%)',
          backgroundSize: '250% 100%',
          animation: 'shimmer-wave 3s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes shimmer-wave {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </button>
  )
}

interface StatusActionCardProps {
  statusInterno: StatusInterno
  sugestoes: SugestaoFornecedor[]
  sugestaoItens: SugestaoItem[] | null
  itens: { id: number; descricao: string; quantidade: number; valor: number }[]
  onEnviarFornecedor: () => void
  onAceitarSugestao: () => void
  onRejeitarSugestao: () => void
  onManterOriginal?: () => void
  onCancelar?: () => void
  onRecolher?: () => void
  recolhendo?: boolean
  onFinalizar?: () => void
  enviandoFornecedor: boolean
  processandoSugestao: boolean
  finalizando?: boolean
  observacaoResposta: string
  setObservacaoResposta: (value: string) => void
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
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
  onManterOriginal,
  onCancelar,
  onRecolher,
  recolhendo,
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
  const pendenteSugestao = sugestoes.find(s => s.status === 'pendente')
  const podeCancelar = !ESTADOS_FINAIS.includes(statusInterno) && situacaoBling !== 1 && situacaoBling !== 2
  const podeRecolher = ['enviado_fornecedor', 'sugestao_pendente', 'contra_proposta_pendente'].includes(statusInterno)
  const podeFinalizar = statusInterno === 'aceito' && situacaoBling !== 1 && situacaoBling !== 2

  const CancelarButton = () => (
    podeCancelar && onCancelar ? (
      <button
        onClick={onCancelar}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50/80 rounded-xl transition-all duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancelar Pedido
      </button>
    ) : null
  )

  const RecolherButton = () => (
    podeRecolher && onRecolher ? (
      <button
        onClick={onRecolher}
        disabled={recolhendo}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-secondary-700 bg-gradient-to-r from-secondary-50 to-secondary-100/80 hover:from-secondary-100 hover:to-secondary-200/80 border border-secondary-300/60 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
        {recolhendo ? 'Recolhendo...' : 'Recolher Envio'}
      </button>
    ) : null
  )

  // ─── Rascunho ───
  if (statusInterno === 'rascunho') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary-200/60 bg-white shadow-lg shadow-primary-100/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-white to-blue-50/50" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/30 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-200/50">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Enviar ao Fornecedor</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Envie este pedido para revisao. O fornecedor podera sugerir ajustes em quantidade, desconto, bonificacao e validade.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ShimmerButton
                  onClick={onEnviarFornecedor}
                  disabled={enviandoFornecedor}
                  className="px-7 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-300/40 hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {enviandoFornecedor ? 'Enviando...' : 'Enviar ao Fornecedor'}
                </ShimmerButton>
                <CancelarButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Enviado - Aguardando ───
  if (statusInterno === 'enviado_fornecedor') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-secondary-300/60 bg-white shadow-lg shadow-secondary-100/40">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-50/70 via-white to-amber-50/40" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary-100/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-secondary-400 to-secondary-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary-200/50">
              <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Aguardando Fornecedor</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                O pedido foi enviado e esta aguardando analise. Voce sera notificado quando houver uma resposta.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 px-4 py-2 bg-secondary-50/80 rounded-xl border border-secondary-200/40">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm font-medium text-secondary-600">Aguardando resposta</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShimmerButton
                    onClick={onRecolher || (() => {})}
                    disabled={recolhendo || !onRecolher}
                    className="px-5 py-2.5 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-secondary-200/50 hover:shadow-xl hover:shadow-secondary-300/40 hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                    {recolhendo ? 'Recolhendo...' : 'Recolher Envio'}
                  </ShimmerButton>
                  <CancelarButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Sugestao Pendente ───
  if (statusInterno === 'sugestao_pendente' && sugestaoItens && sugestaoItens.length > 0) {
    let totalOriginal = 0
    let totalComDescontoItem = 0
    let totalBonificacaoUnidades = 0

    const itensCalculados = sugestaoItens.map((sItem) => {
      const itemOriginal = itens.find(i => i.id === sItem.item_pedido_compra_id)
      const valorUnitario = itemOriginal?.valor || 0
      const precoSugerido = sItem.preco_unitario != null && sItem.preco_unitario !== valorUnitario ? sItem.preco_unitario : null
      const valorBase = precoSugerido ?? valorUnitario
      const qtdOriginal = itemOriginal?.quantidade || 0
      const qtdSugerida = sItem.quantidade_sugerida
      const descontoItem = sItem.desconto_percentual || 0
      const unidadesBonificadas = sItem.bonificacao_quantidade || 0
      const subtotalOriginal = valorUnitario * qtdOriginal
      const valorComDesconto = valorBase * (1 - descontoItem / 100)
      const subtotalSugerido = valorComDesconto * qtdSugerida

      totalOriginal += subtotalOriginal
      totalComDescontoItem += subtotalSugerido
      totalBonificacaoUnidades += unidadesBonificadas

      return { ...sItem, itemOriginal, valorUnitario, precoSugerido, valorBase, qtdOriginal, valorComDesconto, subtotalOriginal, subtotalSugerido, unidadesBonificadas }
    })

    const temPrecoSugerido = itensCalculados.some(item => item.precoSugerido != null)

    const valorMinimo = pendenteSugestao?.valor_minimo_pedido || 0
    const descontoGeral = pendenteSugestao?.desconto_geral || 0
    const bonificacaoGeral = pendenteSugestao?.bonificacao_quantidade_geral || 0
    const prazoEntrega = pendenteSugestao?.prazo_entrega_dias
    const validadeProposta = pendenteSugestao?.validade_proposta

    let descontoGeralValor = 0
    let totalFinal = totalComDescontoItem
    if (valorMinimo > 0 && totalComDescontoItem >= valorMinimo && descontoGeral > 0) {
      descontoGeralValor = totalComDescontoItem * (descontoGeral / 100)
      totalFinal = totalComDescontoItem - descontoGeralValor
    }

    const economia = totalOriginal - totalFinal
    const economiaPercent = totalOriginal > 0 ? (economia / totalOriginal) * 100 : 0

    return (
      <div className="relative overflow-hidden rounded-2xl border border-secondary-300/60 bg-white shadow-lg shadow-secondary-100/40">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-secondary-50 via-secondary-100/50 to-amber-50/30 border-b border-secondary-200/60">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-secondary-400 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg shadow-secondary-200/40">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Sugestao do Fornecedor</h3>
              {pendenteSugestao && (
                <p className="text-sm text-secondary-700/80">
                  Enviada por <span className="font-medium">{pendenteSugestao.users_fornecedor?.nome || 'Fornecedor'}</span>
                  {pendenteSugestao.observacao_fornecedor && (
                    <span className="italic text-gray-500"> — &quot;{pendenteSugestao.observacao_fornecedor}&quot;</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Condicoes comerciais */}
        {(valorMinimo > 0 || prazoEntrega || validadeProposta) && (
          <div className="px-6 py-3.5 bg-primary-50/40 border-b border-secondary-200/40">
            <div className="flex flex-wrap gap-5 text-sm">
              {valorMinimo > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Minimo:</span>
                  <span className="font-semibold text-primary-700">{formatCurrency(valorMinimo)}</span>
                  {descontoGeral > 0 && <span className="text-green-600 font-medium">({descontoGeral}% desc)</span>}
                  {bonificacaoGeral > 0 && <span className="text-purple-600 font-medium">(+{bonificacaoGeral} un)</span>}
                </div>
              )}
              {prazoEntrega && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Prazo:</span>
                  <span className="font-semibold text-gray-700">{prazoEntrega} dias uteis</span>
                </div>
              )}
              {validadeProposta && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Valida ate:</span>
                  <span className="font-semibold text-gray-700">{formatDate(validadeProposta)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabela comparativa */}
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Obs</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Qtd Orig</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Qtd Sug</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Preco Orig</th>
                {temPrecoSugerido && (
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Preco Sug</th>
                )}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Desc%</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Bonif</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-secondary-600 uppercase tracking-wider">Validade</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Sub Orig</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-green-600 uppercase tracking-wider">Sub Sug</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itensCalculados.map((item) => {
                const qtdMudou = item.qtdOriginal !== item.quantidade_sugerida
                return (
                  <tr key={item.id} className="hover:bg-secondary-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      {(() => {
                        const s = item.status_item
                        if (!s || s === 'ok') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">OK</span>
                        if (s === 'divergente') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">Preco desatualizado</span>
                        if (s === 'ruptura') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">Ruptura</span>
                        if (s === 'depreciado') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Depreciado</span>
                        return <span className="text-gray-300">-</span>
                      })()}
                      {item.is_substituicao && <span className="block text-[9px] text-blue-600 mt-0.5">Substituicao</span>}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {item.observacao_item ? (
                        <span className="text-[11px] text-gray-600 leading-tight block break-words">{item.observacao_item}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 truncate max-w-[150px] font-medium" title={item.itemOriginal?.descricao}>
                      {item.is_substituicao && item.produto_nome ? (
                        <div>
                          <span className="line-through text-gray-400 text-xs">{item.itemOriginal?.descricao}</span>
                          <span className="block text-blue-700">{item.produto_nome}</span>
                        </div>
                      ) : item.is_novo ? (
                        <span className="text-blue-700">{item.produto_nome || `Item #${item.item_pedido_compra_id}`}</span>
                      ) : (
                        item.itemOriginal?.descricao || `Item #${item.item_pedido_compra_id}`
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-right tabular-nums">{item.qtdOriginal}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${qtdMudou ? 'text-secondary-700' : 'text-gray-700'}`}>
                      {item.quantidade_sugerida}
                      {qtdMudou && (
                        <span className="ml-1 text-xs font-normal">
                          ({item.quantidade_sugerida > item.qtdOriginal ? '+' : ''}{item.quantidade_sugerida - item.qtdOriginal})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">{formatCurrency(item.valorUnitario)}</td>
                    {temPrecoSugerido && (
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {item.precoSugerido != null ? (
                          <div>
                            <span className="font-semibold text-secondary-700">{formatCurrency(item.precoSugerido)}</span>
                            <div className={`text-xs mt-0.5 ${item.precoSugerido < item.valorUnitario ? 'text-green-600' : 'text-red-500'}`}>
                              {item.precoSugerido < item.valorUnitario ? '\u2193' : '\u2191'} {Math.abs(((item.precoSugerido - item.valorUnitario) / item.valorUnitario) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right">
                      {item.desconto_percentual > 0 ? <span className="text-green-600 font-semibold">{item.desconto_percentual}%</span> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {item.unidadesBonificadas > 0 ? (
                        <div>
                          <span className="text-purple-600 font-semibold">+{item.unidadesBonificadas}</span>
                          <p className="text-[10px] text-gray-400">{item.quantidade_sugerida + item.unidadesBonificadas} un total</p>
                        </div>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.validade ? <span className="text-secondary-700 font-medium">{formatDate(item.validade)}</span> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{formatCurrency(item.subtotalOriginal)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-green-700 tabular-nums">{formatCurrency(item.subtotalSugerido)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Resumo financeiro */}
        <div className="px-6 py-5 bg-gradient-to-r from-green-50/80 via-emerald-50/50 to-white border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Original</p>
              <p className="text-lg font-bold text-gray-600 tabular-nums mt-0.5">{formatCurrency(totalOriginal)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">c/ Desconto Item</p>
              <p className="text-lg font-bold text-gray-600 tabular-nums mt-0.5">{formatCurrency(totalComDescontoItem)}</p>
            </div>
            {descontoGeralValor > 0 && (
              <div>
                <p className="text-xs font-medium text-green-500 uppercase tracking-wider">Desc. Geral ({descontoGeral}%)</p>
                <p className="text-lg font-bold text-green-600 tabular-nums mt-0.5">-{formatCurrency(descontoGeralValor)}</p>
              </div>
            )}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-50 rounded-xl p-3 -m-1 border border-green-200/60">
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Final</p>
              <p className="text-xl font-extrabold text-green-700 tabular-nums mt-0.5">{formatCurrency(totalFinal)}</p>
              {economia > 0 && (
                <p className="text-xs text-green-600 font-medium mt-0.5">
                  Economia: {formatCurrency(economia)} (-{economiaPercent.toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
          {totalBonificacaoUnidades > 0 && (
            <div className="mt-3 px-3 py-2 bg-purple-50/80 rounded-xl border border-purple-100">
              <p className="text-sm text-purple-700">
                <span className="font-semibold">Bonificacao:</span> +{totalBonificacaoUnidades} unidade{totalBonificacaoUnidades > 1 ? 's' : ''} gratis
              </p>
            </div>
          )}
        </div>

        {/* Acoes */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/30">
          <div className="mb-4">
            <input
              type="text"
              value={observacaoResposta}
              onChange={(e) => setObservacaoResposta(e.target.value)}
              placeholder="Observacao para o fornecedor (opcional)"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none bg-white transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <ShimmerButton
                onClick={onAceitarSugestao}
                disabled={processandoSugestao}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-300/40 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {processandoSugestao ? 'Processando...' : 'Aceitar Sugestao'}
              </ShimmerButton>
              {onManterOriginal && (
                <button
                  onClick={onManterOriginal}
                  disabled={processandoSugestao}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Manter Original
                </button>
              )}
              <button
                onClick={onRejeitarSugestao}
                disabled={processandoSugestao}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                Devolver ao Fornecedor
              </button>
            </div>
            <div className="flex items-center gap-2">
              <RecolherButton />
              <CancelarButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Aceito ───
  if (statusInterno === 'aceito') {
    const ultimaSugestao = sugestoes.find(s => s.status === 'aceita')
    return (
      <div className="relative overflow-hidden rounded-2xl border border-green-200/60 bg-white shadow-lg shadow-green-100/30">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/60 via-white to-emerald-50/30" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-200/50">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Sugestao Aceita</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Os itens do pedido foram atualizados com os novos valores negociados.
              </p>
              {ultimaSugestao?.observacao_lojista && (
                <p className="mt-2 text-sm text-green-600 italic bg-green-50/60 px-3 py-1.5 rounded-lg">
                  &quot;{ultimaSugestao.observacao_lojista}&quot;
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {podeFinalizar && onFinalizar && (
                  <ShimmerButton
                    onClick={onFinalizar}
                    disabled={finalizando || false}
                    className="px-7 py-3.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-purple-200/50 hover:shadow-xl hover:shadow-purple-300/40 hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    {finalizando ? 'Finalizando...' : 'Finalizar Pedido'}
                  </ShimmerButton>
                )}
                <CancelarButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Rejeitado ───
  if (statusInterno === 'rejeitado') {
    const ultimaSugestao = sugestoes.find(s => s.status === 'rejeitada')
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-200/60 bg-white shadow-lg shadow-red-100/20">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-white to-rose-50/30" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-200/40">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Sugestao Rejeitada</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                O fornecedor pode enviar uma nova proposta, ou voce pode recolher o envio e editar o pedido.
              </p>
              {ultimaSugestao?.observacao_lojista && (
                <p className="mt-2 text-sm text-red-600 italic bg-red-50/60 px-3 py-1.5 rounded-lg">
                  Motivo: &quot;{ultimaSugestao.observacao_lojista}&quot;
                </p>
              )}
              {(podeCancelar || podeRecolher) && (
                <div className="mt-5 flex items-center gap-3">
                  <RecolherButton />
                  <CancelarButton />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Cancelado ───
  if (statusInterno === 'cancelado') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 via-white to-gray-50/40" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Pedido Cancelado</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Este pedido foi cancelado e nao pode mais ser alterado.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Finalizado ───
  if (statusInterno === 'finalizado') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-white shadow-lg shadow-purple-100/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 via-white to-violet-50/30" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-200/40">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Pedido Finalizado</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Este pedido foi concluido com sucesso. Todas as negociacoes foram finalizadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
