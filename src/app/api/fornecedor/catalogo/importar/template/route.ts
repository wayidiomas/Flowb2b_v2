import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateTemplate } from '@/lib/catalogo-import'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'fornecedor') {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const buffer = generateTemplate()

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-catalogo-produtos.xlsx"',
    },
  })
}
