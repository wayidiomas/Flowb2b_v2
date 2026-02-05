'use client'

import { useState, useEffect } from 'react'
import { MainHeader } from './MainHeader'
import { useAuth } from '@/contexts/AuthContext'
import { TrialExpiredModal } from '@/components/trial'
import { BlingRevokeModal } from '@/components/bling'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { trialStatus, logout, empresa } = useAuth()
  const [blingRevoked, setBlingRevoked] = useState(false)

  // Checar status do Bling quando empresa muda
  useEffect(() => {
    if (!empresa?.id) return

    const checkBlingStatus = async () => {
      try {
        const res = await fetch('/api/auth/bling/status')
        const data = await res.json()
        setBlingRevoked(data.isRevoked === true)
      } catch (err) {
        console.error('Erro ao checar status Bling:', err)
      }
    }

    checkBlingStatus()
  }, [empresa?.id])

  // Mostrar modal bloqueante se trial expirou e nao tem assinatura
  const showTrialModal = trialStatus?.isTrialExpired && !trialStatus?.hasActiveSubscription

  return (
    <div className="min-h-screen bg-gray-100">
      <MainHeader />
      <main className="p-4 md:p-6 2xl:px-8 3xl:px-12">
        <div className="max-w-[1800px] 2xl:max-w-[2200px] 3xl:max-w-none mx-auto">
          {children}
        </div>
      </main>

      {/* Modal de trial expirado - bloqueante (prioridade maior) */}
      <TrialExpiredModal isOpen={!!showTrialModal} onLogout={logout} />

      {/* Modal de Bling revogado - so mostra se trial nao esta bloqueando */}
      {!showTrialModal && (
        <BlingRevokeModal isOpen={blingRevoked} empresaId={empresa?.id ?? null} />
      )}
    </div>
  )
}
