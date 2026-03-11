import { NextResponse } from 'next/server'
import { removeAuthCookie, getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import type { UserType } from '@/lib/activity-log'

export async function POST() {
  try {
    // Capture user info BEFORE removing the cookie
    const user = await getCurrentUser()
    if (user) {
      void logActivity({
        userId: String(user.userId),
        userType: (user.tipo || 'lojista') as UserType,
        userEmail: user.email,
        userNome: user.nome || user.email,
        action: 'logout',
        empresaId: user.empresaId || null,
      }).catch(console.error)
    }

    await removeAuthCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    )
  }
}
