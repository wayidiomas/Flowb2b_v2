'use client'

import { useState, useEffect } from 'react'
import { MainHeader } from './MainHeader'
import { LojistaBottomTabBar } from './LojistaBottomTabBar'
import { useAuth } from '@/contexts/AuthContext'
import { TrialExpiredModal } from '@/components/trial'
import { BlingRevokeModal } from '@/components/bling'
import OnboardingModal from '@/components/onboarding/OnboardingModal'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { trialStatus, logout, empresa, user, loading: authLoading, refreshUser } = useAuth()
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

  // Mostrar onboarding se usuario logado mas sem empresa
  const showOnboarding = !authLoading && user && !empresa

  // Mostrar modal bloqueante se trial expirou e nao tem assinatura
  const showTrialModal = trialStatus?.isTrialExpired && !trialStatus?.hasActiveSubscription

  return (
    <div className="min-h-screen bg-gray-100">
      <MainHeader />
      <main className="p-4 md:p-6 2xl:px-8 3xl:px-12 pb-24 md:pb-6">
        <div className="max-w-[1800px] 2xl:max-w-[2200px] 3xl:max-w-none mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Tab Bar - Mobile */}
      <LojistaBottomTabBar />

      {/* Modal de onboarding - prioridade maxima */}
      {showOnboarding && (
        <OnboardingModal onComplete={refreshUser} />
      )}

      {/* Modal de trial expirado - bloqueante */}
      {!showOnboarding && (
        <TrialExpiredModal isOpen={!!showTrialModal} onLogout={logout} />
      )}

      {/* Modal de Bling revogado - so mostra se nao tem onboarding/trial bloqueando */}
      {!showOnboarding && !showTrialModal && (
        <BlingRevokeModal isOpen={blingRevoked} empresaId={empresa?.id ?? null} />
      )}
    </div>
  )
}
