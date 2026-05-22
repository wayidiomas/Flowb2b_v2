'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { StatusInterno, SugestaoFornecedor, SugestaoItem } from '@/types/pedido-compra'
import { ESTADOS_FINAIS } from '@/types/pedido-compra'

// Tooltip estilizado (branding FlowB2B), instantaneo e posicionado via fixed
// para nao ser cortado pelo overflow da tabela.
function ConferenciaHover({ trigger, titulo, linhas, cor }: {
  trigger: ReactNode
  titulo: string
  linhas: string[]
  cor: 'amber' | 'red' | 'green'
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)
  const handleEnter = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 300)) })
    setShow(true)
  }
  const headerCor =
    cor === 'red' ? 'from-red-50 to-rose-50 border-red-100 text-red-700'
    : cor === 'green' ? 'from-green-50 to-emerald-50 border-green-100 text-green-700'
    : 'from-secondary-50 to-amber-50 border-secondary-100 text-secondary-700'
  const bulletCor = cor === 'red' ? 'text-red-400' : cor === 'green' ? 'text-green-500' : 'text-secondary-500'
  return (
    <span ref={ref} className="cursor-help inline-block" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {trigger}
      {show && linhas.length > 0 && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden text-left pointer-events-none"
        >
          <div className={`px-3 py-2 bg-gradient-to-r ${headerCor} border-b flex items-center gap-1.5`}>
            <span className="text-xs font-bold uppercase tracking-wide">{titulo}</span>
          </div>
          <div className="p-3 space-y-1.5">
            {linhas.map((l, i) => (
              <p key={i} className="text-xs text-gray-600 leading-snug flex gap-1.5">
                <span className={`${bulletCor} font-bold`}>•</span>
                <span>{l}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}

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
  itens: { id: number; descricao: string; quantidade: number; valor: number; codigo_produto?: string | null; codigo_fornecedor?: string | null }[]
  onEnviarFornecedor: () => void
  onEditar?: () => void
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
  temEspelho?: boolean
  validandoEspelho?: boolean
  onValidarEspelho?: () => void
  // Resultado da validacao do espelho pela IA, para cruzar com cada item da sugestao
  validacaoEspelho?: {
    codigo: string | null
    gtin: string | null
    status: string
    espelho_quantidade: number | null
    espelho_preco: number | null
    diferencas?: string[]
  }[]
}

export function StatusActionCard({
  statusInterno,
  sugestoes,
  sugestaoItens,
  itens,
  onEnviarFornecedor,
  onEditar,
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
  temEspelho,
  validandoEspelho,
  onValidarEspelho,
  validacaoEspelho,
}: StatusActionCardProps) {
  // ─── Estados para search / filtros / paginacao da tabela de sugestao ───
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<{ ruptura: boolean; descontinuado: boolean; alterados: boolean }>({ ruptura: false, descontinuado: false, alterados: false })
  const [pagina, setPagina] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const itensPorPagina = isMobile ? 5 : 30

  const pendenteSugestao = sugestoes.find(s => s.status === 'pendente')
  const podeCancelar = !ESTADOS_FINAIS.includes(statusInterno) && situacaoBling !== 1 && situacaoBling !== 2
  const podeRecolher = ['enviado_fornecedor', 'sugestao_pendente', 'contra_proposta_pendente'].includes(statusInterno)
  const podeFinalizar = statusInterno === 'aceito' && situacaoBling !== 1 && situacaoBling !== 2

  const CancelarButton = () => (
    podeCancelar && onCancelar ? (
      <button
        onClick={onCancelar}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap text-sm text-gray-500 hover:text-red-600 hover:bg-red-50/80 rounded-xl transition-all duration-200"
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
        className="inline-flex items-center gap-2 px-5 py-2.5 whitespace-nowrap text-sm font-semibold text-secondary-700 bg-gradient-to-r from-secondary-50 to-secondary-100/80 hover:from-secondary-100 hover:to-secondary-200/80 border border-secondary-300/60 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
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
                {onEditar && (
                  <button
                    onClick={onEditar}
                    className="inline-flex items-center gap-2 px-5 py-2.5 whitespace-nowrap text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                    Editar pedido
                  </button>
                )}
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

    // Indexa a validacao do espelho (IA) por SKU do lojista e por EAN, para cruzar com cada item.
    const normKey = (s: string | null | undefined) => (s || '').toLowerCase().replace(/\s+/g, '').trim()
    const espelhoPorCodigo = new Map<string, NonNullable<typeof validacaoEspelho>[number]>()
    const espelhoPorGtin = new Map<string, NonNullable<typeof validacaoEspelho>[number]>()
    for (const v of validacaoEspelho || []) {
      if (v.codigo) espelhoPorCodigo.set(normKey(v.codigo), v)
      if (v.gtin) espelhoPorGtin.set(normKey(v.gtin), v)
    }

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
      // Itens em ruptura ou descontinuados sao descartados: nao serao comprados,
      // entao nao entram nos totais (ficam riscados na tabela).
      const descartado = sItem.status_item === 'ruptura' || sItem.status_item === 'depreciado'

      if (!descartado) {
        totalOriginal += subtotalOriginal
        totalComDescontoItem += subtotalSugerido
        totalBonificacaoUnidades += unidadesBonificadas
      }

      // Cruza com a validacao do espelho (IA): por SKU do lojista, fallback EAN.
      const espelho =
        (itemOriginal?.codigo_produto ? espelhoPorCodigo.get(normKey(itemOriginal.codigo_produto)) : undefined) ||
        (sItem.gtin ? espelhoPorGtin.get(normKey(sItem.gtin)) : undefined)
      const qtdSugeridaFinal = sItem.quantidade_sugerida
      const espelhoStatus = espelho?.status
      const espelhoFaltando = !!espelho && espelhoStatus === 'faltando'
      const temEspelhoItem = !!espelho && !espelhoFaltando
      const espQtd = espelho?.espelho_quantidade ?? null
      const espelhoPreco = espelho?.espelho_preco ?? null

      // REGRA: a conferencia compara o que VOCE PEDIU com o que o FORNECEDOR EDITOU.
      // Se pedido == fornecedor, e OK (confere) MESMO que o espelho traga valor diferente.
      // So e divergencia quando o fornecedor entregou diferente do que voce pediu.
      const fornecedorMudouQtd = qtdOriginal !== qtdSugeridaFinal
      const fornecedorMudouPreco = Math.abs(valorUnitario - valorBase) > 0.001
      const pedidoEncaixaFornecedor = !fornecedorMudouQtd && !fornecedorMudouPreco
      const espelhoConfere = temEspelhoItem && pedidoEncaixaFornecedor && !descartado
      const espelhoDiverge = temEspelhoItem && !pedidoEncaixaFornecedor && !descartado

      // Preco do espelho (venda atual do fornecedor) comparado ao CUSTO (o que o lojista comprava = valorUnitario).
      const espelhoVsCusto = espelhoPreco != null && Math.abs(espelhoPreco - valorUnitario) > 0.001 ? espelhoPreco - valorUnitario : null
      const espelhoVsCustoPct = espelhoVsCusto != null && valorUnitario > 0 ? (espelhoVsCusto / valorUnitario) * 100 : null

      // Texto do hover quando DIVERGE (fornecedor != pedido). Mostra pedido / fornecedor / espelho.
      const espelhoDiffPartes: string[] = []
      if (espelhoFaltando) {
        espelhoDiffPartes.push('Item nao consta no espelho do fornecedor.')
      } else if (espelhoDiverge) {
        if (fornecedorMudouQtd) {
          const dif = qtdSugeridaFinal - qtdOriginal
          let linha = `Quantidade: voce pediu ${qtdOriginal}, fornecedor editou para ${qtdSugeridaFinal} (${dif > 0 ? '+' : ''}${dif})`
          if (espQtd != null) {
            if (espQtd === qtdSugeridaFinal) linha += `; espelho confirma ${espQtd}.`
            else if (espQtd === qtdOriginal) linha += `; mas o espelho registra ${espQtd} (igual ao que voce pediu).`
            else linha += `; e o espelho registra ${espQtd} (difere dos dois).`
          } else linha += '.'
          espelhoDiffPartes.push(linha)
        }
        if (fornecedorMudouPreco) {
          let linha = `Preco: voce comprava por ${formatCurrency(valorUnitario)}, fornecedor editou para ${formatCurrency(valorBase)}`
          if (espelhoPreco != null) {
            if (Math.abs(espelhoPreco - valorBase) < 0.001) linha += `; espelho confirma ${formatCurrency(espelhoPreco)}.`
            else if (Math.abs(espelhoPreco - valorUnitario) < 0.001) linha += `; mas o espelho mostra ${formatCurrency(espelhoPreco)} (igual ao custo).`
            else linha += `; e o espelho mostra ${formatCurrency(espelhoPreco)} (difere dos dois).`
          } else linha += '.'
          espelhoDiffPartes.push(linha)
        }
      }
      const espelhoDiffTexto = espelhoDiffPartes.join('\n')

      // Texto do hover quando CONFERE (explica POR QUE esta OK, citando o espelho se diferir).
      const espelhoConfereTexto = (() => {
        if (!espelhoConfere) return ''
        const partes = [`Voce pediu ${qtdOriginal} e o fornecedor confirmou ${qtdSugeridaFinal} pelo mesmo preco — confere com o seu pedido.`]
        if (espQtd != null && espQtd !== qtdSugeridaFinal) partes.push(`Obs: espelho registra ${espQtd}, mas o acordo com o fornecedor e ${qtdSugeridaFinal}.`)
        if (espelhoPreco != null && Math.abs(espelhoPreco - valorBase) > 0.001) partes.push(`Obs: espelho mostra ${formatCurrency(espelhoPreco)} (acordo: ${formatCurrency(valorBase)}).`)
        return partes.join('\n')
      })()

      return { ...sItem, itemOriginal, valorUnitario, precoSugerido, valorBase, qtdOriginal, valorComDesconto, subtotalOriginal, subtotalSugerido, unidadesBonificadas, descartado, espelho, espelhoStatus, espelhoFaltando, espelhoDiverge, espelhoConfere, espelhoDiffTexto, espelhoConfereTexto, espelhoPreco, espelhoVsCusto, espelhoVsCustoPct }
    })

    const temPrecoSugerido = itensCalculados.some(item => item.precoSugerido != null || item.espelhoVsCusto != null)

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

    // ─── Filtro / busca / paginacao (somente para renderizacao das linhas) ───
    const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim()
    const termo = norm(busca)
    const filtrados = itensCalculados.filter((it) => {
      // busca: SKU lojista, SKU fornecedor, nome, EAN
      if (termo) {
        const skuLojista = norm(it.itemOriginal?.codigo_produto)
        const skuForn = norm(it.codigo_fornecedor) || norm(it.itemOriginal?.codigo_fornecedor)
        const nome = norm(it.itemOriginal?.descricao) + ' ' + norm(it.produto_nome)
        const ean = norm(it.gtin)
        const match = skuLojista.includes(termo) || skuForn.includes(termo) || nome.includes(termo) || ean.includes(termo)
        if (!match) return false
      }
      // filtros (chips). Se nenhum ativo, passa tudo. Se algum ativo, item precisa casar com ALGUM ativo (OR).
      const algumFiltroAtivo = filtros.ruptura || filtros.descontinuado || filtros.alterados
      if (algumFiltroAtivo) {
        const ehRuptura = it.status_item === 'ruptura'
        const ehDescont = it.status_item === 'depreciado'
        const ehAlterado = (it.qtdOriginal !== it.quantidade_sugerida) || (it.precoSugerido != null) || it.status_item === 'divergente'
        const passa = (filtros.ruptura && ehRuptura) || (filtros.descontinuado && ehDescont) || (filtros.alterados && ehAlterado)
        if (!passa) return false
      }
      return true
    })
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina))
    const paginaAtual = Math.min(pagina, totalPaginas)
    const paginados = filtrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)

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

        {/* Barra de busca + filtros */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
              placeholder="Buscar por SKU, cod. fornecedor, nome ou EAN..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none bg-white transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setFiltros(f => ({ ...f, ruptura: !f.ruptura })); setPagina(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtros.ruptura ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Ruptura
            </button>
            <button
              type="button"
              onClick={() => { setFiltros(f => ({ ...f, descontinuado: !f.descontinuado })); setPagina(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtros.descontinuado ? 'bg-gray-200 border-gray-400 text-gray-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Descontinuado
            </button>
            <button
              type="button"
              onClick={() => { setFiltros(f => ({ ...f, alterados: !f.alterados })); setPagina(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtros.alterados ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Alterados
            </button>
            <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {filtrados.length} de {itensCalculados.length}
            </span>
          </div>
        </div>

        {/* Tabela comparativa */}
        <div className="overflow-x-auto scrollbar-flow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-amber-600 uppercase tracking-wider w-28">Conferencia</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Observacao</th>
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
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={temPrecoSugerido ? 13 : 12} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhum item corresponde a busca/filtros
                  </td>
                </tr>
              )}
              {paginados.map((item) => {
                const qtdMudou = item.qtdOriginal !== item.quantidade_sugerida
                return (
                  <tr key={item.id} className={`hover:bg-secondary-50/30 transition-colors ${item.descartado ? 'bg-gray-50/60' : ''}`}>
                    <td className="px-3 py-2.5">
                      {(() => {
                        const s = item.status_item
                        const precoAlterado = item.precoSugerido != null && item.precoSugerido !== item.valorUnitario
                        // Produto trocado pelo fornecedor (prioritario)
                        if (item.is_substituicao) return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700" title={item.observacao_item ? `Motivo da troca: ${item.observacao_item}` : 'Produto trocado pelo fornecedor'}>🔄 Trocado</span>
                        // Status do fornecedor
                        if (s === 'ruptura') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">Ruptura</span>
                        if (s === 'depreciado') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Depreciado</span>
                        if (s === 'divergente') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">Preco desatualizado</span>
                        // Status do lojista: preco sugerido difere do original
                        if (precoAlterado) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700">Preco alterado</span>
                        if (qtdMudou) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">Qtd alterada</span>
                        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">OK</span>
                      })()}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {item.is_novo ? (
                        <ConferenciaHover
                          cor="amber"
                          titulo="Item extra do fornecedor"
                          linhas={[`O fornecedor incluiu este produto, que NAO estava no seu pedido original.`, ...(item.observacao_item ? [`Obs: ${item.observacao_item}`] : [])]}
                          trigger={<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">+ Extra</span>}
                        />
                      ) : item.espelhoFaltando ? (
                        <ConferenciaHover
                          cor="red"
                          titulo="Faltando no espelho"
                          linhas={['Item nao consta no espelho do fornecedor.']}
                          trigger={<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">⚠ Faltando</span>}
                        />
                      ) : item.espelhoDiverge ? (
                        <ConferenciaHover
                          cor="amber"
                          titulo="Fornecedor editou seu pedido"
                          linhas={item.espelhoDiffTexto ? item.espelhoDiffTexto.split('\n') : ['O fornecedor entregou diferente do que voce pediu.']}
                          trigger={<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">⚠ Diverge</span>}
                        />
                      ) : item.espelhoConfere ? (
                        <ConferenciaHover
                          cor="green"
                          titulo="Confere com o seu pedido"
                          linhas={item.espelhoConfereTexto ? item.espelhoConfereTexto.split('\n') : ['O fornecedor confirmou o que voce pediu.']}
                          trigger={<span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600">✓ Confere</span>}
                        />
                      ) : (
                        <span className="text-gray-300 text-[10px]" title="Sem espelho validado para este item">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {item.observacao_item ? (
                        <span className="text-[11px] text-gray-600 leading-tight block break-words">{item.observacao_item}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 max-w-[180px] font-medium" title={item.itemOriginal?.descricao}>
                      {item.is_substituicao && item.produto_nome ? (
                        <div>
                          <span className="line-through text-gray-400 text-xs block truncate">{item.itemOriginal?.descricao}</span>
                          <span className="block text-blue-700 truncate">{item.produto_nome}</span>
                        </div>
                      ) : item.is_novo ? (
                        <span className="text-blue-700 block truncate">{item.produto_nome || `Item #${item.item_pedido_compra_id}`}</span>
                      ) : (
                        <span className="block truncate">{item.itemOriginal?.descricao || `Item #${item.item_pedido_compra_id}`}</span>
                      )}
                      {(item.itemOriginal?.codigo_produto || item.codigo_fornecedor) && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                          {item.itemOriginal?.codigo_produto && <span>SKU: {item.itemOriginal.codigo_produto}</span>}
                          {item.itemOriginal?.codigo_produto && item.codigo_fornecedor && <span> · </span>}
                          {item.codigo_fornecedor && <span>Forn: {item.codigo_fornecedor}</span>}
                        </p>
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
                      {!item.espelhoFaltando && item.espelho?.espelho_quantidade != null && item.espelho.espelho_quantidade !== item.quantidade_sugerida && (
                        <span className="block text-[10px] font-medium text-amber-700 mt-0.5" title="Quantidade no espelho do fornecedor">
                          espelho: {item.espelho.espelho_quantidade}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">{formatCurrency(item.valorUnitario)}</td>
                    {temPrecoSugerido && (
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {item.precoSugerido != null ? (
                          <div>
                            <span className="font-semibold text-secondary-700">{formatCurrency(item.precoSugerido)}</span>
                            {item.valorUnitario > 0 ? (
                              <div className={`text-xs mt-0.5 ${item.precoSugerido < item.valorUnitario ? 'text-green-600' : 'text-red-500'}`}>
                                {item.precoSugerido < item.valorUnitario ? '\u2193' : '\u2191'} {Math.abs(((item.precoSugerido - item.valorUnitario) / item.valorUnitario) * 100).toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-xs mt-0.5 text-blue-500">novo (sem base)</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 tabular-nums" title="Preco mantido pelo fornecedor">{formatCurrency(item.valorUnitario)}</span>
                        )}
                        {item.espelhoPreco != null && item.espelhoVsCusto != null && (
                          <span className="block text-[10px] mt-0.5 leading-tight">
                            <span className="font-medium text-amber-700">espelho: {formatCurrency(item.espelhoPreco)}</span>
                            {item.espelhoVsCusto != null && item.espelhoVsCustoPct != null && (
                              <span className={`block font-semibold ${item.espelhoVsCusto > 0 ? 'text-red-600' : 'text-green-600'}`} title="Preco do espelho comparado ao que voce comprava (custo)">
                                {item.espelhoVsCusto > 0 ? '↑' : '↓'} {Math.abs(item.espelhoVsCustoPct).toFixed(1)}% vs custo
                              </span>
                            )}
                          </span>
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
                    <td className={`px-3 py-2.5 text-right tabular-nums ${item.descartado ? 'text-gray-300 line-through' : 'text-gray-400'}`}>{formatCurrency(item.subtotalOriginal)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {item.descartado ? (
                        <span className="text-gray-300 line-through" title="Item descartado (ruptura/descontinuado) - nao entra no total">{formatCurrency(item.subtotalSugerido)}</span>
                      ) : (
                        <span className="text-green-700">{formatCurrency(item.subtotalSugerido)}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {totalPaginas > 1 && (
          <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500 tabular-nums">
              <span>Pagina {paginaAtual} de {totalPaginas} · {filtrados.length} itens</span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="hidden sm:inline">Ir para</span>
              <input
                type="number"
                min={1}
                max={totalPaginas}
                defaultValue={paginaAtual}
                key={paginaAtual}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (!isNaN(n)) setPagina(Math.min(totalPaginas, Math.max(1, n)))
                }}
                className="w-14 text-center text-sm font-medium text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                aria-label="Ir para pagina"
              />
            </div>
            <button
              type="button"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proxima
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Resumo financeiro */}
        <div className="px-6 py-5 bg-gradient-to-r from-green-50/80 via-emerald-50/50 to-white border-t border-gray-100">
          {itensCalculados.some(i => i.descartado) && (
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span>
                {itensCalculados.filter(i => i.descartado).length} {itensCalculados.filter(i => i.descartado).length === 1 ? 'item descartado' : 'itens descartados'} (ruptura/descontinuado) <span className="line-through">nao contabilizados</span> no total
              </span>
            </div>
          )}
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
                className="w-full sm:w-auto px-7 py-3.5 whitespace-nowrap bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-300/40 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {processandoSugestao ? 'Processando...' : 'Aceitar Sugestao'}
              </ShimmerButton>
              {temEspelho && onValidarEspelho && (
                <button
                  onClick={onValidarEspelho}
                  disabled={validandoEspelho}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 whitespace-nowrap bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-purple-200/50"
                  title="Conferir o espelho do fornecedor com a IA"
                >
                  {validandoEspelho ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {validandoEspelho ? 'Validando...' : 'Revalidar Espelho'}
                </button>
              )}
              {onManterOriginal && (
                <button
                  onClick={onManterOriginal}
                  disabled={processandoSugestao}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 whitespace-nowrap bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
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
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 whitespace-nowrap bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
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
