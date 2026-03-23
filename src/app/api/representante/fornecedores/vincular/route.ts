import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// Funcao para gerar codigo de acesso unico (mesmo padrao de /api/representantes)
function gerarCodigoAcesso(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = 'REP-'
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

// POST /api/representante/fornecedores/vincular
// Body: { cnpj: "12345678000190" }
// Vincula fornecedores com esse CNPJ ao representante logado
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'representante' || !user.representanteUserId) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado como representante' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { cnpj } = body

    if (!cnpj) {
      return NextResponse.json(
        { success: false, error: 'CNPJ e obrigatorio' },
        { status: 400 }
      )
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '')

    if (cnpjLimpo.length !== 14) {
      return NextResponse.json(
        { success: false, error: 'CNPJ invalido' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar fornecedores com este CNPJ
    const { data: fornecedores, error: fornError } = await supabase
      .from('fornecedores')
      .select('id, nome, empresa_id')
      .eq('cnpj', cnpjLimpo)

    if (fornError) {
      console.error('Erro ao buscar fornecedores:', fornError)
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar fornecedor' },
        { status: 500 }
      )
    }

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum fornecedor encontrado com este CNPJ' },
        { status: 400 }
      )
    }

    // Buscar representantes existentes deste usuario
    const { data: representantesExistentes } = await supabase
      .from('representantes')
      .select('id, empresa_id')
      .eq('user_representante_id', user.representanteUserId)
      .eq('ativo', true)

    // Buscar vinculos existentes para evitar duplicatas
    const repIds = representantesExistentes?.map(r => r.id) || []
    let vinculosExistentes: Array<{ representante_id: number; fornecedor_id: number }> = []
    if (repIds.length > 0) {
      const { data: vinculos } = await supabase
        .from('representante_fornecedores')
        .select('representante_id, fornecedor_id')
        .in('representante_id', repIds)

      vinculosExistentes = vinculos || []
    }

    // Agrupar fornecedores por empresa_id
    const fornecedoresPorEmpresa = new Map<number, number[]>()
    for (const forn of fornecedores) {
      const lista = fornecedoresPorEmpresa.get(forn.empresa_id) || []
      lista.push(forn.id)
      fornecedoresPorEmpresa.set(forn.empresa_id, lista)
    }

    let totalVinculados = 0

    for (const [empresaId, fornecedorIds] of fornecedoresPorEmpresa) {
      // Verificar se ja existe um representante para esta empresa
      let rep = representantesExistentes?.find(r => r.empresa_id === empresaId)

      if (!rep) {
        // Criar representante para esta empresa
        let codigoAcesso = gerarCodigoAcesso()
        let tentativas = 0
        while (tentativas < 10) {
          const { data: existente } = await supabase
            .from('representantes')
            .select('id')
            .eq('codigo_acesso', codigoAcesso)
            .single()
          if (!existente) break
          codigoAcesso = gerarCodigoAcesso()
          tentativas++
        }

        // Buscar nome do usuario
        const { data: userData } = await supabase
          .from('users_representante')
          .select('nome')
          .eq('id', user.representanteUserId)
          .single()

        const { data: novoRep, error: repError } = await supabase
          .from('representantes')
          .insert({
            user_representante_id: user.representanteUserId,
            empresa_id: empresaId,
            codigo_acesso: codigoAcesso,
            nome: userData?.nome || user.nome || 'Representante',
            ativo: true,
          })
          .select('id, empresa_id')
          .single()

        if (repError || !novoRep) {
          console.error('Erro ao criar representante para empresa', empresaId, repError)
          continue
        }

        rep = novoRep
      }

      // Vincular fornecedores que ainda nao estao vinculados
      const novosVinculos = fornecedorIds
        .filter(fornId => {
          return !vinculosExistentes.some(
            v => v.representante_id === rep!.id && v.fornecedor_id === fornId
          )
        })
        .map(fornId => ({
          representante_id: rep!.id,
          fornecedor_id: fornId,
        }))

      if (novosVinculos.length > 0) {
        const { error: vincError } = await supabase
          .from('representante_fornecedores')
          .insert(novosVinculos)

        if (vincError) {
          console.error('Erro ao vincular fornecedores:', vincError)
          continue
        }

        totalVinculados += novosVinculos.length
      }
    }

    if (totalVinculados === 0) {
      return NextResponse.json({
        success: false,
        error: 'Todos os fornecedores com este CNPJ ja estao vinculados a sua conta',
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      fornecedores_vinculados: totalVinculados,
      message: `${totalVinculados} fornecedor(es) vinculado(s) com sucesso`,
    })
  } catch (error) {
    console.error('Erro ao vincular fornecedor:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
