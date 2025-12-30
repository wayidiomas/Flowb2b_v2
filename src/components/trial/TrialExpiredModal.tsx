'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

// Numero de WhatsApp para contratacao de planos
const WHATSAPP_CONTRATACAO = '5511999999999' // TODO: Substituir pelo numero real

// Icone do WhatsApp
function WhatsAppIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// Icone de logout
function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}

interface TrialExpiredModalProps {
  isOpen: boolean
  onLogout: () => void
}

export function TrialExpiredModal({ isOpen, onLogout }: TrialExpiredModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleWhatsAppClick = () => {
    const mensagem = encodeURIComponent(
      `Ola! Meu periodo de teste do FlowB2B expirou e gostaria de contratar um plano.\n\nPlano: Profissional\nValor: R$ 129,90/mes\nEmpresas adicionais: R$ 59,00 cada`
    )
    window.open(`https://wa.me/${WHATSAPP_CONTRATACAO}?text=${mensagem}`, '_blank')
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop escuro - bloqueia tudo */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2293f9] to-[#0a489d] rounded-2xl p-8 text-white shadow-2xl">
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
              <svg className="w-8 h-8 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            {/* Titulo e mensagem */}
            <h2 className="text-2xl font-bold mb-3">Seu periodo de teste expirou</h2>
            <p className="text-white/80 mb-6 leading-relaxed">
              Seu acesso gratuito ao FlowB2B chegou ao fim. Para continuar aproveitando todas as funcionalidades da plataforma, contrate um plano agora mesmo.
            </p>

            {/* Beneficios rapidos */}
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-white/90 mb-2">Com o plano Profissional voce tem:</p>
              <ul className="space-y-1 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Usuarios ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Integracao completa com Bling
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Suporte prioritario
                </li>
              </ul>
            </div>

            {/* Preco */}
            <div className="text-center mb-6">
              <p className="text-sm text-white/60">A partir de</p>
              <p className="text-3xl font-bold">R$ 129,90<span className="text-base font-normal text-white/70">/mes</span></p>
              <p className="text-sm text-white/60">+ R$ 59,00 por empresa adicional</p>
            </div>

            {/* Botoes */}
            <div className="flex flex-col gap-3">
              {/* Botao WhatsApp - principal */}
              <button
                onClick={handleWhatsAppClick}
                className="inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <WhatsAppIcon />
                Contratar via WhatsApp
              </button>

              {/* Botao Logout - secundario */}
              <button
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all"
              >
                <LogoutIcon />
                Sair da conta
              </button>
            </div>

            {/* Informacao adicional */}
            <p className="mt-4 text-center text-sm text-white/50">
              Atendimento de segunda a sexta, das 9h as 18h
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
