'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth'
import {
  Card,
  CardContent,
} from '@/components/ui'

// Icone de email
function EmailIcon() {
  return (
    <svg
      className="w-7 h-7 text-white"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  )
}

// Icone de seta para esquerda
function ArrowLeftIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  )
}

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <AuthLayout>
      <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
        <CardContent>
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-secondary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-secondary-100">
              <EmailIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Verifique seu email
            </h1>
            <p className="text-base text-gray-600 leading-6 mb-2">
              Enviamos um email de confirmacao para
            </p>
            {email && (
              <p className="text-base font-medium text-gray-900 mb-6">
                {email}
              </p>
            )}
            <p className="text-sm text-gray-500 leading-5 mb-8">
              Clique no link do email para ativar sua conta. Se nao encontrar,
              verifique a pasta de spam.
            </p>

            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-8">
              <p className="text-sm text-primary-700">
                O link expira em <strong>24 horas</strong>.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon />
              Voltar para login
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

function CheckEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2293f9] to-[#0a489d]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        <p className="text-sm text-white/80">Carregando...</p>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailFallback />}>
      <CheckEmailContent />
    </Suspense>
  )
}
