import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import OpenAI from 'openai'

export const maxDuration = 60

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemExtraido {
  codigo: string | null
  nome: string | null
  quantidade: number | null
  preco_unitario: number | null
  total: number | null
}

interface ItemPedido {
  id: number
  produto_id: number | null
  codigo: string | null
  codigo_fornecedor: string | null
  descricao: string | null
  unidade: string | null
  quantidade: number
  valor: number
  desconto: number | null
  gtin: string | null
}

interface MatchResult {
  status: 'ok' | 'divergencia' | 'faltando' | 'extra'
  item_pedido?: {
    id: number
    codigo: string | null
    codigo_fornecedor: string | null
    descricao: string | null
    quantidade: number
    valor: number
    gtin: string | null
  }
  item_espelho?: {
    codigo: string | null
    nome: string | null
    quantidade: number | null
    preco_unitario: number | null
    total: number | null
  }
  diferencas?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const sb = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  if (!sa || !sb) return 0
  if (sa === sb) return 1

  // Token-based Jaccard similarity (words, not characters)
  const tokensA = new Set(sa.split(/\s+/).filter(t => t.length > 1))
  const tokensB = new Set(sb.split(/\s+/).filter(t => t.length > 1))
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersection = 0
  tokensA.forEach(t => { if (tokensB.has(t)) intersection++ })
  const union = new Set([...tokensA, ...tokensB]).size
  return union > 0 ? intersection / union : 0
}

function cleanNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  // Remove R$, spaces, then handle BR format: 1.234,56 → 1234.56
  const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function normalizeCode(code: string | null | undefined): string {
  if (!code) return ''
  return code.replace(/\D/g, '').replace(/^0+/, '')
}

// ---------------------------------------------------------------------------
// Matching algorithm
// ---------------------------------------------------------------------------

