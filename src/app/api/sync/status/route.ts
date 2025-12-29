import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const FLOWB2BAPI_URL = process.env.FLOWB2BAPI_URL

// Verifica se o usuario tem acesso a empresa
async function userHasAccessToEmpresa(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  empresaId: number,
  userRole: string
): Promise<boolean> {
  // Admin tem acesso a todas as empresas
  if (userRole === 'admin') {
    return true
  }

  // Verificar se o usuario eh o dono da empresa (empresa_id no users)
  const { data: user } = await supabase
    .from('users')
    .select('empresa_id')
    .eq('id', userId)
    .single()

  if (user?.empresa_id === empresaId) {
    return true
  }

  // Verificar se o usuario eh colaborador da empresa (lista_colaboradores)
  const { data: empresa } = await supabase
    .from('empresas')
    .select('lista_colaboradores')
    .eq('id', empresaId)
    .single()

  if (empresa?.lista_colaboradores?.includes(userId)) {
    return true
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const empresaIdParam = searchParams.get('empresa_id')

    if (!empresaIdParam) {
      return NextResponse.json(
        { success: false, error: 'empresa_id e obrigatorio' },
        { status: 400 }
      )
    }

    const empresaId = parseInt(empresaIdParam, 10)
    if (isNaN(empresaId)) {
      return NextResponse.json(
        { success: false, error: 'empresa_id invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Validar se o usuario tem permissao para essa empresa
    const hasAccess = await userHasAccessToEmpresa(
      supabase,
      user.userId,
      empresaId,
      user.role
    )

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Sem permissao para essa empresa' },
        { status: 403 }
      )
    }

    // Buscar informacoes da empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('conectadabling, dataexpirabling, nome_fantasia, razao_social')
      .eq('id', empresaId)
      .single()

    // Tentar buscar status da API externa primeiro
    if (FLOWB2BAPI_URL) {
      try {
        const response = await fetch(
          `${FLOWB2BAPI_URL}/api/sync/status/${empresaId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const apiStatus = await response.json()

          // Normalizar resposta da flowb2bapi para o formato do frontend
          // A flowb2bapi retorna: { status: 'running'|'idle', activeSyncs: [...] }
          // O frontend espera: { status: 'syncing'|'idle'|'completed'|'error', current_step: string }

          let normalizedStatus: 'idle' | 'syncing' | 'completed' | 'error' = 'idle'
          let currentStep: string | null = null
          let progress: number | null = null

          if (apiStatus.status === 'running' && apiStatus.activeSyncs?.length > 0) {
            normalizedStatus = 'syncing'
            const activeSync = apiStatus.activeSyncs[0]
            currentStep = activeSync.currentStep || 'Sincronizando...'

            // Calcular progresso baseado na etapa atual
            const steps = ['produtos', 'fornecedores', 'pedidos-venda', 'pedidos-compra', 'notas-fiscais']
            const stepIndex = steps.findIndex(s => currentStep?.toLowerCase().includes(s))
            if (stepIndex >= 0) {
              progress = Math.round(((stepIndex + 1) / steps.length) * 100)
            }
          }

          return NextResponse.json({
            success: true,
            source: 'api',
            empresa_id: empresaId,
            empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || 'Empresa',
            bling_connected: empresa?.conectadabling || false,
            bling_expires_at: empresa?.dataexpirabling,
            status: normalizedStatus,
            current_step: currentStep,
            progress,
            active_syncs: apiStatus.activeSyncs || [],
            total_active_syncs: apiStatus.totalActiveSyncs || 0,
          })
        }
      } catch (error) {
        console.error('[Sync Status] Erro ao buscar status da API:', error)
        // Continuar para buscar do banco de dados
      }
    }

    // Buscar status da tabela cron_jobs no Supabase
    const { data: jobs, error: jobsError } = await supabase
      .from('cron_jobs')
      .select('*')
      .eq('id_empresa', empresaId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (jobsError) {
      console.error('[Sync Status] Erro ao buscar jobs:', jobsError)
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar status da sincronizacao' },
        { status: 500 }
      )
    }

    // Determinar o status geral da sincronizacao
    const activeJob = jobs?.find(
      (job) => job.status === 'pending' || job.status === 'processing'
    )
    const lastCompletedJob = jobs?.find((job) => job.status === 'completed')
    const lastErrorJob = jobs?.find((job) => job.status === 'error')

    let overallStatus: 'idle' | 'syncing' | 'completed' | 'error' = 'idle'
    let currentStep: string | null = null
    let progress: number | null = null
    let errorMessage: string | null = null

    if (activeJob) {
      overallStatus = 'syncing'
      currentStep = activeJob.step || 'Iniciando...'
      // Extrair progresso do campo parameters ou result se disponivel
      if (activeJob.parameters?.progress) {
        progress = activeJob.parameters.progress
      }
    } else if (lastCompletedJob) {
      overallStatus = 'completed'
      currentStep = 'Sincronizacao concluida'
    } else if (lastErrorJob && !lastCompletedJob) {
      overallStatus = 'error'
      errorMessage = lastErrorJob.result?.error || 'Erro desconhecido'
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      empresa_id: empresaId,
      empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || 'Empresa',
      bling_connected: empresa?.conectadabling || false,
      bling_expires_at: empresa?.dataexpirabling,
      status: overallStatus,
      current_step: currentStep,
      progress,
      error: errorMessage,
      recent_jobs: jobs?.slice(0, 5).map((job) => ({
        id: job.id,
        status: job.status,
        step: job.step,
        created_at: job.created_at,
        updated_at: job.updated_at,
        error_count: job.error_count,
      })),
    })
  } catch (error) {
    console.error('[Sync Status] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao buscar status' },
      { status: 500 }
    )
  }
}
