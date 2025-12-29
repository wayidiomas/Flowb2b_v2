'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Logo,
  SocialButton,
} from '@/components/ui'

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
    <div className="min-h-screen flex bg-gradient-brand">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center px-8">
        <div className="text-center">
          <p className="text-3xl font-semibold text-white tracking-tight mb-4">
            Bem-vindo a
          </p>
          <Logo variant="light" size="xl" />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
          <CardHeader>
            <CardTitle>Que bom tê-lo de volta!</CardTitle>
            <CardDescription>
              Por favor entre com as suas credenciais.
            </CardDescription>
          </CardHeader>

          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-sm text-white/80">
          &copy; FlowB2B, {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-brand">
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
