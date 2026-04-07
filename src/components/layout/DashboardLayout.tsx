'use client'

import { useState, useEffect } from 'react'
import { MainHeader } from './MainHeader'
import { LojistaBottomTabBar } from './LojistaBottomTabBar'
import { useAuth } from '@/contexts/AuthContext'
import { TrialExpiredModal } from '@/components/trial'
import { BlingRevokeModal } from '@/components/bling'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import CatalogoUpdateModal from '@/components/catalogo/CatalogoUpdateModal'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { trialStatus, logout, empresa, user, loading: authLoading, refreshUser } = useAuth()
  const [blingRevoked, setBlingRevoked] = useState(false)
  const [catalogoUpdate, setCatalogoUpdate] = useState<{catalogoId: number, nome: string, total: number} | null>(null)

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

  // Checar atualizações de catálogo pendentes
  useEffect(() => {
    if (!empresa?.id || !user) return

    const checkCatalogoUpdates = async () => {
      try {
        const res = await fetch('/api/catalogo-atualizacoes/pendentes')
        if (!res.ok) return
        const data = await res.json()
        if (data.tem_pendentes && data.catalogos?.length > 0) {
          const primeiro = data.catalogos[0]
          setCatalogoUpdate({
            catalogoId: primeiro.catalogo_id,
            nome: primeiro.nome,
            total: primeiro.total_pendentes,
          })
        }
      } catch { /* silencioso */ }
    }

    checkCatalogoUpdates()
    const interval = setInterval(checkCatalogoUpdates, 5 * 60 * 1000) // a cada 5 min
    return () => clearInterval(interval)
  }, [empresa?.id, user])

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

      {/* Modal de atualização de catálogo */}
      {!showOnboarding && !showTrialModal && catalogoUpdate && (
        <CatalogoUpdateModal
          catalogoId={catalogoUpdate.catalogoId}
          catalogoNome={catalogoUpdate.nome}
          totalPendentes={catalogoUpdate.total}
          onClose={() => setCatalogoUpdate(null)}
          onComplete={() => setCatalogoUpdate(null)}
        />
      )}
    </div>
  )
}
