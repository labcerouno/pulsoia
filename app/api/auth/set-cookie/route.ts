import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_user_id', userId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/admin',
    })

    return response
  } catch (error) {
    console.error('Set cookie error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
