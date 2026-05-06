import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://flowb2b-v2.onrender.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServerSupabaseClient()

  // Busca a LP ativa pelo slug
  const { data: lp } = await supabase
    .from('landing_pages_fornecedor')
    .select('id, slug, nome, modo, descricao, fornecedor_id, empresa_id_lojista, banner_url, ativa')
    .eq('slug', slug)
    .eq('ativa', true)
    .is('deletada_em', null)
    .maybeSingle()

  if (!lp) {
    return {
      title: 'Catalogo nao encontrado',
    }
  }

  // Nome do fornecedor
  const { data: forn } = await supabase
    .from('fornecedores')
    .select('nome, cnpj')
    .eq('id', lp.fornecedor_id)
    .maybeSingle()

  const fornecedorNome = forn?.nome || 'Fornecedor'

  // Conta produtos reais segundo o modo
  let totalProdutos = 0
  if (lp.modo === 'todos' && forn?.cnpj) {
    const cnpjLimpo = String(forn.cnpj).replace(/\D/g, '')
    const { data: catFor } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .maybeSingle()
    if (catFor) {
      const { count } = await supabase
        .from('catalogo_itens')
        .select('id', { count: 'exact', head: true })
        .eq('catalogo_id', catFor.id)
        .eq('ativo', true)
      totalProdutos = count || 0
    }
  } else if (lp.modo === 'selecao') {
    const { count } = await supabase
      .from('landing_page_produtos')
      .select('produto_id', { count: 'exact', head: true })
      .eq('landing_page_id', lp.id)
    totalProdutos = count || 0
  }
  // 'comprados' eh dinamico (depende de pedidos do lojista) — deixamos sem contagem

  const titulo = `Catalogo ${fornecedorNome}`
  const descricaoBase = lp.descricao?.trim() || 'Veja todo o catalogo e faca seu pedido em poucos cliques.'
  const descricaoFinal = totalProdutos > 0
    ? `${fornecedorNome} - ${totalProdutos.toLocaleString('pt-BR')} produtos. ${descricaoBase}`
    : `${fornecedorNome}. ${descricaoBase}`

  const url = `${APP_URL}/lp/${slug}`
  const bannerUrl = lp.banner_url || `${APP_URL}/assets/branding/logo-white.png`

  return {
    title: titulo,
    description: descricaoFinal,
    openGraph: {
      title: titulo,
      description: descricaoFinal,
      url,
      siteName: 'FlowB2B',
      images: [{ url: bannerUrl }],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricaoFinal,
      images: [bannerUrl],
    },
  }
}

export default function LpLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#F5F7FA] text-gray-900"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
    >
      {children}
    </div>
  )
}
