'use client'

import Link from 'next/link'
import { useAtualizacoesCatalogo } from '@/hooks/useAtualizacoesCatalogo'

/**
 * Banner que aparece no topo de /compras/catalogo (e outras telas) quando
 * há catálogos desatualizados. Convida o lojista a sincronizar antes do pedido.
 *
 * O modal gate obrigatório (Sprint 2.5) é o passo seguinte — este banner é só
 * awareness pra ele saber que tem mudanças sem precisar entrar no fluxo de pedido.
 */
export function BannerAtualizacoes({ className = '' }: { className?: string }) {
  const { data, loading } = useAtualizacoesCatalogo()

  if (loading || data.total_catalogos_desatualizados === 0) return null

  const fornecedoresLabel =
    data.total_catalogos_desatualizados === 1
      ? '1 fornecedor'
      : `${data.total_catalogos_desatualizados} fornecedores`

  const mudancasLabel =
    data.total_nao_vistas === 1 ? '1 mudança' : `${data.total_nao_vistas} mudanças`

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 ${className}`}
      role="status"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
        <svg
          className="w-5 h-5 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">
          Catálogo desatualizado em {fornecedoresLabel}
        </p>
        <p className="text-sm text-gray-600 mt-0.5 truncate">
          {mudancasLabel} pendente{data.total_nao_vistas > 1 ? 's' : ''}.{' '}
          {data.por_catalogo.slice(0, 2).map(c => c.fornecedor_nome).join(', ')}
          {data.por_catalogo.length > 2 ? ` e mais ${data.por_catalogo.length - 2}` : ''}.
        </p>
      </div>
      <Link
        href="/compras/atualizacoes"
        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Ver detalhes
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  )
}
