import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser, generateToken, setAuthCookie } from '@/lib/auth'

interface CriarEmpresaRequest {
  nome_fantasia: string
  cnpj: string
  segmento?: string[]
  usa_bling?: boolean
}

interface CriarEmpresaResponse {
  success: boolean
  empresa?: {
    id: number
    nome_fantasia: string
    cnpj: string
    segmento: string[] | null
    conectadabling: boolean
  }
  redirect_bling?: boolean
  error?: string
}

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calc = (digits: string, factors: number[]): number => {
    const sum = digits.split('').reduce((acc, digit, i) => acc + parseInt(digit) * factors[i], 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const first = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (parseInt(cnpj[12]) !== first) return false

  const second = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (parseInt(cnpj[13]) !== second) return false

  return true
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (currentUser.tipo !== 'lojista' && !currentUser.role) {
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'Tipo de usuario nao autorizado' },
        { status: 403 }
      )
    }

    const body: CriarEmpresaRequest = await request.json()
    const { nome_fantasia, cnpj, segmento, usa_bling } = body

    if (!nome_fantasia?.trim() || !cnpj?.trim()) {
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'nome_fantasia e cnpj sao obrigatorios' },
        { status: 400 }
      )
    }

    const cnpjLimpo = cleanCnpj(cnpj)

    if (!isValidCnpj(cnpjLimpo)) {
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'CNPJ invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: existingEmpresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (existingEmpresa) {
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'Ja existe uma empresa cadastrada com este CNPJ' },
        { status: 409 }
      )
    }

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .insert({
        nome_fantasia: nome_fantasia.trim(),
        cnpj: cnpjLimpo,
        segmento: segmento || null,
        conectadabling: false,
      })
      .select('id, nome_fantasia, cnpj, segmento, conectadabling')
      .single()

    if (empresaError || !empresa) {
      console.error('Erro ao criar empresa:', empresaError)
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'Erro ao criar empresa' },
        { status: 500 }
      )
    }

    const { error: linkError } = await supabase
      .from('users_empresas')
      .insert({
        user_id: currentUser.userId,
        empresa_id: empresa.id,
        role: 'admin',
        ativo: true,
      })

    if (linkError) {
      console.error('Erro ao vincular usuario a empresa:', linkError)
      await supabase.from('empresas').delete().eq('id', empresa.id)
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'Erro ao vincular usuario a empresa' },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ empresa_id: empresa.id })
      .eq('id', currentUser.userId)

    if (updateError) {
      console.error('Erro ao atualizar empresa_id do usuario:', updateError)
      return NextResponse.json<CriarEmpresaResponse>(
        { success: false, error: 'Erro ao definir empresa ativa do usuario' },
        { status: 500 }
      )
    }

    const newToken = await generateToken({
      userId: currentUser.userId,
      empresaId: empresa.id,
      email: currentUser.email,
      role: 'admin',
      tipo: 'lojista',
    })

    await setAuthCookie(newToken)

    return NextResponse.json<CriarEmpresaResponse>({
      success: true,
      empresa,
      redirect_bling: usa_bling === true,
    })
  } catch (error) {
    console.error('Erro ao criar empresa no onboarding:', error)
    return NextResponse.json<CriarEmpresaResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
