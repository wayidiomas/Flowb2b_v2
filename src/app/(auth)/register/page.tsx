'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth'
import {
  Button,
  Input,
  Card,
  CardContent,
  SocialButton,
  Checkbox,
} from '@/components/ui'

// Icone de usuario
function UserPlusIcon() {
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
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
      />
    </svg>
  )
}

function RegisterForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!acceptTerms) {
      setError('Voce precisa aceitar os termos para continuar')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no minimo 8 caracteres')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, password, acceptedTerms: acceptTerms }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      // Redireciona para pagina de verificacao de email
      router.push(`/check-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    // TODO: Implementar cadastro com Google
    console.log('Google signup')
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[400px]" padding="lg" shadow="lg">
        <CardContent>
          {/* Header compacto */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center mb-4 ring-8 ring-secondary-100">
              <UserPlusIcon />
            </div>
            <h1 className="text-2xl font-semibold text-primary-700 tracking-tight">
              Vamos criar sua conta!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Preencha os dados abaixo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-error-500/10 text-error-600 px-3 py-2 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <Input
              label="Nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
            />

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
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-400">
                Minimo 8 caracteres
              </p>
            </div>

            <Checkbox
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              label={
                <span className="text-xs">
                  Concordo com a{' '}
                  <Link
                    href="/politica-privacidade"
                    className="font-semibold text-primary-600 hover:underline"
                  >
                    Privacidade
                  </Link>
                  {' '}e{' '}
                  <Link
                    href="/termos-de-uso"
                    className="font-semibold text-primary-600 hover:underline"
                  >
                    Termos
                  </Link>
                </span>
              }
            />

            <div className="space-y-3 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!acceptTerms}
              >
                Criar conta
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">ou</span>
                </div>
              </div>

              <SocialButton platform="google" onClick={handleGoogleSignup}>
                Cadastrar com Google
              </SocialButton>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Ja tem uma conta?{' '}
            <Link
              href="/login"
              className="font-semibold text-secondary-500 hover:text-secondary-600 transition-colors"
            >
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

function RegisterFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2293f9] to-[#0a489d]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        <p className="text-sm text-white/80">Carregando...</p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  )
}
