import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { syncCatalogoAtualizacoes } from '@/lib/catalogo-bling-sync'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { empresa_id, catalogo_id, atualizacao_ids } = body as {
      empresa_id: number
      catalogo_id: number
      atualizacao_ids: number[]
    }

    // Validate required fields
    if (!empresa_id || !catalogo_id) {
      return NextResponse.json(
        { error: 'empresa_id e catalogo_id sao obrigatorios' },
        { status: 400 }
      )
    }

    if (!atualizacao_ids || !Array.isArray(atualizacao_ids) || atualizacao_ids.length === 0) {
      return NextResponse.json(
        { error: 'atualizacao_ids obrigatorio (array nao vazio)' },
        { status: 400 }
      )
    }

    // Validate empresa_id matches authenticated user
    if (empresa_id !== user.empresaId) {
      return NextResponse.json(
        { error: 'empresa_id nao corresponde ao usuario autenticado' },
        { status: 403 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Check empresa is connected to Bling
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('conectadabling')
      .eq('id', empresa_id)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa nao encontrada' },
        { status: 404 }
      )
    }

    if (!empresa.conectadabling) {
      return NextResponse.json(
        { error: 'Empresa nao esta conectada ao Bling' },
        { status: 400 }
      )
    }

    // Execute sync
    const result = await syncCatalogoAtualizacoes(empresa_id, catalogo_id, atualizacao_ids)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao sincronizar catalogo com Bling:', error)
    return NextResponse.json(
      { error: 'Erro interno ao sincronizar com Bling' },
      { status: 500 }
    )
  }
}
