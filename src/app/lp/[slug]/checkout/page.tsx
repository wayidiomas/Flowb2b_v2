'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { FLOWB2B_BLUE, FLOWB2B_ORANGE } from '@/lib/colors'

interface CartItem {
  produto_id: number
  codigo: string | null
  nome: string
  preco: number
  quantidade: number
  itens_por_caixa: number | null
  imagem_url?: string | null
  marca?: string | null
  unidade?: string | null
  fornecedor_id?: number | null
}

interface PedidoLp {
  slug: string
  fornecedor_id: number
  fornecedor_cnpj: string
  owner_tipo?: 'fornecedor' | 'representante'
  representante_id?: number | null
  itens: CartItem[]
  created_at: string
}

interface EmpresaComFornecedor {
  empresa_id: number
  empresa_nome: string
  empresa_cnpj: string | null
  fornecedor_id: number | null
  vinculada: boolean
}

export default function LpCheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, empresa, empresas, loading: authLoading, switchEmpresa } = useAuth()

  const [pedido, setPedido] = useState<PedidoLp | null>(null)
  const [empresasResolved, setEmpresasResolved] = useState<EmpresaComFornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  // 1. Auth gate: nao logado vai pro /login
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const dest = `/lp/${slug}/checkout`
      router.replace(`/login?redirect=${encodeURIComponent(dest)}`)
    }
  }, [authLoading, user, router, slug])

  // 2. Carrega pedido do localStorage e resolve fornecedor(es)
  useEffect(() => {
    if (authLoading || !user) return

    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem(`flowb2b_pedido_lp_${slug}`)
      : null

    if (!raw) {
      setError('Carrinho vazio. Volte pra LP e selecione produtos.')
      setLoading(false)
      return
    }

    let parsed: PedidoLp
    try {
      parsed = JSON.parse(raw) as PedidoLp
    } catch {
      setError('Carrinho invalido.')
      setLoading(false)
      return
    }
    setPedido(parsed)

    if (empresas.length === 0) {
      setLoading(false)
      return
    }

    const empresaIds = empresas.map(e => e.id)

    // LP de representante: tem multiplos fornecedores no cart.
    // Resolvemos por fornecedor_id dos itens, agrupando por fornecedor.
    if (parsed.owner_tipo === 'representante') {
      const fornIdsCart = Array.from(new Set(
        (parsed.itens || [])
          .map(i => i.fornecedor_id)
          .filter((v): v is number => typeof v === 'number' && v > 0)
      ))

      if (fornIdsCart.length === 0) {
        setError('Carrinho sem fornecedor identificado.')
        setLoading(false)
        return
      }

      // Pega CNPJs dos fornecedores que o cart referencia
      supabase
        .from('fornecedores')
        .select('id, cnpj, empresa_id')
        .in('id', fornIdsCart)
        .then(({ data: fornsCart }) => {
          const cnpjs = Array.from(new Set(((fornsCart || []) as { cnpj: string | null }[])
            .map(f => (f.cnpj || '').replace(/\D/g, ''))
            .filter(Boolean)))

          if (cnpjs.length === 0) {
            setLoading(false)
            return
          }

          // Pra cada empresa do user, verifica se TODOS os CNPJs estao vinculados
          supabase
            .from('fornecedores')
            .select('id, empresa_id, cnpj')
            .in('cnpj', cnpjs)
            .in('empresa_id', empresaIds)
            .then(({ data: matches }) => {
              const cnpjsPorEmpresa = new Map<number, Set<string>>()
              for (const m of (matches || []) as { empresa_id: number; cnpj: string | null }[]) {
                const c = (m.cnpj || '').replace(/\D/g, '')
                if (!c) continue
                if (!cnpjsPorEmpresa.has(m.empresa_id)) cnpjsPorEmpresa.set(m.empresa_id, new Set())
                cnpjsPorEmpresa.get(m.empresa_id)!.add(c)
              }
              const totalCnpjs = cnpjs.length
              const resolved: EmpresaComFornecedor[] = empresas.map(e => {
                const set = cnpjsPorEmpresa.get(e.id) || new Set()
                const vinculadaCompleta = set.size === totalCnpjs
                // fornecedor_id aqui eh apenas um (o primeiro do cart) — checkout multifornecedor
                // sera resolvido na rota /compras/pedidos/novo redirecionando por fornecedor.
                const firstFornId = fornIdsCart[0]
                return {
                  empresa_id: e.id,
                  empresa_nome: e.nome_fantasia || e.razao_social,
                  empresa_cnpj: e.cnpj,
                  fornecedor_id: vinculadaCompleta ? firstFornId : null,
                  vinculada: vinculadaCompleta,
                }
              })
              setEmpresasResolved(resolved)
              setLoading(false)
            })
        })
      return
    }

    // Fluxo legado: LP do fornecedor (1 fornecedor por CNPJ)
    const cnpj = (parsed.fornecedor_cnpj || '').replace(/\D/g, '')
    if (!cnpj) {
      setLoading(false)
      return
    }

    supabase
      .from('fornecedores')
      .select('id, empresa_id, cnpj')
      .eq('cnpj', cnpj)
      .in('empresa_id', empresaIds)
      .then(({ data }) => {
        const fornByEmpresa = new Map<number, number>()
        for (const f of data || []) fornByEmpresa.set(f.empresa_id, f.id)

        const resolved: EmpresaComFornecedor[] = empresas.map(e => ({
          empresa_id: e.id,
          empresa_nome: e.nome_fantasia || e.razao_social,
          empresa_cnpj: e.cnpj,
          fornecedor_id: fornByEmpresa.get(e.id) ?? null,
          vinculada: fornByEmpresa.has(e.id),
        }))
        setEmpresasResolved(resolved)
        setLoading(false)
      })
  }, [authLoading, user, empresas, slug])

  // 3. Se so tem 1 empresa vinculada, vai direto
  useEffect(() => {
    if (loading || redirecting || empresasResolved.length === 0) return
    const vinculadas = empresasResolved.filter(e => e.vinculada)
    if (vinculadas.length === 1) {
      handleEscolherEmpresa(vinculadas[0])
    }
    // se 0 vinculadas, mostra mensagem; se >1, mostra picker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, empresasResolved, redirecting])

  const handleEscolherEmpresa = async (e: EmpresaComFornecedor) => {
    if (!e.vinculada || !e.fornecedor_id) return
    setRedirecting(true)
    try {
      // Troca empresa ativa se necessario
      if (empresa?.id !== e.empresa_id) {
        await switchEmpresa(e.empresa_id)
      }
      const repParam = pedido?.representante_id ? `&representante_id=${pedido.representante_id}` : ''
      router.push(`/compras/pedidos/novo?fornecedor_id=${e.fornecedor_id}&from_lp=${slug}${repParam}`)
    } catch {
      setError('Erro ao trocar de empresa. Tente novamente.')
      setRedirecting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#336FB6] rounded-full animate-spin" />
          <span className="text-sm">Carregando carrinho...</span>
        </div>
      </div>
    )
  }

  const totalItens = pedido?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
  const totalValor = pedido?.itens.reduce((s, i) => s + i.preco * i.quantidade, 0) ?? 0
  const vinculadas = empresasResolved.filter(e => e.vinculada)
  const naoVinculadas = empresasResolved.filter(e => !e.vinculada)

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FA]">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/lp/${slug}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Voltar pra LP
          </Link>
          <Image src="/assets/branding/logo-blue.png" alt="FlowB2B" width={88} height={28} className="object-contain" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-rose-800">{error}</p>
            <Link href={`/lp/${slug}`} className="text-sm font-semibold text-rose-700 underline mt-2 inline-block">
              Voltar pra LP
            </Link>
          </div>
        )}

        {pedido && !error && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-base font-bold text-gray-900">Resumo do pedido</h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {pedido.itens.length} {pedido.itens.length === 1 ? 'SKU' : 'SKUs'}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-500">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
                <span className="text-2xl font-bold tabular-nums" style={{ color: FLOWB2B_BLUE }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-base font-bold text-gray-900">Comprar para qual loja?</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                {vinculadas.length === 0
                  ? 'Voce nao tem vinculo com esse fornecedor em nenhuma das suas empresas.'
                  : `Selecione a empresa que vai receber o pedido.`}
              </p>

              {vinculadas.length > 0 && (
                <div className="space-y-2">
                  {vinculadas.map(e => (
                    <button
                      key={e.empresa_id}
                      onClick={() => handleEscolherEmpresa(e)}
                      disabled={redirecting}
                      className="w-full text-left bg-white ring-1 ring-gray-200 rounded-xl p-4 hover:ring-2 hover:ring-[#336FB6] hover:shadow-[0_4px_16px_-4px_rgba(51,111,182,0.2)] transition-all disabled:opacity-50 group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                            style={{ background: FLOWB2B_BLUE }}
                          >
                            {e.empresa_nome[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{e.empresa_nome}</p>
                            {e.empresa_cnpj && (
                              <p className="text-[11px] font-mono text-gray-400">{e.empresa_cnpj}</p>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-300 group-hover:text-[#336FB6] transition-colors shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2.2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {naoVinculadas.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Sem vinculo
                  </p>
                  <div className="space-y-1.5">
                    {naoVinculadas.map(e => (
                      <div
                        key={e.empresa_id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 opacity-60"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
                          {e.empresa_nome[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-600 truncate">{e.empresa_nome}</p>
                          <p className="text-[10px] text-gray-400">Fornecedor nao cadastrado nessa empresa</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vinculadas.length === 0 && (
                <Link
                  href={`/lp/${slug}`}
                  className="inline-flex items-center justify-center w-full mt-2 px-4 py-3 rounded-xl text-white text-sm font-semibold"
                  style={{ background: FLOWB2B_ORANGE }}
                >
                  Voltar pra LP
                </Link>
              )}
            </div>
          </>
        )}
      </main>

      {redirecting && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-5 shadow-2xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-[#336FB6] rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">Preparando pedido...</span>
          </div>
        </div>
      )}
    </div>
  )
}
