'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ContagemAtualizacoes } from '@/hooks/useAtualizacoesCatalogo'

interface AtualizacoesPendentesModalGlobalProps {
  data: ContagemAtualizacoes
  onRemindTomorrow: () => void
  onDismissForSession: () => void
}

const PER_PAGE = 5

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Modal global pós-login (não-bloqueante) que mostra resumo dos catálogos
 * com mudanças pendentes. Botões: "Lembrar amanhã" (suprime 24h) e "Ver agora"
 * (leva para /compras/atualizacoes). Paginação interna 5/página.
 */
export function AtualizacoesPendentesModalGlobal({
  data,
  onRemindTomorrow,
  onDismissForSession
}: AtualizacoesPendentesModalGlobalProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.por_catalogo.length / PER_PAGE))
  const offset = (page - 1) * PER_PAGE
  const visiveis = data.por_catalogo.slice(offset, offset + PER_PAGE)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={onDismissForSession}
          aria-label="Fechar modal"
        />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Catálogos com atualizações</h2>
              <p className="text-xs text-gray-500">
                {data.total_nao_vistas} mudança{data.total_nao_vistas !== 1 ? 's' : ''} em{' '}
                {data.total_catalogos_desatualizados} fornecedor{data.total_catalogos_desatualizados !== 1 ? 'es' : ''}
              </p>
            </div>
            <button
              onClick={onDismissForSession}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <ul className="space-y-2">
              {visiveis.map(c => (
                <li key={c.catalogo_id}>
                  <Link
                    href={`/compras/atualizacoes/${c.catalogo_id}`}
                    onClick={onDismissForSession}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50/30 transition-all"
                  >
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.fornecedor_nome}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-50 flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: c.cor_primaria || '#336FB6' }}
                      >
                        {c.fornecedor_nome.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.fornecedor_nome}</p>
                      <p className="text-xs text-gray-500">
                        Atualizado em {formatDate(c.ultima_publicacao_at)}
                      </p>
                    </div>

                    <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[2rem] h-7 px-2 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      {c.qtd_nao_vistas}
                    </span>

                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
            <button
              onClick={onRemindTomorrow}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Lembrar amanhã
            </button>
            <Link
              href="/compras/atualizacoes"
              onClick={onDismissForSession}
              className="px-5 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Ver todas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
