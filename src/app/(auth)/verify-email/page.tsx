'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth'
import {
  Button,
  Card,
  CardContent,
} from '@/components/ui'

// Icone de check
function CheckIcon() {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  )
}

// Icone de erro
function ErrorIcon() {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

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

// Icone de loading
function LoadingIcon() {
  return (
    <svg
      className="w-7 h-7 text-white animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

type VerifyStatus = 'loading' | 'success' | 'already-confirmed' | 'error' | 'no-token'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<VerifyStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('no-token')
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setErrorMessage(data.error || 'Erro ao verificar email')
          setStatus('error')
          return
        }

        if (data.alreadyConfirmed) {
          setStatus('already-confirmed')
        } else {
          setStatus('success')
        }
      } catch {
        setErrorMessage('Erro ao verificar email')
        setStatus('error')
      }
    }

    verifyEmail()
  }, [token])

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-primary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-primary-100">
              <LoadingIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Verificando seu email...
            </h1>
            <p className="text-base text-gray-600 leading-6">
              Aguarde enquanto confirmamos seu email.
            </p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-success-500 rounded-full flex items-center justify-center mb-6">
              <CheckIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Email confirmado!
            </h1>
            <p className="text-base text-gray-600 leading-6 mb-8">
              Seu email foi confirmado com sucesso. Agora voce pode acessar sua conta.
            </p>
            <Link href="/login">
              <Button variant="primary" size="lg" fullWidth>
                Ir para login
              </Button>
            </Link>
          </div>
        )

      case 'already-confirmed':
        return (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-secondary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-secondary-100">
              <EmailIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Email ja confirmado
            </h1>
            <p className="text-base text-gray-600 leading-6 mb-8">
              Seu email ja foi confirmado anteriormente. Voce pode acessar sua conta normalmente.
            </p>
            <Link href="/login">
              <Button variant="primary" size="lg" fullWidth>
                Ir para login
              </Button>
            </Link>
          </div>
        )

      case 'no-token':
        return (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-warning-500 rounded-full flex items-center justify-center mb-6">
              <ErrorIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Link invalido
            </h1>
            <p className="text-base text-gray-600 leading-6 mb-8">
              O link de confirmacao esta incompleto ou invalido.
              Por favor, use o link completo enviado para seu email.
            </p>
            <Link href="/login">
              <Button variant="secondary" size="lg" fullWidth>
                Voltar para login
              </Button>
            </Link>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-error-500 rounded-full flex items-center justify-center mb-6">
              <ErrorIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Erro na verificacao
            </h1>
            <p className="text-base text-gray-600 leading-6 mb-8">
              {errorMessage || 'Ocorreu um erro ao verificar seu email. O link pode estar expirado ou invalido.'}
            </p>
            <div className="space-y-3">
              <Link href="/register">
                <Button variant="primary" size="lg" fullWidth>
                  Criar nova conta
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="lg" fullWidth>
                  Voltar para login
                </Button>
              </Link>
            </div>
          </div>
        )
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2293f9] to-[#0a489d]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        <p className="text-sm text-white/80">Carregando...</p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
