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

function ModalImageSection({
  item,
  onImageUploaded,
}: {
  item: CatalogoItem
  onImageUploaded: (id: number, url: string | null) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlField, setShowUrlField] = useState(false)

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
        onImageUploaded(item.id, data.imagem_url)
      } else {
        alert(data.error || 'Erro ao enviar imagem')
      }
    } catch {
      alert('Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  const handleSaveUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    setUploading(true)
    try {
      const res = await fetch(`/api/fornecedor/catalogo/itens/${item.id}/imagem`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagem_url: url }),
      })
      const data = await res.json()
      if (res.ok) {
        onImageUploaded(item.id, url)
        setUrlInput('')
        setShowUrlField(false)
      } else {
        alert(data.error || 'Erro ao salvar URL')
      }
    } catch {
      alert('Erro ao salvar URL')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      const res = await fetch(`/api/fornecedor/catalogo/itens/${item.id}/imagem`, { method: 'DELETE' })
      if (res.ok) onImageUploaded(item.id, null)
    } catch {
      alert('Erro ao remover imagem')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Imagem do produto</p>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
          {item.imagem_url ? (
            <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="text-[10px] mt-1">Sem imagem</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-2">
          {/* Upload file */}
          <div className={`relative flex items-center gap-2 px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg cursor-pointer hover:bg-white hover:border-[#336FB6] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            {uploading ? (
              <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
            <span className="text-gray-600">{uploading ? 'Enviando...' : 'Enviar do computador'}</span>
          </div>

          {/* URL externa */}
          {showUrlField ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveUrl()}
              />
              <button
                onClick={handleSaveUrl}
                disabled={uploading || !urlInput.trim()}
                className="px-3 py-2 text-xs font-medium bg-[#336FB6] text-white rounded-lg hover:bg-[#2b5e9e] disabled:opacity-50"
              >
                Salvar
              </button>
              <button
                onClick={() => { setShowUrlField(false); setUrlInput('') }}
                className="px-2 py-2 text-xs text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowUrlField(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-white hover:border-[#336FB6] transition-colors w-full"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Colar URL externa
            </button>
          )}

          {/* Remover */}
          {item.imagem_url && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Remover imagem
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PersonalizarPrecosModal({
  isOpen,
  onClose,
  item,
  empresasVinculadas,
  onSaved,
  onImageUploaded,
}: {
  isOpen: boolean
  onClose: () => void
  item: CatalogoItem | null
  empresasVinculadas: { empresaId: number; fornecedorId: number; razaoSocial: string; nomeFantasia: string }[]
  onSaved: () => void
  onImageUploaded: (id: number, url: string | null) => void
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
        {/* Imagem do produto */}
        {item && (
          <ModalImageSection item={item} onImageUploaded={onImageUploaded} />
        )}

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
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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
        setOpen(false)
      } else {
        alert(data.error || 'Erro ao enviar imagem')
      }
    } catch {
      alert('Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
    // Reset input para permitir reupload do mesmo arquivo
    e.target.value = ''
  }

  const handleSaveUrl = async () => {
    const url = urlInput.trim()
    if (!url) return

    setUploading(true)
    try {
      const res = await fetch(`/api/fornecedor/catalogo/itens/${item.id}/imagem`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagem_url: url }),
      })
      const data = await res.json()
      if (res.ok) {
        onUploaded(item.id, url)
        setOpen(false)
        setUrlInput('')
      } else {
        alert(data.error || 'Erro ao salvar URL')
      }
    } catch {
      alert('Erro ao salvar URL')
    } finally {
      setUploading(false)
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
        setOpen(false)
      }
    } catch {
      alert('Erro ao remover imagem')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-16 h-16 shrink-0">

      {/* Thumbnail / Placeholder */}
      <button
        onClick={() => { setOpen(!open); setTab(item.imagem_url ? 'url' : 'upload') }}
        className="w-full h-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#336FB6] transition-colors flex items-center justify-center"
      >
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <span className="text-[9px] mt-0.5">Foto</span>
          </div>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4"
        >
          {/* Preview */}
          {item.imagem_url && (
            <div className="mb-3 relative">
              <img src={item.imagem_url} alt={item.nome} className="w-full h-32 object-contain rounded-lg bg-gray-50 border border-gray-100" />
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="absolute top-1 right-1 p-1 bg-white rounded-full shadow border border-gray-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                title="Remover imagem"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${tab === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Enviar arquivo
            </button>
            <button
              onClick={() => setTab('url')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${tab === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              URL externa
            </button>
          </div>

          {tab === 'upload' ? (
            <div
              className={`relative w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#336FB6] hover:text-[#336FB6] transition-colors flex items-center justify-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Clique para selecionar (JPEG, PNG, WebP)
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
              />
              <button
                onClick={handleSaveUrl}
                disabled={uploading || !urlInput.trim()}
                className="w-full py-2 text-sm font-medium bg-[#336FB6] text-white rounded-lg hover:bg-[#2b5e9e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Salvando...
                  </>
                ) : 'Salvar URL'}
              </button>
            </div>
          )}
        </div>
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
  isSelected,
  onToggleSelect,
}: {
  item: CatalogoItem
  lojistaFilter: number | null
  onToggleAtivo: (id: number, ativo: boolean) => void
  onUpdatePreco: (id: number, preco: number) => void
  onPersonalizar: (item: CatalogoItem) => void
  onImageUploaded: (id: number, url: string | null) => void
  saving?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: number) => void
}) {
  const hasCustomPrice = lojistaFilter && item.preco_customizado != null

  return (
    <div className={`p-4 ${!item.ativo ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#336FB6] focus:ring-[#336FB6]/20 shrink-0"
            />
          )}
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
// Personalizar Multi Modal (bulk price customization for selected items)
// ---------------------------------------------------------------------------

interface MultiModalItem {
  catalogo_item_id: number
  nome: string
  codigo: string | null
  preco_base: number | null
  preco_lojista: string
  desconto_percentual: string
}

type MultiAjusteTipo = 'acrescimo' | 'desconto'

function PersonalizarMultiModal({
  isOpen,
  onClose,
  items,
  empresaId,
  empresaNome,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  items: CatalogoItem[]
  empresaId: number
  empresaNome: string
  onSaved: () => void
}) {
  const [modalItens, setModalItens] = useState<MultiModalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ajustePercentual, setAjustePercentual] = useState('')
  const [ajusteTipo, setAjusteTipo] = useState<MultiAjusteTipo>('desconto')

  // Load existing overrides when modal opens
  useEffect(() => {
    if (!isOpen || items.length === 0 || !empresaId) return

    const loadOverrides = async () => {
      setLoading(true)
      try {
        // Fetch all items with empresa_id to get existing overrides
        const res = await fetch(`/api/fornecedor/catalogo/itens?empresa_id=${empresaId}&limit=9999`)
        let overrideMap: Record<number, { preco_customizado?: number | null; desconto_percentual?: number | null }> = {}
        if (res.ok) {
          const data = await res.json()
          const allItens: CatalogoItem[] = data.itens || []
          for (const i of allItens) {
            overrideMap[i.id] = {
              preco_customizado: i.preco_customizado,
              desconto_percentual: i.desconto_percentual,
            }
          }
        }

        setModalItens(
          items.map((item) => {
            const override = overrideMap[item.id]
            const hasOverride = override?.preco_customizado != null
            const precoBase = item.preco_base ?? 0
            return {
              catalogo_item_id: item.id,
              nome: item.nome,
              codigo: item.codigo,
              preco_base: item.preco_base,
              preco_lojista: hasOverride
                ? override!.preco_customizado!.toFixed(2)
                : precoBase.toFixed(2),
              desconto_percentual: hasOverride && override!.desconto_percentual != null
                ? override!.desconto_percentual.toFixed(2)
                : '0.00',
            }
          })
        )
      } catch (err) {
        console.error('Erro ao carregar overrides em lote:', err)
        // Fallback: initialize from item base prices
        setModalItens(
          items.map((item) => ({
            catalogo_item_id: item.id,
            nome: item.nome,
            codigo: item.codigo,
            preco_base: item.preco_base,
            preco_lojista: (item.preco_base ?? 0).toFixed(2),
            desconto_percentual: '0.00',
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    loadOverrides()
  }, [isOpen, items, empresaId])

  // Reset bulk adjustment fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setAjustePercentual('')
      setAjusteTipo('desconto')
    }
  }, [isOpen])

  const updateItem = (index: number, field: 'preco_lojista' | 'desconto_percentual', value: string) => {
    setModalItens((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }
      const precoBase = item.preco_base ?? 0

      if (field === 'preco_lojista') {
        item.preco_lojista = value
        const parsed = parseFloat(value)
        if (!isNaN(parsed) && precoBase > 0) {
          const desc = ((precoBase - parsed) / precoBase) * 100
          item.desconto_percentual = desc.toFixed(2)
        }
      } else {
        item.desconto_percentual = value
        const parsed = parseFloat(value)
        if (!isNaN(parsed)) {
          const novoPreco = Math.max(0, precoBase * (1 - parsed / 100))
          item.preco_lojista = novoPreco.toFixed(2)
        }
      }

      updated[index] = item
      return updated
    })
  }

  const aplicarAjusteTodos = () => {
    const pct = parseFloat(ajustePercentual)
    if (isNaN(pct) || pct <= 0) return

    setModalItens((prev) =>
      prev.map((item) => {
        const precoBase = item.preco_base ?? 0
        if (precoBase <= 0) return item

        let novoPreco: number
        let novoDesconto: number
        if (ajusteTipo === 'acrescimo') {
          novoPreco = precoBase * (1 + pct / 100)
          novoDesconto = -pct
        } else {
          novoPreco = precoBase * (1 - pct / 100)
          novoDesconto = pct
        }

        return {
          ...item,
          preco_lojista: Math.max(0, novoPreco).toFixed(2),
          desconto_percentual: novoDesconto.toFixed(2),
        }
      })
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Only send items where price differs from preco_base
      const changedItens = modalItens.filter((item) => {
        const precoBase = item.preco_base ?? 0
        const precoLojista = parseFloat(item.preco_lojista) || 0
        return Math.abs(precoLojista - precoBase) > 0.001
      })

      if (changedItens.length === 0) {
        onSaved()
        onClose()
        return
      }

      const res = await fetch('/api/fornecedor/catalogo/precos-lojista/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          itens: changedItens.map((item) => ({
            catalogo_item_id: item.catalogo_item_id,
            preco_customizado: parseFloat(item.preco_lojista) || 0,
            desconto_percentual: parseFloat(item.desconto_percentual) || 0,
            ativo: true,
          })),
        }),
      })

      if (res.ok) {
        onSaved()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Erro ao salvar precos em lote:', data.error)
      }
    } catch (err) {
      console.error('Erro ao salvar precos em lote:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Personalizar Precos em Lote</ModalTitle>
        <ModalDescription>
          {items.length} produto(s) selecionado(s) para {empresaNome}
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        {/* Bulk adjustment bar */}
        <div className="mb-4 p-4 bg-[#336FB6]/5 border border-[#336FB6]/20 rounded-xl">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Reajuste em massa</p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Percentual</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={ajustePercentual}
                  onChange={(e) => setAjustePercentual(e.target.value)}
                  placeholder="0.0"
                  className="w-28 px-3 py-2 pr-7 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="multi-ajuste-tipo"
                  checked={ajusteTipo === 'acrescimo'}
                  onChange={() => setAjusteTipo('acrescimo')}
                  className="w-4 h-4 text-[#336FB6] focus:ring-[#336FB6]/20"
                />
                <span className="text-gray-700">Acrescimo</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="multi-ajuste-tipo"
                  checked={ajusteTipo === 'desconto'}
                  onChange={() => setAjusteTipo('desconto')}
                  className="w-4 h-4 text-[#336FB6] focus:ring-[#336FB6]/20"
                />
                <span className="text-gray-700">Desconto</span>
              </label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={aplicarAjusteTodos}
              disabled={!ajustePercentual || parseFloat(ajustePercentual) <= 0}
            >
              Aplicar em todos
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-3 py-3">Produto</th>
                  <th className="px-3 py-3 text-right">Preco Base</th>
                  <th className="px-3 py-3 text-right">Preco Lojista</th>
                  <th className="px-3 py-3 text-right">Desconto %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modalItens.map((item, index) => (
                  <tr key={item.catalogo_item_id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.nome}</p>
                      {item.codigo && (
                        <p className="text-xs text-gray-400 font-mono">{item.codigo}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-500 whitespace-nowrap">
                      {formatCurrency(item.preco_base)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-xs text-gray-400">R$</span>
                        <input
                          type="text"
                          value={item.preco_lojista}
                          onChange={(e) => updateItem(index, 'preco_lojista', e.target.value)}
                          className="w-24 px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={item.desconto_percentual}
                          onChange={(e) => updateItem(index, 'desconto_percentual', e.target.value)}
                          className="w-20 px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6]"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        >
          Salvar precos
        </Button>
      </ModalFooter>
    </Modal>
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

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [multiModalEmpresaId, setMultiModalEmpresaId] = useState<number | null>(null)
  const [showMultiModal, setShowMultiModal] = useState(false)

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

  // Reset page and selection when filters change
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
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
    setModalItem((prev) => prev && prev.id === id ? { ...prev, imagem_url: url } : prev)
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
        onImageUploaded={handleImageUploaded}
      />
      {showMultiModal && multiModalEmpresaId && (
        <PersonalizarMultiModal
          isOpen={showMultiModal}
          onClose={() => setShowMultiModal(false)}
          items={itens.filter((i) => selectedIds.has(i.id))}
          empresaId={multiModalEmpresaId}
          empresaNome={empresasVinculadas.find((e) => e.empresaId === multiModalEmpresaId)?.nomeFantasia || ''}
          onSaved={() => {
            setToast({ message: 'Precos personalizados em lote salvos!', type: 'success' })
            fetchItens()
            setSelectedIds(new Set())
            setShowMultiModal(false)
          }}
        />
      )}

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
                      <th className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={itens.length > 0 && itens.every((i) => selectedIds.has(i.id))}
                          onChange={() => {
                            const allSelected = itens.length > 0 && itens.every((i) => selectedIds.has(i.id))
                            if (allSelected) {
                              setSelectedIds(new Set())
                            } else {
                              setSelectedIds(new Set(itens.map((i) => i.id)))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#336FB6] focus:ring-[#336FB6]/20"
                        />
                      </th>
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
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(item.id)) {
                                    next.delete(item.id)
                                  } else {
                                    next.add(item.id)
                                  }
                                  return next
                                })
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-[#336FB6] focus:ring-[#336FB6]/20"
                            />
                          </td>
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
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={(id) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(id)) {
                          next.delete(id)
                        } else {
                          next.add(id)
                        }
                        return next
                      })
                    }}
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

      {/* Floating action bar for multi-selection */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size} produto(s) selecionado(s)
            </span>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <select
                value={multiModalEmpresaId ?? ''}
                onChange={(e) => setMultiModalEmpresaId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#336FB6]/20 focus:border-[#336FB6] transition-colors"
              >
                <option value="">Selecione o lojista</option>
                {empresasVinculadas.map((emp) => (
                  <option key={emp.empresaId} value={emp.empresaId}>
                    {emp.nomeFantasia || emp.razaoSocial}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowMultiModal(true)}
                disabled={!multiModalEmpresaId}
              >
                Personalizar precos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar selecao
              </Button>
            </div>
          </div>
        </div>
      )}
    </FornecedorLayout>
  )
}
