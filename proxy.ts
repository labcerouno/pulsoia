import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    // Allow these pages through unconditionally to avoid redirect loops
    if (pathname === '/admin/login' || pathname === '/admin/login/otp') {
      return NextResponse.next()
    }

    // Check for authentication cookie
    const adminUserId = request.cookies.get('admin_user_id')?.value
    if (!adminUserId) {
      // Not authenticated — redirect to login
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.search = ''
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
