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
      className="w-6 h-6 text-white"
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
      className="w-4 h-4"
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
      <Card className="w-full max-w-[400px]" padding="lg" shadow="lg">
        <CardContent>
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center mb-4 ring-8 ring-secondary-100">
              <EmailIcon />
            </div>
            <h1 className="text-2xl font-semibold text-primary-700 tracking-tight mb-2">
              Verifique seu email
            </h1>
            <p className="text-sm text-gray-500 mb-1">
              Enviamos um email de confirmacao para
            </p>
            {email && (
              <p className="text-sm font-medium text-gray-900 mb-4">
                {email}
              </p>
            )}
            <p className="text-xs text-gray-400 leading-4 mb-5">
              Clique no link do email para ativar sua conta.
              Se nao encontrar, verifique a pasta de spam.
            </p>

            <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 mb-5">
              <p className="text-xs text-primary-700">
                O link expira em <strong>24 horas</strong>
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
