'use client'

import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAtualizacoesCatalogo } from '@/hooks/useAtualizacoesCatalogo'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export default function AtualizacoesOverviewPage() {
  const { data, loading } = useAtualizacoesCatalogo()

  return (
    <DashboardLayout>
      <PageHeader
        title="Atualizações de catálogo"
        subtitle="Catálogos de fornecedores com mudanças pendentes"
      />

      {loading && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
          Carregando...
        </div>
      )}

      {!loading && data.total_catalogos_desatualizados === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-gray-900 mb-1">Tudo em dia!</p>
          <p className="text-sm text-gray-500">Nenhum catálogo com pendências.</p>
        </div>
      )}

      {!loading && data.total_catalogos_desatualizados > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-3">
            <strong className="font-semibold text-gray-900">{data.total_nao_vistas}</strong>{' '}
            mudança{data.total_nao_vistas !== 1 ? 's' : ''} pendente{data.total_nao_vistas !== 1 ? 's' : ''} em{' '}
            <strong className="font-semibold text-gray-900">{data.total_catalogos_desatualizados}</strong>{' '}
            catálogo{data.total_catalogos_desatualizados !== 1 ? 's' : ''}.
          </div>

          {data.por_catalogo.map(c => (
            <Link
              key={c.catalogo_id}
              href={`/compras/atualizacoes/${c.catalogo_id}`}
              className="block bg-white rounded-xl border border-gray-100 hover:border-amber-300 hover:shadow-sm transition-all p-4"
            >
              <div className="flex items-center gap-4">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.fornecedor_nome}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-50 flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{ backgroundColor: c.cor_primaria || '#336FB6' }}
                  >
                    {c.fornecedor_nome.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.fornecedor_nome}</p>
                  <p className="text-sm text-gray-500">
                    Atualizado em {formatDate(c.ultima_publicacao_at)}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                    {c.qtd_nao_vistas}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">mudança{c.qtd_nao_vistas !== 1 ? 's' : ''}</p>
                </div>

                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
