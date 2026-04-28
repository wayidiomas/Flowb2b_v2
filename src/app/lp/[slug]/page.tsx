'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLpCart } from '@/hooks/useLpCart'
import { FLOWB2B_BLUE, FLOWB2B_ORANGE } from '@/lib/colors'
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
  imagem_url: string | null
}

interface LpData {
  landing_page: {
    id: number
    slug: string
    nome: string
    modo: 'todos' | 'comprados' | 'selecao'
    logo_url: string | null
    banner_url: string | null
    hero_titulo: string | null
    hero_subtitulo: string | null
    descricao: string | null
    whatsapp_contato: string | null
    instagram_url: string | null
    site_url: string | null
    endereco_resumido: string | null
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

  // Paleta FIXA FlowB2B: azul (CTA primario) + laranja (accent botao +)
  const cssVars = useMemo(
    () => ({
      '--accent': FLOWB2B_BLUE,
      '--accent-fg': '#FFFFFF',
      '--accent-2': FLOWB2B_ORANGE,
      '--brand-blue': FLOWB2B_BLUE,
    }) as React.CSSProperties,
    []
  )

  // Carrinho liberado pra todos — auth/vinculo e validado no /compras/pedidos/novo
  const podeComprar = !!data
  const isLojistaVinculado = data?.viewer_state === 'lojista_vinculado'

  const produtosFiltrados = useMemo(() => {
    if (!data) return []
    const termo = busca.trim().toLowerCase()
    if (!termo) return data.produtos
    return data.produtos.filter(p =>
      [p.nome, p.codigo, p.gtin, p.marca].filter(Boolean).join(' ').toLowerCase().includes(termo)
    )
  }, [data, busca])

  const handleFinalizar = () => {
    if (!data) return
    // Persiste carrinho pra /compras/pedidos/novo ler depois
    try {
      window.localStorage.setItem(
        `flowb2b_pedido_lp_${slug}`,
        JSON.stringify({
          slug,
          fornecedor_id: data.landing_page.fornecedor.id,
          fornecedor_cnpj: data.landing_page.fornecedor.cnpj,
          itens: items,
          created_at: new Date().toISOString(),
        })
      )
    } catch { /* silent */ }

    // Se nao e lojista logado e vinculado, manda pro login. O destino final
    // e /compras/pedidos/novo?lp=slug — apos login, o carrinho do localStorage
    // e lido e o pedido e pre-populado.
    if (!isLojistaVinculado) {
      const dest = `/compras/pedidos/novo?lp=${slug}`
      router.push(`/login?redirect=${encodeURIComponent(dest)}`)
      return
    }
    router.push(`/compras/pedidos/novo?lp=${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F7FA]">
        <LpTopNav />
        <div className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 pt-6 pb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 flex items-center gap-4 animate-pulse">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
        <div className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 py-3">
          <div className="h-11 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <main className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </main>
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
      {/* Top nav: logo FlowB2B + botao Entrar */}
      <LpTopNav />

      {/* Header — banner customizado ou nada (hero limpo) */}
      <header className="bg-white border-b border-gray-100">
        {lp.banner_url && (
          <div
            className="h-40 md:h-56 relative overflow-hidden"
            style={{
              backgroundImage: `url(${lp.banner_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        {/* Card do fornecedor */}
        <div className={`max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 ${lp.banner_url ? '-mt-16 md:-mt-20' : 'pt-6'} pb-6`}>
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] p-5 md:p-6">
            <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
              {/* Logo: prioridade lp.logo_url > fornecedor.logo > inicial */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                {(lp.logo_url || lp.fornecedor.logo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lp.logo_url || lp.fornecedor.logo || ''}
                    alt={fornecedorLabel}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">
                    {fornecedorLabel.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  {lp.hero_titulo || `Catalogo ${fornecedorLabel}`}
                </h1>
                {lp.hero_subtitulo && (
                  <p className="text-sm md:text-base text-gray-600 mt-1.5">{lp.hero_subtitulo}</p>
                )}
                <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{fornecedorLabel}</span>
                  <span className="text-gray-300">·</span>
                  <span className="font-mono">{formatCnpj(lp.fornecedor.cnpj)}</span>
                  <span className="text-gray-300">·</span>
                  <span>{data.produtos.length} produtos</span>
                  {lp.endereco_resumido && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>{lp.endereco_resumido}</span>
                    </>
                  )}
                </div>
              </div>

              {/* CTAs do hero */}
              <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto">
                {lp.whatsapp_contato && (
                  <a
                    href={`https://wa.me/55${lp.whatsapp_contato.replace(/\D/g, '')}?text=${encodeURIComponent(`Ola ${fornecedorLabel}, vim pelo catalogo`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1faa56] text-white text-sm font-medium px-4 py-2.5 transition-all duration-300 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z" />
                    </svg>
                    Falar agora
                  </a>
                )}
                {podeComprar && (
                  <div className="hidden md:flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Cliente
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banner condicional (chip discreto) */}
      <ViewerStateBanner viewerState={data.viewer_state} fornecedorNome={fornecedorLabel} slug={slug} />

      {/* Search bar sticky */}
      <div className="sticky top-12 z-20 bg-[#F5F7FA]/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 py-3">
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto, codigo ou marca..."
              className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] focus:outline-none focus:border-[#336FB6] focus:ring-2 focus:ring-[#336FB6]/15 text-sm placeholder:text-gray-400 transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                aria-label="Limpar busca"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto' : 'produtos'}
            {busca && ` encontrados pra "${busca}"`}
          </p>
        </div>
      </div>

      {/* Grid de produtos */}
      <main className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 py-5">
        {produtosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl py-16 px-6 text-center border border-gray-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(51,111,182,0.08) 0%, rgba(255,170,17,0.08) 100%)',
            }}>
              <svg className="w-8 h-8 text-[#336FB6]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">
              {busca ? 'Nenhum produto encontrado' : 'Catalogo em preparacao'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {busca
                ? `Tente buscar por outro termo ou nome de produto`
                : `${fornecedorLabel} ainda nao publicou produtos no catalogo`}
            </p>
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="mt-4 text-sm text-[#336FB6] font-medium hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
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

      {/* Sobre o fornecedor */}
      {lp.descricao && (
        <section className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 mt-12 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-3">
              Sobre {fornecedorLabel}
            </p>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
              {lp.descricao}
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 mt-8 mb-24 md:mb-8">
        <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Powered by</span>
            <span className="text-sm font-bold" style={{ color: FLOWB2B_BLUE }}>FlowB2B</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lp.whatsapp_contato && (
              <a
                href={`https://wa.me/55${lp.whatsapp_contato.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:text-[#25D366] transition-colors"
              >
                WhatsApp
              </a>
            )}
            {lp.instagram_url && (
              <a
                href={lp.instagram_url.startsWith('http') ? lp.instagram_url : `https://instagram.com/${lp.instagram_url.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:text-pink-600 transition-colors"
              >
                Instagram
              </a>
            )}
            {lp.site_url && (
              <a
                href={lp.site_url.startsWith('http') ? lp.site_url : `https://${lp.site_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:text-[#336FB6] transition-colors"
              >
                Site
              </a>
            )}
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400 font-mono">{formatCnpj(lp.fornecedor.cnpj)}</span>
          </div>
        </div>
      </footer>

      {/* Carrinho flutuante GLOW NEON — sempre visivel quando lojista_vinculado */}
      {podeComprar && (
        <FloatingCart count={count} total={total} onClick={() => setDrawerOpen(true)} />
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
    <article className="group bg-white rounded-2xl border border-gray-100 hover:border-[#336FB6]/30 hover:shadow-[0_8px_24px_-8px_rgba(51,111,182,0.18)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Imagem com botao + flutuante */}
      <div
        className="relative aspect-[4/3] flex items-center justify-center overflow-hidden"
        style={{
          background: produto.imagem_url
            ? '#F5F7FA'
            : 'linear-gradient(135deg, rgba(51,111,182,0.04) 0%, rgba(255,170,17,0.06) 100%)',
        }}
      >
        {produto.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <svg className="w-14 h-14 text-[#336FB6]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        )}
        {produto.marca && (
          <span className="absolute top-2 left-2 inline-flex items-center bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-700 shadow-sm">
            {produto.marca}
          </span>
        )}

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
  // Lojista vinculado nao precisa de banner.
  if (viewerState === 'lojista_vinculado') return null

  // Lojista logado mas sem vinculo: oferece solicitar atendimento.
  if (viewerState === 'lojista_sem_vinculo') {
    return <SolicitarVinculoBanner slug={slug} fornecedorNome={fornecedorNome} />
  }

  // Anonimo / outro tipo: hint discreto sobre fluxo de finalizar.
  // O carrinho ja esta liberado; o login so e exigido no checkout.
  const isAnonimo = viewerState === 'anonimo'
  return (
    <div className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 pt-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
        <p className="font-medium">
          {isAnonimo
            ? `Monte seu carrinho e finalize com sua conta. Sem conta? Voce pode se cadastrar na hora.`
            : `Voce esta logado em outro perfil. Pra fechar pedido, entre como lojista.`}
        </p>
        <Link
          href={`/login?redirect=/lp/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0"
        >
          Entrar →
        </Link>
      </div>
    </div>
  )
}

// ─── Top nav (logo FlowB2B + dropdown Entrar) ────────────────────────────────
function LpTopNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loginOptions = [
    { label: 'Lojista', href: '/login' },
    { label: 'Fornecedor', href: '/fornecedor/login' },
    { label: 'Representante', href: '/representante/login' },
  ]

  return (
    <nav className="bg-[#336FB6] h-12 w-full sticky top-0 z-30 shadow-sm">
      <div className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/branding/logo-white.png"
            alt="FlowB2B"
            width={96}
            height={28}
            priority
            className="object-contain"
          />
        </Link>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors duration-300"
          >
            Entrar
            <svg
              className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg py-1.5 min-w-[180px] z-50 ring-1 ring-black/5">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 px-4 pt-2 pb-1">
                Tipo de conta
              </p>
              {loginOptions.map(opt => (
                <Link
                  key={opt.label}
                  href={opt.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Floating Cart com GLOW NEON (laranja → azul) ───────────────────────────
function FloatingCart({
  count,
  total,
  onClick,
}: {
  count: number
  total: number
  onClick: () => void
}) {
  const isEmpty = count === 0

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <style jsx>{`
        @keyframes neonGlow {
          0%, 100% {
            box-shadow:
              0 0 20px rgba(255, 170, 17, 0.5),
              0 0 40px rgba(51, 111, 182, 0.4),
              0 4px 24px rgba(0, 0, 0, 0.15);
          }
          50% {
            box-shadow:
              0 0 30px rgba(255, 170, 17, 0.7),
              0 0 60px rgba(51, 111, 182, 0.5),
              0 4px 24px rgba(0, 0, 0, 0.15);
          }
        }
        .neon-cart {
          animation: neonGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      <button
        onClick={onClick}
        disabled={isEmpty}
        className={`group relative inline-flex items-center gap-3 rounded-full bg-white pl-3 pr-5 py-3 transition-all duration-300 active:scale-[0.97] ${
          isEmpty ? 'opacity-90 cursor-not-allowed' : 'neon-cart hover:scale-[1.04]'
        }`}
      >
        {/* Borda gradient laranja → azul */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            padding: '2px',
            background: `linear-gradient(135deg, ${FLOWB2B_ORANGE} 0%, ${FLOWB2B_BLUE} 100%)`,
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        <div
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-white"
          style={{
            background: `linear-gradient(135deg, ${FLOWB2B_ORANGE} 0%, ${FLOWB2B_BLUE} 100%)`,
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white border-2 border-[#FFAA11] text-[10px] font-bold flex items-center justify-center text-gray-900">
              {count}
            </span>
          )}
        </div>

        <div className="text-left">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 leading-none">
            Carrinho
          </p>
          <p className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">
            {isEmpty ? 'Vazio' : formatBRL(total)}
          </p>
        </div>
      </button>
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
    <div className="max-w-[1680px] 2xl:max-w-[1920px] mx-auto px-4 pt-4">
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
