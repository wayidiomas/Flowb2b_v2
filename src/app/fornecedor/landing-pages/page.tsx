'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from '@/components/ui'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { LP_MODO_LABELS } from '@/lib/lp-helpers'
import { buildLpShareWhatsappUrl } from '@/lib/whatsapp'
import type { LpListItem } from '@/types/landing-page'

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  )
}

export default function LandingPagesListPage() {
  const { user, loading: authLoading } = useFornecedorAuth()
  const [lps, setLps] = useState<LpListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [shareLp, setShareLp] = useState<LpListItem | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/fornecedor/landing-pages')
        if (res.ok) {
          const data = await res.json()
          setLps(data.landing_pages || [])
        }
      } catch (err) {
        console.error('Erro ao carregar LPs:', err)
      } finally {
        setLoading(false)
      }
    }
    if (!authLoading) load()
  }, [authLoading])

  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-32" />
      </FornecedorLayout>
    )
  }

  return (
    <FornecedorLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
              Vitrines digitais
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              Landing pages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Crie vitrines personalizadas pra cada lojista visualizar seu catalogo
            </p>
          </div>
          <Link
            href="/fornecedor/landing-pages/nova"
            className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] shrink-0"
          >
            <PlusIcon />
            Nova landing page
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : lps.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lps.map(lp => (
              <LpCard key={lp.id} lp={lp} onShare={() => { setShareLp(lp); setLinkCopiado(false) }} />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareLp && (
        <Modal isOpen onClose={() => setShareLp(null)} size="md">
          <ModalHeader onClose={() => setShareLp(null)}>
            <ModalTitle>Compartilhar landing page</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Envie o link da LP <strong>{shareLp.nome}</strong> direto pra <strong>{shareLp.lojista_nome_fantasia || shareLp.lojista_razao_social}</strong>.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-1">
                Link publico
              </p>
              <code className="text-xs font-mono text-gray-900 break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/lp/${shareLp.slug}` : `/lp/${shareLp.slug}`}
              </code>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/lp/${shareLp.slug}`
                  try {
                    await navigator.clipboard.writeText(url)
                    setLinkCopiado(true)
                    setTimeout(() => setLinkCopiado(false), 2000)
                  } catch { /* silent */ }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2.5 transition-all"
              >
                {linkCopiado ? '✓ Link copiado' : 'Copiar link'}
              </button>

              <a
                href={buildLpShareWhatsappUrl({
                  celular: null, // celular do lojista pode ser preenchido se quiser; envia pelo WA Web sem destinatario
                  fornecedorNome: user?.nome || 'Fornecedor',
                  lojistaNome: shareLp.lojista_nome_fantasia || shareLp.lojista_razao_social,
                  appUrl: typeof window !== 'undefined' ? window.location.origin : '',
                  slug: shareLp.slug,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1faa56] text-white text-sm font-medium px-4 py-2.5 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
                Abrir WhatsApp
              </a>
            </div>

            <p className="text-[11px] text-gray-400 mt-3 text-center">
              O WhatsApp vai abrir com mensagem pre-preenchida. Confirme o destinatario no app.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShareLp(null)}>Fechar</Button>
          </ModalFooter>
        </Modal>
      )}
    </FornecedorLayout>
  )
}

function EmptyState() {
  return (
    <div className="border border-dashed border-gray-300 rounded-2xl p-12 text-center bg-white">
      <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
        <LayersIcon />
      </div>
      <h3 className="text-base font-medium text-gray-900 mb-1">Nenhuma landing page</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Crie uma vitrine personalizada pra cada lojista. O link pode ser enviado por WhatsApp.
      </p>
      <Link
        href="/fornecedor/landing-pages/nova"
        className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98]"
      >
        <PlusIcon />
        Criar primeira LP
      </Link>
    </div>
  )
}

function LpCard({ lp, onShare }: { lp: LpListItem; onShare: () => void }) {
  const lojistaLabel = lp.lojista_nome_fantasia || lp.lojista_razao_social
  const modoLabel = LP_MODO_LABELS[lp.modo]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(31,21,12,0.06)] transition-all duration-500 group">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: lp.cor_marca || '#336FB6' }}
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500">
          {lp.ativa ? 'Ativa' : 'Inativa'}
        </span>
      </div>
      <Link href={`/fornecedor/landing-pages/${lp.id}`} className="block">
        <h3 className="text-base font-medium text-gray-900 mb-1 truncate">{lp.nome}</h3>
        <p className="text-sm text-gray-500 truncate mb-3">para {lojistaLabel}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{modoLabel}</span>
          {lp.modo === 'selecao' && (
            <span className="font-mono">{lp.produtos_count} produtos</span>
          )}
        </div>
        <p className="font-mono text-[11px] text-gray-400 mt-3 truncate">/lp/{lp.slug}</p>
      </Link>
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <Link
          href={`/fornecedor/landing-pages/${lp.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium px-3 py-2 transition-all"
        >
          Editar
        </Link>
        <button
          onClick={onShare}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1faa56] text-xs font-medium px-3 py-2 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          Compartilhar
        </button>
      </div>
    </div>
  )
}
