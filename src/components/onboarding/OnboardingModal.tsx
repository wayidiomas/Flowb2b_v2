'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingModalProps {
  onComplete: () => void
}

interface Fornecedor {
  id: number
  nome: string
  nome_fantasia: string | null
  logotipo?: string | null
  total_itens?: number
}

type Step = 1 | 2 | 3

// ---------------------------------------------------------------------------
// CNPJ mask helper
// ---------------------------------------------------------------------------

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function stripCNPJ(value: string): string {
  return value.replace(/\D/g, '')
}

// ---------------------------------------------------------------------------
// Segmento options
// ---------------------------------------------------------------------------

const SEGMENTOS = [
  { value: 'Pet Shop', label: 'Pet Shop' },
  { value: 'Agropecuaria', label: 'Agropecuaria' },
  { value: 'Farmacia', label: 'Farmacia' },
  { value: 'Distribuidor', label: 'Distribuidor' },
  { value: 'Outro', label: 'Outro' },
]

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function BlingIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StoreIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21V13h6v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BuildingIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: Step
  totalSteps: number
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep
        return (
          <div
            key={step}
            className={`
              h-2 rounded-full transition-all duration-300
              ${isActive ? 'w-8 bg-primary-600' : isCompleted ? 'w-2 bg-primary-400' : 'w-2 bg-gray-200'}
            `}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({
  onSelectBling,
}: {
  onSelectBling: (usesBling: boolean) => void
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Heading */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        Bem-vindo ao FlowB2B!
      </h1>
      <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-md">
        Vamos configurar sua conta em poucos passos
      </p>

      {/* Question */}
      <p className="text-sm font-medium text-gray-700 mb-4 uppercase tracking-wide">
        Voce utiliza o ERP Bling?
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {/* Card: Uses Bling */}
        <button
          type="button"
          onClick={() => onSelectBling(true)}
          className="
            group relative flex flex-col items-center gap-3
            p-6 rounded-xl border-2 border-gray-200
            bg-white hover:border-primary-500 hover:bg-primary-50/50
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          "
        >
          <div className="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <BlingIcon className="w-7 h-7" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-base">
              Sim, uso o Bling
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Vou conectar meu ERP Bling para sincronizar dados
            </p>
          </div>
        </button>

        {/* Card: Doesn't use Bling */}
        <button
          type="button"
          onClick={() => onSelectBling(false)}
          className="
            group relative flex flex-col items-center gap-3
            p-6 rounded-xl border-2 border-gray-200
            bg-white hover:border-secondary-500 hover:bg-secondary-50/50
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2
          "
        >
          <div className="w-14 h-14 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center group-hover:bg-secondary-200 transition-colors">
            <StoreIcon className="w-7 h-7" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-base">
              Nao uso o Bling
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Quero usar o FlowB2B de forma independente
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Create Empresa
// ---------------------------------------------------------------------------

function StepEmpresa({
  onBack,
  onSubmit,
  loading,
  error,
}: {
  onBack: () => void
  onSubmit: (data: {
    nome_fantasia: string
    cnpj: string
    segmento: string
  }) => void
  loading: boolean
  error: string | null
}) {
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [segmento, setSegmento] = useState('')
  const [touched, setTouched] = useState({
    nomeFantasia: false,
    cnpj: false,
    segmento: false,
  })

  const cnpjDigits = stripCNPJ(cnpj)
  const isValid =
    nomeFantasia.trim().length > 0 &&
    cnpjDigits.length === 14 &&
    segmento.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ nomeFantasia: true, cnpj: true, segmento: true })
    if (!isValid) return
    onSubmit({
      nome_fantasia: nomeFantasia.trim(),
      cnpj: cnpjDigits,
      segmento,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
          <BuildingIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Cadastre sua empresa
          </h2>
          <p className="text-sm text-gray-500">
            Preencha os dados para criar seu espaco de trabalho
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <Input
          label="Nome fantasia"
          placeholder="Ex: Duub Pets"
          value={nomeFantasia}
          onChange={(e) => setNomeFantasia(e.target.value)}
          onBlur={() =>
            setTouched((prev) => ({ ...prev, nomeFantasia: true }))
          }
          error={
            touched.nomeFantasia && !nomeFantasia.trim()
              ? 'Nome fantasia e obrigatorio'
              : undefined
          }
          required
        />

        <Input
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
          onBlur={() => setTouched((prev) => ({ ...prev, cnpj: true }))}
          error={
            touched.cnpj && cnpjDigits.length > 0 && cnpjDigits.length < 14
              ? 'CNPJ deve ter 14 digitos'
              : touched.cnpj && cnpjDigits.length === 0
                ? 'CNPJ e obrigatorio'
                : undefined
          }
          maxLength={18}
          inputMode="numeric"
          required
        />

        {/* Segmento select */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Segmento
          </label>
          <select
            value={segmento}
            onChange={(e) => setSegmento(e.target.value)}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, segmento: true }))
            }
            className={`
              block w-full
              px-3.5 py-2.5
              text-base text-gray-900
              bg-white
              border rounded-lg
              shadow-xs
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-0
              appearance-none
              ${
                touched.segmento && !segmento
                  ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }
            `}
            required
          >
            <option value="" disabled>
              Selecione o segmento
            </option>
            {SEGMENTOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {touched.segmento && !segmento && (
            <p className="mt-1.5 text-sm text-error-500">
              Segmento e obrigatorio
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Voltar
        </button>
        <Button type="submit" loading={loading} disabled={!isValid}>
          Continuar
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Select Fornecedores
// ---------------------------------------------------------------------------

function StepFornecedores({
  onSubmit,
  onSkip,
  loading,
  error,
}: {
  onSubmit: (ids: number[]) => void
  onSkip: () => void
  loading: boolean
  error: string | null
}) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchFornecedores() {
      try {
        setFetchLoading(true)
        setFetchError(null)
        const res = await fetch('/api/onboarding/fornecedores')
        if (!res.ok) throw new Error('Erro ao carregar fornecedores')
        const data = await res.json()
        if (!cancelled) {
          setFornecedores(data.fornecedores ?? data ?? [])
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : 'Erro ao carregar fornecedores'
          )
        }
      } finally {
        if (!cancelled) setFetchLoading(false)
      }
    }
    fetchFornecedores()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleFornecedor = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return fornecedores
    const q = search.toLowerCase()
    return fornecedores.filter(
      (f) =>
        f.nome?.toLowerCase().includes(q) ||
        f.nome_fantasia?.toLowerCase().includes(q)
    )
  }, [fornecedores, search])

  const handleSubmit = () => {
    if (selectedIds.size === 0) return
    onSubmit(Array.from(selectedIds))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Selecione seus fornecedores
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Escolha os fornecedores com quem voce trabalha para solicitar acesso
          ao catalogo
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <SearchIcon className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Buscar fornecedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            block w-full
            pl-10 pr-4 py-2.5
            text-sm text-gray-900
            placeholder:text-gray-400
            bg-gray-50
            border border-gray-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            transition-colors
          "
        />
      </div>

      {/* Selected count */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary-50 border border-primary-200">
          <CheckIcon className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-medium text-primary-700">
            {selectedIds.size}{' '}
            {selectedIds.size === 1
              ? 'fornecedor selecionado'
              : 'fornecedores selecionados'}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-0 max-h-[340px]">
        {fetchLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-600 mb-2">{fetchError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-primary-600 hover:underline font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              {search
                ? 'Nenhum fornecedor encontrado para esta busca'
                : 'Nenhum fornecedor disponivel no momento'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((f) => {
              const isSelected = selectedIds.has(f.id)
              const displayName = f.nome_fantasia || f.nome
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFornecedor(f.id)}
                  className={`
                    group relative flex items-center gap-3
                    p-4 rounded-xl border-2 text-left
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
                    ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/60 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  {/* Avatar / Logo */}
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      text-sm font-bold uppercase
                      transition-colors duration-200
                      ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }
                    `}
                  >
                    {f.logotipo ? (
                      <img
                        src={f.logotipo}
                        alt={displayName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      displayName.slice(0, 2)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    {f.total_itens != null && f.total_itens > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {f.total_itens}{' '}
                        {f.total_itens === 1 ? 'item' : 'itens'}
                      </p>
                    )}
                  </div>

                  {/* Check */}
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-3 h-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          Pular
        </button>
        <Button
          type="button"
          onClick={handleSubmit}
          loading={loading}
          disabled={selectedIds.size === 0}
          className="!bg-secondary-500 hover:!bg-secondary-600 focus:!ring-secondary-500"
        >
          Solicitar e Finalizar
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main OnboardingModal
// ---------------------------------------------------------------------------

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [usesBling, setUsesBling] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Step 1 handler
  const handleSelectBling = (uses: boolean) => {
    setUsesBling(uses)
    setStep(2)
  }

  // Step 2 handler
  const handleCreateEmpresa = async (data: {
    nome_fantasia: string
    cnpj: string
    segmento: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/onboarding/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, segmento: data.segmento ? [data.segmento] : null, usa_bling: usesBling }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          body.error || body.message || 'Erro ao cadastrar empresa'
        )
      }

      if (usesBling) {
        // Bling user: finish onboarding and redirect to sync config
        onComplete()
        window.location.href = '/configuracoes/sync'
      } else {
        // Non-Bling user: go to step 3
        setStep(3)
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao cadastrar empresa'
      )
    } finally {
      setLoading(false)
    }
  }

  // Step 3 handler
  const handleSolicitarCatalogos = async (ids: number[]) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/onboarding/solicitar-catalogos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogo_ids: ids }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          body.error || body.message || 'Erro ao solicitar catalogos'
        )
      }

      onComplete()
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao solicitar catalogos'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSkipFornecedores = () => {
    onComplete()
  }

  // Determine total steps based on Bling choice
  const totalSteps = usesBling === false ? 3 : usesBling === true ? 2 : 3

  // Card width: wider for step 3
  const cardMaxWidth = step === 3 ? 'max-w-4xl' : 'max-w-2xl'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-500/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-secondary-500/5 blur-3xl" />
      </div>

      {/* Card */}
      <div
        className={`
          relative w-full ${cardMaxWidth}
          bg-white rounded-2xl shadow-2xl
          transition-all duration-300 ease-in-out
          overflow-hidden
        `}
      >
        {/* Top header with logo */}
        <div className="w-full bg-gradient-to-r from-[#1a4b8c] via-[#336FB6] to-[#2660A5] px-6 py-8 flex items-center justify-center">
          <img src="/assets/branding/logo-white.png" alt="FlowB2B" className="h-14 sm:h-16" />
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {step === 1 && <StepWelcome onSelectBling={handleSelectBling} />}
          {step === 2 && (
            <StepEmpresa
              onBack={() => {
                setStep(1)
                setUsesBling(null)
                setError(null)
              }}
              onSubmit={handleCreateEmpresa}
              loading={loading}
              error={error}
            />
          )}
          {step === 3 && (
            <StepFornecedores
              onSubmit={handleSolicitarCatalogos}
              onSkip={handleSkipFornecedores}
              loading={loading}
              error={error}
            />
          )}
        </div>

        {/* Step indicator */}
        <div className="pb-6">
          <StepIndicator currentStep={step} totalSteps={totalSteps} />
        </div>
      </div>
    </div>
  )
}
