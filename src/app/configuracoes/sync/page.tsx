'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// Etapas da sincronizacao
const SYNC_STEPS = [
  { key: 'produtos', label: 'Produtos', icon: '📦', description: 'Sincronizando catalogo de produtos' },
  { key: 'fornecedores', label: 'Fornecedores', icon: '🏭', description: 'Sincronizando fornecedores' },
  { key: 'estoque', label: 'Estoque', icon: '📊', description: 'Sincronizando saldos de estoque' },
  { key: 'pedidos_venda', label: 'Pedidos de Venda', icon: '🛒', description: 'Sincronizando pedidos de venda' },
  { key: 'pedidos_compra', label: 'Pedidos de Compra', icon: '📋', description: 'Sincronizando pedidos de compra' },
  { key: 'notas_fiscais', label: 'Notas Fiscais', icon: '📄', description: 'Sincronizando notas fiscais' },
]

interface SyncStatus {
  success: boolean
  source?: string
  empresa_id?: number
  empresa_nome?: string
  bling_connected?: boolean
  bling_expires_at?: string
  status?: 'idle' | 'syncing' | 'completed' | 'error'
  current_step?: string
  progress?: number
  error?: string
  recent_jobs?: Array<{
    id: number
    status: string
    step: string
    created_at: string
    updated_at: string
    error_count: number
  }>
}

// Icones
function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  )
}

function SyncStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const empresaId = searchParams.get('empresa_id')
  const successMessage = searchParams.get('success')

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(!!successMessage)

  const fetchStatus = useCallback(async () => {
    if (!empresaId) {
      setError('empresa_id nao informado')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/sync/status?empresa_id=${empresaId}`)
      const data = await response.json()

      if (data.success) {
        setSyncStatus(data)
        setError(null)
      } else {
        setError(data.error || 'Erro ao buscar status')
      }
    } catch (err) {
      console.error('Erro ao buscar status:', err)
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  // Buscar status inicial e fazer polling
  useEffect(() => {
    fetchStatus()

    // Polling a cada 5 segundos enquanto estiver sincronizando
    const interval = setInterval(() => {
      if (syncStatus?.status === 'syncing' || syncStatus?.status === 'idle') {
        fetchStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchStatus, syncStatus?.status])

  // Esconder mensagem de sucesso apos 5 segundos
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const handleRetrySync = async () => {
    if (!empresaId) return

    setLoading(true)
    try {
      const response = await fetch('/api/sync/first-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: parseInt(empresaId) }),
      })

      if (response.ok) {
        fetchStatus()
      } else {
        const data = await response.json()
        setError(data.error || 'Erro ao reiniciar sincronizacao')
      }
    } catch (err) {
      console.error('Erro ao reiniciar sync:', err)
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'syncing':
        return 'Sincronizando'
      case 'completed':
        return 'Concluido'
      case 'error':
        return 'Erro'
      default:
        return 'Aguardando'
    }
  }

  if (!empresaId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <ErrorIcon />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Empresa nao informada</h2>
          <p className="text-gray-600 mb-4">
            Selecione uma empresa para visualizar o status da sincronizacao.
          </p>
          <Link
            href="/cadastros/empresas"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            <ArrowLeftIcon />
            Ir para Empresas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/cadastros/empresas"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon />
            Voltar para Empresas
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Sincronizacao com Bling</h1>
          {syncStatus?.empresa_nome && (
            <p className="text-gray-600">{syncStatus.empresa_nome}</p>
          )}
        </div>

        {/* Mensagem de sucesso */}
        {showSuccess && successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <div className="text-green-500 shrink-0">
              <CheckIcon />
            </div>
            <div>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Card de Status Principal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Logo Bling */}
                <div className="w-12 h-12 bg-[#2660A5] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Status da Sincronizacao</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        syncStatus?.status
                      )}`}
                    >
                      {syncStatus?.status === 'syncing' && <SpinnerIcon />}
                      {syncStatus?.status === 'completed' && <CheckIcon />}
                      {syncStatus?.status === 'error' && <ErrorIcon />}
                      <span className="ml-1">{getStatusLabel(syncStatus?.status)}</span>
                    </span>
                    {syncStatus?.bling_connected && (
                      <span className="text-xs text-green-600">Bling conectado</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={fetchStatus}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshIcon />
                Atualizar
              </button>
            </div>
          </div>

          {/* Conteudo */}
          <div className="p-6">
            {loading && !syncStatus ? (
              <div className="flex items-center justify-center py-8">
                <SpinnerIcon />
                <span className="ml-2 text-gray-600">Carregando...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-2">
                  <ErrorIcon />
                </div>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  <RefreshIcon />
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                {/* Etapa atual */}
                {syncStatus?.current_step && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Etapa atual:</span> {syncStatus.current_step}
                    </p>
                    {syncStatus.progress !== null && syncStatus.progress !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${syncStatus.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{syncStatus.progress}%</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Erro */}
                {syncStatus?.error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <span className="font-medium">Erro:</span> {syncStatus.error}
                    </p>
                    <button
                      onClick={handleRetrySync}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      <RefreshIcon />
                      Tentar novamente
                    </button>
                  </div>
                )}

                {/* Lista de etapas */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Etapas da sincronizacao</h3>
                  {SYNC_STEPS.map((step, index) => {
                    const isCurrentStep = syncStatus?.current_step?.toLowerCase().includes(step.key)
                    const isPastStep = syncStatus?.status === 'completed' ||
                      (syncStatus?.current_step && SYNC_STEPS.findIndex(s =>
                        syncStatus.current_step?.toLowerCase().includes(s.key)
                      ) > index)

                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isCurrentStep
                            ? 'bg-blue-50 border-blue-200'
                            : isPastStep
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-2xl">{step.icon}</div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            isCurrentStep ? 'text-blue-900' : isPastStep ? 'text-green-900' : 'text-gray-700'
                          }`}>
                            {step.label}
                          </p>
                          <p className={`text-sm ${
                            isCurrentStep ? 'text-blue-600' : isPastStep ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isCurrentStep && <SpinnerIcon />}
                          {isPastStep && !isCurrentStep && (
                            <div className="text-green-500">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Botao para dashboard quando concluido */}
                {syncStatus?.status === 'completed' && (
                  <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                    <p className="text-green-600 font-medium mb-4">
                      Sincronizacao concluida com sucesso!
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                    >
                      Ir para o Dashboard
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Jobs recentes */}
        {syncStatus?.recent_jobs && syncStatus.recent_jobs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Historico recente</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {syncStatus.recent_jobs.map((job) => (
                <div key={job.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.step || 'Job'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(job.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : job.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : job.status === 'processing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Loading fallback para Suspense
function SyncStatusLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-2">
        <SpinnerIcon />
        <span className="text-gray-600">Carregando...</span>
      </div>
    </div>
  )
}

// Componente principal exportado com Suspense
export default function SyncStatusPage() {
  return (
    <Suspense fallback={<SyncStatusLoading />}>
      <SyncStatusContent />
    </Suspense>
  )
}
