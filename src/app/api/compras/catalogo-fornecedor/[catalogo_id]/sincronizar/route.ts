import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/compras/catalogo-fornecedor/[catalogo_id]/sincronizar
 *
 * Aplica todas as atualizações pendentes do catálogo do fornecedor para a empresa
 * do lojista logado:
 *  - tipo='preco'    → UPDATE fornecedores_produtos.valor_de_compra
 *  - tipo='novo'     → cria produtos + fornecedores_produtos (se não existirem)
 *  - tipo='dados'    → aceita (dados estéticos já estão em catalogo_itens global)
 *  - tipo='removido' → aceita (item já saiu do catalogo_itens global)
 *
 * Marca atualizações como 'aceito', zera catalogo_status_lojista, enfileira jobs
 * Bling no flowB2BAPI.
 */

interface AtualizacaoRow {
  id: number
  tipo: 'novo' | 'preco' | 'dados' | 'removido'
  catalogo_item_id: number | null
  dados_antigos: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  catalogo_item: {
    id: number
    nome: string | null
    codigo: string | null
    ean: string | null
    unidade: string | null
    itens_por_caixa: number | null
    marca: string | null
  } | null
}

interface BlingJob {
  operacao: 'upsert_fornecedor_produto' | 'criar_produto'
  payload: Record<string, unknown>
  origem_ref_id: number
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ catalogo_id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    const empresaId = user.empresaId

