'use client'

import { useState, useEffect } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'

interface Representante {
  id: number
  nome: string
  telefone: string | null
  codigo_acesso: string
  ativo: boolean
  cadastrado: boolean
  lojista_nome: string
  fornecedores: { id: number; nome: string }[]
  vinculado_em: string
}

function formatPhone(phone: string | null) {
  if (!phone) return '-'
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }
  return phone
}

function UserIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  )
}

function BuildingIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  )
}

export default function FornecedorRepresentantesPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRepresentantes = async () => {
      if (!user) return

      setLoading(true)
      try {
        const res = await fetch('/api/fornecedor/representantes')
        if (res.ok) {
          const data = await res.json()
          setRepresentantes(data.representantes || [])
        }
      } catch (err) {
        console.error('Erro ao carregar representantes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRepresentantes()
  }, [user])

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Representantes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Representantes comerciais vinculados aos seus cadastros
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : representantes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {representantes.map((rep) => (
                <div key={rep.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      rep.cadastrado ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      <UserIcon className={`w-6 h-6 ${
                        rep.cadastrado ? 'text-emerald-600' : 'text-amber-600'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{rep.nome}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rep.cadastrado
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {rep.cadastrado ? 'Cadastrado' : 'Pendente'}
                        </span>
                        {!rep.ativo && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inativo
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        {rep.telefone && (
                          <div className="flex items-center gap-1.5">
                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                            <span>{formatPhone(rep.telefone)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <BuildingIcon className="w-4 h-4 text-gray-400" />
                          <span>Lojista: {rep.lojista_nome}</span>
                        </div>
                      </div>

                      {/* Fornecedores vinculados */}
                      {rep.fornecedores.length > 1 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Representa voce em {rep.fornecedores.length} cadastros:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rep.fornecedores.map((f) => (
                              <span
                                key={f.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                              >
                                {f.nome}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-gray-400">
                        Vinculado em {new Date(rep.vinculado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-[#336FB6]" />
              </div>
              <p className="text-gray-500 font-medium">Nenhum representante vinculado.</p>
              <p className="text-sm text-gray-400 mt-1">
                Quando um lojista vincular um representante ao seu cadastro, ele aparecera aqui.
              </p>
            </div>
          )}
        </div>

        {/* Info card */}
        {representantes.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Sobre representantes</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Representantes comerciais podem visualizar e responder pedidos em seu nome.
                  Eles sao cadastrados pelos lojistas para facilitar a comunicacao comercial.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FornecedorLayout>
  )
}
