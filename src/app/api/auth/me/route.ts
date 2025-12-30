import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// Calcula diferenca em dias entre duas datas
function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = date1.getTime() - date2.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Adiciona dias a uma data
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar dados completos do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nome, empresa_id, role, ativo, created_at, updated_at')
      .eq('id', sessionUser.userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Determinar empresa_id: primeiro do usuario, senao buscar de users_empresas
    let empresaId = user.empresa_id

    // Buscar primeira empresa vinculada (para calcular trial)
    const { data: primeiraEmpresa } = await supabase
      .from('users_empresas')
      .select('empresa_id, role, created_at')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!empresaId && primeiraEmpresa) {
      empresaId = primeiraEmpresa.empresa_id
    }

    // Buscar dados da empresa
    let empresa = null
    if (empresaId) {
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj')
        .eq('id', empresaId)
        .single()
      empresa = empresaData
    }

    // Buscar todas as empresas do usuario (para multi-tenant)
    const { data: empresasVinculadas } = await supabase
      .from('users_empresas')
      .select('empresa_id, role, ativo, empresas:empresa_id(id, razao_social, nome_fantasia, cnpj)')
      .eq('user_id', user.id)
      .eq('ativo', true)

    // ===== CALCULAR TRIAL STATUS =====
    let trialStatus = null

    // Buscar config de dias de trial
    const { data: trialConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'trial_days')
      .single()

    const trialDays = parseInt(trialConfig?.value || '15')

    // Buscar assinatura ativa
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('id, status, data_inicio, data_fim')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .single()

    const hasActiveSubscription = !!assinatura

    // Calcular status do trial apenas se tiver empresa vinculada
    if (primeiraEmpresa?.created_at) {
      const trialStartDate = new Date(primeiraEmpresa.created_at)
      const trialEndDate = addDays(trialStartDate, trialDays)
      const now = new Date()
      const daysRemaining = differenceInDays(trialEndDate, now)

      trialStatus = {
        isInTrial: !hasActiveSubscription && daysRemaining > 0,
        isTrialExpired: !hasActiveSubscription && daysRemaining <= 0,
        daysRemaining,
        trialStartDate: trialStartDate.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        hasActiveSubscription,
      }

      // ===== CRIAR NOTIFICACOES DE TRIAL =====
      // Notificar quando faltar 5, 3, 1 dias
      const diasParaNotificar = [5, 3, 1]

      if (!hasActiveSubscription && diasParaNotificar.includes(daysRemaining)) {
        // Verificar se ja foi notificado para esse dia
        const { data: jaNotificado } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', user.id)
          .eq('tipo', 'trial_warning')
          .contains('metadata', { dias_restantes: daysRemaining })
          .single()

        if (!jaNotificado) {
          await supabase.from('notificacoes').insert({
            user_id: user.id,
            tipo: 'trial_warning',
            titulo: `Seu trial expira em ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}`,
            mensagem: 'Contrate um plano para continuar usando o FlowB2B sem interrupcoes.',
            metadata: { dias_restantes: daysRemaining },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        empresa_id: empresaId,
        empresa,
        empresas: empresasVinculadas?.map(ue => ({
          ...ue.empresas,
          role: ue.role,
        })) || [],
      },
      trialStatus,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
