import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import {
  isValidCnpj,
  stripCnpj,
  formatCnpj,
  defaultPasswordFromCnpj,
  isValidEmail,
  isValidCelular,
} from '@/lib/cnpj'
import { sendLojistaWelcomeEmail } from '@/lib/email-templates/lojista-welcome'
import type {
  CreateLojistaRequest,
  CreateLojistaResponse,
  CreateLojistaError,
  ListLojistasResponse,
} from '@/types/lojista-vinculo'

// ─── POST: Cria lojista vinculado ao fornecedor logado ────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return errorResponse('Nao autenticado', 401)
    }

    const body = (await request.json()) as CreateLojistaRequest

    // Validacao de inputs
    if (!body.cnpj || !isValidCnpj(body.cnpj)) {
      return errorResponse('CNPJ invalido', 400, 'CNPJ_INVALIDO')
    }
    if (!body.razao_social?.trim()) {
      return errorResponse('Razao social obrigatoria', 400, 'NOME_REQUIRED')
    }
    if (!body.email_admin || !isValidEmail(body.email_admin)) {
      return errorResponse('Email invalido', 400, 'EMAIL_INVALIDO')
    }
    if (!body.nome_admin?.trim()) {
      return errorResponse('Nome do admin obrigatorio', 400, 'NOME_REQUIRED')
    }
    if (!body.celular || !isValidCelular(body.celular)) {
      return errorResponse('Celular invalido (DDD + numero)', 400, 'CELULAR_INVALIDO')
    }

    const supabase = createServerSupabaseClient()
    const cnpjLojistaClean = stripCnpj(body.cnpj)
    const cnpjFornecedorClean = stripCnpj(user.cnpj)
    const emailLower = body.email_admin.toLowerCase().trim()

    // 1. Busca fornecedor logado (precisa do id_supabase + dados pra clonar no tenant do lojista)
    const { data: fornecedor, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, cnpj, nome, nome_fantasia, razao_social')
      .eq('cnpj', cnpjFornecedorClean)
      .limit(1)
      .single()

    if (fornError || !fornecedor) {
      return errorResponse('Fornecedor nao encontrado pelo CNPJ logado', 422, 'FORNECEDOR_SEM_CNPJ')
    }

    // 2. Detecta colisoes ANTES da RPC pra dar mensagens claras
    const { data: empresaExistente } = await supabase
      .from('empresas')
      .select('id, criado_por_fornecedor_id, razao_social, cnpj')
      .eq('cnpj', cnpjLojistaClean)
      .limit(1)
      .maybeSingle()

    if (
      empresaExistente &&
      empresaExistente.criado_por_fornecedor_id &&
      empresaExistente.criado_por_fornecedor_id !== fornecedor.id
    ) {
      return errorResponse(
        `Empresa com este CNPJ ja foi cadastrada por outro fornecedor`,
        409,
        'EMPRESA_JA_EXISTE_OUTRO_FORNECEDOR'
      )
    }

    const { data: emailExistente } = await supabase
      .from('users')
      .select('id, empresa_id')
      .eq('email', emailLower)
      .limit(1)
      .maybeSingle()

    if (emailExistente && empresaExistente && emailExistente.empresa_id !== empresaExistente.id) {
      return errorResponse(
        'Email ja esta em uso em outra empresa',
        409,
        'EMAIL_JA_EM_USO'
      )
    }

    // 3. Hash da senha provisoria (6 primeiros do CNPJ)
    const senhaProvisoria = defaultPasswordFromCnpj(body.cnpj)
    const passwordHash = await hashPassword(senhaProvisoria)

    // 4. Chama RPC atomic
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'flowb2b_create_lojista_via_fornecedor',
      {
        p_cnpj: cnpjLojistaClean,
        p_razao_social: body.razao_social.trim(),
        p_nome_fantasia: body.nome_fantasia?.trim() || null,
        p_email: emailLower,
        p_nome_admin: body.nome_admin.trim(),
        p_celular: body.celular.replace(/\D/g, ''),
        p_password_hash: passwordHash,
        p_fornecedor_id: fornecedor.id,
        p_fornecedor_empresa_id: fornecedor.empresa_id,
        p_fornecedor_cnpj: fornecedor.cnpj,
        p_fornecedor_razao: fornecedor.razao_social || fornecedor.nome,
        p_fornecedor_nome_fantasia: fornecedor.nome_fantasia || fornecedor.nome,
      }
    )

    if (rpcError || !rpcResult) {
      console.error('Erro na RPC flowb2b_create_lojista_via_fornecedor:', rpcError)
      return errorResponse('Erro ao criar lojista (transacao)', 500, 'INTERNAL_ERROR')
    }

    const empresaIdLojista = (rpcResult as { empresa_id: number }).empresa_id
    const userIdLojista = (rpcResult as { user_id: string }).user_id
    const empresaAlreadyExisted = (rpcResult as { empresa_already_existed: boolean }).empresa_already_existed
    const userAlreadyExisted = (rpcResult as { user_already_existed: boolean }).user_already_existed

    // 5. Envia email de boas-vindas (best-effort, nao bloqueia)
    let emailSent = false
    if (body.enviar_email_boas_vindas !== false && !userAlreadyExisted) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const result = await sendLojistaWelcomeEmail({
          email: emailLower,
          nome: body.nome_admin,
          fornecedorNome: fornecedor.nome_fantasia || fornecedor.nome || 'Fornecedor',
          cnpj: formatCnpj(cnpjLojistaClean),
          senhaProvisoria,
          loginUrl: `${baseUrl}/login?prefill_cnpj=${encodeURIComponent(cnpjLojistaClean)}`,
        })
        emailSent = !!result?.success
      } catch (err) {
        console.warn('Erro ao enviar email de boas-vindas:', err)
      }
    }

    const response: CreateLojistaResponse = {
      success: true,
      empresa: {
        id: empresaIdLojista,
        razao_social: body.razao_social,
        cnpj: formatCnpj(cnpjLojistaClean),
      },
      user: {
        id: userIdLojista,
        email: emailLower,
      },
      vinculo: {
        fornecedor_id: fornecedor.id,
        empresa_id: empresaIdLojista,
      },
      primeiro_login: {
        senha_provisoria: senhaProvisoria,
        link_login: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login?prefill_cnpj=${cnpjLojistaClean}`,
      },
      flags: {
        empresa_already_existed: empresaAlreadyExisted,
        user_already_existed: userAlreadyExisted,
        email_sent: emailSent,
      },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Erro inesperado em POST /api/fornecedor/lojistas:', error)
    return errorResponse('Erro interno', 500, 'INTERNAL_ERROR')
  }
}

// ─── GET: Lista lojistas vinculados ao fornecedor logado ─────────────────────
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjFornecedor = stripCnpj(user.cnpj)

    // Busca id do fornecedor logado
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjFornecedor)
      .limit(1)
      .maybeSingle()

    if (!fornecedor) {
      return NextResponse.json<ListLojistasResponse>({ lojistas: [] })
    }

    // Busca empresas criadas por esse fornecedor (vinculo invertido)
    const { data: empresas, error: empErr } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj, celular_principal, created_date')
      .eq('criado_por_fornecedor_id', fornecedor.id)
      .order('created_date', { ascending: false })

    if (empErr) {
      console.error('Erro ao listar empresas:', empErr)
      return NextResponse.json({ error: 'Erro ao listar lojistas' }, { status: 500 })
    }

    if (!empresas || empresas.length === 0) {
      return NextResponse.json<ListLojistasResponse>({ lojistas: [] })
    }

    // Pega admin de cada empresa
    const empresaIds = empresas.map(e => e.id)
    const { data: vinculos } = await supabase
      .from('users_empresas')
      .select(`
        empresa_id,
        users:user_id (id, email, nome, last_login_at)
      `)
      .in('empresa_id', empresaIds)
      .eq('ativo', true)
      .eq('role', 'lojista_lp')

    const adminPorEmpresa = new Map<
      number,
      { email: string | null; nome: string | null; last_login_at: string | null }
    >()
    for (const v of vinculos || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = (v as any).users
      if (u) {
        adminPorEmpresa.set(v.empresa_id, {
          email: u.email || null,
          nome: u.nome || null,
          last_login_at: u.last_login_at || null,
        })
      }
    }

    const lojistas = empresas.map(emp => {
      const admin = adminPorEmpresa.get(emp.id)
      return {
        empresa_id: emp.id,
        razao_social: emp.razao_social || '',
        nome_fantasia: emp.nome_fantasia || null,
        cnpj: formatCnpj(emp.cnpj || ''),
        celular_principal: emp.celular_principal || null,
        admin_email: admin?.email || null,
        admin_nome: admin?.nome || null,
        criado_em: emp.created_date || '',
        last_login_at: admin?.last_login_at || null,
      }
    })

    return NextResponse.json<ListLojistasResponse>({ lojistas })
  } catch (error) {
    console.error('Erro em GET /api/fornecedor/lojistas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────
function errorResponse(message: string, status: number, code?: CreateLojistaError['code']) {
  return NextResponse.json<CreateLojistaError>(
    { success: false, error: message, code },
    { status }
  )
}
