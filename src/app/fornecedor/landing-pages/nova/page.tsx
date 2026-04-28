'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'
import { LP_MODO_LABELS, LP_MODO_DESCRIPTIONS } from '@/lib/lp-helpers'
import type { LpModo } from '@/types/landing-page'
import type { LojistaListItem } from '@/types/lojista-vinculo'

export default function NovaLandingPagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lojistas, setLojistas] = useState<LojistaListItem[]>([])

  const [form, setForm] = useState({
    empresa_id_lojista: '', // vazio = LP generica publica
    nome: '',
    modo: 'todos' as LpModo,
    hero_titulo: '',
    hero_subtitulo: '',
    descricao: '',
    whatsapp_contato: '',
    instagram_url: '',
    site_url: '',
    endereco_resumido: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/fornecedor/lojistas')
        if (res.ok) {
          const data = await res.json()
          setLojistas(data.lojistas || [])
        }
      } catch (err) {
        console.error('Erro ao carregar lojistas:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome obrigatorio')
      return
    }
    if (form.modo === 'comprados' && !form.empresa_id_lojista) {
      setError('Modo "ja comprados" exige um lojista alvo')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/fornecedor/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id_lojista: form.empresa_id_lojista ? Number(form.empresa_id_lojista) : null,
          nome: form.nome.trim(),
          modo: form.modo,
          hero_titulo: form.hero_titulo.trim() || undefined,
          hero_subtitulo: form.hero_subtitulo.trim() || undefined,
          descricao: form.descricao.trim() || undefined,
          whatsapp_contato: form.whatsapp_contato.trim() || undefined,
          instagram_url: form.instagram_url.trim() || undefined,
          site_url: form.site_url.trim() || undefined,
          endereco_resumido: form.endereco_resumido.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar landing page')
        return
      }
      router.push(`/fornecedor/landing-pages/${data.landing_page.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-96" />
        </div>
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/fornecedor/landing-pages" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Voltar para landing pages
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
            Nova landing page
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            Criar landing page
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vai gerar um link publico que voce pode compartilhar com o lojista. Voce pode editar tudo depois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          {/* Lojista alvo (opcional) */}
          <div>
            <label htmlFor="lojista" className="block text-xs font-medium text-gray-700 mb-1.5">
              Lojista alvo <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              id="lojista"
              value={form.empresa_id_lojista}
              onChange={(e) => { setForm({ ...form, empresa_id_lojista: e.target.value }); setError('') }}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
            >
              <option value="">LP generica (publica para todos)</option>
              {lojistas.map(l => (
                <option key={l.empresa_id} value={l.empresa_id}>
                  {l.nome_fantasia || l.razao_social} · {l.cnpj}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              LP generica e publica e qualquer um pode ver. Lojista alvo e usado pra modo &quot;ja comprados&quot;.
            </p>
          </div>

            {/* Nome da LP */}
            <div>
              <label htmlFor="nome" className="block text-xs font-medium text-gray-700 mb-1.5">
                Nome da landing page <span className="text-rose-500">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={form.nome}
                onChange={(e) => { setForm({ ...form, nome: e.target.value }); setError('') }}
                placeholder="Ex: Catalogo MEDICALVET para Pet Shop ABC"
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] text-sm"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">O slug do link sera gerado automaticamente</p>
            </div>

            {/* Modo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Quais produtos vao aparecer na vitrine? <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {(['todos', 'comprados', 'selecao'] as LpModo[]).map(m => (
                  <label
                    key={m}
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-300 ${
                      form.modo === m
                        ? 'border-[#1F150C] bg-[#1F150C]/3'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modo"
                      value={m}
                      checked={form.modo === m}
                      onChange={(e) => setForm({ ...form, modo: e.target.value as LpModo })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{LP_MODO_LABELS[m]}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{LP_MODO_DESCRIPTIONS[m]}</p>
                      {m === 'selecao' && form.modo === 'selecao' && (
                        <p className="text-xs text-amber-700 mt-1.5">
                          Voce podera selecionar os produtos na proxima tela apos criar a LP.
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Personalizacao */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
                Personalizacao (opcional)
              </p>

              <div>
                <label htmlFor="hero_titulo" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Titulo do hero
                </label>
                <input
                  id="hero_titulo"
                  type="text"
                  value={form.hero_titulo}
                  onChange={(e) => setForm({ ...form, hero_titulo: e.target.value })}
                  placeholder="Ex: Catalogo exclusivo CDA"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>

              <div>
                <label htmlFor="hero_subtitulo" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Subtitulo do hero
                </label>
                <input
                  id="hero_subtitulo"
                  type="text"
                  value={form.hero_subtitulo}
                  onChange={(e) => setForm({ ...form, hero_subtitulo: e.target.value })}
                  placeholder="Ex: Os melhores precos pra sua loja"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6] text-sm"
                />
              </div>

              <div>
                <label htmlFor="descricao" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Descricao &quot;Sobre voce&quot;
                </label>
                <textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  placeholder="Conte um pouco sobre seu negocio..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="whatsapp_contato" className="block text-xs font-medium text-gray-700 mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    id="whatsapp_contato"
                    type="tel"
                    value={form.whatsapp_contato}
                    onChange={(e) => setForm({ ...form, whatsapp_contato: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label htmlFor="endereco_resumido" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Cidade / endereco
                  </label>
                  <input
                    id="endereco_resumido"
                    type="text"
                    value={form.endereco_resumido}
                    onChange={(e) => setForm({ ...form, endereco_resumido: e.target.value })}
                    placeholder="Ex: Sao Paulo / SP"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label htmlFor="instagram_url" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Instagram
                  </label>
                  <input
                    id="instagram_url"
                    type="text"
                    value={form.instagram_url}
                    onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                    placeholder="@suaempresa"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
                  />
                </div>
                <div>
                  <label htmlFor="site_url" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Site
                  </label>
                  <input
                    id="site_url"
                    type="text"
                    value={form.site_url}
                    onChange={(e) => setForm({ ...form, site_url: e.target.value })}
                    placeholder="suaempresa.com.br"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-500">
                Logo e banner sao adicionados depois de criar a LP.
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/fornecedor/landing-pages"
                className="inline-flex items-center rounded-full border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-5 py-2.5 transition-all duration-300"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#336FB6] hover:bg-[#2660A5] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Criando...' : 'Criar landing page'}
              </button>
            </div>
          </form>
      </div>
    </FornecedorLayout>
  )
}
