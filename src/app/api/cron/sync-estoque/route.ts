import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { syncEstoqueEmpresa } from '@/lib/bling-estoque-sync'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET|POST /api/cron/sync-estoque
 *
 * Endpoint para cron job. Chamado pelo pg_cron do Supabase via net.http_post.
 * Sincroniza estoque de TODAS as empresas conectadas ao Bling.
 * Chama a API do Bling diretamente (sem intermediário flowb2bapi/Edge Function).
 *
 * Auth: header x-cron-secret ou query param ?secret=
 * Filtro: ?empresa_id=X para sincronizar apenas uma empresa.
 */
async function handler(request: NextRequest) {
  const startTime = Date.now()

  // Auth: verificar secret
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret')

  if (!CRON_SECRET) {
    console.error('[Cron Estoque] CRON_SECRET não configurado nas env vars')
    return NextResponse.json(
      { error: 'CRON_SECRET não configurado no servidor' },
      { status: 500 }
    )
  }

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const empresaIdParam = request.nextUrl.searchParams.get('empresa_id')
  const supabase = createServerSupabaseClient()

  // Buscar empresas conectadas ao Bling
  let empresasQuery = supabase
    .from('empresas')
    .select('id, nome_fantasia, conectadabling')
    .eq('conectadabling', true)

  if (empresaIdParam) {
    empresasQuery = empresasQuery.eq('id', Number(empresaIdParam))
  }

  const { data: empresas, error: empError } = await empresasQuery

  if (empError || !empresas || empresas.length === 0) {
    return NextResponse.json({
      error: 'Nenhuma empresa conectada ao Bling encontrada',
      details: empError?.message,
    })
  }

  console.log(`[Cron Estoque] Iniciando sync para ${empresas.length} empresa(s)`)

  const resultados: Array<{
    empresa_id: number
    nome: string
    status: 'ok' | 'erro' | 'token_invalido'
    resultado?: {
      total_produtos: number
      atualizados: number
      sem_alteracao: number
      erros: number
    }
    erro?: string
    duracao_ms: number
  }> = []

  for (const empresa of empresas) {
    const empresaStart = Date.now()
    console.log(`[Cron Estoque] Empresa ${empresa.id} (${empresa.nome_fantasia})...`)

    try {
      // Buscar token válido
      const { data: tokenData } = await supabase
        .from('bling_tokens')
        .select('access_token, expires_at, is_revoke')
        .eq('empresa_id', empresa.id)
        .single()

      if (!tokenData || tokenData.is_revoke) {
        resultados.push({
          empresa_id: empresa.id,
          nome: empresa.nome_fantasia,
          status: 'token_invalido',
          erro: 'Token não encontrado ou revogado',
          duracao_ms: Date.now() - empresaStart,
        })
        continue
      }

      const expiresAt = new Date(tokenData.expires_at)
      if (expiresAt < new Date()) {
        resultados.push({
          empresa_id: empresa.id,
          nome: empresa.nome_fantasia,
          status: 'token_invalido',
          erro: `Token expirado em ${tokenData.expires_at}`,
          duracao_ms: Date.now() - empresaStart,
        })
        continue
      }

      // Executar sync
      const syncResult = await syncEstoqueEmpresa(
        supabase,
        tokenData.access_token,
        empresa.id
      )

      resultados.push({
        empresa_id: empresa.id,
        nome: empresa.nome_fantasia,
        status: 'ok',
        resultado: syncResult,
        duracao_ms: Date.now() - empresaStart,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error(`[Cron Estoque] Erro empresa ${empresa.id}:`, errorMsg)

      resultados.push({
        empresa_id: empresa.id,
        nome: empresa.nome_fantasia,
        status: 'erro',
        erro: errorMsg,
        duracao_ms: Date.now() - empresaStart,
      })
    }

    // Delay entre empresas para não sobrecarregar Bling
    if (empresas.indexOf(empresa) < empresas.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  const totalDuration = Date.now() - startTime
  const totalAtualizados = resultados.reduce(
    (sum, r) => sum + (r.resultado?.atualizados ?? 0), 0
  )
  const totalErros = resultados.reduce(
    (sum, r) => sum + (r.resultado?.erros ?? 0), 0
  )
  const empresasOk = resultados.filter(r => r.status === 'ok').length

  console.log(
    `[Cron Estoque] CONCLUIDO: ${empresasOk}/${empresas.length} empresas ok, ` +
    `${totalAtualizados} produtos atualizados, ${totalErros} erros, ${totalDuration}ms`
  )

  return NextResponse.json({
    success: true,
    resumo: {
      empresas_processadas: empresas.length,
      empresas_ok: empresasOk,
      total_atualizados: totalAtualizados,
      total_erros: totalErros,
      duracao_ms: totalDuration,
      duracao_legivel: `${(totalDuration / 1000).toFixed(1)}s`,
      timestamp: new Date().toISOString(),
    },
    resultados,
  })
}

// pg_cron usa net.http_post, browser usa GET
export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}