    const { catalogo_id: catalogoIdStr } = await params
    const catalogoId = Number(catalogoIdStr)
    if (!catalogoId || isNaN(catalogoId)) {
      return NextResponse.json({ error: 'catalogo_id invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Catálogo
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome')
      .eq('id', catalogoId)
      .maybeSingle()
    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }
    const cnpj = (catalogo.cnpj || '').replace(/\D/g, '')

    // 2. Fornecedor da empresa do lojista (mesmo CNPJ)
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id, id_bling')
      .eq('cnpj', cnpj)
      .eq('empresa_id', empresaId)
      .maybeSingle()
    if (!fornecedor) {
      return NextResponse.json(
        { error: 'Fornecedor nao vinculado a sua empresa' },
        { status: 400 }
      )
    }

    // 3. Atualizações pendentes
    const { data: atualizacoes, error: atErr } = await supabase
      .from('catalogo_atualizacoes')
      .select(`
        id, tipo, catalogo_item_id, dados_antigos, dados_novos,
        catalogo_item:catalogo_itens(id, nome, codigo, ean, unidade, itens_por_caixa, marca)
      `)
      .eq('catalogo_id', catalogoId)
      .eq('empresa_id', empresaId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })

    if (atErr) {
      console.error('Erro ao buscar atualizacoes:', atErr)
      return NextResponse.json({ error: 'Erro ao buscar atualizacoes' }, { status: 500 })
    }

    const pendentes = (atualizacoes || []) as unknown as AtualizacaoRow[]
    const aplicados = { precos: 0, novos: 0, dados: 0, removidos: 0 }
    const idsAceitos: number[] = []
    const erros: Array<{ atualizacao_id: number; tipo: string; erro: string }> = []
    const blingJobs: BlingJob[] = []

    // 4. Aplica cada mudança
    for (const at of pendentes) {
      try {
        if (at.tipo === 'preco') {
          await aplicarPreco(supabase, at, fornecedor.id, empresaId, blingJobs, fornecedor.id_bling)
          aplicados.precos++
        } else if (at.tipo === 'novo') {
          await criarItemNovo(supabase, at, fornecedor.id, empresaId, blingJobs, fornecedor.id_bling)
          aplicados.novos++
        } else if (at.tipo === 'dados') {
          // No-op no escopo do lojista — dados estéticos já estão em catalogo_itens (global)
          aplicados.dados++
        } else if (at.tipo === 'removido') {
          // No-op — item já saiu do catalogo_itens (ativo=false)
          aplicados.removidos++
        }
        idsAceitos.push(at.id)
      } catch (err) {
        erros.push({
          atualizacao_id: at.id,
          tipo: at.tipo,
          erro: err instanceof Error ? err.message : String(err)
        })
      }
    }

    // 5. Marca como aceito
    if (idsAceitos.length > 0) {
      const { error: updErr } = await supabase
        .from('catalogo_atualizacoes')
        .update({ status: 'aceito', respondido_em: new Date().toISOString() })
        .in('id', idsAceitos)
      if (updErr) {
        console.error('Erro ao marcar atualizacoes aceitas:', updErr)
      }
    }

    // 6. Zera status_lojista
    await supabase
      .from('catalogo_status_lojista')
      .update({
        status: 'atualizado',
        qtd_nao_vistas: 0,
        ultima_visualizacao_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('catalogo_id', catalogoId)
      .eq('empresa_id', empresaId)

    // 7. Enfileira jobs Bling (best-effort, não bloqueia)
    let blingEnfileirados = 0
    if (blingJobs.length > 0) {
      const apiUrl = process.env.FLOWB2BAPI_URL
      const secret = process.env.INTERNAL_QUEUE_SECRET
      if (apiUrl && secret) {
        for (const job of blingJobs) {
          try {
            const r = await fetch(`${apiUrl}/api/queue/enqueue`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': secret
              },
              body: JSON.stringify({
                empresa_id: empresaId,
                operacao: job.operacao,
                payload: job.payload,
                origem: 'sincronizar_catalogo',
                origem_ref_id: job.origem_ref_id
              })
            })
            if (r.ok) blingEnfileirados++
            else console.warn('Falha ao enfileirar Bling job:', await r.text())
          } catch (err) {
            console.warn('Erro ao enfileirar Bling job:', err)
          }
        }
      } else {
        console.warn('FLOWB2BAPI_URL ou INTERNAL_QUEUE_SECRET ausentes — jobs Bling não enfileirados')
      }
    }

    return NextResponse.json({
      success: true,
      total_pendentes: pendentes.length,
      aplicados,
      bling_enfileirados: blingEnfileirados,
      erros
    })
  } catch (err) {
    console.error('Erro em /sincronizar:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── Handlers internos ───────────────────────────────────────────────────────

async function aplicarPreco(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  at: AtualizacaoRow,
  fornecedorId: number,
  empresaId: number,
  blingJobs: BlingJob[],
  fornecedorBlingId: number | null
) {
  const novoPreco = Number(at.dados_novos?.preco_base ?? 0)
  if (!isFinite(novoPreco) || novoPreco <= 0) {
    throw new Error('preco_base inválido')
  }

  // Encontra produto por EAN/codigo na empresa do lojista
  const ean = at.catalogo_item?.ean
  const codigo = at.catalogo_item?.codigo

  let produtoId: number | null = null
  let produtoBlingId: string | null = null

  if (ean) {
    const { data: p } = await supabase
      .from('produtos')
      .select('id, id_produto_bling')
      .eq('gtin', ean)
      .eq('empresa_id', empresaId)
      .maybeSingle()
    if (p) {
      produtoId = p.id
      produtoBlingId = p.id_produto_bling
    }
  }

  if (!produtoId && codigo) {
    // Tentativa por codigo_fornecedor em fornecedores_produtos
    const { data: fp } = await supabase
      .from('fornecedores_produtos')
      .select('produto_id')
      .eq('fornecedor_id', fornecedorId)
      .eq('empresa_id', empresaId)
      .eq('codigo_fornecedor', codigo)
      .maybeSingle()
    if (fp) {
      produtoId = fp.produto_id
      const { data: p } = await supabase
        .from('produtos')
        .select('id_produto_bling')
        .eq('id', fp.produto_id)
        .maybeSingle()
      produtoBlingId = p?.id_produto_bling || null
    }
  }

  if (!produtoId) {
    throw new Error('Produto não encontrado na sua empresa (EAN/código sem match)')
  }

  // Atualiza fornecedores_produtos
  const { error: fpErr } = await supabase
    .from('fornecedores_produtos')
    .update({
      valor_de_compra: novoPreco,
      preco_origem: 'catalogo',
      valor_atualizado_em: new Date().toISOString()
    })
    .eq('fornecedor_id', fornecedorId)
    .eq('produto_id', produtoId)
    .eq('empresa_id', empresaId)

  if (fpErr) throw new Error(`Supabase update falhou: ${fpErr.message}`)

  // Enfileira Bling
  if (produtoBlingId && fornecedorBlingId) {
    blingJobs.push({
      operacao: 'upsert_fornecedor_produto',
      origem_ref_id: at.id,
      payload: {
        produto_id: produtoId,
        produto_bling_id: produtoBlingId,
        fornecedor_bling_id: fornecedorBlingId,
        valor_de_compra: novoPreco
      }
    })
  }
}

async function criarItemNovo(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  at: AtualizacaoRow,
  fornecedorId: number,
  empresaId: number,
  blingJobs: BlingJob[],
  fornecedorBlingId: number | null
) {
  const item = at.catalogo_item
  const dados = at.dados_novos || {}

  const ean = item?.ean ?? (dados.ean as string | undefined)
  const nome = item?.nome ?? (dados.nome as string | undefined)
  const codigo = item?.codigo ?? (dados.codigo as string | undefined)
  const unidade = item?.unidade ?? (dados.unidade as string | undefined) ?? 'UN'
  const itensPorCaixa = item?.itens_por_caixa ?? (dados.itens_por_caixa as number | undefined) ?? 1
  const marca = item?.marca ?? (dados.marca as string | undefined)
  const valor = Number(dados.preco_base ?? 0)

  if (!nome) throw new Error('nome ausente — não dá pra criar produto')

  // Busca produto por EAN se já existe na empresa
  let produtoId: number | null = null
  let produtoBlingId: string | null = null
  if (ean) {
    const { data: p } = await supabase
      .from('produtos')
      .select('id, id_produto_bling')
      .eq('gtin', ean)
      .eq('empresa_id', empresaId)
      .maybeSingle()
    if (p) {
      produtoId = p.id
      produtoBlingId = p.id_produto_bling
    }
  }

  // Cria produto se necessário
  if (!produtoId) {
    const { data: prodInsert, error: prodErr } = await supabase
      .from('produtos')
      .insert({
        nome,
        codigo: codigo || null,
        gtin: ean || null,
        unidade,
        itens_por_caixa: itensPorCaixa,
        marca: marca || null,
        empresa_id: empresaId,
        fornecedor_id: fornecedorId,
        dados_origem: 'catalogo',
        dados_atualizados_em: new Date().toISOString()
      })
      .select('id')
      .single()

    if (prodErr || !prodInsert) {
      throw new Error(`Erro ao criar produto: ${prodErr?.message || 'desconhecido'}`)
    }
    produtoId = prodInsert.id
  }

  // Upsert fornecedores_produtos
  const { data: fpExist } = await supabase
    .from('fornecedores_produtos')
    .select('produto_id')
    .eq('fornecedor_id', fornecedorId)
    .eq('produto_id', produtoId)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (fpExist) {
    const { error: updErr } = await supabase
      .from('fornecedores_produtos')
      .update({
        valor_de_compra: valor,
        codigo_fornecedor: codigo || null,
        preco_origem: 'catalogo',
        valor_atualizado_em: new Date().toISOString()
      })
      .eq('fornecedor_id', fornecedorId)
      .eq('produto_id', produtoId)
      .eq('empresa_id', empresaId)
    if (updErr) throw new Error(`Erro ao atualizar fornecedores_produtos: ${updErr.message}`)
  } else {
    const { error: insErr } = await supabase
      .from('fornecedores_produtos')
      .insert({
        fornecedor_id: fornecedorId,
        produto_id: produtoId,
        empresa_id: empresaId,
        codigo_fornecedor: codigo || null,
        valor_de_compra: valor,
        preco_origem: 'catalogo',
        valor_atualizado_em: new Date().toISOString()
      })
    if (insErr) throw new Error(`Erro ao criar fornecedores_produtos: ${insErr.message}`)
  }

  // Enfileira Bling (criar produto + vincular fornecedor)
  if (fornecedorBlingId) {
    blingJobs.push({
      operacao: 'criar_produto',
      origem_ref_id: at.id,
      payload: {
        produto_id: produtoId,
        produto_bling_id: produtoBlingId,
        fornecedor_bling_id: fornecedorBlingId,
        nome,
        codigo: codigo || null,
        gtin: ean || null,
        unidade,
        itens_por_caixa: itensPorCaixa,
        valor_de_compra: valor
      }
    })
  }
}
