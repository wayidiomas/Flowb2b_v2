import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { SessionUser } from '@/types/auth'

export interface RepresentanteCatalogoContext {
  user: SessionUser
  fornecedorId: number
  cnpj: string
  // Empresas (uma ou mais) onde existem fornecedores vinculados a este representante para o CNPJ resolvido.
  // Catalogo eh por CNPJ, mas o representante pode estar vinculado a 1+ fornecedores que compartilham CNPJ
  // (um por empresa). Para validacao de vinculo, basta um match.
}

export interface FornecedorResolvido {
  fornecedor_id: number
  cnpj: string
}

export interface RepresentanteCatalogoMultiContext {
  user: SessionUser
  // IDs dos fornecedores efetivamente validados (pelo menos 1).
  // Se o request nao informou nenhum, retorna TODOS os fornecedores vinculados ao representante.
  fornecedorIds: number[]
  // Lista de CNPJs (deduplicados) correspondentes aos fornecedores validados.
  cnpjs: string[]
  // Mapeamento fornecedor_id -> CNPJ (somente fornecedores com CNPJ valido)
  fornecedores: FornecedorResolvido[]
  // True quando o representante nao filtrou explicitamente (default = todos)
  selectedAll: boolean
}

/**
 * Extrai fornecedor_id de query string, header X-Fornecedor-Id ou body.
 * Retorna null se nao encontrado/ invalido.
 */
export async function extractFornecedorId(request: NextRequest): Promise<number | null> {
  try {
    const url = new URL(request.url)
    const fromQuery = url.searchParams.get('fornecedor_id')
    if (fromQuery) {
      const id = parseInt(fromQuery, 10)
      if (Number.isFinite(id) && id > 0) return id
    }

    const fromHeader = request.headers.get('x-fornecedor-id')
    if (fromHeader) {
      const id = parseInt(fromHeader, 10)
      if (Number.isFinite(id) && id > 0) return id
    }

    // Tentar body (clonando request para nao consumir o stream original)
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const cloned = request.clone()
        const body = await cloned.json()
        if (body && typeof body === 'object') {
          const id = parseInt(String(body.fornecedor_id ?? ''), 10)
          if (Number.isFinite(id) && id > 0) return id
        }
      } catch {
        // body nao parseavel — ignorar
      }
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      try {
        const cloned = request.clone()
        const fd = await cloned.formData()
        const v = fd.get('fornecedor_id')
        if (typeof v === 'string' && v) {
          const id = parseInt(v, 10)
          if (Number.isFinite(id) && id > 0) return id
        }
      } catch {
        // ignorar
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Extrai uma lista de fornecedor_ids de query string (?fornecedor_ids=1,2,3),
 * header X-Fornecedor-Ids (CSV) ou body { fornecedor_ids: number[] }.
 * Retorna array vazio se nada informado.
 */
export async function extractFornecedorIds(request: NextRequest): Promise<number[]> {
  const parseCsv = (raw: string): number[] => {
    return raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  }

  try {
    const url = new URL(request.url)
    const fromQuery = url.searchParams.get('fornecedor_ids')
    if (fromQuery) {
      const ids = parseCsv(fromQuery)
      if (ids.length > 0) return Array.from(new Set(ids))
    }

    const fromHeader = request.headers.get('x-fornecedor-ids')
    if (fromHeader) {
      const ids = parseCsv(fromHeader)
      if (ids.length > 0) return Array.from(new Set(ids))
    }

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const cloned = request.clone()
        const body = await cloned.json()
        if (body && typeof body === 'object') {
          if (Array.isArray(body.fornecedor_ids)) {
            const ids = body.fornecedor_ids
              .map((v: unknown) => parseInt(String(v), 10))
              .filter((n: number) => Number.isFinite(n) && n > 0)
            if (ids.length > 0) return Array.from(new Set(ids))
          } else if (typeof body.fornecedor_ids === 'string') {
            const ids = parseCsv(body.fornecedor_ids)
            if (ids.length > 0) return Array.from(new Set(ids))
          }
        }
      } catch {
        // ignorar
      }
    }
  } catch {
    return []
  }
  return []
}

/**
 * Autentica representante e valida vinculo com o fornecedor_id informado.
 * Retorna NextResponse de erro, OU contexto { user, fornecedorId, cnpj } se sucesso.
 */
