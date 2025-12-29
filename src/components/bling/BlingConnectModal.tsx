'use client'

import { useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface BlingConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSkip?: () => void
  empresaNome?: string
}

// Ícone do Bling (simplificado)
function BlingIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#2660A5" />
      <path
        d="M12 14h6v4h-6v-4zM12 20h6v6h-6v-6zM20 14h8v4h-8v-4zM20 20h8v6h-8v-6z"
        fill="white"
      />
    </svg>
  )
}

// Ícones de features
function SyncIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ShoppingCartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

export function BlingConnectModal({
  isOpen,
  onClose,
  onSkip,
  empresaNome,
}: BlingConnectModalProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)
    // Redireciona para o OAuth do Bling
    window.location.href = '/api/auth/bling/connect'
  }

  const handleSkip = () => {
    onSkip?.()
    onClose()
  }

  const features = [
    {
      icon: <SyncIcon />,
      title: 'Sincronização automática',
      description: 'Produtos, estoque e pedidos sincronizados em tempo real',
    },
    {
      icon: <BoxIcon />,
      title: 'Gestão de estoque',
      description: 'Controle de entrada e saída integrado com o ERP',
    },
    {
      icon: <ChartIcon />,
      title: 'Relatórios inteligentes',
      description: 'Análise de vendas e sugestões de compra automáticas',
    },
    {
      icon: <ShoppingCartIcon />,
      title: 'Pedidos automáticos',
      description: 'Cálculo otimizado de pedidos de compra',
    },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50">
            <BlingIcon className="w-8 h-8" />
          </div>
          <div>
            <ModalTitle>Conectar com o Bling</ModalTitle>
            <ModalDescription>
              {empresaNome
                ? `Integre ${empresaNome} com o Bling ERP`
                : 'Integre sua empresa com o Bling ERP'}
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          <p className="text-gray-600">
            Conecte sua conta do Bling para aproveitar todos os recursos do FlowB2B:
          </p>

          <div className="grid gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-700 shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{feature.title}</h4>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-secondary-50 border border-secondary-200">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-100 text-secondary-700 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-secondary-800">
                  <strong>Dica:</strong> Você será redirecionado para o Bling para autorizar o acesso.
                  Suas credenciais são seguras e nunca são armazenadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={handleSkip}>
          Fazer depois
        </Button>
        <Button
          variant="primary"
          onClick={handleConnect}
          loading={isConnecting}
          rightIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          }
        >
          Conectar Bling
        </Button>
      </ModalFooter>
    </Modal>
  )
}
