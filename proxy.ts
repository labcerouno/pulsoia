import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    // Allow the login page through unconditionally to avoid redirect loop
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
      // No secret configured — allow access in dev
      return NextResponse.next()
    }

    // Check cookie first
    const cookieSecret = request.cookies.get('admin_secret')?.value
    if (cookieSecret === adminSecret) {
      return NextResponse.next()
    }

    // Check query param
    const querySecret = searchParams.get('secret')
    if (querySecret === adminSecret) {
      // Set cookie and redirect to clean URL
      const url = request.nextUrl.clone()
      url.searchParams.delete('secret')
      const response = NextResponse.redirect(url)
      response.cookies.set('admin_secret', adminSecret, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/admin',
      })
      return response
    }

    // Not authenticated — redirect to login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
