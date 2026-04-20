'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/auth'
import { Button, Input, Card, CardContent } from '@/components/ui'
import type { ResetPasswordResponse } from '@/types/auth'

const LOGIN_BY_TYPE: Record<NonNullable<ResetPasswordResponse['userType']>, string> = {
  lojista: '/login',
  fornecedor: '/fornecedor/login',
  representante: '/representante/login',
}

function KeyIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function ResetSenhaInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState<ResetPasswordResponse['userType']>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Link invalido. Solicite um novo reset.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter no minimo 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data: ResetPasswordResponse = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao redefinir senha')
      }
      setUserType(data.userType || 'lojista')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  const loginPath = userType ? LOGIN_BY_TYPE[userType] : '/login'

  return (
    <AuthLayout>
      <Card className="w-full max-w-[400px]" padding="lg" shadow="lg">
        <CardContent>
          {userType ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-success-500 rounded-full flex items-center justify-center mb-4">
                <CheckIcon />
              </div>
              <h1 className="text-2xl font-semibold text-primary-700 tracking-tight mb-2">
                Senha alterada!
              </h1>
              <p className="text-sm text-gray-600 leading-5 mb-6">
                Agora voce pode entrar com sua nova senha.
              </p>
              <Link
                href={loginPath}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors rounded-lg px-4 py-2"
              >
                Ir para login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center mb-4 ring-8 ring-secondary-100">
                  <KeyIcon />
                </div>
                <h1 className="text-2xl font-semibold text-primary-700 tracking-tight">
                  Redefinir senha
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Escolha uma nova senha para sua conta
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-error-500/10 text-error-600 px-3 py-2 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <Input
                  label="Nova senha"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  autoComplete="new-password"
                />

                <Input
                  label="Confirmar senha"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  Redefinir senha
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default function ResetSenhaPage() {
  return (
    <Suspense fallback={null}>
      <ResetSenhaInner />
    </Suspense>
  )
}
