'use client'

import { MainHeader } from './MainHeader'
import { useAuth } from '@/contexts/AuthContext'
import { TrialExpiredModal } from '@/components/trial'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { trialStatus, logout } = useAuth()

  // Mostrar modal bloqueante se trial expirou e nao tem assinatura
  const showBlockingModal = trialStatus?.isTrialExpired && !trialStatus?.hasActiveSubscription

  return (
    <div className="min-h-screen bg-gray-100">
      <MainHeader />
      <main className="p-6">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

      {/* Modal de trial expirado - bloqueante */}
      <TrialExpiredModal isOpen={!!showBlockingModal} onLogout={logout} />
    </div>
  )
}
