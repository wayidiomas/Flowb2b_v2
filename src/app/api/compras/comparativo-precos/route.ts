import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// GET /api/compras/comparativo-precos?pedido_id=123
//
// Para cada produto (por GTIN) do pedido, retorna o valor_de_compra praticado pelo
// MESMO fornecedor (mesmo CNPJ) em cada loja que o USUARIO LOGADO acessa.
//
// ISOLAMENTO (load-bearing): o conjunto de empresas vem SEMPRE de users_empresas do
// JWT (ativo=true) — NUNCA do cliente. Como o client usa service_role (bypassa RLS),
// o filtro .in('empresa_id', empresasPermitidas) e a unica barreira de tenant.

const onlyDigits = (s: string | null | undefined) => (s || '').replace(/\D/g, '')

interface LojaPreco {
  empresa_id: number
  empresa_nome: string
  preco: number
  origem: string | null
  atualizado_em: string | null
  is_atual: boolean
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const pedidoId = Number(request.nextUrl.searchParams.get('pedido_id'))
    if (!pedidoId || Number.isNaN(pedidoId)) {
      return NextResponse.json({ error: 'pedido_id e obrigatorio' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // 1) Empresas do usuario logado (unica barreira de isolamento)
    const { data: vinculos } = await supabase
      .from('users_empresas')
      .select('empresa_id')
      .eq('user_id', user.userId)
      .eq('ativo', true)
    const empresasPermitidas = (vinculos || []).map((v) => v.empresa_id as number)
    if (empresasPermitidas.length <= 1) {
      // 0 ou 1 loja => nao ha o que comparar
      return NextResponse.json({ comparativo: {}, empresa_atual_id: user.empresaId })
    }

    // 2) Pedido precisa pertencer a uma empresa do usuario
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('id, empresa_id, fornecedor_id')
      .eq('id', pedidoId)
      .single()
    if (!pedido || !empresasPermitidas.includes(pedido.empresa_id)) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    // 3) CNPJ do fornecedor do pedido (chave de match de fornecedor)
    const { data: fornecedorPedido } = await supabase
      .from('fornecedores')
      .select('cnpj')
      .eq('id', pedido.fornecedor_id)
      .single()
    const cnpj = onlyDigits(fornecedorPedido?.cnpj)
    if (!cnpj) return NextResponse.json({ comparativo: {}, empresa_atual_id: pedido.empresa_id })

    // 4) GTINs dos itens do pedido (chave de match de produto)
    const { data: itensPedido } = await supabase
      .from('itens_pedido_compra')
      .select('produto_id, produtos:produto_id(gtin, nome)')
      .eq('pedido_compra_id', pedidoId)
    const gtinsRaw = new Set<string>()
    const nomePorGtin = new Map<string, string>()
    for (const it of itensPedido || []) {
      const rel = (Array.isArray(it.produtos) ? it.produtos[0] : it.produtos) as
        | { gtin: string | null; nome: string | null }
        | null
      const raw = rel?.gtin || ''
      const norm = onlyDigits(raw)
      if (raw && norm) {
        gtinsRaw.add(raw)
        if (rel?.nome && !nomePorGtin.has(norm)) nomePorGtin.set(norm, rel.nome)
      }
    }
    if (gtinsRaw.size === 0) return NextResponse.json({ comparativo: {}, empresa_atual_id: pedido.empresa_id })

    // 5) Fornecedores com mesmo CNPJ NAS empresas do usuario (cnpj pode ter mascara -> compara por digitos)
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, cnpj')
      .in('empresa_id', empresasPermitidas)
    const fornecedoresGrupo = (fornecedores || []).filter((f) => onlyDigits(f.cnpj) === cnpj)
    if (fornecedoresGrupo.length === 0) {
      return NextResponse.json({ comparativo: {}, empresa_atual_id: pedido.empresa_id })
    }
    const fornIds = fornecedoresGrupo.map((f) => f.id as number)

    // 6) Produtos por GTIN nas empresas do usuario -> produto_id -> { empresa_id, gtinNorm }
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, gtin, empresa_id')
      .in('empresa_id', empresasPermitidas)
      .in('gtin', [...gtinsRaw])
    const produtoInfo = new Map<number, { empresa_id: number; gtin: string }>()
    for (const p of produtos || []) {
      const norm = onlyDigits(p.gtin)
      if (norm) produtoInfo.set(p.id as number, { empresa_id: p.empresa_id as number, gtin: norm })
    }
    const produtoIds = [...produtoInfo.keys()]
    if (produtoIds.length === 0) return NextResponse.json({ comparativo: {}, empresa_atual_id: pedido.empresa_id })

    // 7) Precos praticados (escopo: empresas permitidas + fornecedores do grupo + produtos casados)
    const { data: precos } = await supabase
      .from('fornecedores_produtos')
      .select('empresa_id, fornecedor_id, produto_id, valor_de_compra, preco_origem, valor_atualizado_em')
      .in('empresa_id', empresasPermitidas)
      .in('fornecedor_id', fornIds)
      .in('produto_id', produtoIds)

    // 8) Nomes das lojas
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, razao_social')
      .in('id', empresasPermitidas)
    const nomeEmpresa = new Map<number, string>()
    for (const e of empresas || []) {
      nomeEmpresa.set(e.id as number, (e.nome_fantasia as string) || (e.razao_social as string) || `Loja ${e.id}`)
    }

    // 9) Montar comparativo por GTIN (1 entrada por loja; em duplicidade, mantem o menor preco)
    const comparativo: Record<string, { produto_nome: string | null; lojas: LojaPreco[] }> = {}
    for (const fp of precos || []) {
      const preco = Number(fp.valor_de_compra)
      if (!preco || preco <= 0) continue
      const pi = produtoInfo.get(fp.produto_id as number)
      if (!pi || pi.empresa_id !== fp.empresa_id) continue
      const gtin = pi.gtin
      if (!comparativo[gtin]) comparativo[gtin] = { produto_nome: nomePorGtin.get(gtin) || null, lojas: [] }
      const loja: LojaPreco = {
        empresa_id: fp.empresa_id as number,
        empresa_nome: nomeEmpresa.get(fp.empresa_id as number) || `Loja ${fp.empresa_id}`,
        preco,
        origem: (fp.preco_origem as string) ?? null,
        atualizado_em: (fp.valor_atualizado_em as string) ?? null,
        is_atual: fp.empresa_id === pedido.empresa_id,
      }
      const existente = comparativo[gtin].lojas.find((l) => l.empresa_id === loja.empresa_id)
      if (!existente) comparativo[gtin].lojas.push(loja)
      else if (preco < existente.preco) Object.assign(existente, loja)
    }

    // So retorna GTINs com pelo menos 2 lojas (senao nao ha comparacao)
    const final: typeof comparativo = {}
    for (const [gtin, info] of Object.entries(comparativo)) {
      if (info.lojas.length >= 2) final[gtin] = info
    }

    return NextResponse.json({ comparativo: final, empresa_atual_id: pedido.empresa_id })
  } catch (error) {
    console.error('Erro no comparativo de precos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
