'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLpCart } from '@/hooks/useLpCart'
import { resolveLpAccent, FLOWB2B_BLUE, FLOWB2B_ORANGE } from '@/lib/colors'
import type { LpViewerState } from '@/app/api/lp/[slug]/route'

interface LpProduto {
  id: number
  codigo: string | null
  nome: string
  gtin: string | null
  marca: string | null
  preco: number | null
  unidade: string | null
  itens_por_caixa: number | null
  curva: string | null
}

interface LpData {
  landing_page: {
    id: number
    slug: string
    nome: string
    modo: 'todos' | 'comprados' | 'selecao'
    cor_marca: string | null
    logo_url: string | null
    banner_url: string | null
    hero_titulo: string | null
    hero_subtitulo: string | null
    fornecedor: {
      id: number
      cnpj: string
      nome: string
      nome_fantasia: string | null
      razao_social: string
      logo: string | null
    }
  }
  produtos: LpProduto[]
  viewer_state: LpViewerState
}

const formatBRL = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatCnpj = (cnpj: string): string => {
  const c = (cnpj || '').replace(/\D/g, '')
  if (c.length !== 14) return cnpj
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export default function LandingPagePublica() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [data, setData] = useState<LpData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { items, addItem, updateQty, removeItem, total, count } = useLpCart(slug)

  useEffect(() => {
    if (!slug) return
    const load = async () => {
      try {
        const res = await fetch(`/api/lp/${slug}`)
        if (res.status === 404) {
          setError('Esta landing page nao existe ou foi desativada')
        } else if (res.status === 410) {
          setError('Esta landing page esta inativa')
        } else if (!res.ok) {
          setError('Erro ao carregar landing page')
        } else {
          setData(await res.json())
        }
      } catch {
        setError('Erro de conexao')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  // Paleta:
  //   --accent: cor_marca se setada, senao azul FlowB2B (CTAs primarios)
  //   --accent-2: laranja FlowB2B (botoes + dos produtos, badges destaque)
  const accentColor = resolveLpAccent(data?.landing_page.cor_marca)
  const cssVars = useMemo(
    () => ({
      '--accent': accentColor,
      '--accent-fg': '#FFFFFF',
      '--accent-2': FLOWB2B_ORANGE,
      '--brand-blue': FLOWB2B_BLUE,
    }) as React.CSSProperties,
    [accentColor]
  )

  const podeComprar = data?.viewer_state === 'lojista_vinculado'

  const produtosFiltrados = useMemo(() => {
    if (!data) return []
    const termo = busca.trim().toLowerCase()
    if (!termo) return data.produtos
    return data.produtos.filter(p =>
      [p.nome, p.codigo, p.gtin, p.marca].filter(Boolean).join(' ').toLowerCase().includes(termo)
    )
  }, [data, busca])

  const handleFinalizar = () => {
    if (!podeComprar) return
    try {
      window.localStorage.setItem(
        `flowb2b_pedido_lp_${slug}`,
        JSON.stringify({
          slug,
          fornecedor_id: data?.landing_page.fornecedor.id,
          fornecedor_cnpj: data?.landing_page.fornecedor.cnpj,
          itens: items,
          created_at: new Date().toISOString(),
        })
      )
    } catch { /* silent */ }
    router.push(`/compras/pedidos/novo?lp=${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F7FA]">
        <div className="w-10 h-10 border-2 border-[#336FB6]/20 border-t-[#336FB6] rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F7FA] px-4">
        <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Pagina indisponivel</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[#336FB6] hover:bg-[#2660A5] text-white text-sm font-medium px-5 py-2.5 transition-colors"
          >
            Ir para FlowB2B
          </Link>
        </div>
      </div>
    )
  }

  const { landing_page: lp } = data
  const fornecedorLabel = lp.fornecedor.nome_fantasia || lp.fornecedor.nome

  return (
    <div style={cssVars} className="min-h-[100dvh] bg-[#F5F7FA] pb-24 md:pb-0">
      {/* Header Hero — banner customizado ou gradient da paleta da LP */}
      <header className="bg-white border-b border-gray-100">
        <div
          className="h-32 md:h-44 relative overflow-hidden"
          style={
            lp.banner_url
              ? { backgroundImage: `url(${lp.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)` }
          }
        >
          {/* Overlay escuro pra contraste quando tem banner */}
          {lp.banner_url ? (
            <div className="absolute inset-0 bg-black/30" />
          ) : (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
          )}
        </div>

        {/* Card do fornecedor (sobrepoõe o hero) */}
        <div className="max-w-[1200px] mx-auto px-4 -mt-12 md:-mt-14 pb-5">
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] p-4 md:p-5 flex items-center gap-4">
            {/* Logo: prioridade lp.logo_url > fornecedor.logo > inicial do nome */}
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {(lp.logo_url || lp.fornecedor.logo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lp.logo_url || lp.fornecedor.logo || ''}
                  alt={fornecedorLabel}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-gray-400">
                  {fornecedorLabel.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {fornecedorLabel}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-mono">{formatCnpj(lp.fornecedor.cnpj)}</span>
                <span className="mx-2">·</span>
                {data.produtos.length} produtos
              </p>
              {lp.hero_subtitulo && (
                <p className="text-sm text-gray-700 mt-1 line-clamp-1">{lp.hero_subtitulo}</p>
              )}
            </div>

            {/* Chip status só mostra quando o user pode comprar */}
            {podeComprar && (
              <div className="hidden md:flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium shrink-0">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Cliente
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Banner condicional (chip discreto) */}
      <ViewerStateBanner viewerState={data.viewer_state} fornecedorNome={fornecedorLabel} slug={slug} />

      {/* Search bar sticky */}
      <div className="sticky top-0 z-30 bg-[#F5F7FA] border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto, codigo ou marca..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[var(--accent)] text-sm placeholder:text-gray-400 transition-colors"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Grid de produtos */}
      <main className="max-w-[1200px] mx-auto px-4 py-5">
        {produtosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl py-16 text-center border border-gray-100">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">
              {busca ? 'Nenhum produto encontrado' : 'Catalogo em preparacao'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {produtosFiltrados.map(p => (
              <ProdutoCard
                key={p.id}
                produto={p}
                podeComprar={podeComprar}
                noCarrinho={items.find(i => i.produto_id === p.id)?.quantidade || 0}
                onAdd={() => {
                  if (!podeComprar) return
                  addItem({
                    produto_id: p.id,
                    codigo: p.codigo,
                    nome: p.nome,
                    preco: p.preco || 0,
                    itens_por_caixa: p.itens_por_caixa,
                  })
                }}
                onUpdateQty={(q) => updateQty(p.id, q)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer cart mobile (estilo iFood) */}
      {podeComprar && count > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-[var(--accent)] flex items-center justify-center text-[10px] font-bold" style={{ color: 'var(--accent)' }}>
                {count}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">{count} {count === 1 ? 'item' : 'itens'}</p>
              <p className="text-sm font-semibold text-gray-900">{formatBRL(total)}</p>
            </div>
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Ver carrinho
          </span>
        </button>
      )}

      {/* Botão flutuante carrinho desktop */}
      {podeComprar && count > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="hidden md:flex fixed top-1/2 right-6 -translate-y-1/2 z-40 items-center gap-2.5 bg-white hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] rounded-2xl px-4 py-3 transition-all"
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {count}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{formatBRL(total)}</span>
        </button>
      )}

      {/* Drawer */}
      {drawerOpen && podeComprar && (
        <CartDrawer
          items={items}
          total={total}
          onClose={() => setDrawerOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeItem}
          onCheckout={handleFinalizar}
        />
      )}
    </div>
  )
}

// ─── Produto Card iFood-style ────────────────────────────────────────────────
function ProdutoCard({
  produto,
  podeComprar,
  noCarrinho,
  onAdd,
  onUpdateQty,
}: {
  produto: LpProduto
  podeComprar: boolean
  noCarrinho: number
  onAdd: () => void
  onUpdateQty: (q: number) => void
}) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden">
      {/* Imagem com botao + flutuante */}
      <div className="relative aspect-[4/3] bg-gray-50 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>

        {podeComprar && noCarrinho === 0 && produto.preco != null && produto.preco > 0 && (
          <button
            onClick={onAdd}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] hover:scale-110"
            style={{ background: 'var(--accent-2)' }}
            aria-label="Adicionar ao carrinho"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}

        {podeComprar && noCarrinho > 0 && (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 bg-white rounded-full shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] px-1 py-1"
          >
            <button
              onClick={() => onUpdateQty(noCarrinho - 1)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-sm font-semibold"
              style={{ color: 'var(--accent-2)' }}
            >
              −
            </button>
            <span className="font-mono text-sm font-semibold w-5 text-center text-gray-900">{noCarrinho}</span>
            <button
              onClick={() => onUpdateQty(noCarrinho + 1)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-sm font-semibold"
              style={{ color: 'var(--accent-2)' }}
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {produto.codigo && (
          <p className="text-[10px] font-mono text-gray-400 mb-1">
            {produto.codigo}
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 leading-snug min-h-[2.5rem]">
          {produto.nome}
        </h3>
        {produto.preco != null && produto.preco > 0 ? (
          <p className="font-semibold text-base" style={{ color: 'var(--accent)' }}>
            {formatBRL(produto.preco)}
          </p>
        ) : (
          <p className="text-xs text-gray-400">Preco sob consulta</p>
        )}
      </div>
    </article>
  )
}

// ─── Banner condicional (chip discreto, não card grande) ─────────────────────
function ViewerStateBanner({
  viewerState,
  fornecedorNome,
  slug,
}: {
  viewerState: LpViewerState
  fornecedorNome: string
  slug: string
}) {
  if (viewerState === 'lojista_vinculado') return null

  let mensagem = ''
  let cta: { label: string; href: string } | null = null
  let bgClass = 'bg-amber-50 border-amber-200 text-amber-900'

  if (viewerState === 'anonimo') {
    mensagem = `Faca login pra comprar de ${fornecedorNome}`
    cta = { label: 'Entrar', href: `/login?redirect=/lp/${slug}` }
    bgClass = 'bg-blue-50 border-blue-200 text-blue-900'
  } else if (viewerState === 'lojista_sem_vinculo') {
    return <SolicitarVinculoBanner slug={slug} fornecedorNome={fornecedorNome} />
  } else {
    mensagem = 'Visualizacao apenas. Pra comprar use uma conta de lojista.'
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-4">
      <div className={`${bgClass} border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm`}>
        <p className="font-medium">{mensagem}</p>
        {cta && (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0"
          >
            {cta.label} →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Solicitar vinculo banner (com state) ────────────────────────────────────
function SolicitarVinculoBanner({ slug, fornecedorNome }: { slug: string; fornecedorNome: string }) {
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setEnviando(true)
    setError('')
    try {
      const res = await fetch(`/api/lp/${slug}/solicitar-vinculo`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 401) {
        window.location.href = `/login?redirect=/lp/${slug}`
        return
      }
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar solicitacao')
        return
      }
      setEnviado(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
        <p className="font-medium">
          {enviado
            ? `Solicitacao enviada! ${fornecedorNome} vai analisar e te avisar`
            : `Voce ainda nao e cliente de ${fornecedorNome}`}
        </p>
        {!enviado && (
          <button
            onClick={handleClick}
            disabled={enviando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0 disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Solicitar atendimento →'}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-600 mt-2">{error}</p>
      )}
    </div>
  )
}

// ─── Cart Drawer ─────────────────────────────────────────────────────────────
function CartDrawer({
  items,
  total,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
}: {
  items: ReturnType<typeof useLpCart>['items']
  total: number
  onClose: () => void
  onUpdateQty: (id: number, q: number) => void
  onRemove: (id: number) => void
  onCheckout: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-[420px] h-full bg-white flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Seu carrinho</p>
            <h3 className="text-base font-semibold text-gray-900">{items.length} produtos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {items.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">Carrinho vazio</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(item => (
                <div key={item.produto_id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{item.nome}</p>
                    {item.codigo && (
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{item.codigo}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-0.5">
                        <button
                          onClick={() => onUpdateQty(item.produto_id, item.quantidade - 1)}
                          className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center text-gray-700 text-sm font-medium"
                        >
                          −
                        </button>
                        <span className="font-mono text-sm w-5 text-center">{item.quantidade}</span>
                        <button
                          onClick={() => onUpdateQty(item.produto_id, item.quantidade + 1)}
                          className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center text-gray-700 text-sm font-medium"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-semibold text-sm text-gray-900">
                        {formatBRL(item.preco * item.quantidade)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(item.produto_id)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                    aria-label="Remover"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-semibold text-lg text-gray-900">{formatBRL(total)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-white text-sm font-semibold py-3.5 transition-all duration-300 active:scale-[0.98]"
              style={{ background: 'var(--accent)' }}
            >
              Finalizar pedido
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Voce sera redirecionado pra revisar e confirmar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
