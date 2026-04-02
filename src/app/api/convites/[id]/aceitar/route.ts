import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'lojista') {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!user.empresaId) {
      return NextResponse.json({ error: 'Usuario sem empresa vinculada' }, { status: 400 })
    }

    const { id } = await params
    const conviteId = parseInt(id, 10)

    if (isNaN(conviteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Get convite by id, verify status = 'pendente'
    const { data: convite, error: conviteError } = await supabase
      .from('convites_fornecedor')
      .select('*')
      .eq('id', conviteId)
      .single()

    if (conviteError || !convite) {
      return NextResponse.json({ error: 'Convite nao encontrado' }, { status: 404 })
    }

    if (convite.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Este convite ja foi respondido' },
        { status: 400 }
      )
    }

    // Check if fornecedor already exists in this empresa
    const { data: existingFornecedor } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', convite.fornecedor_cnpj)
      .eq('empresa_id', user.empresaId)
      .maybeSingle()

    // If NOT exists: create fornecedor record
    if (!existingFornecedor) {
      const { error: createError } = await supabase
        .from('fornecedores')
        .insert({
          cnpj: convite.fornecedor_cnpj,
          nome: convite.fornecedor_nome,
          razao_social: convite.fornecedor_nome,
          tipo_pessoa: 'J',
          empresa_id: user.empresaId,
        })

      if (createError) {
        console.error('[Aceitar Convite] Erro ao criar fornecedor:', createError)
        return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 })
      }
    }

    // Update convite: set status = 'aceito', empresa_id, user_id, responded_at
    const { error: updateError } = await supabase
      .from('convites_fornecedor')
      .update({
        status: 'aceito',
        empresa_id: user.empresaId,
        user_id: user.userId,
        responded_at: new Date().toISOString(),
      })
      .eq('id', conviteId)

    if (updateError) {
      console.error('[Aceitar Convite] Erro ao atualizar convite:', updateError)
      return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao aceitar convite:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
