import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            franchiseId?: string | null
            locationId?: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role: string
        franchiseId?: string | null
        locationId?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        franchiseId?: string | null
        locationId?: string | null
    }
}
