import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// GET - Listar notificacoes do usuario
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Buscar notificacoes do usuario
    const { data: notificacoes, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', sessionUser.userId)
      .order('data_criacao', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Erro ao buscar notificacoes:', error)
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar notificacoes' },
        { status: 500 }
      )
    }

    // Contar nao lidas
    const { count: naoLidas } = await supabase
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', sessionUser.userId)
      .eq('lida', false)

    return NextResponse.json({
      success: true,
      notificacoes: notificacoes || [],
      naoLidas: naoLidas || 0,
    })
  } catch (error) {
    console.error('Erro ao buscar notificacoes:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Marcar notificacoes como lidas
export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Nao autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    const supabase = createServerSupabaseClient()

    if (markAllAsRead) {
      // Marcar todas como lidas
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', sessionUser.userId)
        .eq('lida', false)

      if (error) {
        console.error('Erro ao marcar notificacoes:', error)
        return NextResponse.json(
          { success: false, error: 'Erro ao marcar notificacoes' },
          { status: 500 }
        )
      }
    } else if (notificationId) {
      // Marcar uma especifica como lida
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificationId)
        .eq('user_id', sessionUser.userId)

      if (error) {
        console.error('Erro ao marcar notificacao:', error)
        return NextResponse.json(
          { success: false, error: 'Erro ao marcar notificacao' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao marcar notificacoes:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
