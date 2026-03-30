'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface ValidacaoItemResult {
  status: 'ok' | 'divergencia' | 'faltando' | 'extra'
  status_manual?: 'ok' | 'divergencia' | 'faltando' | 'extra' | 'ignorado' | null
  item_pedido?: {
    codigo: string | null
    descricao: string | null
    quantidade: number
    valor: number | null
    gtin: string | null
  }
  item_espelho?: {
    codigo: string | null
    nome: string | null
    quantidade: number | null
    preco_unitario: number | null
    total: number | null
  }
  diferencas?: string[]
  observacao_item?: string
}

interface ValidacaoResult {
  resumo: {
    total_pedido: number
    total_espelho: number
    ok: number
    divergencias: number
    faltando: number
    extras: number
  }
  itens: ValidacaoItemResult[]
}

interface PedidoInfo {
  numero: string
  fornecedor: string
}

interface EspelhoInfo {
  espelho_url: string | null
  espelho_nome: string | null
  espelho_status: string | null
  espelho_enviado_em: string | null
  prazo_entrega_fornecedor: string | null
}

export default function ValidacaoEspelhoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pedidoId } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  // Page state
  const [loading, setLoading] = useState(true)
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null)
  const [espelhoInfo, setEspelhoInfo] = useState<EspelhoInfo | null>(null)
  const [validacaoResult, setValidacaoResult] = useState<ValidacaoResult | null>(null)
  const [validacaoItens, setValidacaoItens] = useState<ValidacaoItemResult[]>([])
  const [validacaoObservacao, setValidacaoObservacao] = useState('')
  const [validandoEspelho, setValidandoEspelho] = useState(false)
  const [salvandoValidacao, setSalvandoValidacao] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load pedido info
  const fetchPedidoInfo = useCallback(async () => {
    if (!user?.empresa_id) return
    try {
      const { data, error } = await supabase.rpc('flowb2b_get_pedido_compra_detalhes', {
        p_pedido_id: parseInt(pedidoId),
        p_empresa_id: user.empresa_id
      })
      if (error) throw error
      const pedido = Array.isArray(data) ? data[0] : data
      if (pedido) {
        setPedidoInfo({
          numero: pedido.numero || pedidoId,
          fornecedor: pedido.fornecedor_nome || 'Fornecedor',
        })
      }
    } catch {
      // Fallback - will just show pedidoId
    }
  }, [pedidoId, user?.empresa_id])

  // Load espelho info
  const fetchEspelhoInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedidos-compra/${pedidoId}/espelho`)
      if (res.ok) {
        const data = await res.json()
        setEspelhoInfo(data)
      }
    } catch {
      // espelho may not exist
    }
  }, [pedidoId])

  // Load saved validation
  const fetchValidacao = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedidos-compra/${pedidoId}/espelho/validacao`)
      if (!res.ok) return

      const data = await res.json()
      if (data.exists) {
        const itensFormatados: ValidacaoItemResult[] = (data.itens || []).map((item: Record<string, unknown>) => ({
          status: (item.status_ia as string) || 'ok',
          status_manual: (item.status_manual as string) || (item.status_ia as string) || null,
          item_pedido: item.item_pedido_descricao ? {
            codigo: item.item_pedido_codigo as string | null,
            descricao: item.item_pedido_descricao as string | null,
            quantidade: (item.item_pedido_quantidade as number) || 0,
            valor: item.item_pedido_valor as number | null,
            gtin: item.item_pedido_gtin as string | null,
          } : undefined,
          item_espelho: item.item_espelho_nome ? {
            codigo: item.item_espelho_codigo as string | null,
            nome: item.item_espelho_nome as string | null,
            quantidade: item.item_espelho_quantidade as number | null,
            preco_unitario: item.item_espelho_preco as number | null,
            total: null,
          } : undefined,
          diferencas: item.diferencas as string[] | undefined,
          observacao_item: item.observacao_item as string | undefined,
        }))

        setValidacaoResult({
          resumo: {
            total_pedido: data.validacao.total_ok + data.validacao.total_divergencias + data.validacao.total_faltando,
            total_espelho: data.validacao.total_ok + data.validacao.total_divergencias + data.validacao.total_extras,
            ok: data.validacao.total_ok,
            divergencias: data.validacao.total_divergencias,
            faltando: data.validacao.total_faltando,
            extras: data.validacao.total_extras,
          },
          itens: itensFormatados,
        })
        setValidacaoItens(itensFormatados)
        setValidacaoObservacao(data.validacao.observacao || '')
      }
    } catch {
      // validation may not exist yet
    }
  }, [pedidoId])

  // Initial load
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      await Promise.all([fetchPedidoInfo(), fetchEspelhoInfo(), fetchValidacao()])
      setLoading(false)
    }
    loadAll()
  }, [fetchPedidoInfo, fetchEspelhoInfo, fetchValidacao])

  // Run AI validation
  const handleValidarEspelho = async () => {
    if (validacaoItens.length > 0) {
      if (!confirm('Ja existe uma validacao. Rodar a IA novamente vai substituir os resultados atuais. Continuar?')) return
    }
    setValidandoEspelho(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedidoId}/espelho/validar`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setValidacaoResult(data)
        setValidacaoItens(data.itens.map((item: ValidacaoItemResult) => ({
          ...item,
          status_manual: item.status,
        })))
        setValidacaoObservacao('')
        setSavedSuccess(false)
      } else {
        setErrorMsg(data.error || 'Erro ao validar espelho')
      }
    } catch {
      setErrorMsg('Erro ao validar espelho. Tente novamente.')
    } finally {
      setValidandoEspelho(false)
    }
  }

  // Save validation
  const handleSalvarValidacao = async () => {
    setSalvandoValidacao(true)
    setErrorMsg(null)
    setSavedSuccess(false)
    try {
      const res = await fetch(`/api/pedidos-compra/${pedidoId}/espelho/validacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'validado',
          observacao: validacaoObservacao,
          itens: validacaoItens.map(item => ({
            status_ia: item.status,
            status_manual: item.status_manual || item.status,
            item_pedido_codigo: item.item_pedido?.codigo,
            item_pedido_descricao: item.item_pedido?.descricao,
            item_pedido_quantidade: item.item_pedido?.quantidade,
            item_pedido_valor: item.item_pedido?.valor,
            item_pedido_gtin: item.item_pedido?.gtin,
            item_espelho_codigo: item.item_espelho?.codigo,
            item_espelho_nome: item.item_espelho?.nome,
            item_espelho_quantidade: item.item_espelho?.quantidade,
            item_espelho_preco: item.item_espelho?.preco_unitario,
            diferencas: item.diferencas,
            observacao_item: item.observacao_item,
          })),
        }),
      })
      if (res.ok) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Erro ao salvar validacao')
      }
    } catch {
      setErrorMsg('Erro ao salvar validacao. Tente novamente.')
    } finally {
      setSalvandoValidacao(false)
    }
  }

  // Compute dynamic summary from current items
  const manualResumo = {
    ok: validacaoItens.filter(i => (i.status_manual || i.status) === 'ok').length,
    divergencias: validacaoItens.filter(i => (i.status_manual || i.status) === 'divergencia').length,
    faltando: validacaoItens.filter(i => (i.status_manual || i.status) === 'faltando').length,
    extras: validacaoItens.filter(i => (i.status_manual || i.status) === 'extra').length,
    ignorados: validacaoItens.filter(i => i.status_manual === 'ignorado').length,
  }

  // Sort items: divergencias first, then faltando, extra, ok, ignorado
  const sortedItens = [...validacaoItens]
    .map((item, originalIdx) => ({ ...item, _idx: originalIdx }))
    .sort((a, b) => {
      const order: Record<string, number> = { divergencia: 0, faltando: 1, extra: 2, ok: 3, ignorado: 4 }
      const statusA = (a.status_manual || a.status) as string
      const statusB = (b.status_manual || b.status) as string
      return (order[statusA] ?? 5) - (order[statusB] ?? 5)
    })

  const hasValidation = validacaoItens.length > 0
  const hasEspelho = !!espelhoInfo?.espelho_url

  return (
    <RequirePermission permission="pedidos">
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Top row: back link + title */}
            <div className="flex items-center gap-4 py-4">
              <Link
                href={`/compras/pedidos/${pedidoId}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Voltar ao pedido
              </Link>
              <div className="h-6 w-px bg-gray-200 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  Validacao do Espelho {pedidoInfo ? `- Pedido #${pedidoInfo.numero}` : ''}
                </h1>
                {pedidoInfo?.fornecedor && (
                  <p className="text-sm text-gray-500 truncate">{pedidoInfo.fornecedor}</p>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between gap-4 pb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Run AI button */}
                <button
                  onClick={handleValidarEspelho}
                  disabled={validandoEspelho || !hasEspelho}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!hasEspelho ? 'Nenhum espelho enviado' : ''}
                >
                  {validandoEspelho ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                      Rodar IA
                    </>
                  )}
                </button>

                {/* View espelho button */}
                {hasEspelho && (
                  <>
                    <button
                      onClick={() => router.push(`/compras/pedidos/${pedidoId}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-primary-300 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ver espelho
                    </button>
                    <a
                      href={`/api/pedidos-compra/${pedidoId}/espelho/download`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </a>
                  </>
                )}
              </div>

              {/* Save button */}
              {hasValidation && (
                <button
                  onClick={handleSalvarValidacao}
                  disabled={salvandoValidacao}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {salvandoValidacao ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                      Salvar validacao
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Summary badges */}
            {hasValidation && (
              <div className="flex flex-wrap items-center gap-2 pb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {manualResumo.ok} OK
                </span>
                {manualResumo.divergencias > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {manualResumo.divergencias} Divergencias
                  </span>
                )}
                {manualResumo.faltando > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {manualResumo.faltando} Faltando
                  </span>
                )}
                {manualResumo.extras > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    + {manualResumo.extras} Extras
                  </span>
                )}
                {manualResumo.ignorados > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                    {manualResumo.ignorados} Ignorados
                  </span>
                )}
                {validacaoResult && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Pedido: {validacaoResult.resumo.total_pedido} itens | Espelho: {validacaoResult.resumo.total_espelho} itens
                  </span>
                )}
              </div>
            )}

            {/* Success / Error messages */}
            {savedSuccess && (
              <div className="pb-4">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Validacao salva com sucesso!
                </div>
              </div>
            )}
            {errorMsg && (
              <div className="pb-4">
                <div className="flex items-center justify-between gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {errorMsg}
                  </div>
                  <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            /* Loading skeleton */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-8 flex flex-col items-center justify-center gap-3">
                <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-gray-500">Carregando validacao...</p>
              </div>
            </div>
          ) : !hasEspelho ? (
            /* No espelho state */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Nenhum espelho enviado</h3>
                  <p className="text-sm text-gray-500 mt-1">O fornecedor ainda nao enviou o espelho deste pedido. A validacao so pode ser feita apos o envio.</p>
                </div>
                <Link
                  href={`/compras/pedidos/${pedidoId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors mt-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Voltar ao pedido
                </Link>
              </div>
            </div>
          ) : !hasValidation ? (
            /* No validation yet - prompt to run AI */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Espelho disponivel para validacao</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    O espelho <span className="font-medium text-gray-700">{espelhoInfo?.espelho_nome || 'do pedido'}</span> foi recebido.
                    Use a IA para comparar automaticamente com os itens do pedido.
                  </p>
                </div>
                <button
                  onClick={handleValidarEspelho}
                  disabled={validandoEspelho}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 mt-2 shadow-lg shadow-purple-200/50"
                >
                  {validandoEspelho ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validando com IA...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                      Rodar validacao IA
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Full-width validation table */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3.5 text-left min-w-[220px]">Produto (Pedido)</th>
                      <th className="px-4 py-3.5 text-left min-w-[220px]">Produto (Espelho)</th>
                      <th className="px-4 py-3.5 text-center min-w-[80px]">Qtd Ped.</th>
                      <th className="px-4 py-3.5 text-center min-w-[80px]">Qtd Esp.</th>
                      <th className="px-4 py-3.5 text-right min-w-[100px]">Preco Ped.</th>
                      <th className="px-4 py-3.5 text-right min-w-[100px]">Preco Esp.</th>
                      <th className="px-4 py-3.5 text-left min-w-[180px]">Diferencas</th>
                      <th className="px-4 py-3.5 text-left min-w-[140px]">Status</th>
                      <th className="px-4 py-3.5 text-left min-w-[160px]">Obs. Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedItens.map((item) => {
                      const effectiveStatus = (item.status_manual || item.status) as string
                      const isChangedFromAI = item.status_manual != null && item.status_manual !== item.status
                      return (
                        <tr key={item._idx} className={
                          effectiveStatus === 'ok' ? 'bg-white hover:bg-gray-50/50' :
                          effectiveStatus === 'divergencia' ? 'bg-amber-50/60 hover:bg-amber-50' :
                          effectiveStatus === 'faltando' ? 'bg-red-50/60 hover:bg-red-50' :
                          effectiveStatus === 'extra' ? 'bg-blue-50/60 hover:bg-blue-50' :
                          'bg-gray-50/60 hover:bg-gray-100/50'
                        }>
                          <td className="px-4 py-3 text-sm">
                            {item.item_pedido ? (
                              <div>
                                <p className="font-medium text-gray-900">{item.item_pedido.descricao}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.item_pedido.gtin || item.item_pedido.codigo || '-'}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.item_espelho ? (
                              <div>
                                <p className="font-medium text-gray-900">{item.item_espelho.nome}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.item_espelho.codigo || '-'}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-medium">{item.item_pedido?.quantidade ?? '-'}</td>
                          <td className="px-4 py-3 text-sm text-center font-medium">{item.item_espelho?.quantidade ?? '-'}</td>
                          <td className="px-4 py-3 text-sm text-right">{item.item_pedido?.valor != null ? `R$ ${item.item_pedido.valor.toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 text-sm text-right">{item.item_espelho?.preco_unitario != null ? `R$ ${item.item_espelho.preco_unitario.toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.diferencas && item.diferencas.length > 0 ? (
                              <ul className="list-disc list-inside space-y-0.5">
                                {item.diferencas.map((dif, idx) => (
                                  <li key={idx}>{dif}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={effectiveStatus}
                                onChange={(e) => {
                                  const newItens = [...validacaoItens]
                                  newItens[item._idx] = {
                                    ...newItens[item._idx],
                                    status_manual: e.target.value as ValidacaoItemResult['status_manual'],
                                  }
                                  setValidacaoItens(newItens)
                                }}
                                className={`text-xs border rounded-lg px-2.5 py-2 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none cursor-pointer ${
                                  effectiveStatus === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                                  effectiveStatus === 'divergencia' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                                  effectiveStatus === 'faltando' ? 'border-red-300 bg-red-50 text-red-700' :
                                  effectiveStatus === 'extra' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                                  'border-gray-300 bg-gray-50 text-gray-600'
                                }`}
                              >
                                <option value="ok">OK</option>
                                <option value="divergencia">Diverge</option>
                                <option value="faltando">Faltando</option>
                                <option value="extra">+ Extra</option>
                                <option value="ignorado">Ignorar</option>
                              </select>
                              {!isChangedFromAI && (
                                <span className="text-[10px] font-medium text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded" title="Status sugerido pela IA">IA</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Obs..."
                              value={item.observacao_item || ''}
                              onChange={(e) => {
                                const newItens = [...validacaoItens]
                                newItens[item._idx] = {
                                  ...newItens[item._idx],
                                  observacao_item: e.target.value,
                                }
                                setValidacaoItens(newItens)
                              }}
                              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full min-w-[140px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer: global observation + save */}
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Observacoes gerais</label>
                    <textarea
                      placeholder="Observacoes gerais sobre a validacao..."
                      value={validacaoObservacao}
                      onChange={(e) => setValidacaoObservacao(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none bg-white"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs text-gray-500 max-w-[200px]">
                      Ajuste o status de cada item se a IA errou. Clique em Salvar para registrar.
                    </p>
                    <button
                      onClick={handleSalvarValidacao}
                      disabled={salvandoValidacao}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-lg shadow-primary-200/50 whitespace-nowrap"
                    >
                      {salvandoValidacao ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                          </svg>
                          Salvar validacao
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
    </RequirePermission>
  )
}
