'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from '@/components/ui'
import { LP_MODO_LABELS, LP_MODO_DESCRIPTIONS } from '@/lib/lp-helpers'
import { FLOWB2B_BLUE, FLOWB2B_ORANGE } from '@/lib/colors'
import type { LandingPage, LpModo } from '@/types/landing-page'

export default function LandingPageDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const lpId = Number(params.id)

  const [lp, setLp] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    modo: 'todos' as LpModo,
    hero_titulo: '',
    hero_subtitulo: '',
    descricao: '',
    whatsapp_contato: '',
    instagram_url: '',
    site_url: '',
    endereco_resumido: '',
    ativa: true,
  })

  useEffect(() => {
    if (!lpId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/fornecedor/landing-pages/${lpId}`)
        if (res.ok) {
          const data = await res.json()
          setLp(data.landing_page)
          setForm({
            nome: data.landing_page.nome,
            modo: data.landing_page.modo,
            hero_titulo: data.landing_page.hero_titulo || '',
            hero_subtitulo: data.landing_page.hero_subtitulo || '',
            descricao: data.landing_page.descricao || '',
            whatsapp_contato: data.landing_page.whatsapp_contato || '',
            instagram_url: data.landing_page.instagram_url || '',
            site_url: data.landing_page.site_url || '',
            endereco_resumido: data.landing_page.endereco_resumido || '',
            ativa: data.landing_page.ativa,
          })
        } else {
          setError('Landing page nao encontrada')
        }
      } catch (err) {
        console.error(err)
        setError('Erro ao carregar')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lpId])

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setError('Nome obrigatorio')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/fornecedor/landing-pages/${lpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          modo: form.modo,
          hero_titulo: form.hero_titulo.trim() || null,
          hero_subtitulo: form.hero_subtitulo.trim() || null,
          descricao: form.descricao.trim() || null,
          whatsapp_contato: form.whatsapp_contato.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          site_url: form.site_url.trim() || null,
          endereco_resumido: form.endereco_resumido.trim() || null,
          ativa: form.ativa,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        return
      }
      // Recarrega
      const refresh = await fetch(`/api/fornecedor/landing-pages/${lpId}`)
      if (refresh.ok) {
        const r = await refresh.json()
        setLp(r.landing_page)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/fornecedor/landing-pages/${lpId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/fornecedor/landing-pages')
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao deletar')
      }
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const copyLink = async () => {
    if (!lp) return
    const url = `${window.location.origin}/lp/${lp.slug}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      /* silent */
    }
  }

  if (loading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  if (!lp) {
    return (
      <FornecedorLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <p className="text-gray-500 mb-4">{error || 'Landing page nao encontrada'}</p>
          <Link
            href="/fornecedor/landing-pages"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2.5"
          >
            Voltar
          </Link>
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

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
              Editar landing page
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              {lp.nome}
            </h1>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            Excluir
          </button>
        </div>

        {/* Link publico */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-2">
            Link publico
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-900 truncate">
              /lp/{lp.slug}
            </code>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium px-3 py-2 transition-all"
            >
              {linkCopiado ? '✓ Copiado' : 'Copiar'}
            </button>
            <Link
              href={`/lp/${lp.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F150C] hover:bg-[#2a1d12] text-white text-xs font-medium px-3 py-2 transition-all"
            >
              Abrir
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div>
            <label htmlFor="nome" className="block text-xs font-medium text-gray-700 mb-1.5">
              Nome <span className="text-rose-500">*</span>
            </label>
            <input
              id="nome"
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F150C]/15 focus:border-[#1F150C] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Modo</label>
            <div className="space-y-2">
              {(['todos', 'comprados', 'selecao'] as LpModo[]).map(m => (
                <label
                  key={m}
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-300 ${
                    form.modo === m ? 'border-[#1F150C] bg-[#1F150C]/3' : 'border-gray-200 hover:border-gray-300'
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
                  </div>
                </label>
              ))}
            </div>
            {form.modo === 'selecao' && (
              <p className="text-xs text-amber-700 mt-2">
                Selecao manual de produtos: feature adicional de picker chega na proxima sprint.
              </p>
            )}
          </div>

          {/* Identidade visual: logo + banner + cor */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-3">
              Identidade visual
            </p>

            <ImageUploader
              lpId={lpId}
              kind="logo"
              currentUrl={lp.logo_url}
              label="Logo do fornecedor"
              hint="PNG ou JPG, max 2MB. Aparece no card do hero da landing page."
              aspect="aspect-square"
              onChange={(url) => setLp(prev => prev ? { ...prev, logo_url: url } : prev)}
            />

            <div className="mt-4">
              <ImageUploader
                lpId={lpId}
                kind="banner"
                currentUrl={lp.banner_url}
                label="Banner do hero (opcional)"
                hint="PNG ou JPG, max 2MB. Vira fundo do hero. Sem banner, usa um gradient da cor abaixo."
                aspect="aspect-[4/1]"
                onChange={(url) => setLp(prev => prev ? { ...prev, banner_url: url } : prev)}
              />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 px-3 py-2.5 flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ background: FLOWB2B_BLUE }} />
              <span className="w-3 h-3 rounded-full" style={{ background: FLOWB2B_ORANGE }} />
            </div>
            <span>A LP usa o azul e laranja FlowB2B padrao. A identidade visual fica no logo + banner.</span>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativa}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">LP ativa (acessivel publicamente)</span>
            </label>
          </div>

          <div>
            <label htmlFor="hero_titulo" className="block text-xs font-medium text-gray-700 mb-1.5">
              Titulo do hero
            </label>
            <input
              id="hero_titulo"
              type="text"
              value={form.hero_titulo}
              onChange={(e) => setForm({ ...form, hero_titulo: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm"
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
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm"
            />
          </div>

          {/* Sobre o fornecedor */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-3">
              Sobre voce
            </p>
            <div>
              <label htmlFor="descricao" className="block text-xs font-medium text-gray-700 mb-1.5">
                Descricao (opcional)
              </label>
              <textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={4}
                placeholder="Conte um pouco sobre seu negocio, anos de mercado, diferenciais..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
              />
              <p className="text-[11px] text-gray-500 mt-1">Aparece em uma secao 'Sobre' na LP publica.</p>
            </div>
          </div>

          {/* Contato */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-3">
              Contato e redes
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="whatsapp_contato" className="block text-xs font-medium text-gray-700 mb-1.5">
                  WhatsApp (com DDD)
                </label>
                <input
                  id="whatsapp_contato"
                  type="tel"
                  value={form.whatsapp_contato}
                  onChange={(e) => setForm({ ...form, whatsapp_contato: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-3.5 rounded-lg border border-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#336FB6]/15 focus:border-[#336FB6]"
                />
                <p className="text-[11px] text-gray-500 mt-1">Aparece como botao verde &quot;Falar agora&quot; no hero.</p>
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
                  placeholder="@suaempresa ou link completo"
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
          </div>

          {/* Live preview do hero */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-3">
              Preview do hero
            </p>
            <HeroPreview
              banner_url={lp.banner_url}
              logo_url={lp.logo_url}
              hero_titulo={form.hero_titulo}
              hero_subtitulo={form.hero_subtitulo}
              whatsapp_contato={form.whatsapp_contato}
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </div>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
          <ModalHeader onClose={() => setShowDeleteModal(false)}>
            <ModalTitle>Excluir landing page?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600">
              A landing page <strong>{lp.nome}</strong> sera removida. O link <code>/lp/{lp.slug}</code> deixara
              de funcionar.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button
              loading={deleting}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Excluir
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </FornecedorLayout>
  )
}

// ─── ImageUploader ───────────────────────────────────────────────────────────
function ImageUploader({
  lpId,
  kind,
  currentUrl,
  label,
  hint,
  aspect,
  onChange,
}: {
  lpId: number
  kind: 'logo' | 'banner'
  currentUrl: string | null
  label: string
  hint: string
  aspect: string
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch(`/api/fornecedor/landing-pages/${lpId}/upload`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar')
        return
      }
      onChange(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      const res = await fetch(`/api/fornecedor/landing-pages/${lpId}/upload?kind=${kind}`, {
        method: 'DELETE',
      })
      if (res.ok) onChange(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        <div
          className={`${aspect} ${kind === 'logo' ? 'w-24' : 'flex-1 max-w-md'} rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0`}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-2">{hint}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700 transition-all disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : currentUrl ? 'Substituir' : 'Selecionar arquivo'}
            </button>
            {currentUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-300 text-rose-600 transition-all disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>
          {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── HeroPreview (live) ───────────────────────────────────────────────────────
function HeroPreview({
  banner_url,
  logo_url,
  hero_titulo,
  hero_subtitulo,
  whatsapp_contato,
}: {
  banner_url: string | null
  logo_url: string | null
  hero_titulo: string
  hero_subtitulo: string
  whatsapp_contato: string
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-[#F5F7FA]">
      <div
        className="h-28 relative"
        style={
          banner_url
            ? { backgroundImage: `url(${banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, ${FLOWB2B_BLUE} 0%, #2660A5 60%, ${FLOWB2B_ORANGE} 130%)` }
        }
      >
        {banner_url && <div className="absolute inset-0 bg-black/30" />}
      </div>
      <div className="px-4 -mt-10 pb-4">
        <div className="bg-white rounded-xl shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)] p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-400">F</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{hero_titulo || 'Titulo do hero'}</p>
            {hero_subtitulo && <p className="text-xs text-gray-500 truncate">{hero_subtitulo}</p>}
          </div>
          {whatsapp_contato && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#25D366] text-white text-[10px] font-medium px-2 py-1 shrink-0">
              WhatsApp
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
