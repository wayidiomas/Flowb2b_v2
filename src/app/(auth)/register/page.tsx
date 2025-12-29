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
      className="w-7 h-7 text-white"
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
      setError('Você precisa aceitar os termos para continuar')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      // Redireciona para login com mensagem de sucesso
      router.push('/login?registered=true')
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
      <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
        <CardContent>
          <div className="text-center mb-8">
            {/* Icone */}
            <div className="mx-auto w-14 h-14 bg-secondary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-secondary-100">
              <UserPlusIcon />
            </div>
            <h1 className="text-[30px] font-semibold text-primary-700 tracking-[-1.2px] mb-3">
              Vamos criar sua conta!
            </h1>
            <p className="text-base text-gray-600 leading-6">
              Preencha os dados abaixo para comecar.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error-500/10 text-error-600 p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <Input
              label="Nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Entre com seu nome"
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Entre com seu email"
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
              <p className="mt-1.5 text-sm text-gray-400">
                A senha deve ter no mínimo 8 caracteres
              </p>
            </div>

            <div className="pt-2">
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                label={
                  <span>
                    Concordo com os termos de{' '}
                    <Link
                      href="/politica-privacidade"
                      className="font-bold text-primary-700 hover:underline"
                    >
                      Política de Privacidade
                    </Link>
                    {' '}e{' '}
                    <Link
                      href="/termos-de-uso"
                      className="font-bold text-primary-700 hover:underline"
                    >
                      Termos de Uso
                    </Link>
                  </span>
                }
              />
            </div>

            <div className="space-y-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!acceptTerms}
              >
                Vamos lá!
              </Button>

              <SocialButton platform="google" onClick={handleGoogleSignup}>
                Cadastrar se com Google
              </SocialButton>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              Já tem uma conta?{' '}
            </span>
            <Link
              href="/login"
              className="text-sm font-semibold text-secondary-500 hover:text-secondary-600 transition-colors"
            >
              Entrar
            </Link>
          </div>
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
