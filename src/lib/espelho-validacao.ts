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
    itens_por_caixa: number | null
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
// Internal types
// ---------------------------------------------------------------------------

interface ItemPedidoInterno {
  idx: number
  codigo_fornecedor: string | null
  codigo_produto: string | null
  descricao: string | null
  quantidade: number
  valor: number | null
  gtin: string | null
  itens_por_caixa: number | null
  unidade: string | null
}

interface ItemEspelhoInterno {
  idx: number
  codigo_fornecedor: string | null
  codigo_barras: string | null
  nome: string | null
  quantidade: number | null
  preco_unitario: number | null
  total: number | null
  unidade: string | null
  embalagem: string | null
}

interface MatchedPair {
  pedido: ItemPedidoInterno
  espelho: ItemEspelhoInterno
  matchType: 'codigo_fornecedor' | 'gtin_ean' | 'codigo_produto' | 'fuzzy_ia'
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

function normalizeCode(code: string | null | undefined): string {
  if (!code || code === 'N/A' || code === '-') return ''
  return code.trim().replace(/^0+/, '') || code.trim()
}

function looksLikeEan(code: string): boolean {
  const clean = normalizeCode(code)
  return clean.length >= 8 && /^\d+$/.test(clean) && /^[789]/.test(clean)
}

function approxEqual(a: number, b: number, tolerance = 0.02): boolean {
  if (a === 0 && b === 0) return true
  if (a === 0 || b === 0) return false
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) <= tolerance
}

// ---------------------------------------------------------------------------
// Gramatura: extracao e comparacao
// Evita matches falsos da IA entre "X 7kg" e "X 10kg" (mesmo nome-base, peso diferente).
// ---------------------------------------------------------------------------

interface Gramatura {
  valor: number   // sempre normalizado para a unidade base
  unidade: 'g' | 'ml' | 'un'  // base normalizada (peso, volume, unidades)
}

// Extrai TODAS as gramaturas/volumes mencionados num texto.
// Ex: "FN FRESH MEAT 2,5kg c/3" -> [{valor: 2500, unidade: 'g'}, {valor: 3, unidade: 'un'}]
function extrairGramaturas(texto: string | null | undefined): Gramatura[] {
  if (!texto) return []
  const out: Gramatura[] = []
  // Regex pega numeros (com . ou , decimal) seguidos de unidade. Tolera espaco opcional.
  // Captura: 2,5kg | 100g | 1L | 1.5L | 500ml | 250g | c/12 | C/3 | 30un
  const reMassa = /\b(\d+(?:[.,]\d+)?)\s*(kg|g)\b/gi
  const reVolume = /\b(\d+(?:[.,]\d+)?)\s*(l|ml)\b/gi
  const reEmbalagem = /\b(?:c|cx|c\/|cont|contendo)\.?\s*(\d+)\s*un?\b/gi
  let m: RegExpExecArray | null
  while ((m = reMassa.exec(texto)) !== null) {
    const v = parseFloat(m[1].replace(',', '.'))
    if (isFinite(v) && v > 0) {
      out.push({ valor: m[2].toLowerCase() === 'kg' ? v * 1000 : v, unidade: 'g' })
    }
  }
  while ((m = reVolume.exec(texto)) !== null) {
    const v = parseFloat(m[1].replace(',', '.'))
    if (isFinite(v) && v > 0) {
      out.push({ valor: m[2].toLowerCase() === 'l' ? v * 1000 : v, unidade: 'ml' })
    }
  }
  while ((m = reEmbalagem.exec(texto)) !== null) {
    const v = parseInt(m[1], 10)
    if (isFinite(v) && v > 0) out.push({ valor: v, unidade: 'un' })
  }
  return out
}

