'use client'

import { useAuth } from '@/contexts/AuthContext'

interface EmpresaMultiSelectProps {
  value: number[]
  onChange: (empresaIds: number[]) => void
  label?: string
  helperText?: string
  /** IDs desabilitados (ex: lojas que ja tem o registro) - nao podem ser marcados */
  disabledIds?: number[]
  /** Label mostrada ao lado das lojas desabilitadas */
  disabledLabel?: string
  /** Se true, nao mostra o check "Ativa" (util em replicacao) */
  hideActiveTag?: boolean
}

export function EmpresaMultiSelect({
  value,
  onChange,
  label = 'Aplicar em quais lojas?',
  helperText,
  disabledIds = [],
  disabledLabel = 'Ja cadastrado',
  hideActiveTag = false,
}: EmpresaMultiSelectProps) {
  const { empresas, empresa: empresaAtiva } = useAuth()

  if (!empresas || empresas.length <= 1) return null

  const disabledSet = new Set(disabledIds)
  const selectableIds = empresas.map(e => e.id).filter(id => !disabledSet.has(id))
  const selectableCount = selectableIds.length
  const allSelectableSelected = selectableCount > 0 && selectableIds.every(id => value.includes(id))
  const noneSelected = value.length === 0

  const toggle = (id: number) => {
    if (disabledSet.has(id)) return
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const selectAll = () => onChange(selectableIds)
  const clearAll = () => onChange([])

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-500">
          {value.length} de {selectableCount} loja{selectableCount !== 1 ? 's' : ''}
          {disabledIds.length > 0 && ` · ${disabledIds.length} indisponivel(is)`}
        </span>
      </div>

      {helperText && (
        <p className="text-xs text-gray-500 mb-2">{helperText}</p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={selectAll}
          disabled={allSelectableSelected || selectableCount === 0}
          className="px-3 py-1 text-xs font-medium text-[#336FB6] hover:bg-[#336FB6]/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Selecionar todas
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={noneSelected}
          className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Limpar
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg max-h-[180px] overflow-y-auto divide-y divide-gray-100">
        {empresas.map(e => {
          const checked = value.includes(e.id)
          const isAtiva = empresaAtiva?.id === e.id
          const isDisabled = disabledSet.has(e.id)
          const nome = e.nome_fantasia || e.razao_social
          return (
            <label
              key={e.id}
              className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                isDisabled
                  ? 'bg-gray-50 cursor-not-allowed opacity-60'
                  : `cursor-pointer hover:bg-gray-50 ${checked ? 'bg-[#336FB6]/5' : ''}`
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isDisabled}
                onChange={() => toggle(e.id)}
                className="w-4 h-4 text-[#336FB6] border-gray-300 rounded focus:ring-[#336FB6] cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>{nome}</p>
                  {!hideActiveTag && isAtiva && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#336FB6]/10 text-[#336FB6] rounded uppercase">
                      Ativa
                    </span>
                  )}
                  {isDisabled && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 text-gray-600 rounded uppercase">
                      {disabledLabel}
                    </span>
                  )}
                </div>
                {e.cnpj && (
                  <p className="text-xs text-gray-500 truncate">{e.cnpj}</p>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
