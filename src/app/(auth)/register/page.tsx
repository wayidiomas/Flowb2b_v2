'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Logo,
  SocialButton,
  Checkbox,
} from '@/components/ui'

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
    <div className="min-h-screen flex bg-gradient-brand">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center px-8">
        <div className="max-w-md text-center">
          <p className="text-3xl font-semibold text-white tracking-tight mb-4">
            Bem-vindo a
          </p>
          <Logo variant="light" size="xl" />

          <p className="mt-8 text-gray-200 leading-relaxed">
            Simplifique sua gestão de compras B2B com integração direta ao Bling.
            Controle estoque, pedidos e fornecedores em um só lugar.
          </p>

          {/* Social Proof */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white text-sm font-medium"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-gray-200 font-medium">
              Junte-se a 10.000+ usuários
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-[440px]" padding="xl" shadow="lg">
          <CardHeader>
            <CardTitle>Vamos criar sua conta!</CardTitle>
          </CardHeader>

          <CardContent>
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
                        href="/termos-uso"
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

function RegisterFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-brand">
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
