import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
)

const COOKIE_NAME = 'flowb2b-auth-token'

// Rotas públicas (não precisam de autenticação)
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/check-email',
  '/termos-de-uso',
  '/politica-privacidade',
]

// Rotas de API públicas
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/magic-link',
  '/api/auth/verify-magic-link',
  '/api/auth/verify-email',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rotas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir rotas de API públicas
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir arquivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Verificar token de autenticação
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    // Redirecionar para login se não estiver autenticado
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verificar se o token é válido
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Adicionar informações do usuário nos headers para uso nas API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', String(payload.userId))
    requestHeaders.set('x-empresa-id', String(payload.empresaId))
    requestHeaders.set('x-user-role', String(payload.role))

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    // Token inválido - redirecionar para login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
