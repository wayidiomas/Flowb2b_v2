'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FornecedorAuthLayout } from '@/components/auth'
import { Card, CardContent, Input } from '@/components/ui'

// Icone de usuario/adicionar
function UserPlusIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

function FornecedorRegistroForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get('redirect') || '/fornecedor/dashboard'

  // Formatar CNPJ enquanto digita
  const handleCnpjChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    let formatted = digits
    if (digits.length > 12) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
    } else if (digits.length > 8) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    } else if (digits.length > 5) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`
    }
    setCnpj(formatted)
  }

  // Formatar telefone
  const handleTelefoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    let formatted = digits
    if (digits.length > 7) {
      // Formato completo com hifen: (XX) XXXXX-XXXX
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    } else if (digits.length > 2) {
      // Formato parcial sem hifen: (XX) XXXXX
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    }
    setTelefone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/fornecedor/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, password, cnpj, telefone }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(data.message || 'Conta criada com sucesso!')
        const loginUrl = redirect !== '/fornecedor/dashboard'
          ? `/fornecedor/login?redirect=${encodeURIComponent(redirect)}`
          : '/fornecedor/login'
        setTimeout(() => router.push(loginUrl), 2000)
      } else {
        setError(data.error || 'Erro ao criar conta')
      }
    } catch {
      setError('Erro de conexao')
    }

    setLoading(false)
  }

  return (
    <FornecedorAuthLayout description="Cadastre-se como fornecedor e acompanhe seus pedidos de compra em tempo real.">
      <Card shadow="lg" rounded="xl" className="w-full max-w-[420px]">
        <CardContent className="p-8">
          {/* Header com icone amber */}
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
              <UserPlusIcon />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Criar conta
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Preencha seus dados para se cadastrar
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-4 border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm mb-4 border border-green-100">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome completo"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />

            <Input
              label="CNPJ"
              type="text"
              required
              value={cnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              placeholder="00.000.000/0000-00"
              hint="CNPJ cadastrado como fornecedor por um lojista FlowB2B"
            />

            <Input
              label="Telefone"
              type="text"
              value={telefone}
              onChange={(e) => handleTelefoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
              hint="A senha deve ter no minimo 8 caracteres"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* Botao com gradiente amber/orange */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Ja tem conta?{' '}
              <Link
                href={redirect !== '/fornecedor/dashboard' ? `/fornecedor/login?redirect=${encodeURIComponent(redirect)}` : '/fornecedor/login'}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                Faca login
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <Link
              href="/login"
              className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sou lojista
            </Link>
          </div>
        </CardContent>
      </Card>
    </FornecedorAuthLayout>
  )
}

// Fallback com cores amber
function RegistroFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        <p className="text-sm text-white/90 font-medium">Carregando...</p>
      </div>
    </div>
  )
}

export default function FornecedorRegistroPage() {
  return (
    <Suspense fallback={<RegistroFallback />}>
      <FornecedorRegistroForm />
    </Suspense>
  )
}
