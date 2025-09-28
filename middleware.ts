import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { passwordCheckMiddleware } from './src/middleware/password-check'

export default withAuth(
  async function middleware(request: NextRequest) {
    // First check if user needs to change password
    const passwordCheckResponse = await passwordCheckMiddleware(request)
    if (passwordCheckResponse.status !== 200) {
      return passwordCheckResponse
    }

    // Continue with other middleware logic if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages for everyone
        if (req.nextUrl.pathname.startsWith('/auth')) {
          return true
        }

        // Require authentication for protected routes
        if (req.nextUrl.pathname.startsWith('/dashboard') ||
            req.nextUrl.pathname.startsWith('/member') ||
            req.nextUrl.pathname.startsWith('/officer') ||
            req.nextUrl.pathname.startsWith('/treasurer') ||
            req.nextUrl.pathname.startsWith('/administrator')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}