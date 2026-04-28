'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Button, Skeleton } from '@/components/ui'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import type { LojistaListItem } from '@/types/lojista-vinculo'

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function StorefrontIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  )
}

export default function FornecedorLojistasPage() {
  const { loading: authLoading } = useFornecedorAuth()
  const [lojistas, setLojistas] = useState<LojistaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number>(0)
  useEffect(() => {
    setNow(Date.now())
  }, [])

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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
              Rede de lojistas
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              Lojistas vinculados
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre lojistas pra criar landing pages personalizadas e enviar pedidos diretos
            </p>
          </div>
          <Link
            href="/fornecedor/lojistas/novo"
            className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] shrink-0"
          >
            <PlusIcon />
            Cadastrar lojista
          </Link>
        </div>

        {/* Conteudo */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : lojistas.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {lojistas.map(l => (
              <LojistaCard key={l.empresa_id} lojista={l} now={now} />
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
        <StorefrontIcon />
      </div>
      <h3 className="text-base font-medium text-gray-900 mb-1">Nenhum lojista cadastrado</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Cadastre o primeiro lojista pra abrir o fluxo de landing pages personalizadas
      </p>
      <Link
        href="/fornecedor/lojistas/novo"
        className="inline-flex items-center gap-2 rounded-full bg-[#1F150C] hover:bg-[#2a1d12] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98]"
      >
        <PlusIcon />
        Cadastrar primeiro lojista
      </Link>
    </div>
  )
}

function formatLastLogin(iso: string | null, now: number): string {
  if (!iso) return 'Nunca acessou'
  const d = new Date(iso)
  const dias = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 1) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 30) return `${dias}d atras`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function LojistaCard({ lojista, now }: { lojista: LojistaListItem; now: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(31,21,12,0.06)] transition-all duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-medium text-gray-900 truncate">
              {lojista.nome_fantasia || lojista.razao_social}
            </h3>
            {lojista.last_login_at === null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium uppercase tracking-wider">
                Aguardando 1o acesso
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-gray-500 mt-0.5">{lojista.cnpj}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {lojista.admin_email && <span>{lojista.admin_email}</span>}
            {lojista.celular_principal && (
              <span className="font-mono">{lojista.celular_principal}</span>
            )}
            <span>Ultimo acesso: {formatLastLogin(lojista.last_login_at, now)}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled>
          Detalhes em breve
        </Button>
      </div>
    </div>
  )
}
