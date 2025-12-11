import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compareSync } from "bcryptjs"

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
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

                if (!user || !user.password) {
                    return null
                }

                const isPasswordValid = compareSync(credentials.password, user.password)

                if (!isPasswordValid) {
                    return null
                }

                let approvalStatus = 'PENDING'
                let accountStatus = 'ACTIVE'
                let businessType = null

                // Check franchisor account status for franchisor owners
                if (user.role === 'FRANCHISOR') {
                    const franchisor = await prisma.franchisor.findUnique({
                        where: { ownerId: user.id },
                        select: { businessType: true, approvalStatus: true, accountStatus: true }
                    })
                    businessType = franchisor?.businessType || null
                    approvalStatus = franchisor?.approvalStatus || 'PENDING'
                    accountStatus = franchisor?.accountStatus || 'ACTIVE'

                    // Block login for suspended/terminated accounts
                    if (accountStatus === 'SUSPENDED' || accountStatus === 'TERMINATED') {
                        throw new Error(`ACCOUNT_${accountStatus}`)
                    }
                } else if (user.role === 'ADMIN' || user.role === 'PROVIDER') {
                    approvalStatus = 'APPROVED'
                } else if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
                    // Employees and Managers - check their franchise's franchisor status
                    approvalStatus = 'APPROVED'

                    if (user.franchiseId) {
                        const franchise = await prisma.franchise.findUnique({
                            where: { id: user.franchiseId },
                            include: { franchisor: { select: { accountStatus: true } } }
                        })
                        accountStatus = franchise?.franchisor?.accountStatus || 'ACTIVE'

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
                    canProcessRefunds: user.canProcessRefunds,
                    canManageShifts: user.canManageShifts,
                    businessType,
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
                    canProcessRefunds: token.canProcessRefunds,
                    canManageShifts: token.canManageShifts,
                    businessType: token.businessType,
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
                    canProcessRefunds: (user as any).canProcessRefunds,
                    canManageShifts: (user as any).canManageShifts,
                    businessType: (user as any).businessType,
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

