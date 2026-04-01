import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidacaoResumo {
  total_pedido: number
  total_espelho: number
  ok: number
  divergencias: number
  faltando: number
  extras: number
}

export interface ValidacaoItem {
  status: 'ok' | 'divergencia' | 'faltando' | 'extra'
  item_pedido?: {
    codigo: string | null
    descricao: string | null
    quantidade: number
    valor: number | null
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

export interface ValidacaoResult {
  success: boolean
  resumo?: ValidacaoResumo
  itens?: ValidacaoItem[]
  error?: string
  detalhes?: string
  status?: number
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

// ---------------------------------------------------------------------------
// Core validation function
// ---------------------------------------------------------------------------

/**
 * Validates an espelho (mirror document) for a given pedido using AI.
 *
 * IMPORTANT: The caller is responsible for authorizing access to the pedido.
 * This function trusts that the pedidoId has already been validated.
 *
 * @param pedidoId - The confirmed pedido ID (caller already validated access)
 */
export async function validarEspelho(pedidoId: number): Promise<ValidacaoResult> {
  // Check OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: 'Servico de validacao nao configurado.', status: 500 }
  }

  const supabase = createServerSupabaseClient()

  // =========================================================================
  // Fetch pedido (without empresa_id filter - caller already authorized)
  // =========================================================================
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos_compra')
    .select('id, espelho_url, espelho_nome, empresa_id')
    .eq('id', pedidoId)
    .eq('is_excluded', false)
    .single()

  if (pedidoError || !pedido) {
    return { success: false, error: 'Pedido nao encontrado', status: 404 }
  }

  if (!pedido.espelho_url) {
    return { success: false, error: 'Nenhum espelho encontrado para este pedido.', status: 404 }
  }

  // =========================================================================
  // Fetch order items + GTIN
  // =========================================================================
  const { data: itensPedidoRaw, error: itensError } = await supabase
    .from('itens_pedido_compra')
    .select('id, produto_id, codigo_produto, codigo_fornecedor, descricao, unidade, quantidade, valor')
    .eq('pedido_compra_id', pedidoId)

  if (itensError || !itensPedidoRaw || itensPedidoRaw.length === 0) {
    return { success: false, error: 'Nenhum item encontrado no pedido', status: 404 }
  }

  const produtoIds = itensPedidoRaw
    .map(i => i.produto_id)
    .filter((id): id is number => id !== null)

  const gtinMap = new Map<number, string>()
  const itensPorCaixaMap = new Map<number, number | null>()
  const unidadeProdutoMap = new Map<number, string | null>()
  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, gtin, itens_por_caixa, unidade')
      .in('id', produtoIds)
      .eq('empresa_id', pedido.empresa_id)

    for (const p of produtos || []) {
      if (p.gtin) gtinMap.set(p.id, p.gtin)
      itensPorCaixaMap.set(p.id, p.itens_por_caixa)
      unidadeProdutoMap.set(p.id, p.unidade)
    }
  }

  // =========================================================================
  // Download espelho from storage
  // =========================================================================
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('espelhos-pedido')
    .download(pedido.espelho_url)

  if (downloadError || !fileData) {
    return { success: false, error: 'Erro ao baixar arquivo do espelho', status: 500 }
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const base64 = buffer.toString('base64')
  const filename = pedido.espelho_nome || 'espelho'
  const mimeType = getMimeType(filename)

  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return { success: false, error: `Tipo nao suportado: ${mimeType}`, status: 400 }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // =========================================================================
  // STEP 1: AI Extraction - reads the espelho and extracts items as JSON
  // =========================================================================

  const promptExtracao = `Voce e um OCR especializado em documentos comerciais B2B (espelhos de pedido, cotacoes, orcamentos de fornecedores).

Extraia TODOS os itens/produtos listados neste documento.

Para cada item, extraia:
- codigo_fornecedor: o codigo principal do produto (geralmente aparece entre parenteses no inicio, ex: "(4006089)" → "4006089")
- codigo_barras: o codigo de barras/EAN/GTIN (13 digitos, ex: "7897348205258")
- nome: nome/descricao do produto
- quantidade: quantidade (numero)
- preco_unitario: preco unitario (numero decimal, ex: 121.15)
- total: valor total da linha (numero decimal)
- unidade: unidade de medida (UN, CX, FD, PCT, etc.)
- embalagem: informacao de embalagem (ex: "UN C/ 4", "FD C/ 12", "CX C/ 6")

IMPORTANTE:
- O codigo_fornecedor geralmente aparece entre parenteses antes do nome do produto
- O codigo_barras/EAN geralmente aparece no campo "Cod. Barras" com 13 digitos
- Valores monetarios como numeros decimais com ponto (ex: 1234.56, NAO "R$ 1.234,56")
- Se o documento tem formato brasileiro (1.234,56), converta para 1234.56
- Extraia TODOS os itens, mesmo que sejam muitos
- Se um campo nao esta visivel, use null

Retorne APENAS um JSON array, sem markdown:
[{"codigo_fornecedor":"4006089","codigo_barras":"7897348205258","nome":"GOLDEN FORM CAES AD CARNE MB 1KG","quantidade":8,"preco_unitario":15.44,"total":123.52,"unidade":"UN","embalagem":"FD C/ 4"}]`

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
    return { success: false, error: 'Erro ao extrair itens do espelho.', detalhes: msg, status: 500 }
  }

  // =========================================================================
  // STEP 2: AI Comparison - compares the two sets and matches items
  // =========================================================================

  // Build text for pedido items
  const pedidoTexto = itensPedidoRaw.map((item, i) => {
    const gtin = item.produto_id ? gtinMap.get(item.produto_id) || '' : ''
    const unidade = item.produto_id ? unidadeProdutoMap.get(item.produto_id) || item.unidade || '' : item.unidade || ''
    const itens_por_caixa = item.produto_id ? itensPorCaixaMap.get(item.produto_id) : null
    return `${i + 1}. GTIN:${gtin || 'N/A'} | CodForn:${item.codigo_fornecedor || 'N/A'} | CodProd:${item.codigo_produto || 'N/A'} | "${item.descricao || ''}" | Qtd:${item.quantidade} | UN:${unidade || 'N/A'} | CxCom:${itens_por_caixa || 'N/A'} | R$${(item.valor || 0).toFixed(2)}`
  }).join('\n')

  // Build text for espelho items
  const espelhoTexto = itensEspelho.map((item, i) => {
    const cf = (item as Record<string, unknown>).codigo_fornecedor || (item as Record<string, unknown>).codigo || 'N/A'
    const cb = (item as Record<string, unknown>).codigo_barras || 'N/A'
    const un = (item as Record<string, unknown>).unidade || 'N/A'
    const emb = (item as Record<string, unknown>).embalagem || 'N/A'
    return `${i + 1}. CodForn:${cf} | EAN:${cb} | "${item.nome || ''}" | Qtd:${item.quantidade ?? 'N/A'} | UN:${un} | Emb:${emb} | R$${item.preco_unitario?.toFixed(2) ?? 'N/A'} | Total:R$${item.total?.toFixed(2) ?? 'N/A'}`
  }).join('\n')

  const promptComparacao = `Voce e um validador de pedidos de compra B2B. Compare os itens do PEDIDO ORIGINAL com os itens EXTRAIDOS DO ESPELHO do fornecedor.

ITENS DO PEDIDO ORIGINAL (${itensPedidoRaw.length} itens):
${pedidoTexto}

ITENS DO ESPELHO DO FORNECEDOR (${itensEspelho.length} itens):
${espelhoTexto}

REGRA FUNDAMENTAL: Cada item do pedido deve aparecer EXATAMENTE UMA VEZ no resultado. Cada item do espelho deve ser usado EXATAMENTE UMA VEZ. NAO DUPLIQUE itens. O total de itens no resultado deve ser: total_pedido + extras do espelho.

INSTRUCOES DE CRUZAMENTO (PRIORIDADE RIGOROSA):
1. PRIMEIRO: Cruze por CodForn do pedido com CodForn do espelho (match EXATO de codigo do fornecedor). Ex: CodForn:4008009 no pedido = CodForn:4008009 no espelho = MATCH. Cada codigo so pode ser usado UMA VEZ.
2. SEGUNDO: Se nao encontrou por CodForn, cruze por GTIN/EAN (match exato de codigo de barras). Cada EAN so pode ser usado UMA VEZ.
3. TERCEIRO: Somente se nao encontrou por codigo, tente por nome do produto (entenda abreviacoes: "AD"=adulto, "FIL"=filhote, "MB"=mini bits, "PEQ"=pequeno, "RÇ ESP"=racas especificas). Cada nome so pode ser usado UMA VEZ.
4. NAO faca match por nome se os codigos sao diferentes! Codigos diferentes = produtos diferentes.
5. Para cada match encontrado: compare quantidade e preco (tolerancia de 2% no preco)
6. Classifique: "ok" (tudo bate), "divergencia" (encontrou mas qtd ou preco diferem), "faltando" (nao achou no espelho)
7. Itens do espelho que SOBRARAM sem correspondencia no pedido: "extra"
8. NUNCA liste o mesmo item duas vezes. Se ja fez match, NAO use esse item novamente.

REGRAS DE EMBALAGEM (MUITO IMPORTANTE):
- Se a quantidade difere mas o VALOR TOTAL DA LINHA eh igual (tolerancia 2%), considere OK. Isso significa conversao de embalagem (ex: 4 UN = 1 fardo de 4).
- Se o pedido tem Qtd=4 e CxCom=4, e o espelho tem Qtd=1 com embalagem tipo fardo/caixa, eh a mesma coisa: 1 cx de 4 = 4 unidades.
- Priorize SEMPRE comparar o VALOR TOTAL da linha. Se o total bate, a diferenca de quantidade eh apenas conversao de embalagem e NAO eh divergencia.
- Se Qtd_pedido = Qtd_espelho × itens_por_caixa (ou vice-versa), considere OK.

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

    return {
      success: true,
      resumo: result.resumo,
      itens: result.itens,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Erro IA Comparacao:', err)
    return { success: false, error: 'Erro ao comparar itens.', detalhes: msg, status: 500 }
  }
}
