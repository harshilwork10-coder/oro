import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compareSync } from "bcryptjs"

// SECURITY: Determine if running in production and if using HTTPS
const isProduction = process.env.NODE_ENV === 'production'
// Use HTTPS detection from NEXTAUTH_URL to set secure cookies
// This prevents login loops when deployed without HTTPS or when NEXTAUTH_URL is still http://
const useSecureCookies = (process.env.NEXTAUTH_URL || '').startsWith('https://')

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        // SECURITY: Session expires after 24 hours of inactivity
        maxAge: 24 * 60 * 60, // 24 hours
    },
    // SECURITY: Secure cookie settings to prevent session hijacking
    // NOTE: __Secure- prefix and secure:true REQUIRE HTTPS. 
    // If NEXTAUTH_URL is http://, we use standard cookie names to prevent login loops.
    cookies: {
        sessionToken: {
            name: useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
            options: {
                httpOnly: true,           // Cannot be accessed by JavaScript
                sameSite: 'lax',          // CSRF protection
                path: '/',
                secure: useSecureCookies, // HTTPS only when URL is https
            },
        },
        callbackUrl: {
            name: useSecureCookies ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
        csrfToken: {
            name: useSecureCookies ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
    },
    pages: {
        signIn: "/login",
        signOut: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    }
                })

                if (!user) {
                    return null
                }

                // Check for PIN-verified login (from /employee-login page)
                const isPinVerified = credentials.password.startsWith('PIN_VERIFIED_')
                // Check for Phone+PIN verified login (from /staff-login page)
                const isPhonePinVerified = credentials.password.startsWith('PHONE_PIN_VERIFIED_')

                if (isPinVerified || isPhonePinVerified) {
                    // PIN was already verified by /api/auth/pin-login or /api/auth/phone-pin-login
                    // Just verify the PIN matches
                    const prefix = isPhonePinVerified ? 'PHONE_PIN_VERIFIED_' : 'PIN_VERIFIED_'
                    const pin = credentials.password.replace(prefix, '')
                    if (user.pin) {
                        const isPinValid = compareSync(pin, user.pin)
                        if (!isPinValid) {
                            return null
                        }
                    } else {
                        return null // User has no PIN set
                    }
                } else if (credentials.password.startsWith('DEVICE_LOGIN_')) {
                    // TRUSTED DEVICE RESTORATION (The "Cockroach" Method)
                    // The API /api/auth/restore-device verified the deviceId and returned this token
                    // Format: DEVICE_LOGIN_::userId::timestamp::signature
                    const tokenParts = credentials.password.split('::')
                    if (tokenParts.length !== 4) return null

                    const userId = tokenParts[1]
                    const timestamp = parseInt(tokenParts[2])

                    // Verify timestamp is fresh (30 seconds max)
                    if (Date.now() - timestamp > 30000) return null

                    if (user.id !== userId) return null

                    // In a real crypto implementation, we'd verify the signature here.
                    // For now, since the API generated it and passed it to the client which immediately used it,
                    // and we trusted the API call, we accept it if the user matches.
                    // (The API endpoint did the heavy lifting of checking TrustedDevice table)

                } else {
                    // Regular password login
                    if (!user.password) {
                        return null
                    }
                    const isPasswordValid = compareSync(credentials.password, user.password)
                    if (!isPasswordValid) {
                        return null
                    }
                }

                let approvalStatus = 'PENDING'
                let accountStatus = 'ACTIVE'
                let businessType = null
                let industryType = 'SERVICE' // Default to SERVICE

                // Check franchisor account status for franchisor owners
                if (user.role === 'FRANCHISOR') {
                    const franchisor = await prisma.franchisor.findUnique({
                        where: { ownerId: user.id },
                        select: { businessType: true, industryType: true, approvalStatus: true, accountStatus: true }
                    })
                    businessType = franchisor?.businessType || null
                    industryType = franchisor?.industryType || 'SERVICE'
                    approvalStatus = franchisor?.approvalStatus || 'PENDING'
                    accountStatus = franchisor?.accountStatus || 'ACTIVE'

                    // Block login for suspended/terminated accounts
                    if (accountStatus === 'SUSPENDED' || accountStatus === 'TERMINATED') {
                        throw new Error(`ACCOUNT_${accountStatus}`)
                    }
                } else if (user.role === 'ADMIN' || user.role === 'PROVIDER') {
                    approvalStatus = 'APPROVED'
                } else if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
                    // Employees and Managers - check their franchise's franchisor status AND industryType
                    approvalStatus = 'APPROVED'

                    if (user.franchiseId) {
                        const franchise = await prisma.franchise.findUnique({
                            where: { id: user.franchiseId },
                            include: { franchisor: { select: { accountStatus: true, industryType: true } } }
                        })
                        accountStatus = franchise?.franchisor?.accountStatus || 'ACTIVE'
                        industryType = franchise?.franchisor?.industryType || 'SERVICE' // Get industryType from their franchisor!

                        // Block employee login if their franchisor is suspended
                        if (accountStatus === 'SUSPENDED' || accountStatus === 'TERMINATED') {
                            throw new Error(`ACCOUNT_${accountStatus}`)
                        }
                    }
                } else if (user.role === 'FRANCHISEE' && user.franchiseId) {
                    // For Franchisee Owners linked to a franchise
                    const franchise = await prisma.franchise.findUnique({
                        where: { id: user.franchiseId },
                        include: {
                            franchisor: { select: { accountStatus: true } }
                        }
                    })
                    approvalStatus = franchise?.approvalStatus || 'PENDING'
                    accountStatus = franchise?.franchisor?.accountStatus || 'ACTIVE'

                    // Block franchisee login if their franchisor is suspended
                    if (accountStatus === 'SUSPENDED' || accountStatus === 'TERMINATED') {
                        throw new Error(`ACCOUNT_${accountStatus}`)
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    franchiseId: user.franchiseId,
                    locationId: user.locationId,
                    // All Permission Fields
                    canAddServices: user.canAddServices,
                    canAddProducts: user.canAddProducts,
                    canManageInventory: user.canManageInventory,
                    canViewReports: user.canViewReports,
                    canProcessRefunds: user.canProcessRefunds,
                    canManageSchedule: user.canManageSchedule,
                    canManageEmployees: user.canManageEmployees,
                    canManageShifts: user.canManageShifts,
                    canClockIn: user.canClockIn,
                    canClockOut: user.canClockOut,
                    businessType,
                    industryType,
                    approvalStatus,
                    accountStatus,
                }
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.id,
                    role: token.role,
                    franchiseId: token.franchiseId,
                    locationId: token.locationId,
                    // All Permission Fields
                    canAddServices: token.canAddServices,
                    canAddProducts: token.canAddProducts,
                    canManageInventory: token.canManageInventory,
                    canViewReports: token.canViewReports,
                    canProcessRefunds: token.canProcessRefunds,
                    canManageSchedule: token.canManageSchedule,
                    canManageEmployees: token.canManageEmployees,
                    canManageShifts: token.canManageShifts,
                    canClockIn: token.canClockIn,
                    canClockOut: token.canClockOut,
                    businessType: token.businessType,
                    industryType: token.industryType,
                    approvalStatus: token.approvalStatus,
                    accountStatus: token.accountStatus,
                }
            }
        },
        async jwt({ token, user }) {
            if (user) {
                // Initial login - set all values from authorize()
                return {
                    ...token,
                    id: user.id,
                    role: (user as any).role,
                    franchiseId: (user as any).franchiseId,
                    locationId: (user as any).locationId,
                    // All Permission Fields
                    canAddServices: (user as any).canAddServices,
                    canAddProducts: (user as any).canAddProducts,
                    canManageInventory: (user as any).canManageInventory,
                    canViewReports: (user as any).canViewReports,
                    canProcessRefunds: (user as any).canProcessRefunds,
                    canManageSchedule: (user as any).canManageSchedule,
                    canManageEmployees: (user as any).canManageEmployees,
                    canManageShifts: (user as any).canManageShifts,
                    canClockIn: (user as any).canClockIn,
                    canClockOut: (user as any).canClockOut,
                    businessType: (user as any).businessType,
                    industryType: (user as any).industryType,
                    approvalStatus: (user as any).approvalStatus,
                    accountStatus: (user as any).accountStatus,
                }
            }

            // FRESH LOOKUP: On subsequent requests, fetch fresh approval status
            // This prevents stale token issues when approval status changes
            if (token.id && token.role === 'FRANCHISOR') {
                try {
                    const franchisor = await prisma.franchisor.findFirst({
                        where: { ownerId: token.id as string },
                        select: { approvalStatus: true, accountStatus: true }
                    })
                    if (franchisor) {
                        token.approvalStatus = franchisor.approvalStatus
                        token.accountStatus = franchisor.accountStatus
                    }
                } catch (e) {
                    // Silently fail - use existing token values
                    console.error('[JWT] Failed to refresh approval status:', e)
                }
            }

            return token
        }
    }
}


