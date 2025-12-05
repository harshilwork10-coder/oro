import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
    const token = await getToken({ req })
    const isAuth = !!token
    const isPending = token?.approvalStatus === 'PENDING' || token?.approvalStatus === 'REJECTED'

    const { pathname } = req.nextUrl

    // Public paths that don't require auth
    const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/auth/magic-link') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico'

    // 1. If not authenticated and trying to access protected route -> Login
    if (!isAuth && !isPublic) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // 2. If authenticated...
    if (isAuth) {
        // If Pending/Rejected...
        if (isPending) {
            // Allow access to Pending page and API
            if (pathname === '/auth/pending-approval' || pathname.startsWith('/api')) {
                return NextResponse.next()
            }
            // Redirect everything else to Pending page
            return NextResponse.redirect(new URL('/auth/pending-approval', req.url))
        }

        // If Approved...
        if (!isPending) {
            // If trying to access Pending page -> Dashboard
            if (pathname === '/auth/pending-approval') {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
            // If trying to access Login -> Dashboard
            if (pathname === '/login') {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
        }
    }

    // Add security headers to all responses
    const response = NextResponse.next()

    // Prevent caching of authenticated pages - CRITICAL SECURITY
    if (!isPublic) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        response.headers.set('Surrogate-Control', 'no-store')
    }

    // Additional security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.ico$|.*\\.webp$).*)'],
}
