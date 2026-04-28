'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from '@/components/ui'
import { LP_MODO_LABELS, LP_MODO_DESCRIPTIONS } from '@/lib/lp-helpers'
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
    cor_marca: '',
    hero_titulo: '',
    hero_subtitulo: '',
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
            cor_marca: data.landing_page.cor_marca || '',
            hero_titulo: data.landing_page.hero_titulo || '',
            hero_subtitulo: data.landing_page.hero_subtitulo || '',
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
          cor_marca: form.cor_marca || undefined,
          hero_titulo: form.hero_titulo.trim() || null,
          hero_subtitulo: form.hero_subtitulo.trim() || null,
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cor_marca" className="block text-xs font-medium text-gray-700 mb-1.5">
                Cor da marca
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="cor_marca"
                  type="color"
                  value={form.cor_marca || '#1F150C'}
                  onChange={(e) => setForm({ ...form, cor_marca: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.cor_marca}
                  onChange={(e) => setForm({ ...form, cor_marca: e.target.value })}
                  placeholder="#RRGGBB"
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-300 font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer h-10">
                <input
                  type="checkbox"
                  checked={form.ativa}
                  onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">LP ativa (acessivel publicamente)</span>
              </label>
            </div>
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
