'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RepresentanteLayout } from '@/components/layout/RepresentanteLayout'
import { Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from '@/components/ui'
import { useRepresentanteAuth } from '@/contexts/RepresentanteAuthContext'
import { LP_MODO_LABELS } from '@/lib/lp-helpers'
import type { LpRepListItem } from '@/types/landing-page'

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

export default function RepresentanteLandingPagesListPage() {
  const { user, loading: authLoading } = useRepresentanteAuth()
  const [lps, setLps] = useState<LpRepListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [shareLp, setShareLp] = useState<LpRepListItem | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/representante/landing-pages')
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
      <RepresentanteLayout>
        <Skeleton className="h-32" />
      </RepresentanteLayout>
    )
  }

  return (
    <RepresentanteLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
              Vitrines digitais
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              Minhas landing pages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Crie vitrines com a sua marca agregando os fornecedores que voce atende
            </p>
          </div>
          <Link
            href="/representante/landing-pages/nova"
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
              <LpCard
                key={lp.id}
                lp={lp}
                onShare={() => { setShareLp(lp); setLinkCopiado(false) }}
              />
            ))}
          </div>
        )}
      </div>

      {shareLp && (
        <Modal isOpen onClose={() => setShareLp(null)} size="md">
          <ModalHeader onClose={() => setShareLp(null)}>
            <ModalTitle>Compartilhar landing page</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Envie o link da LP <strong>{shareLp.nome}</strong>
              {shareLp.lojista_nome ? <> para <strong>{shareLp.lojista_nome}</strong></> : null}.
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
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Ola! Da uma olhada no catalogo que preparei pra voce: ${typeof window !== 'undefined' ? window.location.origin : ''}/lp/${shareLp.slug}` +
                  (user?.nome ? ` — ${user.nome}` : '')
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1faa56] text-white text-sm font-medium px-4 py-2.5 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z" />
                </svg>
                Abrir WhatsApp
              </a>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShareLp(null)}>Fechar</Button>
          </ModalFooter>
        </Modal>
      )}
    </RepresentanteLayout>
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
        Crie uma vitrine com a sua marca, agregando os produtos dos fornecedores que voce representa.
      </p>
      <Link
        href="/representante/landing-pages/nova"
        className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98]"
      >
        <PlusIcon />
        Criar primeira LP
      </Link>
    </div>
  )
}

function LpCard({ lp, onShare }: { lp: LpRepListItem; onShare: () => void }) {
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

      {lp.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lp.banner_url}
          alt="banner"
          className="w-full h-20 rounded-lg object-cover mb-3"
        />
      )}

      <Link href={`/representante/landing-pages/${lp.id}`} className="block">
        <h3 className="text-base font-medium text-gray-900 mb-1 truncate">{lp.nome}</h3>
        {lp.lojista_nome && (
          <p className="text-sm text-gray-500 truncate mb-3">para {lp.lojista_nome}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{modoLabel}</span>
          <span className="font-mono">{lp.produtos_count} produtos</span>
        </div>
        <p className="font-mono text-[11px] text-gray-400 mt-3 truncate">/lp/{lp.slug}</p>
      </Link>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <Link
          href={`/representante/landing-pages/${lp.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium px-3 py-2 transition-all"
        >
          Editar
        </Link>
        <Link
          href={`/lp/${lp.slug}`}
          target="_blank"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1F150C]/5 hover:bg-[#1F150C]/10 text-[#1F150C] text-xs font-medium px-3 py-2 transition-all"
        >
          Ver pública
        </Link>
        <button
          onClick={onShare}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1faa56] text-xs font-medium px-3 py-2 transition-all"
        >
          Compartilhar
        </button>
      </div>
    </div>
  )
}
