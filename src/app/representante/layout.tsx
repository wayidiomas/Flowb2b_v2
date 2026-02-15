'use client'

import { RepresentanteAuthProvider } from '@/contexts/RepresentanteAuthContext'

export default function RepresentanteRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RepresentanteAuthProvider>
      {children}
    </RepresentanteAuthProvider>
  )
}