function matchItems(
  itensPedido: ItemPedido[],
  itensExtraidos: ItemExtraido[]
): MatchResult[] {
  const results: MatchResult[] = []
  const matchedEspelhoIndexes = new Set<number>()

  // Build helper to format pedido item for output
  const formatPedido = (item: ItemPedido) => ({
    id: item.id,
    codigo: item.codigo,
    codigo_fornecedor: item.codigo_fornecedor,
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor: item.valor,
    gtin: item.gtin,
  })

  const formatEspelho = (item: ItemExtraido) => ({
    codigo: item.codigo,
    nome: item.nome,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    total: item.total,
  })

  // For each order item, try to find a match in extracted items
  for (const pedidoItem of itensPedido) {
    let bestMatchIndex = -1

    // Priority 1: Match by GTIN/EAN (exact)
    if (pedidoItem.gtin) {
      const normalizedGtin = normalizeCode(pedidoItem.gtin)
      if (normalizedGtin) {
        bestMatchIndex = itensExtraidos.findIndex((ext, idx) => {
          if (matchedEspelhoIndexes.has(idx)) return false
          const extCode = normalizeCode(ext.codigo)
          return extCode === normalizedGtin
        })
      }
    }

    // Priority 2: Match by codigo_fornecedor (exact)
    if (bestMatchIndex === -1 && pedidoItem.codigo_fornecedor) {
      const normalizedCodForn = normalizeCode(pedidoItem.codigo_fornecedor)
      if (normalizedCodForn) {
        bestMatchIndex = itensExtraidos.findIndex((ext, idx) => {
          if (matchedEspelhoIndexes.has(idx)) return false
          const extCode = normalizeCode(ext.codigo)
          return extCode === normalizedCodForn
        })
      }
    }

    // Priority 2b: Match by codigo (exact)
    if (bestMatchIndex === -1 && pedidoItem.codigo) {
      const normalizedCod = normalizeCode(pedidoItem.codigo)
      if (normalizedCod) {
        bestMatchIndex = itensExtraidos.findIndex((ext, idx) => {
          if (matchedEspelhoIndexes.has(idx)) return false
          const extCode = normalizeCode(ext.codigo)
          return extCode === normalizedCod
        })
      }
    }

    // Priority 3: Match by name similarity (>= 70%)
    if (bestMatchIndex === -1 && pedidoItem.descricao) {
      let bestSim = 0
      itensExtraidos.forEach((ext, idx) => {
        if (matchedEspelhoIndexes.has(idx)) return
        if (!ext.nome) return
        const sim = similarity(pedidoItem.descricao!, ext.nome)
        if (sim > bestSim) {
          bestSim = sim
          bestMatchIndex = idx
        }
      })
      // Only accept if similarity is at least 70%
      if (bestSim < 0.7) {
        bestMatchIndex = -1
      }
    }

    if (bestMatchIndex === -1) {
      // No match found - item is missing from espelho
      results.push({
        status: 'faltando',
        item_pedido: formatPedido(pedidoItem),
      })
    } else {
      matchedEspelhoIndexes.add(bestMatchIndex)
      const espelhoItem = itensExtraidos[bestMatchIndex]

      // Compare quantities and prices
      const diferencas: string[] = []

      // Compare quantity
      const espelhoQtd = cleanNumber(espelhoItem.quantidade)
      if (espelhoQtd !== null && espelhoQtd !== pedidoItem.quantidade) {
        diferencas.push(
          `Quantidade: pedido=${pedidoItem.quantidade}, espelho=${espelhoQtd}`
        )
      }

      // Compare unit price with 1% tolerance (to account for rounding)
      const espelhoPreco = cleanNumber(espelhoItem.preco_unitario)
      if (espelhoPreco !== null && pedidoItem.valor > 0) {
        const tolerance = pedidoItem.valor * 0.01
        if (Math.abs(espelhoPreco - pedidoItem.valor) > tolerance) {
          diferencas.push(
            `Preco unitario: pedido=${pedidoItem.valor.toFixed(2)}, espelho=${espelhoPreco.toFixed(2)}`
          )
        }
      }

      results.push({
        status: diferencas.length > 0 ? 'divergencia' : 'ok',
        item_pedido: formatPedido(pedidoItem),
        item_espelho: formatEspelho(espelhoItem),
        ...(diferencas.length > 0 ? { diferencas } : {}),
      })
    }
  }

  // Items in espelho with no match in order -> 'extra'
  itensExtraidos.forEach((ext, idx) => {
    if (matchedEspelhoIndexes.has(idx)) return
    results.push({
      status: 'extra',
      item_espelho: formatEspelho(ext),
    })
  })

  return results
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // 2. Fetch pedido with espelho info
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .select('id, espelho_url, espelho_nome')
      .eq('id', pedidoId)
      .eq('empresa_id', user.empresaId)
      .eq('is_excluded', false)
      .single()

    if (pedidoError || !pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    if (!pedido.espelho_url) {
      return NextResponse.json(
        { error: 'Nenhum espelho encontrado para este pedido. Envie o espelho antes de validar.' },
        { status: 404 }
      )
    }

    // 3. Get order items with product details
    const { data: itensPedidoRaw, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select('id, produto_id, codigo, codigo_fornecedor, descricao, unidade, quantidade, valor, desconto')
      .eq('pedido_compra_id', pedidoId)

    if (itensError || !itensPedidoRaw || itensPedidoRaw.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum item encontrado no pedido de compra' },
        { status: 404 }
      )
    }

    // 4. For each item, get GTIN from produtos table
    const produtoIds = itensPedidoRaw
      .map(i => i.produto_id)
      .filter((id): id is number => id !== null && id !== undefined)

    let produtosMap = new Map<number, { id: number; gtin: string | null; codigo: string | null; nome: string | null }>()

    if (produtoIds.length > 0) {
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, gtin, codigo, nome')
        .in('id', produtoIds)

      if (produtos) {
        for (const p of produtos) {
          produtosMap.set(p.id, p)
        }
      }
    }

    // Build enriched order items
    const itensPedido: ItemPedido[] = itensPedidoRaw.map(item => {
      const produto = item.produto_id ? produtosMap.get(item.produto_id) : null
      return {
        id: item.id,
        produto_id: item.produto_id,
        codigo: item.codigo,
        codigo_fornecedor: item.codigo_fornecedor,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor: item.valor,
        desconto: item.desconto,
        gtin: produto?.gtin || null,
      }
    })

    // 5. Download espelho from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('espelhos-pedido')
      .download(pedido.espelho_url)

    if (downloadError || !fileData) {
      console.error('Erro ao baixar espelho do storage:', downloadError)
      return NextResponse.json({ error: 'Erro ao baixar arquivo do espelho' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')

    // 6. Determine MIME type
    const filename = pedido.espelho_nome || pedido.espelho_url.split('/').pop() || 'espelho'
    const mimeType = getMimeType(filename)

    // Validate that the file type is supported for vision
    const supportedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!supportedMimes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipo de arquivo nao suportado para validacao: ${mimeType}. Use PDF, JPG, PNG ou WebP.` },
        { status: 400 }
      )
    }

    // 7. Call OpenAI GPT-5.4-mini Vision
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY nao configurada')
      return NextResponse.json(
        { error: 'Servico de validacao nao configurado. Contate o administrador.' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let itensExtraidos: ItemExtraido[]

    try {
      const response = await openai.responses.create({
        model: 'gpt-5.4-mini',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Voce e um assistente especializado em extrair dados de documentos comerciais (espelhos de pedido, cotacoes, orcamentos).

Analise este documento e extraia TODOS os itens/produtos listados.

Para cada item, extraia:
- codigo: codigo do produto (pode ser EAN, GTIN, codigo interno, SKU)
- nome: descricao/nome do produto
- quantidade: quantidade (numero inteiro ou decimal)
- preco_unitario: preco unitario (numero decimal)
- total: valor total da linha (numero decimal)

Retorne APENAS um JSON array valido, sem markdown, sem explicacao:
[{"codigo": "...", "nome": "...", "quantidade": 0, "preco_unitario": 0.00, "total": 0.00}]

Se um campo nao estiver visivel, use null. Extraia TODOS os itens, mesmo que a tabela tenha muitas linhas.`,
              },
              ...(mimeType === 'application/pdf'
                ? [{
                    type: 'input_file' as const,
                    file_data: `data:${mimeType};base64,${base64}`,
                    filename: filename,
                  }]
                : [{
                    type: 'input_image' as const,
                    image_url: `data:${mimeType};base64,${base64}`,
                    detail: 'auto' as const,
                  }]
              ),
            ],
          },
        ],
      })

      // Parse the JSON response
      const responseText = (response.output_text || '').trim()
      if (!responseText) {
        throw new Error('IA retornou resposta vazia')
      }
      // Extract JSON array - try direct parse first, then strip markdown
      let jsonText = responseText
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim()
      } else {
        const arrayMatch = responseText.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          jsonText = arrayMatch[0]
        }
      }

      itensExtraidos = JSON.parse(jsonText)

      if (!Array.isArray(itensExtraidos)) {
        throw new Error('Resposta da IA nao e um array de itens')
      }

      // Sanitize extracted items
      itensExtraidos = itensExtraidos.map(item => ({
        codigo: item.codigo ?? null,
        nome: item.nome ?? null,
        quantidade: cleanNumber(item.quantidade),
        preco_unitario: cleanNumber(item.preco_unitario),
        total: cleanNumber(item.total),
      }))
    } catch (aiError: unknown) {
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError)
      console.error('Erro na chamada OpenAI ou parse da resposta:', aiError)
      return NextResponse.json(
        {
          error: 'Erro ao analisar o espelho com IA. Tente novamente.',
          detalhes: errorMessage,
        },
        { status: 500 }
      )
    }

    // 8. Run matching algorithm
    const results = matchItems(itensPedido, itensExtraidos)

    // 9. Build summary and return
    const resumo = {
      total_pedido: itensPedido.length,
      total_espelho: itensExtraidos.length,
      ok: results.filter(r => r.status === 'ok').length,
      divergencias: results.filter(r => r.status === 'divergencia').length,
      faltando: results.filter(r => r.status === 'faltando').length,
      extras: results.filter(r => r.status === 'extra').length,
    }

    return NextResponse.json({
      success: true,
      resumo,
      itens: results,
    })
  } catch (error) {
    console.error('Erro ao validar espelho:', error)
    return NextResponse.json({ error: 'Erro interno ao validar espelho' }, { status: 500 })
  }
}
