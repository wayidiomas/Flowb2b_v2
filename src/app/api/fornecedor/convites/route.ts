import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'fornecedor' || !user.fornecedorUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    const { data: convites, error } = await supabase
      .from('convites_fornecedor')
      .select('*')
      .eq('fornecedor_user_id', user.fornecedorUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Fornecedor Convites] Erro ao buscar convites:', error)
      return NextResponse.json({ error: 'Erro ao buscar convites' }, { status: 500 })
    }

    return NextResponse.json({ convites: convites || [] })
  } catch (error) {
    console.error('Erro ao listar convites fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'fornecedor' || !user.fornecedorUserId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { lojista_nome, lojista_telefone, lojista_email } = body

    // Validate required fields
    if (!lojista_nome || !lojista_telefone) {
      return NextResponse.json(
        { error: 'Nome e telefone do lojista sao obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get fornecedor info (cnpj, nome) from users_fornecedor joined with fornecedores
    const { data: fornecedorUser, error: userError } = await supabase
      .from('users_fornecedor')
      .select('id, nome, cnpj')
      .eq('id', user.fornecedorUserId)
      .single()

    if (userError || !fornecedorUser) {
      console.error('[Fornecedor Convites] Erro ao buscar fornecedor user:', userError)
      return NextResponse.json({ error: 'Fornecedor nao encontrado' }, { status: 404 })
    }

    const fornecedor_cnpj = fornecedorUser.cnpj || user.cnpj || ''
    const fornecedor_nome = fornecedorUser.nome || 'Fornecedor'

    // Generate referral code
    const codigo_referral = crypto.randomUUID().replace(/-/g, '').slice(0, 12)

    // Insert into convites_fornecedor
    const { data: convite, error: insertError } = await supabase
      .from('convites_fornecedor')
      .insert({
        fornecedor_user_id: user.fornecedorUserId,
        fornecedor_cnpj,
        fornecedor_nome,
        lojista_nome,
        lojista_telefone,
        lojista_email: lojista_email || null,
        status: 'pendente',
        codigo_referral,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Fornecedor Convites] Erro ao criar convite:', insertError)
      return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 })
    }

    // Build WhatsApp message URL
    const phone = lojista_telefone.replace(/\D/g, '')
    const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`
    const message = encodeURIComponent(
      `Ola ${lojista_nome}! Sou ${fornecedor_nome} e uso o FlowB2B para gerenciar pedidos de compra.\n\n` +
      `Convido voce a conhecer a plataforma — automatize suas compras, controle rupturas e conecte seus fornecedores.\n\n` +
      `Cadastre-se gratis: https://flowb2b-v2.onrender.com/register?ref=${codigo_referral}\n\n` +
      `Seus 3 primeiros meses sao gratis!`
    )
    const whatsappUrl = `https://wa.me/${phoneFormatted}?text=${message}`

    return NextResponse.json({ convite, whatsappUrl })
  } catch (error) {
    console.error('Erro ao criar convite fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
