import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifica se a request vem de um superadmin.
 * Usa o header x-user-tipo setado pelo middleware.
 */
export function requireSuperAdmin(request: NextRequest): NextResponse | null {
  const userTipo = request.headers.get('x-user-tipo')

  if (userTipo !== 'superadmin') {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas super admins podem acessar este recurso.' },
      { status: 403 }
    )
  }

  return null // OK, pode prosseguir
}
