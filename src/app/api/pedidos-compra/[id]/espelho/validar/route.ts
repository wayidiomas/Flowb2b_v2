import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import OpenAI from 'openai'

export const maxDuration = 60

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

// ---------------------------------------------------------------------------
// POST handler - Validação em 2 etapas com IA
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // =====================================================================
    // ETAPA 0: Auth + dados do banco
    // =====================================================================
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const { id: pedidoId } = await params
    const supabase = createServerSupabaseClient()

    // Fetch pedido
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
      return NextResponse.json({ error: 'Nenhum espelho encontrado para este pedido.' }, { status: 404 })
    }

    // Fetch order items + GTIN
    const { data: itensPedidoRaw, error: itensError } = await supabase
      .from('itens_pedido_compra')
      .select('id, produto_id, codigo_produto, codigo_fornecedor, descricao, unidade, quantidade, valor')
      .eq('pedido_compra_id', pedidoId)

    if (itensError || !itensPedidoRaw || itensPedidoRaw.length === 0) {
      return NextResponse.json({ error: 'Nenhum item encontrado no pedido' }, { status: 404 })
    }

    const produtoIds = itensPedidoRaw
      .map(i => i.produto_id)
      .filter((id): id is number => id !== null)

    const gtinMap = new Map<number, string>()
    if (produtoIds.length > 0) {
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, gtin')
        .in('id', produtoIds)
        .eq('empresa_id', user.empresaId)

      for (const p of produtos || []) {
        if (p.gtin) gtinMap.set(p.id, p.gtin)
      }
    }

    // Download espelho
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('espelhos-pedido')
      .download(pedido.espelho_url)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Erro ao baixar arquivo do espelho' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')
    const filename = pedido.espelho_nome || 'espelho'
    const mimeType = getMimeType(filename)

    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return NextResponse.json({ error: `Tipo nao suportado: ${mimeType}` }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Servico de validacao nao configurado.' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // =====================================================================
    // ETAPA 1: IA de Extração - lê o espelho e extrai itens em JSON
    // =====================================================================

    const promptExtracao = `Voce e um OCR especializado em documentos comerciais B2B (espelhos de pedido, cotacoes, orcamentos de fornecedores).

Extraia TODOS os itens/produtos listados neste documento.

Para cada item, extraia:
- codigo_fornecedor: o codigo principal do produto (geralmente aparece entre parenteses no inicio, ex: "(4006089)" → "4006089")
- codigo_barras: o codigo de barras/EAN/GTIN (13 digitos, ex: "7897348205258")
- nome: nome/descricao do produto
- quantidade: quantidade (numero)
- preco_unitario: preco unitario (numero decimal, ex: 121.15)
- total: valor total da linha (numero decimal)

IMPORTANTE:
- O codigo_fornecedor geralmente aparece entre parenteses antes do nome do produto
- O codigo_barras/EAN geralmente aparece no campo "Cod. Barras" com 13 digitos
- Valores monetarios como numeros decimais com ponto (ex: 1234.56, NAO "R$ 1.234,56")
- Se o documento tem formato brasileiro (1.234,56), converta para 1234.56
- Extraia TODOS os itens, mesmo que sejam muitos
- Se um campo nao esta visivel, use null

Retorne APENAS um JSON array, sem markdown:
[{"codigo_fornecedor":"4006089","codigo_barras":"7897348205258","nome":"GOLDEN FORM CAES AD CARNE MB 1KG","quantidade":8,"preco_unitario":15.44,"total":123.52}]`

    let itensEspelho: Array<{
      codigo: string | null
      nome: string | null
      quantidade: number | null
      preco_unitario: number | null
      total: number | null
    }>

    try {
      const resp1 = await openai.responses.create({
        model: 'gpt-5.4-mini',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: promptExtracao },
            ...(mimeType === 'application/pdf'
              ? [{ type: 'input_file' as const, file_data: `data:${mimeType};base64,${base64}`, filename }]
              : [{ type: 'input_image' as const, image_url: `data:${mimeType};base64,${base64}`, detail: 'high' as const }]
            ),
          ],
        }],
      })

      const text1 = (resp1.output_text || '').trim()
      if (!text1) throw new Error('IA de extracao retornou vazio')

      // Parse JSON
      let json1 = text1
      const cb = text1.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (cb) json1 = cb[1].trim()
      else {
        const am = text1.match(/\[[\s\S]*\]/)
        if (am) json1 = am[0]
      }

      itensEspelho = JSON.parse(json1)
      if (!Array.isArray(itensEspelho)) throw new Error('Resposta nao e array')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Erro IA Extracao:', err)
      return NextResponse.json({ error: 'Erro ao extrair itens do espelho.', detalhes: msg }, { status: 500 })
    }

    // =====================================================================
    // ETAPA 2: IA de Comparação - recebe os dois conjuntos e faz o match
    // =====================================================================

    // Montar texto dos itens do pedido
    const pedidoTexto = itensPedidoRaw.map((item, i) => {
      const gtin = item.produto_id ? gtinMap.get(item.produto_id) || '' : ''
      return `${i + 1}. GTIN:${gtin || 'N/A'} | CodForn:${item.codigo_fornecedor || 'N/A'} | CodProd:${item.codigo_produto || 'N/A'} | "${item.descricao || ''}" | Qtd:${item.quantidade} | R$${(item.valor || 0).toFixed(2)}`
    }).join('\n')

    // Montar texto dos itens extraidos do espelho
    const espelhoTexto = itensEspelho.map((item, i) => {
      const cf = (item as Record<string, unknown>).codigo_fornecedor || (item as Record<string, unknown>).codigo || 'N/A'
      const cb = (item as Record<string, unknown>).codigo_barras || 'N/A'
      return `${i + 1}. CodForn:${cf} | EAN:${cb} | "${item.nome || ''}" | Qtd:${item.quantidade ?? 'N/A'} | R$${item.preco_unitario?.toFixed(2) ?? 'N/A'} | Total:R$${item.total?.toFixed(2) ?? 'N/A'}`
    }).join('\n')

    const promptComparacao = `Voce e um validador de pedidos de compra B2B. Compare os itens do PEDIDO ORIGINAL com os itens EXTRAIDOS DO ESPELHO do fornecedor.

ITENS DO PEDIDO ORIGINAL (${itensPedidoRaw.length} itens):
${pedidoTexto}

ITENS DO ESPELHO DO FORNECEDOR (${itensEspelho.length} itens):
${espelhoTexto}

INSTRUCOES DE CRUZAMENTO (PRIORIDADE RIGOROSA):
1. PRIMEIRO: Cruze por CodForn do pedido com CodForn do espelho (match EXATO de codigo do fornecedor). Ex: CodForn:4008009 no pedido = CodForn:4008009 no espelho = MATCH
2. SEGUNDO: Se nao encontrou por CodForn, cruze por GTIN/EAN (match exato de codigo de barras)
3. TERCEIRO: Somente se nao encontrou por codigo, tente por nome do produto (entenda abreviacoes: "AD"=adulto, "FIL"=filhote, "MB"=mini bits, "PEQ"=pequeno, "RÇ ESP"=racas especificas)
4. NAO faca match por nome se os codigos sao diferentes! Codigos diferentes = produtos diferentes.
5. Para cada match encontrado: compare quantidade e preco (tolerancia de 2% no preco)
6. Classifique: "ok" (tudo bate), "divergencia" (encontrou mas qtd ou preco diferem), "faltando" (nao achou no espelho)
7. Itens do espelho sem correspondencia no pedido: "extra"

Retorne APENAS JSON valido, sem markdown:
{
  "resumo": {
    "total_pedido": ${itensPedidoRaw.length},
    "total_espelho": ${itensEspelho.length},
    "ok": <numero>,
    "divergencias": <numero>,
    "faltando": <numero>,
    "extras": <numero>
  },
  "itens": [
    {
      "status": "ok"|"divergencia"|"faltando"|"extra",
      "item_pedido": {"codigo":"...","descricao":"...","quantidade":0,"valor":0.00,"gtin":"..."},
      "item_espelho": {"codigo":"...","nome":"...","quantidade":0,"preco_unitario":0.00,"total":0.00},
      "diferencas": ["Quantidade: pedido=4, espelho=3"]
    }
  ]
}

item_pedido = null para "extra". item_espelho = null para "faltando". diferencas = [] para "ok".
Valores monetarios como numeros decimais (121.15).`

    try {
      const resp2 = await openai.responses.create({
        model: 'gpt-5.4-mini',
        input: [{ role: 'user', content: promptComparacao }],
      })

      const text2 = (resp2.output_text || '').trim()
      if (!text2) throw new Error('IA de comparacao retornou vazio')

      let json2 = text2
      const cb2 = text2.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (cb2) json2 = cb2[1].trim()
      else {
        const om = text2.match(/\{[\s\S]*\}/)
        if (om) json2 = om[0]
      }

      const result = JSON.parse(json2)

      if (!result.resumo || !result.itens) {
        throw new Error('Formato de resposta invalido')
      }

      return NextResponse.json({
        success: true,
        resumo: result.resumo,
        itens: result.itens,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Erro IA Comparacao:', err)
      return NextResponse.json({ error: 'Erro ao comparar itens.', detalhes: msg }, { status: 500 })
    }
  } catch (error) {
    console.error('Erro ao validar espelho:', error)
    return NextResponse.json({ error: 'Erro interno ao validar espelho' }, { status: 500 })
  }
}
