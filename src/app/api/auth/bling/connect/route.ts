import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBlingAuthUrl } from '@/lib/bling'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verificar se usuário está autenticado
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=Faça login primeiro', request.url)
      )
    }

    // Verificar se foi passado um empresaId específico via query param
    // Isso é usado quando o usuário cria uma nova empresa e quer conectá-la ao Bling
    const { searchParams } = new URL(request.url)
    const empresaIdParam = searchParams.get('empresaId')

    let empresaId = user.empresaId

    // Se foi passado um empresaId específico, validar se o usuário tem acesso
    if (empresaIdParam) {
      const parsedEmpresaId = parseInt(empresaIdParam, 10)

      if (!isNaN(parsedEmpresaId)) {
        const supabase = createServerSupabaseClient()

        // Admin pode acessar qualquer empresa
        if (user.role === 'admin') {
          const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('id', parsedEmpresaId)
            .single()

          if (empresa) {
            empresaId = parsedEmpresaId
          }
        } else {
          // Verificar se o usuário é dono da empresa (empresa_id no users)
          const { data: userData } = await supabase
            .from('users')
            .select('empresa_id')
            .eq('id', user.userId)
            .single()

          if (userData?.empresa_id === parsedEmpresaId) {
            empresaId = parsedEmpresaId
          } else {
            // Verificar se o usuário é colaborador da empresa
            const { data: empresa } = await supabase
              .from('empresas')
              .select('lista_colaboradores')
              .eq('id', parsedEmpresaId)
              .single()

            if (empresa?.lista_colaboradores?.includes(user.userId)) {
              empresaId = parsedEmpresaId
            }
          }
        }
      }
    }

    // Gerar state com userId para validar no callback
    // State contém: { userId, empresaId, timestamp, random }
    const stateData = {
      userId: user.userId,
      empresaId: empresaId,
      timestamp: Date.now(),
      random: crypto.randomUUID(),
    }

    // Codificar state em base64
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

    // Redirecionar para OAuth do Bling
    const authUrl = getBlingAuthUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Bling connect error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=Erro ao conectar com Bling', request.url)
    )
  }
}
