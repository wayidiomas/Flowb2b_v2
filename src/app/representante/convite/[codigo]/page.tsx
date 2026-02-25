'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RepresentanteAuthLayout } from '@/components/auth'
import { Card, CardContent, Input } from '@/components/ui'

function UserGroupIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

interface ConviteData {
  representante: {
    id: number
    nome: string
    empresa_nome: string
    ja_vinculado: boolean
  }
  fornecedores: Array<{ id: number; nome: string }>
}

export default function RepresentanteConvitePage() {
  const params = useParams()
  const router = useRouter()
  const codigo = params.codigo as string

  const [conviteData, setConviteData] = useState<ConviteData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    async function fetchConvite() {
      try {
        const response = await fetch(`/api/auth/representante/convite?codigo=${codigo}`)
        const data = await response.json()

        if (data.success) {
          setConviteData(data)
        } else {
          setPageError(data.error || 'Convite invalido')
        }
      } catch {
        setPageError('Erro ao carregar convite')
      } finally {
        setPageLoading(false)
      }
    }

    if (codigo) {
      fetchConvite()
    }
  }, [codigo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (password !== confirmPassword) {
      setFormError('As senhas nao conferem')
      return
    }

    if (password.length < 6) {
      setFormError('Senha deve ter pelo menos 6 caracteres')
      return
    }

    setFormLoading(true)

    try {
      const response = await fetch('/api/auth/representante/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: conviteData?.representante.nome,
          email,
          codigo_acesso: codigo,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/representante/dashboard')
      } else {
        setFormError(data.error || 'Erro ao criar conta')
      }
    } catch {
      setFormError('Erro ao criar conta')
    } finally {
      setFormLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
          <p className="text-sm text-white/90 font-medium">Carregando convite...</p>
        </div>
      </div>
    )
  }

  if (pageError || !conviteData) {
    return (
      <RepresentanteAuthLayout>
        <Card shadow="lg" rounded="xl" className="w-full max-w-[420px]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-800 mb-2">Convite invalido</h1>
            <p className="text-sm text-gray-500 mb-6">{pageError || 'Este link de convite nao e valido ou expirou.'}</p>
            <Link
              href="/representante/login"
              className="text-violet-600 hover:text-violet-700 font-semibold text-sm"
            >
              Ir para o login
            </Link>
          </CardContent>
        </Card>
      </RepresentanteAuthLayout>
    )
  }

  const { representante, fornecedores } = conviteData

  // Caso 1: Ja vinculado - mostrar mensagem de sucesso
  if (representante.ja_vinculado) {
    return (
      <RepresentanteAuthLayout>
        <Card shadow="lg" rounded="xl" className="w-full max-w-[420px]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/25">
              <CheckIcon />
            </div>
            <h1 className="text-xl font-semibold text-gray-800 mb-2">Conta ja ativada!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Este convite ja foi utilizado. Faca login para acessar o portal.
            </p>
            <Link
              href="/representante/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200"
            >
              Fazer login
            </Link>
          </CardContent>
        </Card>
      </RepresentanteAuthLayout>
    )
  }

  // Caso 2: Novo usuario - formulario de registro
  return (
    <RepresentanteAuthLayout>
      <Card shadow="lg" rounded="xl" className="w-full max-w-[420px]">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25">
              <UserGroupIcon />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Crie sua conta
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Portal do Representante
            </p>
          </div>

          {/* Info do convite */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-violet-700">
              <span className="font-semibold">{representante.empresa_nome}</span> te convidou como representante.
            </p>
            {fornecedores.length > 0 && (
              <p className="text-xs text-violet-600 mt-1">
                Fornecedores: {fornecedores.map(f => f.nome).join(', ')}
              </p>
            )}
          </div>

          {/* Error message */}
          {formError && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-4 border border-red-100">
              {formError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome"
              type="text"
              value={representante.nome}
              disabled
            />

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
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
            </div>

            <Input
              label="Confirme a senha"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente"
            />

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {formLoading ? (
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
                href="/representante/login"
                className="text-violet-600 hover:text-violet-700 font-semibold"
              >
                Entrar
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </RepresentanteAuthLayout>
  )
}
