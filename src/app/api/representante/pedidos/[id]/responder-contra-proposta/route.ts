import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Contra-proposta desativada. Use rejeicao com motivo.' }, { status: 410 })
}
