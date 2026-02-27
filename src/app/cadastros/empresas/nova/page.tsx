'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EmpresaForm } from '@/components/empresas/EmpresaForm'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function NovaEmpresaPage() {
  return (
    <RequirePermission permission="configuracoes">
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/cadastros/empresas" className="text-gray-500 hover:text-gray-700">
            Minhas empresas
          </Link>
          <span className="text-gray-400">&gt;</span>
          <span className="font-medium text-gray-900">Nova Empresa</span>
        </nav>
      </div>

      <EmpresaForm />
    </DashboardLayout>
    </RequirePermission>
  )
}
