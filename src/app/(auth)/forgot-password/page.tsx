'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth'
import {
  Button,
  Input,
  Card,
  CardContent,
} from '@/components/ui'

// Icone de chave
function KeyIcon() {
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
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar email')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
        <CardContent>
          {success ? (
            // Estado de sucesso
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-success-500 rounded-full flex items-center justify-center mb-6">
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
              </div>
              <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
                Email enviado!
              </h1>
              <p className="text-base text-gray-600 leading-6 mb-8">
                Enviamos as instrucoes para alterar sua senha para{' '}
                <span className="font-medium text-gray-900">{email}</span>.
                Verifique sua caixa de entrada.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon />
                Voltar para login
              </Link>
            </div>
          ) : (
            // Formulario
            <>
              <div className="text-center mb-8">
                {/* Icone */}
                <div className="mx-auto w-14 h-14 bg-secondary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-secondary-100">
                  <KeyIcon />
                </div>
                <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
                  Esqueceu sua senha?
                </h1>
                <p className="text-base text-gray-600 leading-6">
                  Nao se preocupe, nos enviaremos as instrucoes para alterar sua senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-error-500/10 text-error-600 p-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <Input
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Entre com seu email"
                  autoComplete="email"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Alterar senha
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeftIcon />
                  Voltar para login
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
