'use client'

import { FornecedorAuthProvider } from '@/contexts/FornecedorAuthContext'

export default function FornecedorRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FornecedorAuthProvider>
      {children}
    </FornecedorAuthProvider>
  )
}
