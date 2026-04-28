import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateLojistasTemplateBuffer } from '@/lib/lojistas-import'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const buffer = generateLojistasTemplateBuffer()

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_lojistas.xlsx"',
    },
  })
}
