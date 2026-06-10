import { BLING_CONFIG } from './bling'
import { blingFetch } from './bling-fetch'
import { createServerSupabaseClient } from './supabase'
import { FRETE_POR_CONTA_MAP, FretePorContaLabel } from '@/types/pedido-compra'

export type CancelamentoBlingResult =
  | { ok: true; jaCancelado?: boolean }
  | { ok: false; naoEncontrado?: boolean; status: number; errorText: string }

/**
 * Cancela um pedido de compra no Bling (situacao 2 = Cancelado).
 * Endpoint oficial (Bling API v3): PATCH /pedidos/compras/{id}/situacoes  body { valor: 2 }
 *
 * Idempotente: se o Bling indicar que o pedido ja esta cancelado, retorna ok.
 * Fonte unica usada tanto pelo "Cancelar Pedido" quanto pela "lixeira" (excluir).
 */
export async function cancelarPedidoCompraBling(
  blingId: number | string,
  accessToken: string
): Promise<CancelamentoBlingResult> {
  const result = await blingFetch(
    `${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}/situacoes`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ valor: 2 }),
    },
    { context: 'cancelar pedido de compra', maxRetries: 3 }
  )

  if (result.response.ok) {
    return { ok: true }
  }

  const errorText = await result.response.text().catch(() => '')

  // Idempotencia: Bling devolve mensagem especifica quando ja esta cancelado
  if (errorText.toLowerCase().includes('cancelad')) {
    return { ok: true, jaCancelado: true }
  }

  return {
    ok: false,
    naoEncontrado: result.response.status === 404,
    status: result.response.status,
    errorText: errorText.slice(0, 300),
  }
}

// ============================================================
// Sincronizacao do pedido completo (itens + parcelas) com o Bling
// ============================================================

export type SyncPedidoResult =
  | { ok: true; warning?: string }
  | { ok: false; bloqueado?: boolean; error: string; details?: string }

// Marcadores do bloco de itens extra dentro da observacao do Bling. O bloco e
// REconstruido a cada sync (idempotente): removemos um bloco antigo e reanexamos
// o atual, entao re-sincronizar nunca duplica.
const EXTRAS_MARK_START = '--- Itens adicionais (FlowB2B) ---'
const EXTRAS_MARK_END = '--- fim itens adicionais ---'

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Monta a observacao do Bling preservando o texto do usuario e (re)anexando o
 * bloco de itens extra. Remove qualquer bloco anterior antes de reanexar.
 */
