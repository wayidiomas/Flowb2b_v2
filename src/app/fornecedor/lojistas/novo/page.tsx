'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { isValidCnpj, isValidEmail, isValidCelular, formatCnpj } from '@/lib/cnpj'
import type { CreateLojistaResponse, CreateLojistaError } from '@/types/lojista-vinculo'

export default function NovoLojistaPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<CreateLojistaResponse | null>(null)

  const [form, setForm] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    email_admin: '',
    nome_admin: '',
    celular: '',
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleCnpjBlur = async () => {
    const clean = form.cnpj.replace(/\D/g, '')
    if (clean.length === 14) {
      setForm(prev => ({ ...prev, cnpj: formatCnpj(clean) }))

      // Auto-fill via ReceitaWS (best-effort)
      if (!form.razao_social) {
        try {
          const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
          if (res.ok) {
            const data = await res.json()
            setForm(prev => ({
              ...prev,
              razao_social: prev.razao_social || data.razao_social || '',
              nome_fantasia: prev.nome_fantasia || data.nome_fantasia || '',
              email_admin: prev.email_admin || data.email || '',
              celular: prev.celular || data.ddd_telefone_1 || '',
            }))
          }
        } catch {
          /* silent */
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidCnpj(form.cnpj)) {
      setError('CNPJ invalido')
      return
    }
    if (!form.razao_social.trim()) {
      setError('Razao social e obrigatoria')
      return
    }
    if (!isValidEmail(form.email_admin)) {
      setError('Email invalido')
      return
    }
    if (!form.nome_admin.trim()) {
      setError('Nome do admin e obrigatorio')
      return
    }
    if (!isValidCelular(form.celular)) {
      setError('Celular invalido (informe DDD + numero)')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/fornecedor/lojistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: form.cnpj.replace(/\D/g, ''),
          razao_social: form.razao_social.trim(),
          nome_fantasia: form.nome_fantasia.trim() || undefined,
          email_admin: form.email_admin.toLowerCase().trim(),
          nome_admin: form.nome_admin.trim(),
          celular: form.celular.replace(/\D/g, ''),
          enviar_email_boas_vindas: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errData = data as CreateLojistaError
        setError(errData.error || 'Erro ao cadastrar lojista')
        return
      }

      setResultado(data as CreateLojistaResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  if (resultado) {
    return (
      <FornecedorLayout>
        <div className="max-w-xl mx-auto pt-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lojista cadastrado!</h2>
            <p className="text-sm text-gray-500 mb-6">
              {resultado.flags.email_sent
                ? 'Um email de boas-vindas foi enviado com as credenciais de acesso.'
                : 'Cadastro realizado, mas o email nao pode ser enviado. Compartilhe os dados manualmente:'}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">CNPJ (login)</span>
                <span className="font-mono font-medium text-gray-900">{resultado.empresa.cnpj}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Senha provisoria</span>
                <span className="font-mono font-medium text-gray-900">{resultado.primeiro_login.senha_provisoria}</span>
              </div>
            </div>

            {resultado.flags.empresa_already_existed && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 mb-4">
                Esta empresa ja existia no sistema. Foi adicionada a sua rede sem duplicar.
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                href="/fornecedor/lojistas"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-5 py-2.5 transition-all duration-300"
              >
                Ver lista
              </Link>
              <button
                onClick={() => {
                  setResultado(null)
                  setForm({ cnpj: '', razao_social: '', nome_fantasia: '', email_admin: '', nome_admin: '', celular: '' })
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98]"
              >
                Cadastrar outro
              </button>
            </div>
          </div>
        </div>
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/fornecedor/lojistas" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Voltar para lojistas
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
            Novo lojista
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            Cadastrar lojista
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            O lojista recebera um email com CNPJ e senha provisoria. Sera obrigado a trocar a senha no primeiro acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          {/* CNPJ */}
          <div>
            <label htmlFor="cnpj" className="block text-xs font-medium text-gray-700 mb-1.5">
              CNPJ <span className="text-rose-500">*</span>
            </label>
            <input
              id="cnpj"
              type="text"
              inputMode="numeric"
              maxLength={18}
              value={form.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              onBlur={handleCnpjBlur}
              placeholder="00.000.000/0000-00"
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] font-mono text-sm transition-colors"
              required
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Apos preencher, buscamos automaticamente Razao Social e contato (best-effort)
            </p>
          </div>

          {/* Razao Social */}
          <div>
            <label htmlFor="razao_social" className="block text-xs font-medium text-gray-700 mb-1.5">
              Razao Social <span className="text-rose-500">*</span>
            </label>
            <input
              id="razao_social"
              type="text"
              value={form.razao_social}
              onChange={(e) => handleChange('razao_social', e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] text-sm transition-colors"
              required
            />
          </div>

          {/* Nome Fantasia */}
          <div>
            <label htmlFor="nome_fantasia" className="block text-xs font-medium text-gray-700 mb-1.5">
              Nome Fantasia <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="nome_fantasia"
              type="text"
              value={form.nome_fantasia}
              onChange={(e) => handleChange('nome_fantasia', e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] text-sm transition-colors"
            />
          </div>

          {/* Admin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nome_admin" className="block text-xs font-medium text-gray-700 mb-1.5">
                Nome do admin <span className="text-rose-500">*</span>
              </label>
              <input
                id="nome_admin"
                type="text"
                value={form.nome_admin}
                onChange={(e) => handleChange('nome_admin', e.target.value)}
                placeholder="Ex: Joao Silva"
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] text-sm transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="celular" className="block text-xs font-medium text-gray-700 mb-1.5">
                Celular (com DDD) <span className="text-rose-500">*</span>
              </label>
              <input
                id="celular"
                type="tel"
                inputMode="tel"
                value={form.celular}
                onChange={(e) => handleChange('celular', e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] font-mono text-sm transition-colors"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email_admin" className="block text-xs font-medium text-gray-700 mb-1.5">
              Email do admin <span className="text-rose-500">*</span>
            </label>
            <input
              id="email_admin"
              type="email"
              value={form.email_admin}
              onChange={(e) => handleChange('email_admin', e.target.value)}
              placeholder="lojista@empresa.com.br"
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] text-sm transition-colors"
              required
            />
            <p className="text-[11px] text-gray-500 mt-1">Para enviar credenciais de acesso</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/fornecedor/lojistas"
              className="inline-flex items-center rounded-full border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-5 py-2.5 transition-all duration-300"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Cadastrando...' : 'Cadastrar lojista'}
            </button>
          </div>
        </form>
      </div>
    </FornecedorLayout>
  )
}
