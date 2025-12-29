'use client'

import { MainHeader } from './MainHeader'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <MainHeader />
      <main className="p-6">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
