'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

// A tela de edicao foi unificada na gerar-automatico.
// Esta rota agora apenas redireciona para a tela unificada.
export default function EditarPedidoCompraRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  useEffect(() => {
    if (pedidoId) {
      router.replace(`/compras/pedidos/gerar-automatico?pedido_id=${pedidoId}`)
    }
  }, [pedidoId, router])

  return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-500">
      Redirecionando...
    </div>
  )
}
