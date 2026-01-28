'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface BlingRevokeModalProps {
  isOpen: boolean
  empresaId: number | null
}

export function BlingRevokeModal({ isOpen, empresaId }: BlingRevokeModalProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleReauthorize = () => {
    setLoading(true)
    // Redirecionar para OAuth com flag revoke=true
    const url = empresaId
      ? `/api/auth/bling/connect?empresaId=${empresaId}&revoke=true`
      : '/api/auth/bling/connect?revoke=true'
    window.location.href = url
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop escuro - bloqueia tudo */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white shadow-2xl">
          {/* Decoracao de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            {/* Logo FlowB2B */}
            <div className="mb-6">
              <Image
                src="/assets/branding/logo-white.png"
                alt="FlowB2B"
                width={160}
                height={50}
                className="object-contain"
              />
            </div>

            {/* Icone de alerta */}
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            {/* Titulo e mensagem */}
            <h2 className="text-2xl font-bold mb-3">Reautorizacao do Bling necessaria</h2>
            <p className="text-white/80 mb-6 leading-relaxed">
              Atualizamos a integracao com o Bling para incluir novas funcionalidades.
              Por favor, reautorize o acesso para continuar utilizando o sistema normalmente.
            </p>

            {/* O que vai acontecer */}
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-white/90 mb-2">Ao reautorizar:</p>
              <ul className="space-y-1 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Voce sera redirecionado para o Bling
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Conceda as permissoes solicitadas
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Seus dados serao sincronizados novamente
                </li>
              </ul>
            </div>

            {/* Botao principal */}
            <button
              onClick={handleReauthorize}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-white text-orange-600 font-semibold rounded-xl transition-all hover:bg-white/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Redirecionando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Reautorizar Bling
                </>
              )}
            </button>

            {/* Informacao adicional */}
            <p className="mt-4 text-center text-sm text-white/50">
              Este processo leva apenas alguns segundos
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
