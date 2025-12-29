'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  // Save collapsed state to localStorage
  const handleToggle = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newValue))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
      <Header sidebarCollapsed={sidebarCollapsed} />
      <main
        className={`
          pt-16 min-h-screen
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'pl-[72px]' : 'pl-[280px]'}
        `}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
