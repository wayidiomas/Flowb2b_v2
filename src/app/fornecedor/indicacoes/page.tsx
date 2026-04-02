'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'

// Types
interface Convite {
  id: number
  fornecedor_user_id: number
  fornecedor_cnpj: string
  fornecedor_nome: string
  lojista_nome: string
  lojista_telefone: string
  lojista_email: string | null
  empresa_id: number | null
  user_id: string | null
  status: 'pendente' | 'aceito' | 'recusado'
  codigo_referral: string
  created_at: string
  responded_at: string | null
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

// Icons
function GiftIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function SendIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function UserPlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CurrencyIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// Toast component
function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}
      >
        {toast.type === 'success' ? (
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
        <span>{toast.message}</span>
        <button onClick={onDismiss} className="ml-2 text-current opacity-60 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Helper to build WhatsApp URL from a convite
function buildWhatsAppUrl(convite: Convite, fornecedorNome: string) {
  const phone = convite.lojista_telefone.replace(/\D/g, '')
  const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`
  const message = encodeURIComponent(
    `Ola ${convite.lojista_nome}! Sou ${fornecedorNome} e uso o FlowB2B para gerenciar pedidos de compra.\n\n` +
    `Convido voce a conhecer a plataforma — automatize suas compras, controle rupturas e conecte seus fornecedores.\n\n` +
    `Cadastre-se gratis: https://flowb2b-v2.onrender.com/register?ref=${convite.codigo_referral}\n\n` +
    `Seus 3 primeiros meses sao gratis!`
  )
  return `https://wa.me/${phoneFormatted}?text=${message}`
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

function StatusBadge({ status }: { status: string }) {
  const config = {
    pendente: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendente' },
    aceito: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aceito' },
    recusado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Recusado' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default function FornecedorIndicacoesPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Form state
  const [lojistaNome, setLojistaNome] = useState('')
  const [lojistaTelefone, setLojistaTelefone] = useState('')
  const [lojistaEmail, setLojistaEmail] = useState('')

  const fetchConvites = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/fornecedor/convites')
      if (res.ok) {
        const data = await res.json()
        setConvites(data.convites || [])
      }
    } catch (err) {
      console.error('Erro ao carregar convites:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchConvites()
  }, [fetchConvites])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lojistaNome.trim() || !lojistaTelefone.trim()) {
      setToast({ message: 'Nome e telefone sao obrigatorios', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/fornecedor/convites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lojista_nome: lojistaNome.trim(),
          lojista_telefone: lojistaTelefone.trim(),
          lojista_email: lojistaEmail.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao enviar convite')
      }

      const data = await res.json()

      // Open WhatsApp
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank')
      }

      setToast({ message: 'Convite criado com sucesso!', type: 'success' })
      setLojistaNome('')
      setLojistaTelefone('')
      setLojistaEmail('')

      // Refresh convites list
      fetchConvites()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar convite'
      setToast({ message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendWhatsApp = (convite: Convite) => {
    const fornecedorNome = convite.fornecedor_nome || user?.nome || 'Fornecedor'
    const whatsappUrl = buildWhatsAppUrl(convite, fornecedorNome)
    window.open(whatsappUrl, '_blank')
  }

  // Stats
  const totalIndicados = convites.length
  const aceitos = convites.filter(c => c.status === 'aceito').length
  const pendentes = convites.filter(c => c.status === 'pendente').length
  const receitaEstimada = aceitos * 99.90 * 0.10

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Indicacoes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Indique lojistas e ganhe 10% da mensalidade
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#336FB6]/10 flex items-center justify-center">
                <UserPlusIcon className="w-5 h-5 text-[#336FB6]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalIndicados}</p>
                <p className="text-xs text-gray-500">Total indicados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{aceitos}</p>
                <p className="text-xs text-gray-500">Aceitos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendentes}</p>
                <p className="text-xs text-gray-500">Pendentes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CurrencyIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {receitaEstimada.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-gray-500">Receita estimada/mes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <GiftIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Enviar novo convite</h2>
                <p className="text-xs text-gray-500">Preencha os dados do lojista e envie via WhatsApp</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="lojista_nome" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do lojista *
                </label>
                <input
                  id="lojista_nome"
                  type="text"
                  value={lojistaNome}
                  onChange={(e) => setLojistaNome(e.target.value)}
                  placeholder="Ex: Joao Silva"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#336FB6] focus:ring-1 focus:ring-[#336FB6] outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="lojista_telefone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone *
                </label>
                <input
                  id="lojista_telefone"
                  type="tel"
                  value={lojistaTelefone}
                  onChange={(e) => setLojistaTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#336FB6] focus:ring-1 focus:ring-[#336FB6] outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="lojista_email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email (opcional)
                </label>
                <input
                  id="lojista_email"
                  type="email"
                  value={lojistaEmail}
                  onChange={(e) => setLojistaEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#336FB6] focus:ring-1 focus:ring-[#336FB6] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mt-5">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#FFAA11] hover:bg-[#e89a0e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <WhatsAppIcon className="w-4 h-4" />
                    Enviar convite via WhatsApp
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Convites list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Convites enviados</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : convites.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lojista
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acao
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {convites.map((convite) => (
                      <tr key={convite.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{convite.lojista_nome}</p>
                            {convite.lojista_email && (
                              <p className="text-xs text-gray-500">{convite.lojista_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatPhone(convite.lojista_telefone)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={convite.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(convite.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {convite.status === 'pendente' && (
                            <button
                              onClick={() => handleResendWhatsApp(convite)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              Reenviar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {convites.map((convite) => (
                  <div key={convite.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{convite.lojista_nome}</p>
                          <StatusBadge status={convite.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatPhone(convite.lojista_telefone)}</p>
                        {convite.lojista_email && (
                          <p className="text-xs text-gray-400 mt-0.5">{convite.lojista_email}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(convite.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {convite.status === 'pendente' && (
                        <button
                          onClick={() => handleResendWhatsApp(convite)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          Reenviar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
                <SendIcon className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-gray-500 font-medium">Nenhum convite enviado ainda.</p>
              <p className="text-sm text-gray-400 mt-1">
                Use o formulario acima para convidar lojistas e ganhar comissao!
              </p>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <GiftIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-amber-900">Como funciona o programa de indicacoes</h4>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                <li>1. Envie um convite via WhatsApp para o lojista</li>
                <li>2. O lojista se cadastra usando o link do convite</li>
                <li>3. Quando o lojista assinar, voce ganha 10% da mensalidade</li>
                <li>4. A comissao e paga mensalmente enquanto o lojista for ativo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FornecedorLayout>
  )
}