export function montarObservacaoComExtras(
  obsAtual: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itensExtra: any[],
): string {
  // Remove bloco antigo (se existir) entre os marcadores
  const reBloco = new RegExp(
    `\\n*${EXTRAS_MARK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${EXTRAS_MARK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  )
  const base = (obsAtual || '').replace(reBloco, '').trim()

  if (!itensExtra || itensExtra.length === 0) return base

  const linhas = itensExtra.map((it) => {
    const qtd = Number(it.quantidade) || 0
    const valor = (it.valor_unitario_final ?? it.valor) || 0
    const cod = it.codigo_fornecedor || it.ean
    const partes = [`- ${qtd}x ${it.descricao || 'Produto'}`]
    if (cod) partes.push(`(cod ${cod})`)
    if (valor > 0) partes.push(`${fmtBRL(valor)}/un`)
    return partes.join(' ')
  })

  const bloco = [
    EXTRAS_MARK_START,
    'Itens negociados a faturar pela nota fiscal (nao incluidos no total deste pedido):',
    ...linhas,
    EXTRAS_MARK_END,
  ].join('\n')

  return base ? `${base}\n\n${bloco}` : bloco
}

/**
 * Re-envia o pedido de compra COMPLETO para o Bling (PUT), refletindo o estado
 * atual de itens_pedido_compra + parcelas_pedido_compra do Supabase.
 *
 * Usado quando o lojista ACEITA uma sugestao do fornecedor: nesse momento itens
 * podem ter sido inseridos (extras/novos), substituidos ou ter quantidade/preco
 * alterados — mudancas que so existiam no Supabase. Sem este PUT, o pedido no
 * Bling ficaria desatualizado (so o status mudava via PATCH /situacoes).
 *
 * Fluxo (igual ao PUT /api/pedidos-compra/[id]):
 *   estornar-contas  ->  PUT /pedidos/compras/{blingId}  ->  lancar-contas
 *
 * As parcelas existentes sao RE-PROPORCIONADAS para bater com o novo total dos
 * itens (evita erro 220 do Bling). Datas e forma de pagamento sao preservadas.
 *
 * Best-effort no estorno/relancamento; bloqueia (ok:false, bloqueado:true) apenas
 * quando ha conta a pagar ja baixada/paga (nao da pra editar no Bling).
 */
export async function sincronizarPedidoCompraComBling(params: {
  pedidoId: number | string
  blingId: number | string
  empresaId: number
  accessToken: string
  supabase: ReturnType<typeof createServerSupabaseClient>
  /** % de desconto geral aplicado (0 = nenhum). Enviado como desconto PERCENTUAL ao Bling. */
  descontoGeralPercentual?: number
}): Promise<SyncPedidoResult> {
  const { pedidoId, blingId, empresaId, accessToken, supabase } = params
  const descontoGeral = params.descontoGeralPercentual || 0

  // 1. Cabecalho do pedido
  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos_compra')
    .select('data, data_prevista, fornecedor_id, frete, frete_por_conta, transportador, peso_bruto, volumes, ordem_compra, observacoes, observacoes_internas, total_icms')
    .eq('id', pedidoId)
    .eq('empresa_id', empresaId)
    .single()

  if (pedidoErr || !pedido) {
    return { ok: false, error: 'Pedido nao encontrado para sincronizar com Bling' }
  }

  // 2. id_bling do fornecedor
  const { data: fornecedor } = await supabase
    .from('fornecedores')
    .select('id_bling')
    .eq('id', pedido.fornecedor_id)
    .eq('empresa_id', empresaId)
    .single()

  if (!fornecedor?.id_bling) {
    return { ok: false, error: 'Fornecedor sem ID Bling vinculado; nao e possivel atualizar no Bling.' }
  }

  // 3. Itens atuais (estado pos-aceite) + dados do produto para id_produto_bling
  const { data: itens } = await supabase
    .from('itens_pedido_compra')
    .select('descricao, unidade, valor, valor_unitario_final, quantidade, aliquota_ipi, codigo_fornecedor, codigo_produto, ean, produto_id, somente_flowb2b, produtos(id_produto_bling, codigo, gtin)')
    .eq('pedido_compra_id', pedidoId)

  if (!itens || itens.length === 0) {
    return { ok: false, error: 'Pedido sem itens para sincronizar com Bling' }
  }

  // Itens "extra" (somente_flowb2b) NAO vao ao Bling como linha: entram na
  // observacao do pedido e ficam fora do total/parcelas. Os demais sincronizam.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itensBling = itens.filter((it: any) => !it.somente_flowb2b)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itensExtra = itens.filter((it: any) => it.somente_flowb2b)

  if (itensBling.length === 0) {
    return { ok: false, error: 'Pedido sem itens sincronizaveis com o Bling (apenas itens extra FlowB2B).' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itensPayload = itensBling.map((it: any) => {
    const prod = Array.isArray(it.produtos) ? it.produtos[0] : it.produtos
    // valor_unitario_final ja embute o desconto por item (quando houve)
    const valorUnit = (it.valor_unitario_final ?? it.valor) || 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemPayload: Record<string, any> = {
      descricao: it.descricao || 'Produto',
      unidade: it.unidade || 'UN',
      valor: valorUnit,
      quantidade: it.quantidade,
      aliquotaIPI: it.aliquota_ipi || 0,
    }
    const codigoForn = it.codigo_fornecedor || it.codigo_produto || prod?.codigo
    if (codigoForn) itemPayload.codigoFornecedor = codigoForn
    if (prod?.id_produto_bling) {
      itemPayload.produto = { id: Number(prod.id_produto_bling) }
      if (prod.codigo) itemPayload.produto.codigo = prod.codigo
    }
    return itemPayload
  })

  // 4. Total que o Bling vera (itens net + IPI - desconto geral + frete)
  let blingTotal = itensPayload.reduce((acc, it) => {
    const subtotal = it.quantidade * it.valor
    const ipi = subtotal * ((it.aliquotaIPI || 0) / 100)
    return acc + subtotal + ipi
  }, 0)
  if (descontoGeral > 0) {
    blingTotal -= blingTotal * (descontoGeral / 100)
  }

  const freteNaoSoma = pedido.frete_por_conta === 'CIF' || pedido.frete_por_conta === 'SEM_FRETE'
  const freteValor = !freteNaoSoma && pedido.frete ? Number(pedido.frete) : 0
  blingTotal += freteValor
  blingTotal = Math.round(blingTotal * 100) / 100

  // 5. Montar payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    data: pedido.data,
    fornecedor: { id: fornecedor.id_bling },
    itens: itensPayload,
  }
  if (pedido.data_prevista) payload.dataPrevista = pedido.data_prevista
  if (pedido.ordem_compra) payload.ordemCompra = pedido.ordem_compra
  // Observacao do Bling = obs do usuario + bloco com os itens extra (FlowB2B-only)
  const obsComExtras = montarObservacaoComExtras(pedido.observacoes, itensExtra)
  if (obsComExtras) payload.observacoes = obsComExtras
  if (pedido.observacoes_internas) payload.observacoesInternas = pedido.observacoes_internas
  if (descontoGeral > 0) payload.desconto = { valor: descontoGeral, unidade: 'PERCENTUAL' }
  if (pedido.total_icms && Number(pedido.total_icms) > 0) {
    payload.tributacao = { totalICMS: Number(pedido.total_icms) }
  }
  if (freteValor > 0 || pedido.transportador || pedido.frete_por_conta) {
    payload.transporte = {}
    if (freteValor > 0) payload.transporte.frete = freteValor
    if (pedido.transportador) payload.transporte.transportador = pedido.transportador
    if (pedido.frete_por_conta) {
      const fpc = pedido.frete_por_conta
      payload.transporte.fretePorConta =
        FRETE_POR_CONTA_MAP[fpc as FretePorContaLabel] ?? (Number.isFinite(Number(fpc)) ? Number(fpc) : 0)
    }
    if (pedido.peso_bruto) payload.transporte.pesoBruto = Number(pedido.peso_bruto)
    if (pedido.volumes) payload.transporte.volumes = Number(pedido.volumes)
  }

  // 6. Parcelas: re-proporcionar para bater com o novo total.
  // OBS: parcelas_pedido_compra.forma_pagamento_id guarda o ID do BLING
  // (id_forma_de_pagamento_bling) diretamente — nao o id interno do Supabase.
  const { data: parcelas } = await supabase
    .from('parcelas_pedido_compra')
    .select('valor, data_vencimento, observacao, forma_pagamento_id')
    .eq('pedido_compra_id', pedidoId)
    .order('data_vencimento', { ascending: true })

  if (parcelas && parcelas.length > 0) {
    const somaAtual = parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
    let acumulado = 0
    payload.parcelas = parcelas.map((p, idx) => {
      let valorParcela: number
      if (idx === parcelas.length - 1) {
        // ultima parcela absorve o residuo de arredondamento
        valorParcela = Math.round((blingTotal - acumulado) * 100) / 100
      } else {
        const proporcao = somaAtual > 0 ? (Number(p.valor) || 0) / somaAtual : 1 / parcelas.length
        valorParcela = Math.round(blingTotal * proporcao * 100) / 100
        acumulado += valorParcela
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parcelaPayload: Record<string, any> = {
        valor: valorParcela,
        dataVencimento: p.data_vencimento,
        observacao: p.observacao || '',
      }
      if (p.forma_pagamento_id) {
        parcelaPayload.formaPagamento = { id: p.forma_pagamento_id }
      }
      return parcelaPayload
    })
  }

  // 7. ESTORNAR contas antes do PUT (conta paga/baixada bloqueia a edicao)
  let warning: string | null = null
  try {
    const estorno = await blingFetch(
      `${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}/estornar-contas`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      },
      { context: 'estornar contas (aceite sugestao)', maxRetries: 3 }
    )
    if (!estorno.response.ok) {
      const txt = (await estorno.response.text().catch(() => '')).toLowerCase()
      const contaPaga = txt.includes('paga') || txt.includes('baixad') || txt.includes('liquidad') || txt.includes('quitad')
      const semContas = txt.includes('nenhuma conta') || txt.includes('nao ha conta') || txt.includes('não há conta') || txt.includes('sem conta') || txt.includes('nota fiscal')
      if (contaPaga && !semContas) {
        return { ok: false, bloqueado: true, error: 'Pedido possui conta a pagar ja baixada/paga no Bling e nao pode ser atualizado.', details: txt.slice(0, 300) }
      }
      if (!semContas) warning = 'Nao foi possivel estornar contas a pagar automaticamente. Verifique no Bling.'
    }
  } catch (e) {
    console.warn('[syncPedidoBling] estorno falhou (best-effort):', e)
    warning = 'Nao foi possivel estornar contas a pagar automaticamente. Verifique no Bling.'
  }

  // 8. PUT do pedido
  const put = await blingFetch(
    `${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    },
    { context: 'atualizar pedido (aceite sugestao)', maxRetries: 5 }
  )

  if (!put.response.ok) {
    const errorText = await put.response.text().catch(() => '')
    let errorMessage = 'Erro ao atualizar pedido no Bling'
    try {
      const j = JSON.parse(errorText)
      errorMessage = j.error?.message || j.error?.description || errorMessage
    } catch {
      if (errorText) errorMessage = errorText
    }
    console.error('[syncPedidoBling] PUT erro:', put.response.status, errorText)
    return { ok: false, error: errorMessage, details: errorText.slice(0, 500) }
  }

  // 9. Re-lancar contas (best-effort)
  try {
    const lancar = await blingFetch(
      `${BLING_CONFIG.apiUrl}/pedidos/compras/${blingId}/lancar-contas`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      },
      { context: 'lancar contas (aceite sugestao)', maxRetries: 3 }
    )
    if (!lancar.response.ok) {
      const w = 'Pedido atualizado, mas nao foi possivel re-lancar as contas a pagar. Verifique no Bling.'
      warning = warning ? `${warning} ${w}` : w
    }
  } catch (e) {
    console.warn('[syncPedidoBling] relancamento falhou (best-effort):', e)
    const w = 'Pedido atualizado, mas nao foi possivel re-lancar as contas a pagar. Verifique no Bling.'
    warning = warning ? `${warning} ${w}` : w
  }

  return warning ? { ok: true, warning } : { ok: true }
}
