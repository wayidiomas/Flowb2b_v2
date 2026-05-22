import { BLING_CONFIG } from './bling'
import { blingFetch } from './bling-fetch'

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
