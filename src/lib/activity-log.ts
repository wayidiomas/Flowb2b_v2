import { createServerSupabaseClient } from '@/lib/supabase'

export type UserType = 'lojista' | 'colaborador' | 'fornecedor' | 'representante' | 'superadmin'

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'pedido_criado'
  | 'pedido_enviado'
  | 'sugestao_enviada'
  | 'contra_proposta_enviada'
  | 'sugestao_aceita'
  | 'sugestao_rejeitada'
  | 'pedido_recolhido'
  | 'sugestao_excluida'
  | 'registro'

interface LogActivityParams {
  userId: string
  userType: UserType
  userEmail?: string
  userNome?: string
  action: ActivityAction
  empresaId?: string | number | null
  metadata?: Record<string, unknown>
}

/**
 * Log a user activity event to the user_activity_log table.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('user_activity_log').insert({
      user_id: params.userId,
      user_type: params.userType,
      user_email: params.userEmail || null,
      user_nome: params.userNome || null,
      action: params.action,
      empresa_id: params.empresaId || null,
      metadata: params.metadata || {},
    })
    if (error) {
      console.error('[activity-log] Failed to log activity:', error.message)
    }
  } catch (err) {
    console.error('[activity-log] Unexpected error:', err)
  }
}

/**
 * Update last_login_at on the appropriate user table.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function updateLastLogin(
  table: 'users' | 'users_fornecedor' | 'users_representante',
  userId: string | number
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from(table)
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) {
      console.error(`[activity-log] Failed to update last_login_at on ${table}:`, error.message)
    }
  } catch (err) {
    console.error('[activity-log] Unexpected error updating last_login:', err)
  }
}
