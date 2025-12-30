import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.empresaId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { fornecedor_id } = await request.json()

    if (!fornecedor_id) {
      return NextResponse.json({ error: 'fornecedor_id obrigatorio' }, { status: 400 })
    }

    const validacaoEanUrl = process.env.VALIDACAO_EAN_URL
    if (!validacaoEanUrl) {
      console.error('VALIDACAO_EAN_URL nao configurada')
      return NextResponse.json(
        { error: 'Servico de calculo nao configurado' },
        { status: 500 }
      )
    }

    // Chamar API externa com timeout de 5 minutos (300000ms)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000)

    try {
      const response = await fetch(
        `${validacaoEanUrl}/calculo_pedido_auto_otimizado/calcular`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fornecedor_id,
            empresa_id: user.empresaId
          }),
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro da API validacao_ean:', response.status, errorText)
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Tempo limite excedido. Tente novamente.' },
          { status: 504 }
        )
      }

      throw fetchError
    }
  } catch (error) {
    console.error('Erro ao calcular sugestoes:', error)
    return NextResponse.json(
      { error: 'Erro ao calcular sugestoes de compra' },
      { status: 500 }
    )
  }
}
