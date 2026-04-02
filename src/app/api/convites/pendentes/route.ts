import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'lojista') {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Get user's email from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.userId)
      .single()

    if (userError || !userData) {
      console.error('[Convites Pendentes] Erro ao buscar usuario:', userError)
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    // Build OR filter: lojista_email matches OR empresa_id matches
    // We need to handle the case where empresa_id might be null on the convite
    let query = supabase
      .from('convites_fornecedor')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })

    // Build filter conditions
    const orConditions: string[] = []

    if (userData.email) {
      orConditions.push(`lojista_email.eq.${userData.email}`)
    }

    if (user.empresaId) {
      orConditions.push(`empresa_id.eq.${user.empresaId}`)
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ convites: [] })
    }

    query = query.or(orConditions.join(','))

    const { data: convites, error } = await query

    if (error) {
      console.error('[Convites Pendentes] Erro ao buscar convites:', error)
      return NextResponse.json({ error: 'Erro ao buscar convites' }, { status: 500 })
    }

    return NextResponse.json({ convites: convites || [] })
  } catch (error) {
    console.error('Erro ao listar convites pendentes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