// Compara gramaturas entre dois textos. Retorna true quando ha CONFLITO claro.
// - Se ambos nao tem gramatura -> retorna false (sem informacao, deixa passar)
// - Se um tem e outro nao -> retorna false (sem comparacao possivel, deixa passar)
// - Se ambos tem na mesma unidade -> compara com tolerancia 5%
function gramaturasIncompativeis(textoA: string | null | undefined, textoB: string | null | undefined): boolean {
  const gA = extrairGramaturas(textoA)
  const gB = extrairGramaturas(textoB)
  if (gA.length === 0 || gB.length === 0) return false

  // Pega a maior gramatura de cada lado por unidade — geralmente o produto principal
  const maiorPorUnidade = (lista: Gramatura[]) => {
    const mapa = new Map<string, number>()
    for (const g of lista) {
      const atual = mapa.get(g.unidade) || 0
      if (g.valor > atual) mapa.set(g.unidade, g.valor)
    }
    return mapa
  }

  const mapA = maiorPorUnidade(gA)
  const mapB = maiorPorUnidade(gB)

  // Se ha unidade em comum, compara
  for (const [unidade, valorA] of mapA) {
    const valorB = mapB.get(unidade)
    if (valorB === undefined) continue
    // Tolerancia de 5% (cobre arredondamento). Diferencas reais 1kg vs 2kg etc passam aqui.
    const diff = Math.abs(valorA - valorB) / Math.max(valorA, valorB)
    if (diff > 0.05) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// STEP 2: Deterministic matching (no AI)
// ---------------------------------------------------------------------------

function matchDeterministico(
  pedido: ItemPedidoInterno[],
  espelho: ItemEspelhoInterno[],
): { matched: MatchedPair[]; unmatchedPedido: ItemPedidoInterno[]; unmatchedEspelho: ItemEspelhoInterno[] } {
  const matched: MatchedPair[] = []
  const usedPedido = new Set<number>()
  const usedEspelho = new Set<number>()

  // Build espelho lookup maps
  const espByCodForn = new Map<string, ItemEspelhoInterno[]>()
  const espByEan = new Map<string, ItemEspelhoInterno[]>()
  for (const e of espelho) {
    const cf = normalizeCode(e.codigo_fornecedor)
    if (cf && !looksLikeEan(cf)) {
      if (!espByCodForn.has(cf)) espByCodForn.set(cf, [])
      espByCodForn.get(cf)!.push(e)
    }
    const ean = normalizeCode(e.codigo_barras)
    if (ean) {
      if (!espByEan.has(ean)) espByEan.set(ean, [])
      espByEan.get(ean)!.push(e)
    }
    // Also index codigo_fornecedor as EAN if it looks like one
    if (cf && looksLikeEan(cf)) {
      if (!espByEan.has(cf)) espByEan.set(cf, [])
      espByEan.get(cf)!.push(e)
    }
  }

  function tryMatch(p: ItemPedidoInterno, e: ItemEspelhoInterno, matchType: MatchedPair['matchType']): boolean {
    if (usedPedido.has(p.idx) || usedEspelho.has(e.idx)) return false
    matched.push({ pedido: p, espelho: e, matchType })
    usedPedido.add(p.idx)
    usedEspelho.add(e.idx)
    return true
  }

  // --- ROUND 1: codigo_fornecedor exato (excluindo EANs) ---
  for (const p of pedido) {
    if (usedPedido.has(p.idx)) continue
    const cf = normalizeCode(p.codigo_fornecedor)
    if (!cf || looksLikeEan(cf)) continue
    const candidates = espByCodForn.get(cf)
    if (candidates) {
      for (const e of candidates) {
        if (tryMatch(p, e, 'codigo_fornecedor')) break
      }
    }
  }
  console.log(`[ESPELHO] Round 1 (codigo_fornecedor): ${matched.length} matched`)

  // --- ROUND 2: GTIN/EAN ---
  const matchedAfterR1 = matched.length
  for (const p of pedido) {
    if (usedPedido.has(p.idx)) continue
    // Collect all possible EANs from pedido item
    const eans = new Set<string>()
    if (p.gtin) eans.add(normalizeCode(p.gtin))
    if (p.codigo_produto && looksLikeEan(p.codigo_produto)) eans.add(normalizeCode(p.codigo_produto))
    if (p.codigo_fornecedor && looksLikeEan(p.codigo_fornecedor)) eans.add(normalizeCode(p.codigo_fornecedor))

    for (const ean of eans) {
      if (!ean || usedPedido.has(p.idx)) continue
      const candidates = espByEan.get(ean)
      if (candidates) {
        for (const e of candidates) {
          if (tryMatch(p, e, 'gtin_ean')) break
        }
      }
    }
  }
  console.log(`[ESPELHO] Round 2 (GTIN/EAN): ${matched.length - matchedAfterR1} matched`)

  // --- ROUND 3: codigo_produto against any espelho code ---
  const matchedAfterR2 = matched.length
  for (const p of pedido) {
    if (usedPedido.has(p.idx)) continue
    const cp = normalizeCode(p.codigo_produto)
    if (!cp) continue
    // Try against espelho codigo_fornecedor
    const candidates = espByCodForn.get(cp)
    if (candidates) {
      for (const e of candidates) {
        if (tryMatch(p, e, 'codigo_produto')) break
      }
    }
  }
  console.log(`[ESPELHO] Round 3 (codigo_produto): ${matched.length - matchedAfterR2} matched`)

  const unmatchedPedido = pedido.filter(p => !usedPedido.has(p.idx))
  const unmatchedEspelho = espelho.filter(e => !usedEspelho.has(e.idx))
  console.log(`[ESPELHO] Deterministic total: ${matched.length}/${pedido.length} pedido, ${espelho.length - unmatchedEspelho.length}/${espelho.length} espelho`)
  console.log(`[ESPELHO] Unmatched: ${unmatchedPedido.length} pedido, ${unmatchedEspelho.length} espelho`)

  return { matched, unmatchedPedido, unmatchedEspelho }
}

// ---------------------------------------------------------------------------
// STEP 3: Fuzzy matching by AI (only unmatched items)
// ---------------------------------------------------------------------------

async function matchFuzzyIA(
  openai: OpenAI,
  unmatchedPedido: ItemPedidoInterno[],
  unmatchedEspelho: ItemEspelhoInterno[],
): Promise<MatchedPair[]> {
  if (unmatchedPedido.length === 0 || unmatchedEspelho.length === 0) return []

  const pedidoTexto = unmatchedPedido.map((p, i) =>
    `${i}. CodForn:${p.codigo_fornecedor || 'N/A'} | CodProd:${p.codigo_produto || 'N/A'} | GTIN:${p.gtin || 'N/A'} | "${p.descricao || ''}" | Qtd:${p.quantidade}`
  ).join('\n')

  const espelhoTexto = unmatchedEspelho.map((e, i) =>
    `${i}. CodForn:${e.codigo_fornecedor || 'N/A'} | EAN:${e.codigo_barras || 'N/A'} | "${e.nome || ''}" | Qtd:${e.quantidade ?? 'N/A'}`
  ).join('\n')

  const prompt = `Voce e um ESPECIALISTA em cruzamento de nomes de produtos do setor PET e VETERINARIO.
Sua tarefa: associar itens de um PEDIDO de compra (que nao casaram por codigo) com itens do ESPELHO do
fornecedor. Os nomes vem de fontes diferentes e quase sempre divergem MUITO na forma — abreviacoes
agressivas, ordem de palavras diferente, com/sem a marca, "E"/"&" omitidos, acentos faltando. O MESMO
produto pode aparecer como "GP GMT CAO AD MI OVE ARR 3KG" de um lado e "GRAN PLUS GOURMET CAO ADULTO
MINI OVELHA E ARROZ 3kg" do outro. Seu trabalho e enxergar atraves dessas diferencas.

METODOLOGIA (siga para cada par candidato):
1. EXPANDA todas as abreviacoes dos dois nomes.
2. Decomponha cada nome nestes componentes: MARCA, LINHA/SUBLINHA, ESPECIE (cao/gato), FASE
   (filhote/adulto/senior), PORTE (mini/pequeno/medio/grande), SABOR/INGREDIENTE principal, GRAMATURA.
3. Considere o MESMO produto quando MARCA + LINHA + ESPECIE + FASE + PORTE + SABOR baterem — mesmo que
   a ordem, a forma das palavras ou a presenca da marca sejam diferentes. A semelhanca textual NAO
   importa; o que importa e descrever o mesmo produto fisico.

DICIONARIO DE ABREVIACOES (nao exaustivo — infira outras pelo contexto):
- Marcas/linhas: GP=Gran Plus, GMT=Gourmet, SD=Special Dog, UL/ULTRALIFE=Ultralife, FN=Formula Natural,
  MENU, CHOICE, MIX, BIONATURAL, PRIME
- Especie: CAO/CAES/CN=caes, GAT/GT/GATO=gatos
- Fase: AD=adulto, FIL/FILH=filhote, JR/JUNIOR=junior, SR/SENIOR=senior, CAST=castrado
- Porte: MI/MINI=mini, PEQ/RP/"RACAS PEQ"=racas pequenas, MED/MD=medio, GR/GDE=grande, MG=medio e grande
- Sabor/ingrediente: OVE=ovelha, ARR=arroz, FG/FRG=frango, CN/CARNE=carne, SAL/SALM=salmao, CER=cereais,
  COR=cordeiro, FRESH MEAT, BAT=batata
- Formas/outros: MB=mini bits, COMP/CP=comprimidos, ELIZAB=elizabetano, SHAMP=shampoo, SOL=solucao,
  SPRAY, FRALDA=fralda descartavel, BIFINHO, PETISCO, SACHE

REGRA CRITICA — GRAMATURA / PESO / VOLUME:
Produtos com gramaturas/pesos/volumes DIFERENTES sao SKUs DIFERENTES, mesmo que todo o resto seja igual.
NUNCA case pesos diferentes.
  - "RACAO X PEQ 7kg" x "RACAO X PEQ 10kg"   -> NAO casar
  - "PETISCO Y 100g" x "PETISCO Y 250g"      -> NAO casar
  - "LEITINHO Z 200ml" x "LEITINHO Z 500ml"  -> NAO casar
  (Atencao: "1kg" != "1,5kg"; "3kg" != "3KG" e IGUAL — caixa e espaco nao contam.)

CRITERIO DE DECISAO:
- Case quando voce, como especialista, concluir que descrevem o MESMO produto fisico (mesmos componentes
  + mesma gramatura), por mais diferentes que os textos parecam.
- Se houver mais de um candidato plausivel para o mesmo item, escolha o que melhor casa nos componentes.
- So deixe SEM match quando nenhum candidato corresponder em marca/linha/variante, OU quando a unica
  diferenca for a gramatura. Nesse caso o item do pedido fica como ruptura e o do espelho como extra.
- Cada indice (pedido e espelho) so pode ser usado UMA vez.

PEDIDO sem match (${unmatchedPedido.length} itens):
${pedidoTexto}

ESPELHO sem match (${unmatchedEspelho.length} itens):
${espelhoTexto}

Retorne APENAS um JSON array, sem markdown e sem comentarios:
[{"pedido_idx": 0, "espelho_idx": 2}]
Se nenhum par for o mesmo produto, retorne []`

  try {
    const resp = await openai.responses.create({
      model: 'gpt-5.4-mini',
      reasoning: { effort: 'high' },
      input: [{ role: 'user', content: prompt }],
    })

    const text = (resp.output_text || '').trim()
    if (!text) return []

    let json = text
    const cb = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cb) json = cb[1].trim()
    else {
      const am = text.match(/\[[\s\S]*\]/)
      if (am) json = am[0]
    }

    const pairs: Array<{ pedido_idx: number; espelho_idx: number }> = JSON.parse(json)
    if (!Array.isArray(pairs)) return []

    // Convert to MatchedPair, deduplicating + filtrando matches com gramatura conflitante
    const result: MatchedPair[] = []
    const usedP = new Set<number>()
    const usedE = new Set<number>()
    let rejeitadosPorGramatura = 0

    for (const { pedido_idx, espelho_idx } of pairs) {
      if (usedP.has(pedido_idx) || usedE.has(espelho_idx)) continue
      if (pedido_idx < 0 || pedido_idx >= unmatchedPedido.length) continue
      if (espelho_idx < 0 || espelho_idx >= unmatchedEspelho.length) continue

      const ped = unmatchedPedido[pedido_idx]
      const esp = unmatchedEspelho[espelho_idx]

      // Guardrail deterministico: descarta matches que a IA fez ignorando
      // diferenca de gramatura/peso/volume (causa do bug "10kg nao vira extra")
      if (gramaturasIncompativeis(ped.descricao, esp.nome)) {
        rejeitadosPorGramatura++
        console.warn('[ESPELHO][guardrail] match IA rejeitado por gramatura divergente', {
          pedido: ped.descricao,
          espelho: esp.nome,
        })
        continue
      }

      result.push({ pedido: ped, espelho: esp, matchType: 'fuzzy_ia' })
      usedP.add(pedido_idx)
      usedE.add(espelho_idx)
    }

    // Telemetria detalhada dos pares aceitos (ajuda a calibrar o prompt)
    if (result.length > 0) {
      console.log('[ESPELHO][fuzzy-ia] pares aceitos:', result.map(r => ({
        pedido: r.pedido.descricao, espelho: r.espelho.nome,
      })))
    }
    console.log(`[ESPELHO] Fuzzy IA: ${result.length} matched, ${rejeitadosPorGramatura} rejeitados por gramatura (de ${pairs.length} pares retornados pela IA); pool: ${unmatchedPedido.length}p × ${unmatchedEspelho.length}e`)
    return result
  } catch (err) {
    console.error('[ESPELHO] Fuzzy IA error:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// STEP 4: Classification (no AI)
// ---------------------------------------------------------------------------

function classificarItens(
  allMatched: MatchedPair[],
  unmatchedPedido: ItemPedidoInterno[],
  unmatchedEspelho: ItemEspelhoInterno[],
): { resumo: ValidacaoResumo; itens: ValidacaoItem[] } {
  const itens: ValidacaoItem[] = []
  let ok = 0, divergencias = 0

  for (const { pedido: p, espelho: e } of allMatched) {
    const diffs: string[] = []
    const qtyP = Number(p.quantidade) || 0
    const qtyE = Number(e.quantidade) || 0
    const precoP = Number(p.valor) || 0
    const precoE = Number(e.preco_unitario) || 0
    const totalE = Number(e.total) || 0
    const totalP = precoP * qtyP
    const ipc = p.itens_por_caixa || 1

    // Master check: se o TOTAL DA LINHA bate (2%), considerar OK
    // Isso pega: conversão de embalagem, IA confundindo unit price com total, arredondamentos
    const totalEReal = totalE > 0 ? totalE : precoE * qtyE
    if (totalP > 0 && totalEReal > 0 && approxEqual(totalP, totalEReal)) {
      // Total bate — tudo OK, diferenças são só de representação
      const status = 'ok' as const
      ok++
      itens.push({
        status,
        item_pedido: {
          codigo: p.codigo_fornecedor, descricao: p.descricao,
          quantidade: qtyP, valor: precoP, gtin: p.gtin,
          itens_por_caixa: p.itens_por_caixa,
        },
        item_espelho: {
          codigo: e.codigo_fornecedor, nome: e.nome,
          quantidade: qtyE, preco_unitario: precoE, total: totalEReal,
        },
        diferencas: [],
      })
      continue
    }

    // Check quantity (with embalagem conversion)
    let qtyOk = qtyP === qtyE
    if (!qtyOk && ipc > 1 && (qtyP === qtyE * ipc || qtyE === qtyP * ipc)) {
      qtyOk = true
    }
    if (!qtyOk) {
      diffs.push(`Quantidade: pedido=${qtyP}, espelho=${qtyE}`)
    }

    // Check price
    let precoOk = approxEqual(precoP, precoE)
    // Also check if espelho "unit price" is actually the line total
    if (!precoOk && qtyP > 0 && approxEqual(precoP * qtyP, precoE)) {
      precoOk = true // espelho tem total no campo de preco unitario
    }
    if (!precoOk && precoE > 0) {
      diffs.push(`Preço unitário: pedido=${precoP.toFixed(2)}, espelho=${precoE.toFixed(2)}`)
    }

    const status = diffs.length === 0 ? 'ok' : 'divergencia'
    if (status === 'ok') ok++
    else divergencias++

    itens.push({
      status,
      item_pedido: {
        codigo: p.codigo_fornecedor,
        descricao: p.descricao,
        quantidade: qtyP,
        valor: precoP,
        gtin: p.gtin,
        itens_por_caixa: p.itens_por_caixa,
      },
      item_espelho: {
        codigo: e.codigo_fornecedor,
        nome: e.nome,
        quantidade: qtyE,
        preco_unitario: precoE,
        total: totalE,
      },
      diferencas: diffs,
    })
  }

  // Faltando (pedido items not found in espelho)
  for (const p of unmatchedPedido) {
    itens.push({
      status: 'faltando',
      item_pedido: {
        codigo: p.codigo_fornecedor,
        descricao: p.descricao,
        quantidade: Number(p.quantidade) || 0,
        valor: Number(p.valor) || 0,
        gtin: p.gtin,
        itens_por_caixa: p.itens_por_caixa,
      },
      diferencas: [],
    })
  }

  // Extra (espelho items not found in pedido)
  for (const e of unmatchedEspelho) {
    itens.push({
      status: 'extra',
      item_espelho: {
        codigo: e.codigo_fornecedor,
        nome: e.nome,
        quantidade: Number(e.quantidade) || 0,
        preco_unitario: Number(e.preco_unitario) || 0,
        total: Number(e.total) || 0,
      },
      diferencas: [],
    })
  }

  const resumo: ValidacaoResumo = {
    total_pedido: allMatched.length + unmatchedPedido.length,
    total_espelho: allMatched.length + unmatchedEspelho.length,
    ok,
    divergencias,
    faltando: unmatchedPedido.length,
    extras: unmatchedEspelho.length,
  }

  return { resumo, itens }
}

// ---------------------------------------------------------------------------
// Core validation function
// ---------------------------------------------------------------------------

export async function validarEspelho(pedidoId: number): Promise<ValidacaoResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: 'Servico de validacao nao configurado.', status: 500 }
  }

  const supabase = createServerSupabaseClient()

  // =========================================================================
  // Fetch pedido
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
  // Fetch order items + GTIN + itens_por_caixa
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
  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, gtin, itens_por_caixa')
      .in('id', produtoIds)
      .eq('empresa_id', pedido.empresa_id)

    for (const p of produtos || []) {
      if (p.gtin) gtinMap.set(p.id, p.gtin)
      itensPorCaixaMap.set(p.id, p.itens_por_caixa)
    }
  }

  // Build internal pedido items
  const itensPedido: ItemPedidoInterno[] = itensPedidoRaw.map((item, idx) => ({
    idx,
    codigo_fornecedor: item.codigo_fornecedor || null,
    codigo_produto: item.codigo_produto || null,
    descricao: item.descricao || null,
    quantidade: Number(item.quantidade) || 0,
    valor: Number(item.valor) || 0,
    gtin: item.produto_id ? gtinMap.get(item.produto_id) || null : null,
    itens_por_caixa: item.produto_id ? itensPorCaixaMap.get(item.produto_id) ?? null : null,
    unidade: item.unidade || null,
  }))

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
  // STEP 1: AI Extraction (kept as-is)
  // =========================================================================

  const promptExtracao = `Voce e um OCR especializado em documentos comerciais B2B (espelhos de pedido, cotacoes, orcamentos de fornecedores pet/veterinarios).

Extraia TODOS os itens/produtos listados neste documento.

Para cada item, extraia:
- codigo_fornecedor: codigo interno do fornecedor (geralmente entre parenteses, ex: "(4006089)" → "4006089", ou coluna "Cod")
- codigo_barras: codigo de barras/EAN/GTIN (13 digitos, ex: "7897348205258")
- nome: nome/descricao do produto
- quantidade: quantidade (numero inteiro)
- preco_unitario: preco unitario (numero decimal com ponto, ex: 121.15)
- total: valor total da linha (numero decimal)
- unidade: unidade de medida (UN, CX, FD, PCT, etc.)
- embalagem: informacao de embalagem (ex: "UN C/ 4", "FD C/ 12")

IMPORTANTE:
- Valores monetarios brasileiros (1.234,56) devem ser convertidos para decimal (1234.56)
- Extraia TODOS os itens, mesmo que sejam muitos
- Se um campo nao esta visivel, use null
- codigo_fornecedor e codigo_barras sao campos DIFERENTES — nao confunda

Retorne APENAS um JSON array, sem markdown:
[{"codigo_fornecedor":"4006089","codigo_barras":"7897348205258","nome":"GOLDEN FORM CAES AD CARNE MB 1KG","quantidade":8,"preco_unitario":15.44,"total":123.52,"unidade":"UN","embalagem":"FD C/ 4"}]`

  let itensEspelhoRaw: Array<Record<string, unknown>>

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

    let json1 = text1
    const cb = text1.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cb) json1 = cb[1].trim()
    else {
      const am = text1.match(/\[[\s\S]*\]/)
      if (am) json1 = am[0]
    }

    itensEspelhoRaw = JSON.parse(json1)
    if (!Array.isArray(itensEspelhoRaw)) throw new Error('Resposta nao e array')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Erro IA Extracao:', err)
    return { success: false, error: 'Erro ao extrair itens do espelho.', detalhes: msg, status: 500 }
  }

  console.log(`[ESPELHO] Extração: ${itensEspelhoRaw.length} itens do espelho, ${itensPedido.length} itens do pedido`)

  // Build internal espelho items
  const itensEspelho: ItemEspelhoInterno[] = itensEspelhoRaw.map((item, idx) => ({
    idx,
    codigo_fornecedor: String(item.codigo_fornecedor || item.codigo || '') || null,
    codigo_barras: String(item.codigo_barras || '') || null,
    nome: String(item.nome || '') || null,
    quantidade: item.quantidade != null ? Number(item.quantidade) : null,
    preco_unitario: item.preco_unitario != null ? Number(item.preco_unitario) : null,
    total: item.total != null ? Number(item.total) : null,
    unidade: String(item.unidade || '') || null,
    embalagem: String(item.embalagem || '') || null,
  }))

  // =========================================================================
  // STEP 2: Deterministic matching (TypeScript, no AI)
  // =========================================================================
  const det = matchDeterministico(itensPedido, itensEspelho)

  // =========================================================================
  // STEP 3: Fuzzy matching by AI (only unmatched items)
  // =========================================================================
  const fuzzyMatches = await matchFuzzyIA(openai, det.unmatchedPedido, det.unmatchedEspelho)

  // Remove fuzzy-matched from unmatched pools
  const fuzzyPedidoIdxs = new Set(fuzzyMatches.map(m => m.pedido.idx))
  const fuzzyEspelhoIdxs = new Set(fuzzyMatches.map(m => m.espelho.idx))
  const finalUnmatchedPedido = det.unmatchedPedido.filter(p => !fuzzyPedidoIdxs.has(p.idx))
  const finalUnmatchedEspelho = det.unmatchedEspelho.filter(e => !fuzzyEspelhoIdxs.has(e.idx))

  // =========================================================================
  // STEP 4: Classification (TypeScript, no AI)
  // =========================================================================
  const allMatched = [...det.matched, ...fuzzyMatches]
  const { resumo, itens } = classificarItens(allMatched, finalUnmatchedPedido, finalUnmatchedEspelho)

  console.log(`[ESPELHO] Final: ${resumo.ok} ok, ${resumo.divergencias} diverg, ${resumo.faltando} faltando, ${resumo.extras} extras`)

  return { success: true, resumo, itens }
}
