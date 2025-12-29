'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth'
import {
  Button,
  Input,
  Card,
  CardContent,
  SocialButton,
} from '@/components/ui'

// Icone de email
function MailIcon() {
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

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push(redirect)
    } else {
      setError(result.error || 'Erro ao fazer login')
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    // TODO: Implementar login com Google
    console.log('Google login')
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[400px]" padding="lg" shadow="lg">
        <CardContent>
          {/* Header compacto */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center mb-4 ring-8 ring-secondary-100">
              <MailIcon />
            </div>
            <h1 className="text-2xl font-semibold text-primary-700 tracking-tight">
              Que bom te-lo de volta!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Entre com suas credenciais
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-error-500/10 text-error-600 px-3 py-2 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
            />

            <div>
              <Input
                label="Senha"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-secondary-500 hover:text-secondary-600 transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Entrar
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">ou</span>
                </div>
              </div>

              <SocialButton platform="google" onClick={handleGoogleLogin}>
                Entrar com Google
              </SocialButton>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Nao tem uma conta?{' '}
            <Link
              href="/register"
              className="font-semibold text-secondary-500 hover:text-secondary-600 transition-colors"
            >
              Cadastre-se
            </Link>
          </p>

          <p className="mt-4 text-center text-[11px] text-gray-400 leading-4">
            Ao entrar, voce concorda com nossos{' '}
            <Link href="/termos-de-uso" className="text-primary-500 hover:underline">
              Termos
            </Link>{' '}
            e{' '}
            <Link href="/politica-privacidade" className="text-primary-500 hover:underline">
              Privacidade
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2293f9] to-[#0a489d]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        <p className="text-sm text-white/80">Carregando...</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
