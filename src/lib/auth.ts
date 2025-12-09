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
                let businessType = null

                if (user.role === 'FRANCHISOR') {
                    const franchisor = await prisma.franchisor.findUnique({
                        where: { ownerId: user.id },
                        select: { businessType: true, approvalStatus: true }
                    })
                    businessType = franchisor?.businessType || null
                    approvalStatus = franchisor?.approvalStatus || 'PENDING'
                } else if (user.role === 'ADMIN' || user.role === 'PROVIDER') {
                    approvalStatus = 'APPROVED'
                } else if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
                    // Employees and Managers are auto-approved (added by owner)
                    approvalStatus = 'APPROVED'
                } else if (user.role === 'FRANCHISEE' && user.franchiseId) {
                    // For Franchisee Owners linked to a franchise
                    const franchise = await prisma.franchise.findUnique({
                        where: { id: user.franchiseId },
                        select: { approvalStatus: true }
                    })
                    approvalStatus = franchise?.approvalStatus || 'PENDING'
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
                }
            }
        },
        async jwt({ token, user }) {
            if (user) {
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
                }
            }
            return token
        }
    }
}
