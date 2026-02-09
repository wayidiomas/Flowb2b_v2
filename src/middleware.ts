import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
)

const COOKIE_NAME = 'flowb2b-auth-token'

// Rotas publicas (nao precisam de autenticacao)
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/check-email',
  '/termos-de-uso',
  '/politica-privacidade',
  '/fornecedor/login',
  '/fornecedor/registro',
  '/publico',
]

// Rotas de API publicas
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/magic-link',
  '/api/auth/verify-magic-link',
  '/api/auth/verify-email',
  '/api/auth/fornecedor/login',
  '/api/auth/fornecedor/registro',
]

// Padroes de API publicas (com regex)
const publicApiPatterns = [
  /^\/api\/pedidos-compra\/\d+\/publico$/,  // /api/pedidos-compra/123/publico
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

  // Permitir rotas de API publicas por padrao (regex)
  if (publicApiPatterns.some(pattern => pattern.test(pathname))) {
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
    // Redirecionar para login apropriado se nao estiver autenticado
    const isFornecedorRoute = pathname.startsWith('/fornecedor') || pathname.startsWith('/api/fornecedor')
    const loginPath = isFornecedorRoute ? '/fornecedor/login' : '/login'
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verificar se o token e valido
    const { payload } = await jwtVerify(token, JWT_SECRET)

    const userTipo = String(payload.tipo || 'lojista')

    // Protecao por tipo de usuario
    // IMPORTANTE: /api/fornecedores (lojista) != /api/fornecedor/* (portal fornecedor)
    const isFornecedorRoute = pathname.startsWith('/fornecedor') ||
      (pathname.startsWith('/api/fornecedor') && !pathname.startsWith('/api/fornecedores'))
    const isLojistaRoute = pathname.startsWith('/compras') || pathname.startsWith('/dashboard') ||
      pathname.startsWith('/estoque') || pathname.startsWith('/vendas') ||
      pathname.startsWith('/configuracoes') || pathname.startsWith('/api/pedidos-compra') ||
      pathname.startsWith('/api/produtos') || pathname.startsWith('/api/fornecedores') ||
      pathname.startsWith('/api/dashboard') || pathname.startsWith('/api/auth/bling')

    // Fornecedor tentando acessar rota de lojista
    if (userTipo === 'fornecedor' && isLojistaRoute) {
      return NextResponse.redirect(new URL('/fornecedor/dashboard', request.url))
    }

    // Lojista tentando acessar rota de fornecedor (exceto APIs de sugestoes)
    if (userTipo === 'lojista' && isFornecedorRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Adicionar informacoes do usuario nos headers para uso nas API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', String(payload.userId))
    requestHeaders.set('x-empresa-id', String(payload.empresaId))
    requestHeaders.set('x-user-role', String(payload.role))
    requestHeaders.set('x-user-tipo', userTipo)
    if (payload.cnpj) {
      requestHeaders.set('x-user-cnpj', String(payload.cnpj))
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    // Token invalido - redirecionar para login
    const loginPath = pathname.startsWith('/fornecedor') ? '/fornecedor/login' : '/login'
    const response = NextResponse.redirect(new URL(loginPath, request.url))
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
