'use client'

import { useState, useEffect } from 'react'
import { useOnboardingPendente } from '@/hooks/useOnboardingPendente'
import {
  ERP_OPTIONS,
  type ErpUsado,
  type OnboardingStatus,
  type OnboardingSubmitRequest,
} from '@/types/onboarding'

type Step = 'senha' | 'dados' | 'perfil'

/**
 * Modal de onboarding pra LOJISTAS CADASTRADOS POR FORNECEDOR (vinculo invertido).
 * Diferente do OnboardingModal antigo que cobre o cadastro de empresa do zero.
 *
 * Triggers:
 *  - users.senha_provisoria=true → step 'senha' obrigatorio
 *  - empresa sem razao_social ou celular → step 'dados' obrigatorio
 *  - empresa.onboarding_completo_em IS NULL → step 'perfil' opcional ('lembrar amanha')
 */

function LojistaInviteOnboardingModal({
  status,
  obrigatorio,
  onComplete,
  onAdiar,
}: {
  status: OnboardingStatus
  obrigatorio: boolean
  onComplete: () => void
  onAdiar: () => void
}) {
  const steps: Step[] = []
  if (status.precisa_trocar_senha) steps.push('senha')
  if (status.precisa_completar_dados) steps.push('dados')
  if (status.precisa_responder_perfil) steps.push('perfil')

  const [stepIdx, setStepIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [razaoSocial, setRazaoSocial] = useState(status.empresa?.razao_social || '')
  const [nomeFantasia, setNomeFantasia] = useState(status.empresa?.nome_fantasia || '')
  const [celular, setCelular] = useState(status.empresa?.celular_principal || '')
  const [endereco, setEndereco] = useState(status.empresa?.endereco_resumido || '')

  const [erp, setErp] = useState<ErpUsado | ''>(status.empresa?.erp_usado || '')
  const [numColabs, setNumColabs] = useState(status.empresa?.numero_colaboradores?.toString() || '')
  const [numLojas, setNumLojas] = useState(status.empresa?.num_lojas?.toString() || '')
  const [pedidosMes, setPedidosMes] = useState(status.empresa?.pedidos_medio_mes?.toString() || '')

  useEffect(() => {
    setError('')
  }, [stepIdx])

  const currentStep = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1

  const handleNext = async () => {
    setError('')
    setSubmitting(true)
    try {
      const body: OnboardingSubmitRequest = {}

      if (currentStep === 'senha') {
        if (novaSenha.length < 6) {
          setError('Senha deve ter ao menos 6 caracteres')
          setSubmitting(false)
          return
        }
        if (novaSenha !== confirmarSenha) {
          setError('Senhas nao conferem')
          setSubmitting(false)
          return
        }
        body.nova_senha = novaSenha
      } else if (currentStep === 'dados') {
        if (!razaoSocial.trim()) {
          setError('Razao social obrigatoria')
          setSubmitting(false)
          return
        }
        if (!celular.trim()) {
          setError('Celular obrigatorio')
          setSubmitting(false)
          return
        }
        body.razao_social = razaoSocial
        body.nome_fantasia = nomeFantasia
        body.celular_principal = celular
        body.endereco_resumido = endereco
      } else if (currentStep === 'perfil') {
        if (erp) body.erp_usado = erp as ErpUsado
        if (numColabs) body.numero_colaboradores = Number(numColabs)
        if (numLojas) body.num_lojas = Number(numLojas)
        if (pedidosMes) body.pedidos_medio_mes = Number(pedidosMes)
      }

      const res = await fetch('/api/lojista/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSubmitting(false)
        return
      }

      if (isLast) {
        onComplete()
      } else {
        setStepIdx(stepIdx + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdiarPerfil = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/lojista/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adiar_perfil: true }),
      })
      onAdiar()
    } finally {
      setSubmitting(false)
    }
  }

  if (steps.length === 0) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <header className="px-6 py-4 border-b border-gray-100">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-1">
            Etapa {stepIdx + 1} de {steps.length}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentStep === 'senha' && 'Crie sua senha'}
            {currentStep === 'dados' && 'Confirme os dados da empresa'}
            {currentStep === 'perfil' && 'Conte um pouco sobre voce'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentStep === 'senha' && 'Voce esta usando uma senha provisoria. Defina uma nova pra continuar.'}
            {currentStep === 'dados' && 'Esses dados sao usados pra emitir notas e pedidos. Confira antes de continuar.'}
            {currentStep === 'perfil' && 'Ajuda-nos a personalizar a plataforma. Pode pular se quiser.'}
          </p>
        </header>

        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#336FB6] transition-all"
            style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {currentStep === 'senha' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nova senha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Pelo menos 6 caracteres"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Confirme a nova senha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>
            </>
          )}

          {currentStep === 'dados' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={status.empresa?.cnpj || ''}
                  disabled
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Razao social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome fantasia</label>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Celular <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Endereco</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rua X, 123 - Sao Paulo/SP"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>
            </>
          )}

          {currentStep === 'perfil' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Qual ERP voce usa?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ERP_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setErp(opt.value)}
                      className={`px-3 py-2.5 text-sm rounded-lg border transition-all ${
                        erp === opt.value
                          ? 'border-[#336FB6] bg-[#336FB6]/5 text-[#336FB6] font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Funcionarios</label>
                  <input
                    type="number"
                    min="1"
                    value={numColabs}
                    onChange={(e) => setNumColabs(e.target.value)}
                    placeholder="Ex: 5"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Quantas lojas?</label>
                  <input
                    type="number"
                    min="1"
                    value={numLojas}
                    onChange={(e) => setNumLojas(e.target.value)}
                    placeholder="Ex: 1"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Pedidos de compra por mes (em media)
                </label>
                <input
                  type="number"
                  min="0"
                  value={pedidosMes}
                  onChange={(e) => setPedidosMes(e.target.value)}
                  placeholder="Ex: 30"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {currentStep === 'perfil' && !obrigatorio ? (
            <button
              type="button"
              onClick={handleAdiarPerfil}
              disabled={submitting}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Lembrar amanha
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-[#336FB6] hover:bg-[#2660A5] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : isLast ? 'Concluir' : 'Continuar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

/**
 * Gate global pra disparar o modal de onboarding pos-login do lojista_lp.
 * Usado dentro de DashboardLayout.
 */
export function LojistaInviteOnboardingGate() {
  const { status, deveAbrir, obrigatorio, refresh, marcarAdiadoHoje } = useOnboardingPendente()

  if (!status || !deveAbrir) return null

  return (
    <LojistaInviteOnboardingModal
      status={status}
      obrigatorio={obrigatorio}
      onComplete={refresh}
      onAdiar={() => {
        marcarAdiadoHoje()
        refresh()
      }}
    />
  )
}
