import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export async function passwordCheckMiddleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Skip password check for auth pages and API routes
  if (
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/'
  ) {
    return NextResponse.next()
  }

  // If user is authenticated and must change password, redirect to change password page
  if (token?.mustChangePassword && request.nextUrl.pathname !== '/auth/change-password') {
    const changePasswordUrl = new URL('/auth/change-password', request.url)
    return NextResponse.redirect(changePasswordUrl)
  }

  return NextResponse.next()
}