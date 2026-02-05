import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser, generateToken, setAuthCookie } from '@/lib/auth'

interface VincularRequest {
  empresaId: number
}

interface VincularResponse {
  success: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    // Obter usuario atual do JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json<VincularResponse>(
        { success: false, error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const body: VincularRequest = await request.json()
    const { empresaId } = body

    if (!empresaId) {
      return NextResponse.json<VincularResponse>(
        { success: false, error: 'empresaId e obrigatorio' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verificar se a empresa existe
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, razao_social')
      .eq('id', empresaId)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json<VincularResponse>(
        { success: false, error: 'Empresa nao encontrada' },
        { status: 404 }
      )
    }

    // Verificar se ja existe vinculo
    const { data: existingLink } = await supabase
      .from('users_empresas')
      .select('id')
      .eq('user_id', currentUser.userId)
      .eq('empresa_id', empresaId)
      .single()

    // Se nao existe, criar o vinculo
    if (!existingLink) {
      const { error: linkError } = await supabase
        .from('users_empresas')
        .insert({
          user_id: currentUser.userId,
          empresa_id: empresaId,
          role: 'admin', // Criador da empresa e admin
          ativo: true,
        })

      if (linkError) {
        console.error('Erro ao criar vinculo user_empresa:', linkError)
        return NextResponse.json<VincularResponse>(
          { success: false, error: 'Erro ao vincular usuario a empresa' },
          { status: 500 }
        )
      }
    }

    // Atualizar empresa_id do usuario (empresa ativa)
    const { error: updateError } = await supabase
      .from('users')
      .update({ empresa_id: empresaId })
      .eq('id', currentUser.userId)

    if (updateError) {
      console.error('Erro ao atualizar empresa_id do usuario:', updateError)
      return NextResponse.json<VincularResponse>(
        { success: false, error: 'Erro ao definir empresa ativa' },
        { status: 500 }
      )
    }

    // Gerar novo JWT com o empresaId atualizado
    const newToken = await generateToken({
      userId: currentUser.userId,
      empresaId: empresaId,
      email: currentUser.email,
      role: currentUser.role,
      tipo: 'lojista',
    })

    // Atualizar cookie com novo token
    await setAuthCookie(newToken)

    return NextResponse.json<VincularResponse>({
      success: true,
    })
  } catch (error) {
    console.error('Erro ao vincular empresa:', error)
    return NextResponse.json<VincularResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
