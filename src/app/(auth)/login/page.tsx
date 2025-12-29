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
      <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
        <CardContent>
          <div className="text-center mb-8">
            {/* Icone */}
            <div className="mx-auto w-14 h-14 bg-secondary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-secondary-100">
              <MailIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Que bom te-lo de volta!
            </h1>
            <p className="text-base text-gray-600 leading-6">
              Por favor entre com as suas credenciais.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <Input
              label="Senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-secondary-500 hover:text-secondary-600 transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <div className="space-y-4 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Entrar
              </Button>

              <SocialButton platform="google" onClick={handleGoogleLogin}>
                Entrar com Google
              </SocialButton>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              Não tem uma conta?{' '}
            </span>
            <Link
              href="/register"
              className="text-sm font-semibold text-secondary-500 hover:text-secondary-600 transition-colors"
            >
              Cadastre-se
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Ao entrar, voce concorda com nossos{' '}
              <Link href="/termos-de-uso" className="text-primary-600 hover:underline">
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link href="/politica-privacidade" className="text-primary-600 hover:underline">
                Politica de Privacidade
              </Link>
            </p>
          </div>
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
