import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogoMulti,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

/**
 * GET /api/representante/catalogo/perfil
 * Leitura do(s) perfil(is) do catalogo dos fornecedores selecionados.
 * Representante NAO pode editar o perfil — PUT/POST retornam 403.
 *
 * Quando ha 1 fornecedor: retorna { catalogo } (compat).
 * Quando ha N: retorna { catalogos: [...] } + catalogo = catalogos[0] (compat).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs } = ctx

    const supabase = createServerSupabaseClient()

    const { data: catalogos, error } = await supabase
      .from('catalogo_fornecedor')
      .select('id, cnpj, nome, status, created_at, updated_at, slug, logo_url, banner_url, cor_primaria, descricao, whatsapp, publico')
      .in('cnpj', cnpjs)

    if (error) {
      console.error('Erro ao buscar perfis do catalogo:', error)
      return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
    }

    if (!catalogos || catalogos.length === 0) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ catalogo: catalogos[0], catalogos })
  } catch (error) {
    console.error('Erro ao buscar perfil (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Representante nao pode editar perfil do fornecedor' },
    { status: 403 }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'Representante nao pode editar perfil do fornecedor' },
    { status: 403 }
  )
}
