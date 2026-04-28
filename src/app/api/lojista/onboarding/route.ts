import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import type {
  OnboardingStatus,
  OnboardingSubmitRequest,
  OnboardingSubmitResponse,
  ErpUsado,
} from '@/types/onboarding'

const ERP_VALUES: ErpUsado[] = [
  'bling',
  'conta_azul',
  'totvs',
  'omie',
  'sankhya',
  'tiny',
  'outro',
  'nenhum',
]

// ─── GET: Status do onboarding ───────────────────────────────────────────────
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    const { data: userRow } = await supabase
      .from('users')
      .select('id, email, nome, senha_provisoria, role')
      .eq('id', user.userId)
      .maybeSingle()

    const { data: empresa } = await supabase
      .from('empresas')
      .select(`
        id, cnpj, razao_social, nome_fantasia, celular_principal, endereco_resumido,
        erp_usado, numero_colaboradores, num_lojas, pedidos_medio_mes,
        onboarding_completo_em
      `)
      .eq('id', user.empresaId)
      .maybeSingle()

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
    }

    // O onboarding so e obrigatorio pra lojistas convidados via vinculo invertido
    // (senha_provisoria=true ou role=lojista_lp). Admins regulares com empresa real
    // ja vinculada via Bling/CNPJ nao precisam preencher esses campos pra comprar.
    const isLojistaConvidado =
      !!userRow?.senha_provisoria || userRow?.role === 'lojista_lp'

    const precisaTrocarSenha = !!userRow?.senha_provisoria
    const precisaCompletarDados =
      isLojistaConvidado && (!empresa.razao_social || !empresa.celular_principal)
    const precisaResponderPerfil =
      isLojistaConvidado && !empresa.onboarding_completo_em

    const status: OnboardingStatus = {
      precisa_trocar_senha: precisaTrocarSenha,
      precisa_completar_dados: precisaCompletarDados,
      precisa_responder_perfil: precisaResponderPerfil,
      empresa: {
        id: empresa.id,
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        celular_principal: empresa.celular_principal,
        endereco_resumido: empresa.endereco_resumido,
        erp_usado: (empresa.erp_usado as ErpUsado) || null,
        numero_colaboradores: empresa.numero_colaboradores,
        num_lojas: empresa.num_lojas,
        pedidos_medio_mes: empresa.pedidos_medio_mes,
      },
      user: {
        nome: userRow?.nome || null,
        email: userRow?.email || '',
      },
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Erro em GET /api/lojista/onboarding:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST: Salva dados do onboarding ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as OnboardingSubmitRequest
    const supabase = createServerSupabaseClient()

    // 1. Trocar senha se solicitado
    if (body.nova_senha) {
      if (body.nova_senha.length < 6) {
        return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })
      }
      const passwordHash = await hashPassword(body.nova_senha)
      const { error: pwErr } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          senha_provisoria: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.userId)
      if (pwErr) {
        console.error('Erro ao trocar senha:', pwErr)
        return NextResponse.json({ error: 'Erro ao trocar senha' }, { status: 500 })
      }
    }

    // 2. Atualizar dados da empresa (so campos preenchidos)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      modified_date: new Date().toISOString(),
    }

    if (body.razao_social !== undefined) updates.razao_social = body.razao_social.trim() || null
    if (body.nome_fantasia !== undefined) updates.nome_fantasia = body.nome_fantasia.trim() || null
    if (body.celular_principal !== undefined) updates.celular_principal = body.celular_principal.replace(/\D/g, '') || null
    if (body.endereco_resumido !== undefined) updates.endereco_resumido = body.endereco_resumido.trim() || null

    if (body.erp_usado !== undefined) {
      if (!ERP_VALUES.includes(body.erp_usado)) {
        return NextResponse.json({ error: 'ERP invalido' }, { status: 400 })
      }
      updates.erp_usado = body.erp_usado
    }
    if (body.numero_colaboradores !== undefined) updates.numero_colaboradores = body.numero_colaboradores
    if (body.num_lojas !== undefined) updates.num_lojas = body.num_lojas
    if (body.pedidos_medio_mes !== undefined) updates.pedidos_medio_mes = body.pedidos_medio_mes

    const respondeuPerfil =
      body.erp_usado !== undefined ||
      body.numero_colaboradores !== undefined ||
      body.num_lojas !== undefined ||
      body.pedidos_medio_mes !== undefined ||
      !!body.adiar_perfil

    if (respondeuPerfil) {
      updates.onboarding_completo_em = new Date().toISOString()
    }

    if (Object.keys(updates).length > 1) {
      const { error: empErr } = await supabase
        .from('empresas')
        .update(updates)
        .eq('id', user.empresaId)
      if (empErr) {
        console.error('Erro ao atualizar empresa:', empErr)
        return NextResponse.json({ error: 'Erro ao atualizar empresa' }, { status: 500 })
      }
    }

    const response: OnboardingSubmitResponse = {
      success: true,
      onboarding_completo: !!respondeuPerfil,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro em POST /api/lojista/onboarding:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
