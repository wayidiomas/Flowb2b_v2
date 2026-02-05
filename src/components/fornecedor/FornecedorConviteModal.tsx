'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface FornecedorConviteModalProps {
  isOpen: boolean
  onClose: () => void
  pedidoId: string
  fornecedorNome?: string
}

export function FornecedorConviteModal({ isOpen, onClose, pedidoId, fornecedorNome }: FornecedorConviteModalProps) {
  const [mounted, setMounted] = useState(false)

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

  if (!isOpen || !mounted) return null

  const loginUrl = `/fornecedor/login?redirect=/fornecedor/pedidos/${pedidoId}`
  const registroUrl = `/fornecedor/registro?redirect=/fornecedor/pedidos/${pedidoId}`

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop escuro */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

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
                width={140}
                height={45}
                className="object-contain"
              />
            </div>

            {/* Icone */}
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>

            {/* Titulo e mensagem */}
            <h2 className="text-2xl font-bold mb-2">Responda este pedido!</h2>
            {fornecedorNome && (
              <p className="text-white/70 text-sm mb-3">
                Ola, {fornecedorNome}
              </p>
            )}
            <p className="text-white/80 mb-6 leading-relaxed">
              Cadastre-se gratuitamente na FlowB2B e envie suas sugestoes comerciais diretamente para o lojista.
            </p>

            {/* Beneficios */}
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-white/90 mb-3">Ao se cadastrar voce podera:</p>
              <ul className="space-y-2 text-sm text-white/80">
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
                  Propor bonificacoes e prazos de validade
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Acompanhar o status dos seus pedidos
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
              className="inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-white text-orange-600 font-semibold rounded-xl transition-all hover:bg-white/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              Criar conta gratis
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
