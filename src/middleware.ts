import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
    const token = await getToken({ req })
    const isAuth = !!token

    // PROVIDER, ADMIN, EMPLOYEE, MANAGER are always approved - don't check their approvalStatus
    const alwaysApprovedRoles = ['PROVIDER', 'ADMIN', 'EMPLOYEE', 'MANAGER']
    const isAlwaysApproved = token?.role && alwaysApprovedRoles.includes(token.role as string)

    // Only consider pending if NOT an always-approved role AND explicitly PENDING/REJECTED
    // If approvalStatus is undefined or APPROVED, treat as approved
    const isPending = !isAlwaysApproved && (token?.approvalStatus === 'PENDING' || token?.approvalStatus === 'REJECTED')

    const { pathname } = req.nextUrl

    // Public paths that don't require auth
    const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/employee-login') ||  // Employee PIN login page (POS terminal)
        pathname.startsWith('/staff-login') ||     // Employee Phone + PIN login page
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
        // If Pending/Rejected, redirect to pending page (except for that page and API)
        if (isPending) {
            // Allow access to Pending page and API
            if (pathname === '/auth/pending-approval' || pathname.startsWith('/api')) {
                return NextResponse.next()
            }
            // Redirect everything else to Pending page
            return NextResponse.redirect(new URL('/auth/pending-approval', req.url))
        }

        // If trying to access Login -> Dashboard
        if (pathname === '/login') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        // ── Role-Based Route Protection ─────────────────────────────
        const role = token.role as string | undefined

        // Define which route prefixes each role is BLOCKED from accessing
        const roleRestrictions: Record<string, string[]> = {
            'OWNER': ['/provider', '/franchisor'],
            'FRANCHISOR': ['/provider'],
            // PROVIDER has full access – no restrictions
            // EMPLOYEE/MANAGER inherit OWNER-level restrictions
            'EMPLOYEE': ['/provider', '/franchisor', '/owner'],
            'MANAGER': ['/provider', '/franchisor'],
        }

        const blocked = role ? (roleRestrictions[role] || []) : []
        const isBlocked = blocked.some(prefix => pathname.startsWith(prefix))

        if (isBlocked) {
            // Redirect to the user's home page based on role
            const roleHome: Record<string, string> = {
                'PROVIDER': '/provider/home',
                'FRANCHISOR': '/franchisor/home',
                'OWNER': '/owner',
                'EMPLOYEE': '/dashboard',
                'MANAGER': '/owner',
            }
            const home = (role && roleHome[role]) || '/dashboard'
            return NextResponse.redirect(new URL(home, req.url))
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
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // Content Security Policy - prevents XSS attacks
    // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js/React
    // localhost:9100 is for local print agent (thermal receipt printer)
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: blob: https:; " +
        "connect-src 'self' https: http://localhost:9100 http://127.0.0.1:9100; " +
        "frame-ancestors 'none';"
    )

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.ico$|.*\\.webp$).*)'],
}
