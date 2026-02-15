'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface RepresentanteConviteModalProps {
  isOpen: boolean
  onClose: () => void
  pedidoId: string
  codigoAcesso: string
  representanteNome?: string
}

export function RepresentanteConviteModal({
  isOpen,
  onClose,
  pedidoId,
  codigoAcesso,
  representanteNome
}: RepresentanteConviteModalProps) {
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Bloquear scroll quando modal esta aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codigoAcesso)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen || !mounted) return null

  const loginUrl = `/representante/login?redirect=/representante/pedidos/${pedidoId}`
  const registroUrl = `/representante/registro?codigo=${codigoAcesso}&redirect=/representante/pedidos/${pedidoId}`

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop escuro */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
          {/* Decoracao de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            {/* Logo FlowB2B */}
            <div className="mb-6">
              <Image
                src="/assets/branding/logo-white.png"
                alt="FlowB2B"
                width={140}
                height={45}
                className="object-contain"
              />
            </div>

            {/* Icone */}
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>

            {/* Titulo e mensagem */}
            <h2 className="text-2xl font-bold mb-2">Responda este pedido!</h2>
            {representanteNome && (
              <p className="text-white/70 text-sm mb-3">
                Ola, {representanteNome}
              </p>
            )}
            <p className="text-white/80 mb-4 leading-relaxed">
              Cadastre-se como representante na FlowB2B e gerencie pedidos de todos os seus fornecedores em um so lugar.
            </p>

            {/* Codigo de Acesso */}
            <div className="bg-white/15 rounded-xl p-4 mb-6">
              <p className="text-xs text-white/70 mb-2">Seu codigo de acesso:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 rounded-lg px-4 py-2.5 font-mono text-lg font-bold tracking-wider">
                  {codigoAcesso}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Copiar codigo"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-white/60 mt-2">
                Use este codigo no momento do cadastro
              </p>
            </div>

            {/* Beneficios */}
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-white/90 mb-3">Ao se cadastrar voce podera:</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Gerenciar pedidos de multiplos fornecedores
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enviar sugestoes de quantidade e desconto
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Dashboard unificado com todas as metricas
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Receber notificacoes em tempo real
                </li>
              </ul>
            </div>

            {/* Botao principal */}
            <a
              href={registroUrl}
              className="inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-white text-purple-600 font-semibold rounded-xl transition-all hover:bg-white/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              Criar conta de representante
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>

            {/* Link login */}
            <div className="mt-4 text-center">
              <a
                href={loginUrl}
                className="text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                Ja tenho conta? <span className="underline">Entrar</span>
              </a>
            </div>

            {/* Divider */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <button
                onClick={onClose}
                className="w-full text-center text-sm text-white/50 hover:text-white/70 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Continuar apenas visualizando
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
