'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSincronizarCatalogo } from '@/hooks/useSincronizarCatalogo'
import type { CatalogoAtualizado } from '@/hooks/useAtualizacoesCatalogo'

interface ModalSincronizarCatalogoProps {
  /** Dados do catálogo desatualizado (vindo do hook useAtualizacoesCatalogo) */
  catalogo: CatalogoAtualizado
  /** Callback chamado APÓS sincronização bem-sucedida — pai deve prosseguir */
  onSincronizado: () => void
  /** Callback se usuário decidir voltar (escolher outro fornecedor) */
  onVoltar: () => void
}

/**
 * Modal gate obrigatório do fluxo de pedido. Aparece quando o lojista escolhe
 * um fornecedor com catálogo desatualizado. Sem sincronizar não dá pra prosseguir
 * com o pedido — botão "Voltar" leva à seleção de outro fornecedor.
 *
 * Após sincronizar com sucesso, chama onSincronizado para o pai prosseguir.
 */
export function ModalSincronizarCatalogo({
  catalogo,
  onSincronizado,
  onVoltar
}: ModalSincronizarCatalogoProps) {
  const { sincronizar, loading, error, result } = useSincronizarCatalogo()
  const [autoCerrouViaSucesso, setAutoCerrouViaSucesso] = useState(false)

  // Após sincronizar com sucesso, fecha automaticamente após 1.2s
  useEffect(() => {
    if (result && !autoCerrouViaSucesso) {
      setAutoCerrouViaSucesso(true)
      const t = setTimeout(() => onSincronizado(), 1200)
      return () => clearTimeout(t)
    }
  }, [result, autoCerrouViaSucesso, onSincronizado])

  const handleSincronizar = async () => {
    try {
      await sincronizar(catalogo.catalogo_id)
    } catch {
      // erro já está em error state
    }
  }

  const totalLabel = catalogo.qtd_nao_vistas === 1 ? '1 mudança' : `${catalogo.qtd_nao_vistas} mudanças`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Catálogo desatualizado</h2>
              <p className="text-xs text-gray-500 truncate">{catalogo.fornecedor_nome}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {!result && !error && (
              <>
                <p className="text-sm text-gray-700 leading-relaxed">
                  O fornecedor <strong className="font-semibold">{catalogo.fornecedor_nome}</strong> publicou{' '}
                  <strong className="font-semibold">{totalLabel}</strong> no catálogo.
                </p>
                <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                  Você precisa <strong className="font-semibold">sincronizar</strong> antes de criar um pedido — assim
                  os preços e itens novos entram nos seus dados e a sugestão de compra usa os valores certos.
                </p>
                <Link
                  href={`/compras/atualizacoes/${catalogo.catalogo_id}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#336FB6] hover:text-[#2660A5] font-medium"
                >
                  Ver detalhes das mudanças
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p className="font-medium mb-1">Erro ao sincronizar</p>
                <p>{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Sincronizado com sucesso
                </div>
                <ul className="text-emerald-700 space-y-0.5">
                  {result.aplicados.precos > 0 && <li>{result.aplicados.precos} preço{result.aplicados.precos > 1 ? 's' : ''} atualizado{result.aplicados.precos > 1 ? 's' : ''}</li>}
                  {result.aplicados.novos > 0 && <li>{result.aplicados.novos} item{result.aplicados.novos > 1 ? 'ns' : ''} novo{result.aplicados.novos > 1 ? 's' : ''}</li>}
                  {result.aplicados.dados > 0 && <li>{result.aplicados.dados} alteração{result.aplicados.dados > 1 ? 'ões' : ''} de dados</li>}
                  {result.aplicados.removidos > 0 && <li>{result.aplicados.removidos} removido{result.aplicados.removidos > 1 ? 's' : ''}</li>}
                </ul>
                {result.erros.length > 0 && (
                  <p className="mt-2 text-amber-700">
                    {result.erros.length} mudança{result.erros.length > 1 ? 's' : ''} com erro — registrado para revisão
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!result && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                onClick={onVoltar}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Escolher outro fornecedor
              </button>
              <button
                onClick={handleSincronizar}
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Sincronizando...
                  </>
                ) : (
                  <>Sincronizar agora</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
