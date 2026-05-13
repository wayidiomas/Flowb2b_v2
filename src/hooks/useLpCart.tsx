'use client'

import { useEffect, useState, useCallback } from 'react'

export interface LpCartItem {
  produto_id: number
  codigo: string | null
  nome: string
  preco: number
  quantidade: number
  itens_por_caixa: number | null
  imagem_url?: string | null
  marca?: string | null
  unidade?: string | null
  /**
   * Fornecedor do produto. Em LPs de fornecedor, todos os itens compartilham o
   * mesmo fornecedor. Em LPs de representante, itens podem vir de fornecedores
   * diferentes — o checkout agrupa por essa chave.
   */
  fornecedor_id?: number | null
}

const PREFIX = 'lp_cart_'

export function useLpCart(slug: string) {
  const key = `${PREFIX}${slug}`
  const [items, setItems] = useState<LpCartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hidrata do localStorage no mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed as LpCartItem[])
      }
    } catch {
      /* silent */
    }
    setHydrated(true)
  }, [key])

  // Persiste sempre que muda
  useEffect(() => {
    if (!hydrated) return
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(items))
    } catch {
      /* silent */
    }
  }, [items, key, hydrated])

  const addItem = useCallback((item: Omit<LpCartItem, 'quantidade'>, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.produto_id === item.produto_id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + qty }
        return next
      }
      return [...prev, { ...item, quantidade: qty }]
    })
  }, [])

  const updateQty = useCallback((produtoId: number, qty: number) => {
    setItems(prev =>
      qty <= 0
        ? prev.filter(p => p.produto_id !== produtoId)
        : prev.map(p => (p.produto_id === produtoId ? { ...p, quantidade: qty } : p))
    )
  }, [])

  const removeItem = useCallback((produtoId: number) => {
    setItems(prev => prev.filter(p => p.produto_id !== produtoId))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const total = items.reduce((sum, item) => sum + item.preco * item.quantidade, 0)
  const count = items.reduce((sum, item) => sum + item.quantidade, 0)

  return { items, hydrated, addItem, updateQty, removeItem, clear, total, count }
}