export async function authRepresentanteCatalogo(
  request: NextRequest
): Promise<NextResponse | RepresentanteCatalogoContext> {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const fornecedorId = await extractFornecedorId(request)
  if (!fornecedorId) {
    return NextResponse.json({ error: 'fornecedor_id obrigatorio' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Validar vinculo: existe representante_fornecedores ligando este fornecedor a um representante
  // cujo user_representante_id == user.representanteUserId
  const { data: vinculos, error: vincError } = await supabase
    .from('representante_fornecedores')
    .select('id, representante_id, representantes!inner(user_representante_id, ativo)')
    .eq('fornecedor_id', fornecedorId)

  if (vincError) {
    console.error('Erro ao validar vinculo representante-fornecedor:', vincError)
    return NextResponse.json({ error: 'Erro ao validar vinculo' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (vinculos || []).find((v: any) => {
    const reps = v.representantes
    if (!reps) return false
    // representantes!inner pode vir como array ou objeto dependendo da versao
    const r = Array.isArray(reps) ? reps[0] : reps
    return r && r.user_representante_id === user.representanteUserId && r.ativo !== false
  })

  if (!match) {
    return NextResponse.json(
      { error: 'Sem vinculo com este fornecedor' },
      { status: 403 }
    )
  }

  // Buscar CNPJ do fornecedor (necessario porque catalogo_fornecedor eh chaveado por CNPJ)
  const { data: forn, error: fornError } = await supabase
    .from('fornecedores')
    .select('id, cnpj')
    .eq('id', fornecedorId)
    .single()

  if (fornError || !forn || !forn.cnpj) {
    return NextResponse.json({ error: 'Fornecedor sem CNPJ valido' }, { status: 404 })
  }

  return {
    user,
    fornecedorId,
    cnpj: String(forn.cnpj).replace(/\D/g, ''),
  }
}

/**
 * Autentica representante e valida lista de fornecedor_ids.
 *
 * Comportamento:
 * - Se request informou fornecedor_ids[]: cada ID deve pertencer ao representante.
 *   Caso nenhum dos IDs seja valido, retorna 403.
 * - Se request nao informou nada: retorna TODOS os fornecedores vinculados (default = todos).
 */
export async function authRepresentanteCatalogoMulti(
  request: NextRequest
): Promise<NextResponse | RepresentanteCatalogoMultiContext> {
  const user = await getCurrentUser()
  if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  // 1) Buscar TODOS os fornecedores vinculados ao representante (uma query).
  const { data: vinculos, error: vincError } = await supabase
    .from('representante_fornecedores')
    .select('fornecedor_id, representantes!inner(user_representante_id, ativo)')

  if (vincError) {
    console.error('Erro ao buscar vinculos representante:', vincError)
    return NextResponse.json({ error: 'Erro ao validar vinculo' }, { status: 500 })
  }

  const fornecedorIdsVinculados = Array.from(
    new Set(
      (vinculos || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((v: any) => {
          const reps = v.representantes
          if (!reps) return false
          const r = Array.isArray(reps) ? reps[0] : reps
          return r && r.user_representante_id === user.representanteUserId && r.ativo !== false
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((v: any) => Number(v.fornecedor_id))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  )

  if (fornecedorIdsVinculados.length === 0) {
    return NextResponse.json({ error: 'Sem fornecedores vinculados' }, { status: 403 })
  }

  // 2) Resolver IDs solicitados (ou default = todos vinculados).
  const requested = await extractFornecedorIds(request)
  const selectedAll = requested.length === 0

  const fornecedorIdsValidos = selectedAll
    ? fornecedorIdsVinculados
    : requested.filter((id) => fornecedorIdsVinculados.includes(id))

  if (fornecedorIdsValidos.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum dos fornecedores informados pertence ao representante' },
      { status: 403 }
    )
  }

  // 3) Buscar CNPJs dos fornecedores validos.
  const { data: forns, error: fornError } = await supabase
    .from('fornecedores')
    .select('id, cnpj')
    .in('id', fornecedorIdsValidos)

  if (fornError) {
    console.error('Erro ao buscar fornecedores:', fornError)
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
  }

  const fornecedores: FornecedorResolvido[] = (forns || [])
    .filter((f) => f && f.cnpj)
    .map((f) => ({
      fornecedor_id: Number(f.id),
      cnpj: String(f.cnpj).replace(/\D/g, ''),
    }))
    .filter((f) => f.cnpj.length > 0)

  if (fornecedores.length === 0) {
    return NextResponse.json({ error: 'Nenhum fornecedor com CNPJ valido' }, { status: 404 })
  }

  const cnpjs = Array.from(new Set(fornecedores.map((f) => f.cnpj)))

  return {
    user,
    fornecedorIds: fornecedores.map((f) => f.fornecedor_id),
    cnpjs,
    fornecedores,
    selectedAll,
  }
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
