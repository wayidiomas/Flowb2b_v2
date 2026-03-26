'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useFornecedorAuth } from '@/contexts/FornecedorAuthContext'
import { FornecedorLayout } from '@/components/layout/FornecedorLayout'
import { Skeleton } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/Modal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogoItem {
  id: number
  catalogo_id: number
  produto_id: number
  empresa_id: number
  codigo: string | null
  nome: string
  marca: string | null
  unidade: string | null
  itens_por_caixa: number | null
  preco_base: number | null
  ativo: boolean
  ordem: number | null
  imagem_url: string | null
  preco_customizado?: number | null
  desconto_percentual?: number | null
  ativo_lojista?: boolean | null
  preco_lojista_id?: number | null
}

interface Catalogo {
  id: number
  fornecedor_id: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-8 h-8'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState {
  message: string
  type: 'success' | 'error' | 'warning'
}

interface SyncResult {
  empresa_id: number
  empresa_nome: string
  supabase: boolean
  bling: boolean
}

function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : toast.type === 'warning'
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}
      >
        {toast.type === 'success' ? (
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : toast.type === 'warning' ? (
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
        <span>{toast.message}</span>
        <button onClick={onDismiss} className="ml-2 text-current opacity-60 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline Price Editor
// ---------------------------------------------------------------------------

function InlinePriceEditor({
  value,
  onSave,
  saving,
}: {
  value: number | null
  onSave: (newValue: number) => void
  saving?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    if (saving) return
    setEditValue(value != null ? value.toFixed(2).replace('.', ',') : '0,00')
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Sincronizando...</span>
      </span>
    )
  }

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-sm text-gray-500">R$</span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-24 px-2 py-1 text-sm border border-[#336FB6] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 text-right"
        />
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-[#336FB6] transition-colors group"
    >
      <span>{formatCurrency(value)}</span>
      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#336FB6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
      </svg>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#336FB6]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Personalizar Precos Modal
// ---------------------------------------------------------------------------

interface PrecoLojista {
  empresaId: number
  nomeFantasia: string
  razaoSocial: string
  precoCustomizado: string
  descontoPercentual: string
  ativo: boolean
  hasOverride: boolean
  precoLojistaId: number | null
  changed: boolean
  removed: boolean
}

function PersonalizarPrecosModal({
  isOpen,
  onClose,
  item,
  empresasVinculadas,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  item: CatalogoItem | null
  empresasVinculadas: { empresaId: number; fornecedorId: number; razaoSocial: string; nomeFantasia: string }[]
  onSaved: () => void
}) {
  const [lojistas, setLojistas] = useState<PrecoLojista[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !item) return

    const loadOverrides = async () => {
      setLoading(true)
      try {
        // Fetch item details per lojista to get existing overrides
        const results: PrecoLojista[] = []
        for (const emp of empresasVinculadas) {
          const res = await fetch(
            `/api/fornecedor/catalogo/itens?search=${encodeURIComponent(item.codigo || '')}&empresa_id=${emp.empresaId}&limit=1`
          )
          let override: { preco_customizado?: number | null; desconto_percentual?: number | null; ativo_lojista?: boolean | null; preco_lojista_id?: number | null } = {}
          if (res.ok) {
            const data = await res.json()
            const found = data.itens?.find((i: CatalogoItem) => i.id === item.id)
            if (found) {
              override = {
                preco_customizado: found.preco_customizado,
                desconto_percentual: found.desconto_percentual,
                ativo_lojista: found.ativo_lojista,
                preco_lojista_id: found.preco_lojista_id,
              }
            }
          }

          const hasOverride = override.preco_customizado != null
          results.push({
            empresaId: emp.empresaId,
            nomeFantasia: emp.nomeFantasia,
            razaoSocial: emp.razaoSocial,
            precoCustomizado: hasOverride
              ? (override.preco_customizado!).toFixed(2).replace('.', ',')
              : '',
            descontoPercentual: override.desconto_percentual != null
              ? override.desconto_percentual.toFixed(1).replace('.', ',')
              : '',
            ativo: override.ativo_lojista ?? true,
            hasOverride,
            precoLojistaId: override.preco_lojista_id ?? null,
            changed: false,
            removed: false,
          })
        }
        setLojistas(results)
      } catch (err) {
        console.error('Erro ao carregar overrides:', err)
      } finally {
        setLoading(false)
      }
    }
    loadOverrides()
  }, [isOpen, item, empresasVinculadas])

  const precoBase = item?.preco_base ?? 0

  const updateLojista = (index: number, changes: Partial<PrecoLojista>) => {
    setLojistas((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...changes, changed: true }
      return updated
    })
  }

  const handlePrecoChange = (index: number, valor: string) => {
    const parsed = parseFloat(valor.replace(',', '.'))
    let desc = ''
    if (!isNaN(parsed) && precoBase > 0 && parsed < precoBase) {
      desc = (((precoBase - parsed) / precoBase) * 100).toFixed(1).replace('.', ',')
    }
    updateLojista(index, { precoCustomizado: valor, descontoPercentual: desc, hasOverride: true })
  }

  const handleDescontoChange = (index: number, valor: string) => {
    const parsed = parseFloat(valor.replace(',', '.'))
    let preco = ''
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      preco = (precoBase * (1 - parsed / 100)).toFixed(2).replace('.', ',')
    }
    updateLojista(index, { descontoPercentual: valor, precoCustomizado: preco, hasOverride: true })
  }

  const handleRemoveOverride = (index: number) => {
    updateLojista(index, {
      precoCustomizado: '',
      descontoPercentual: '',
      hasOverride: false,
      removed: true,
    })
  }

  const handleSetOverride = (index: number) => {
    updateLojista(index, {
      precoCustomizado: precoBase.toFixed(2).replace('.', ','),
      descontoPercentual: '0,0',
      hasOverride: true,
      removed: false,
    })
  }

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      const promises: Promise<Response>[] = []

      for (const lojista of lojistas) {
        if (!lojista.changed) continue

        if (lojista.removed && lojista.precoLojistaId) {
          promises.push(
            fetch(`/api/fornecedor/catalogo/precos-lojista?id=${lojista.precoLojistaId}`, {
              method: 'DELETE',
            })
          )
        } else if (lojista.hasOverride && !lojista.removed) {
          const preco = parseFloat(lojista.precoCustomizado.replace(',', '.'))
          const desconto = lojista.descontoPercentual
            ? parseFloat(lojista.descontoPercentual.replace(',', '.'))
            : undefined
          if (!isNaN(preco)) {
            promises.push(
              fetch('/api/fornecedor/catalogo/precos-lojista', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  catalogo_item_id: item.id,
                  empresa_id: lojista.empresaId,
                  preco_customizado: preco,
                  desconto_percentual: desconto,
                  ativo: lojista.ativo,
                }),
              })
            )
          }
        }
      }

      await Promise.all(promises)
      onSaved()
      onClose()
    } catch (err) {
      console.error('Erro ao salvar precos:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Personalizar Precos</ModalTitle>
        {item && (
          <ModalDescription>
            {item.nome} {item.codigo ? `(${item.codigo})` : ''}
            {' - Preco base: '}
            {formatCurrency(item.preco_base)}
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {lojistas.map((lojista, index) => (
              <div
                key={lojista.empresaId}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {lojista.nomeFantasia || lojista.razaoSocial}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Ativo</span>
                    <ToggleSwitch
                      checked={lojista.ativo}
                      onChange={(val) => updateLojista(index, { ativo: val })}
                      disabled={!lojista.hasOverride}
                    />
                  </div>
                </div>

                {lojista.hasOverride && !lojista.removed ? (
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Preco</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">R$</span>
                        <input
                          type="text"
                          value={lojista.precoCustomizado}
                          onChange={(e) => handlePrecoChange(index, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                        />
                      </div>
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Desconto %</label>
                      <input
                        type="text"
                        value={lojista.descontoPercentual}
                        onChange={(e) => handleDescontoChange(index, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveOverride(index)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap pb-2"
                    >
                      Remover override
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      {formatCurrency(precoBase)} (preco base)
                    </p>
                    <button
                      onClick={() => handleSetOverride(index)}
                      className="text-xs text-[#336FB6] hover:text-[#2660a5] font-medium"
                    >
                      Definir preco customizado
                    </button>
                  </div>
                )}
              </div>
            ))}

            {lojistas.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum lojista vinculado encontrado.
              </p>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="md" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="md"
          loading={saving}
          onClick={handleSave}
          disabled={!lojistas.some((l) => l.changed)}
        >
          Salvar
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Lojista Filter Dropdown (simplified inline dropdown)
// ---------------------------------------------------------------------------

function LojistaFilterDropdown({
  empresasVinculadas,
  selected,
  onSelect,
}: {
  empresasVinculadas: { empresaId: number; nomeFantasia: string; razaoSocial: string }[]
  selected: number | null
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedEmpresa = empresasVinculadas.find((e) => e.empresaId === selected)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:border-[#336FB6]/40 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
        <span className="text-gray-700 truncate max-w-[120px]">
          {selected ? (selectedEmpresa?.nomeFantasia || 'Lojista') : 'Lojista'}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => { onSelect(null); setOpen(false) }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              !selected ? 'bg-[#336FB6]/5 text-[#336FB6] font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Todos os lojistas
          </button>
          {empresasVinculadas.map((emp) => (
            <button
              key={emp.empresaId}
              onClick={() => { onSelect(emp.empresaId); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors truncate ${
                selected === emp.empresaId
                  ? 'bg-[#336FB6]/5 text-[#336FB6] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {emp.nomeFantasia || emp.razaoSocial}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Marca Filter Dropdown
// ---------------------------------------------------------------------------

function MarcaFilterDropdown({
  marcas,
  selected,
  onSelect,
}: {
  marcas: string[]
  selected: string | null
  onSelect: (marca: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:border-[#336FB6]/40 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        <span className="text-gray-700 truncate max-w-[120px]">
          {selected || 'Marca'}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-48 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          <button
            onClick={() => { onSelect(null); setOpen(false) }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              !selected ? 'bg-[#336FB6]/5 text-[#336FB6] font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Todas as marcas
          </button>
          {marcas.map((marca) => (
            <button
              key={marca}
              onClick={() => { onSelect(marca); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors truncate ${
                selected === marca
                  ? 'bg-[#336FB6]/5 text-[#336FB6] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {marca}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product Card (mobile)
// ---------------------------------------------------------------------------

function ProductImageUpload({
  item,
  onUploaded,
}: {
  item: CatalogoItem
  onUploaded: (id: number, url: string | null) => void
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/fornecedor/catalogo/itens/${item.id}/imagem`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.imagem_url) {
        onUploaded(item.id, data.imagem_url)
      } else {
        alert(data.error || 'Erro ao enviar imagem')
      }
    } catch {
      alert('Erro ao enviar imagem')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      const res = await fetch(`/api/fornecedor/catalogo/itens/${item.id}/imagem`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onUploaded(item.id, null)
      }
    } catch {
      alert('Erro ao remover imagem')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {uploading ? (
        <div className="flex items-center justify-center w-full h-full">
          <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : item.imagem_url ? (
        <>
          <img
            src={item.imagem_url}
            alt={item.nome}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={() => fileRef.current?.click()}
              className="p-1 bg-white/90 rounded-full mr-1"
              title="Trocar imagem"
            >
              <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={handleRemove}
              className="p-1 bg-white/90 rounded-full"
              title="Remover imagem"
            >
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-[#336FB6] hover:bg-gray-50 transition-colors"
          title="Adicionar imagem"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <span className="text-[9px] mt-0.5">Foto</span>
        </button>
      )}
    </div>
  )
}

function ProductCard({
  item,
  lojistaFilter,
  onToggleAtivo,
  onUpdatePreco,
  onPersonalizar,
  onImageUploaded,
  saving,
}: {
  item: CatalogoItem
  lojistaFilter: number | null
  onToggleAtivo: (id: number, ativo: boolean) => void
  onUpdatePreco: (id: number, preco: number) => void
  onPersonalizar: (item: CatalogoItem) => void
  onImageUploaded: (id: number, url: string | null) => void
  saving?: boolean
}) {
  const hasCustomPrice = lojistaFilter && item.preco_customizado != null

  return (
    <div className={`p-4 ${!item.ativo ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <ProductImageUpload item={item} onUploaded={onImageUploaded} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.nome}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="font-mono">{item.codigo || '-'}</span>
              {item.marca && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>{item.marca}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <ToggleSwitch
          checked={item.ativo}
          onChange={(val) => onToggleAtivo(item.id, val)}
        />
      </div>

      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
        <span>UN: {item.unidade || '-'}</span>
        {item.itens_por_caixa && (
          <>
            <span className="text-gray-300">|</span>
            <span>Cx: {item.itens_por_caixa} un</span>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase text-gray-400 font-medium">Preco base</p>
          <InlinePriceEditor
            value={item.preco_base}
            onSave={(val) => onUpdatePreco(item.id, val)}
            saving={saving}
          />
        </div>
        <div className="text-right">
          {lojistaFilter ? (
            <div>
              <p className="text-[10px] uppercase text-gray-400 font-medium">Lojista</p>
              {hasCustomPrice ? (
                <p className="text-sm font-semibold text-[#336FB6]">
                  {formatCurrency(item.preco_customizado)}
                  {item.desconto_percentual != null && item.desconto_percentual > 0 && (
                    <span className="text-xs text-emerald-600 ml-1">
                      (-{item.desconto_percentual.toFixed(1)}%)
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Preco base</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <button
        onClick={() => onPersonalizar(item)}
        className="mt-3 w-full text-center text-xs text-[#336FB6] hover:text-[#2660a5] font-medium py-2 border border-[#336FB6]/20 rounded-lg hover:bg-[#336FB6]/5 transition-colors"
      >
        Personalizar precos por lojista
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FornecedorCatalogoPage() {
  const { loading: authLoading, empresasVinculadas } = useFornecedorAuth()

  // Catalog state
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [catalogoExists, setCatalogoExists] = useState<boolean | null>(null)
  const [itens, setItens] = useState<CatalogoItem[]>([])
  const [totalItens, setTotalItens] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [lojistaFilter, setLojistaFilter] = useState<number | null>(null)
  const [marcaFilter, setMarcaFilter] = useState<string | null>(null)
  const [showInativos, setShowInativos] = useState(false)
  const [marcas, setMarcas] = useState<string[]>([])

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const LIMIT = 50

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)

  // Sync Bling toggle
  const [syncBling, setSyncBling] = useState(true)

  // Track which item is currently saving price (for loading indicator)
  const [savingItemId, setSavingItemId] = useState<number | null>(null)

  // Modal
  const [modalItem, setModalItem] = useState<CatalogoItem | null>(null)

  // ------ Check if catalog exists ------
  const checkCatalogo = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fornecedor/catalogo')
      if (res.ok) {
        const data = await res.json()
        setCatalogoExists(data.exists)
        if (data.exists && data.catalogo) {
          setCatalogo(data.catalogo)
          setTotalItens(data.total_itens || 0)
        }
      }
    } catch (err) {
      console.error('Erro ao verificar catalogo:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      checkCatalogo()
    }
  }, [authLoading, checkCatalogo])

  // ------ Fetch items ------
  const fetchItens = useCallback(async () => {
    if (!catalogoExists) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (lojistaFilter) params.set('empresa_id', String(lojistaFilter))
      if (marcaFilter) params.set('marca', marcaFilter)
      if (!showInativos) params.set('ativo', 'true')
      params.set('page', String(page))
      params.set('limit', String(LIMIT))

      const res = await fetch(`/api/fornecedor/catalogo/itens?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItens(data.itens || [])
        setTotalItens(data.total || 0)
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / LIMIT)))
      }
    } catch (err) {
      console.error('Erro ao carregar itens:', err)
    } finally {
      setLoading(false)
    }
  }, [catalogoExists, debouncedSearch, lojistaFilter, marcaFilter, showInativos, page])

  useEffect(() => {
    if (catalogoExists) {
      fetchItens()
    }
  }, [fetchItens, catalogoExists])

  // ------ Extract brands from loaded items ------
  useEffect(() => {
    if (itens.length > 0) {
      const uniqueMarcas = Array.from(
        new Set(itens.map((i) => i.marca).filter((m): m is string => !!m))
      ).sort()
      setMarcas((prev) => {
        // Merge with existing to accumulate from multiple pages
        const merged = Array.from(new Set([...prev, ...uniqueMarcas])).sort()
        return merged
      })
    }
  }, [itens])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, lojistaFilter, marcaFilter, showInativos])

  // ------ Create catalog ------
  const handleCreateCatalogo = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/fornecedor/catalogo', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setCatalogo(data.catalogo)
        setCatalogoExists(true)
        setTotalItens(data.total_itens || 0)
        setToast({ message: `Catalogo criado com ${data.total_itens || 0} produtos importados!`, type: 'success' })
      } else {
        setToast({ message: 'Erro ao criar catalogo. Tente novamente.', type: 'error' })
      }
    } catch (err) {
      console.error('Erro ao criar catalogo:', err)
      setToast({ message: 'Erro de conexao ao criar catalogo.', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  // ------ Sync catalog ------
  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/fornecedor/catalogo/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setToast({
          message: `Sincronizado! ${data.novos_itens || 0} novos, ${data.atualizados || 0} atualizados.`,
          type: 'success',
        })
        fetchItens()
        // Refresh total
        checkCatalogo()
      } else {
        setToast({ message: 'Erro ao sincronizar catalogo.', type: 'error' })
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err)
      setToast({ message: 'Erro de conexao ao sincronizar.', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  // ------ Toggle ativo ------
  const handleImageUploaded = (id: number, url: string | null) => {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, imagem_url: url } : i)))
    setToast({ message: url ? 'Imagem atualizada!' : 'Imagem removida!', type: 'success' })
  }

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    // Optimistic update
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ativo } : i)))
    try {
      const res = await fetch('/api/fornecedor/catalogo/itens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: [{ id, ativo }] }),
      })
      if (!res.ok) {
        // Revert
        setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ativo: !ativo } : i)))
        setToast({ message: 'Erro ao atualizar status do produto.', type: 'error' })
      }
    } catch {
      setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ativo: !ativo } : i)))
      setToast({ message: 'Erro de conexao.', type: 'error' })
    }
  }

  // ------ Update price (individual endpoint with Bling sync) ------
  const handleUpdatePreco = async (id: number, preco: number) => {
    const oldItem = itens.find((i) => i.id === id)
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, preco_base: preco } : i)))
    setSavingItemId(id)
    try {
      const res = await fetch(`/api/fornecedor/catalogo/itens/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preco_base: preco,
          sync_bling: syncBling,
        }),
      })
      if (!res.ok) {
        if (oldItem) {
          setItens((prev) => prev.map((i) => (i.id === id ? { ...i, preco_base: oldItem.preco_base } : i)))
        }
        setToast({ message: 'Erro ao atualizar preco.', type: 'error' })
      } else {
        const data = await res.json()

        if (data.sync_results && Array.isArray(data.sync_results)) {
          const results: SyncResult[] = data.sync_results
          const totalEmpresas = results.length
          const blingFailed = results.filter((r) => !r.bling)
          const allFailed = results.filter((r) => !r.supabase)

          if (allFailed.length === totalEmpresas && totalEmpresas > 0) {
            setToast({ message: 'Erro ao atualizar preco em todas as empresas.', type: 'error' })
          } else if (blingFailed.length > 0) {
            setToast({
              message: `Preco atualizado localmente. Sync Bling falhou em ${blingFailed.length} empresa(s).`,
              type: 'warning',
            })
          } else {
            setToast({
              message: totalEmpresas > 0
                ? 'Preco atualizado em todas as empresas!'
                : 'Preco atualizado!',
              type: 'success',
            })
          }
        } else {
          setToast({ message: 'Preco atualizado!', type: 'success' })
        }
      }
    } catch {
      if (oldItem) {
        setItens((prev) => prev.map((i) => (i.id === id ? { ...i, preco_base: oldItem.preco_base } : i)))
      }
      setToast({ message: 'Erro de conexao.', type: 'error' })
    } finally {
      setSavingItemId(null)
    }
  }

  // ------ Auth loading ------
  if (authLoading) {
    return (
      <FornecedorLayout>
        <Skeleton className="h-96" />
      </FornecedorLayout>
    )
  }

  // ------ Onboarding: catalog not yet created ------
  if (catalogoExists === false) {
    return (
      <FornecedorLayout>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center max-w-md w-full">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#FFAA11]/10 rounded-full flex items-center justify-center">
              <TagIcon className="w-10 h-10 text-[#FFAA11]" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Crie seu Catalogo</h1>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Seus produtos serao importados automaticamente dos lojistas vinculados.
              Voce podera gerenciar precos e personalizar por lojista.
            </p>
            <Button
              variant="primary"
              size="xl"
              fullWidth
              loading={creating}
              onClick={handleCreateCatalogo}
              className="!bg-[#FFAA11] hover:!bg-[#e69a0f]"
            >
              {creating ? 'Importando produtos...' : 'Criar Meu Catalogo'}
            </Button>
          </div>
        </div>
      </FornecedorLayout>
    )
  }

  // ------ Initial loading ------
  if (catalogoExists === null) {
    return (
      <FornecedorLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96" />
        </div>
      </FornecedorLayout>
    )
  }

  // ------ Main catalog view ------
  return (
    <FornecedorLayout>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <PersonalizarPrecosModal
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        item={modalItem}
        empresasVinculadas={empresasVinculadas}
        onSaved={() => {
          setToast({ message: 'Precos personalizados salvos!', type: 'success' })
          fetchItens()
        }}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Meu Catalogo</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie produtos e precos para todos os lojistas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              loading={syncing}
              onClick={handleSync}
              leftIcon={<SyncIcon className="w-4 h-4" />}
            >
              Sincronizar
            </Button>
            <span className="px-3 py-1.5 bg-[#336FB6]/10 text-[#336FB6] text-sm font-semibold rounded-lg">
              {totalItens} produtos
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou codigo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
            />
          </div>

          {/* Lojista filter */}
          <LojistaFilterDropdown
            empresasVinculadas={empresasVinculadas}
            selected={lojistaFilter}
            onSelect={setLojistaFilter}
          />

          {/* Marca filter */}
          {marcas.length > 0 && (
            <MarcaFilterDropdown
              marcas={marcas}
              selected={marcaFilter}
              onSelect={setMarcaFilter}
            />
          )}

          {/* Show inativos toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInativos}
              onChange={(e) => setShowInativos(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#336FB6] focus:ring-[#336FB6]/20"
            />
            <span className="text-sm text-gray-600">Inativos</span>
          </label>

          {/* Sync Bling toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-500">
            <input
              type="checkbox"
              checked={syncBling}
              onChange={(e) => setSyncBling(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#336FB6] focus:ring-[#336FB6]/20"
            />
            Sincronizar precos com Bling
          </label>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : itens.length > 0 ? (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                      <th className="px-6 py-4 w-12">Ativo</th>
                      <th className="px-4 py-4 w-16">Foto</th>
                      <th className="px-6 py-4">Codigo</th>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Marca</th>
                      <th className="px-6 py-4 text-center">UN / Cx</th>
                      <th className="px-6 py-4 text-right">Preco Base</th>
                      {lojistaFilter && <th className="px-6 py-4 text-right">Preco Lojista</th>}
                      <th className="px-6 py-4 text-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.map((item) => {
                      const hasCustomPrice = lojistaFilter && item.preco_customizado != null
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#336FB6]/5 transition-colors ${!item.ativo ? 'opacity-50' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <ToggleSwitch
                              checked={item.ativo}
                              onChange={(val) => handleToggleAtivo(item.id, val)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <ProductImageUpload item={item} onUploaded={handleImageUploaded} />
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-700">{item.codigo || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium max-w-xs truncate">
                            {item.nome}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{item.marca || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.unidade || '-'}
                            {item.itens_por_caixa ? ` / ${item.itens_por_caixa} un` : ''}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <InlinePriceEditor
                              value={item.preco_base}
                              onSave={(val) => handleUpdatePreco(item.id, val)}
                              saving={savingItemId === item.id}
                            />
                          </td>
                          {lojistaFilter && (
                            <td className="px-6 py-4 text-right">
                              {hasCustomPrice ? (
                                <span className="text-sm font-semibold text-[#336FB6]">
                                  {formatCurrency(item.preco_customizado)}
                                  {item.desconto_percentual != null && item.desconto_percentual > 0 && (
                                    <span className="text-xs text-emerald-600 ml-1">
                                      (-{item.desconto_percentual.toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">Preco base</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setModalItem(item)}
                              className="inline-flex items-center gap-1.5 text-xs text-[#336FB6] hover:text-[#2660a5] font-medium px-3 py-1.5 border border-[#336FB6]/20 rounded-lg hover:bg-[#336FB6]/5 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Personalizar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {itens.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    lojistaFilter={lojistaFilter}
                    onToggleAtivo={handleToggleAtivo}
                    onUpdatePreco={handleUpdatePreco}
                    onPersonalizar={setModalItem}
                    onImageUploaded={handleImageUploaded}
                    saving={savingItemId === item.id}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-[#336FB6] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                <TagIcon className="w-8 h-8 text-[#336FB6]" />
              </div>
              <p className="text-gray-500 font-medium">Nenhum produto encontrado.</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-1">Tente buscar com outros termos</p>
              )}
            </div>
          )}
        </div>
      </div>
    </FornecedorLayout>
  )
}
