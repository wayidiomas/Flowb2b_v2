'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface TipoDestinatarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectFornecedor: () => void
  onSelectRepresentante: () => void
  fornecedorNome?: string
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function UserGroupIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

export function TipoDestinatarioModal({
  isOpen,
  onClose,
  onSelectFornecedor,
  onSelectRepresentante,
  fornecedorNome,
}: TipoDestinatarioModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[520px] animate-in zoom-in-95 fade-in duration-200 overflow-hidden rounded-[20px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.35)]">
        {/* Header Azul */}
        <div className="bg-[#336FB6] px-8 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>

          <div className="mb-4">
            <Image
              src="/assets/branding/logo-white.png"
              alt="FlowB2B"
              width={100}
              height={32}
              className="object-contain"
            />
          </div>

          <h2 className="text-[24px] font-bold text-white leading-tight">
            Quem vai receber este pedido?
          </h2>

          <p className="mt-2 text-[15px] text-white/80 leading-relaxed">
            {fornecedorNome
              ? `Selecione como deseja enviar o pedido para ${fornecedorNome}.`
              : 'Selecione como deseja enviar este pedido.'
            }
          </p>
        </div>

        {/* Corpo Branco */}
        <div className="bg-white px-8 py-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Opcao: Fornecedor Direto */}
            <button
              onClick={onSelectFornecedor}
              className="group flex flex-col items-center p-6 rounded-xl border-2 border-[#e2e8f0] hover:border-[#336FB6] hover:bg-[#336FB6]/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-[#f1f5f9] group-hover:bg-[#336FB6]/10 flex items-center justify-center text-[#64748b] group-hover:text-[#336FB6] transition-all">
                <BuildingIcon />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#1e293b]">
                Fornecedor direto
              </h3>
              <p className="mt-2 text-[13px] text-[#64748b] text-center">
                Envia para o cadastro do proprio fornecedor
              </p>
            </button>

            {/* Opcao: Representante */}
            <button
              onClick={onSelectRepresentante}
              className="group flex flex-col items-center p-6 rounded-xl border-2 border-[#e2e8f0] hover:border-[#FFAA11] hover:bg-[#FFAA11]/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-[#f1f5f9] group-hover:bg-[#FFAA11]/10 flex items-center justify-center text-[#64748b] group-hover:text-[#FFAA11] transition-all">
                <UserGroupIcon />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#1e293b]">
                Representante
              </h3>
              <p className="mt-2 text-[13px] text-[#64748b] text-center">
                Envia para um representante comercial
              </p>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-[14px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
