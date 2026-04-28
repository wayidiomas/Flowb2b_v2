import { ReactNode } from 'react'

export default function LpLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#F5F7FA] text-gray-900"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
    >
      {children}
    </div>
  )
}
