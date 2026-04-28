'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { LP_MODO_LABELS } from '@/lib/lp-helpers'
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
  const { loading: authLoading } = useFornecedorAuth()
  const [lps, setLps] = useState<LpListItem[]>([])
  const [loading, setLoading] = useState(true)

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
              <LpCard key={lp.id} lp={lp} />
            ))}
          </div>
        )}
      </div>
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

function LpCard({ lp }: { lp: LpListItem }) {
  const lojistaLabel = lp.lojista_nome_fantasia || lp.lojista_razao_social
  const modoLabel = LP_MODO_LABELS[lp.modo]

  return (
    <Link
      href={`/fornecedor/landing-pages/${lp.id}`}
      className="block bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(31,21,12,0.06)] transition-all duration-500 group"
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: lp.cor_marca || '#1F150C' }}
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500">
          {lp.ativa ? 'Ativa' : 'Inativa'}
        </span>
      </div>
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
  )
}
