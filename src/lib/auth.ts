import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

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
                console.log('Authorize called with:', { email: credentials?.email })

                if (!credentials?.email || !credentials?.password) {
                    console.log('Missing credentials')
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    }
                })

                if (!user || !user.password) {
                    console.log('User not found or no password set')
                    return null
                }

                console.log('User found, verifying password...')
                const isPasswordValid = await compare(credentials.password, user.password)

                if (!isPasswordValid) {
                    console.log('Invalid password')
                    return null
                }

                console.log('Authentication successful')
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    franchiseId: user.franchiseId,
                    locationId: user.locationId,
                    canProcessRefunds: user.canProcessRefunds,
                    canManageShifts: user.canManageShifts,
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
                }
            }
            return token
        }
    }
}
