import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://flowb2b-v2.onrender.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServerSupabaseClient()

  // 1) Tenta LP do REPRESENTANTE primeiro
  const { data: lpRep } = await supabase
    .from('landing_pages_representante')
    .select('id, slug, nome, modo, descricao, representante_id, empresa_id_lojista, banner_url, ativa')
    .eq('slug', slug)
    .eq('ativa', true)
    .is('deletada_em', null)
    .maybeSingle()

  let nomeOwner: string | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lp: any = null
  let isRep = false

  if (lpRep) {
    lp = lpRep
    isRep = true
    const { data: rep } = await supabase
      .from('representantes')
      .select('nome')
      .eq('id', lpRep.representante_id)
      .maybeSingle()
    nomeOwner = rep?.nome || 'Representante'
  } else {
    // 2) Fallback: LP do fornecedor
    const { data: lpForn } = await supabase
      .from('landing_pages_fornecedor')
      .select('id, slug, nome, modo, descricao, fornecedor_id, empresa_id_lojista, banner_url, ativa')
      .eq('slug', slug)
      .eq('ativa', true)
      .is('deletada_em', null)
      .maybeSingle()
    if (!lpForn) {
      return { title: 'Catalogo nao encontrado' }
    }
    lp = lpForn
    const { data: forn } = await supabase
      .from('fornecedores')
      .select('nome, cnpj')
      .eq('id', lpForn.fornecedor_id)
      .maybeSingle()
    nomeOwner = forn?.nome || 'Fornecedor'
  }

  // Conta produtos
  let totalProdutos = 0
  if (isRep) {
    if (lp.modo === 'todos') {
      const { data: vinculos } = await supabase
        .from('representante_fornecedores')
        .select('fornecedor_id')
        .eq('representante_id', lp.representante_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fornIds = [...new Set(((vinculos || []) as any[]).map(v => v.fornecedor_id))]
      if (fornIds.length > 0) {
        const { data: forns } = await supabase
          .from('fornecedores')
          .select('cnpj')
          .in('id', fornIds)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cnpjs = [...new Set(((forns || []) as any[])
          .map(f => (f.cnpj || '').replace(/\D/g, ''))
          .filter(Boolean))]
        if (cnpjs.length > 0) {
          const { data: catalogos } = await supabase
            .from('catalogo_fornecedor')
            .select('id')
            .in('cnpj', cnpjs)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const catIds = ((catalogos || []) as any[]).map(c => c.id)
          if (catIds.length > 0) {
            const { count } = await supabase
              .from('catalogo_itens')
              .select('id', { count: 'exact', head: true })
              .in('catalogo_id', catIds)
              .eq('ativo', true)
            totalProdutos = count || 0
          }
        }
      }
    } else if (lp.modo === 'selecao') {
      const { count } = await supabase
        .from('landing_page_representante_produtos')
        .select('produto_id', { count: 'exact', head: true })
        .eq('landing_page_id', lp.id)
      totalProdutos = count || 0
    }
  } else {
    // Fornecedor
    const { data: forn } = await supabase
      .from('fornecedores')
      .select('cnpj')
      .eq('id', lp.fornecedor_id)
      .maybeSingle()
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
  }

  const titulo = `Catalogo ${nomeOwner}`
  const descricaoBase = lp.descricao?.trim() || 'Veja todo o catalogo e faca seu pedido em poucos cliques.'
  const descricaoFinal = totalProdutos > 0
    ? `${nomeOwner} - ${totalProdutos.toLocaleString('pt-BR')} produtos. ${descricaoBase}`
    : `${nomeOwner}. ${descricaoBase}`

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
