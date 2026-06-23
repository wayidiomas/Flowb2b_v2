'use client'

export interface ComparativoLoja {
  empresa_id: number
  empresa_nome: string
  preco: number
  origem: string | null
  atualizado_em: string | null
  is_atual: boolean
}

interface ComparativoPrecosModalProps {
  produtoNome: string | null
  gtin: string
  fornecedorNome?: string
  // Preco que o fornecedor esta cotando agora (espelho), para contexto.
  precoCotado?: number | null
  lojas: ComparativoLoja[]
  formatCurrency: (value: number) => string
  onClose: () => void
}

// Label honesto da origem/recencia do preco cadastrado.
function origemLabel(origem: string | null, atualizadoEm: string | null): string {
  if (atualizadoEm) {
    const d = new Date(atualizadoEm)
    const data = Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    if (origem === 'catalogo') return data ? `catálogo · ${data}` : 'catálogo'
    return data ? `atualizado ${data}` : 'do ERP'
  }
  return 'do ERP · sem data'
}

export function ComparativoPrecosModal({
  produtoNome,
  gtin,
  fornecedorNome,
  precoCotado,
  lojas,
  formatCurrency,
  onClose,
}: ComparativoPrecosModalProps) {
  const ordenadas = [...lojas].sort((a, b) => a.preco - b.preco)
  const menorPreco = ordenadas.length ? ordenadas[0].preco : 0

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-primary-50 to-secondary-50 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 break-words">
                {produtoNome || 'Produto'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                EAN {gtin}
                {fornecedorNome ? <> · {fornecedorNome}</> : null}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-7 h-7 rounded-lg hover:bg-white/70 text-gray-400 hover:text-gray-600 flex items-center justify-center"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          {precoCotado != null && precoCotado > 0 && (
            <p className="mt-2 text-xs text-gray-600">
              Cotado agora neste pedido:{' '}
              <span className="font-semibold text-gray-900">{formatCurrency(precoCotado)}</span>
            </p>
          )}
        </div>

        {/* Tabela: preco aplicado por loja */}
        <div className="p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Preço deste fornecedor em cada loja sua
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left py-2 font-semibold">Loja</th>
                <th className="text-right py-2 font-semibold">Preço aplicado</th>
                <th className="text-left py-2 pl-3 font-semibold">Origem</th>
                <th className="text-right py-2 font-semibold">vs menor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordenadas.map((l) => {
                const ehMenor = l.preco === menorPreco
                const deltaPct = menorPreco > 0 ? ((l.preco - menorPreco) / menorPreco) * 100 : 0
                return (
                  <tr key={l.empresa_id} className={l.is_atual ? 'bg-primary-50/40' : ''}>
                    <td className="py-2.5 text-gray-900">
                      <span className="font-medium">{l.empresa_nome}</span>
                      {l.is_atual && (
                        <span className="ml-1.5 text-[10px] font-semibold text-primary-600">(atual)</span>
                      )}
                      {ehMenor && (
                        <span className="ml-1.5 text-[10px] font-semibold text-green-600">★ menor</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-gray-900">
                      {formatCurrency(l.preco)}
                    </td>
                    <td className="py-2.5 pl-3 text-[11px] text-gray-400">
                      {origemLabel(l.origem, l.atualizado_em)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {ehMenor ? (
                        <span className="text-green-600 font-medium">—</span>
                      ) : (
                        <span className="text-red-500 font-medium">+{deltaPct.toFixed(1)}%</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-gray-400 leading-snug">
            Preços do cadastro de cada loja (último valor aplicado). &quot;Sem data&quot; = veio do
            ERP e pode estar desatualizado.
          </p>
        </div>
      </div>
    </div>
  )
}
