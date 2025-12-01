import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface User {
        id: string
        role: string
        providerRole?: string
        providerPermissions?: string
        franchiseId?: string | null
        locationId?: string | null
        canProcessRefunds?: boolean
        canManageShifts?: boolean
        franchisorStatus?: string | null
        businessType?: string | null
    }

    interface Session {
        user: User
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        providerRole?: string
        providerPermissions?: string
        franchiseId?: string | null
        locationId?: string | null
        canProcessRefunds?: boolean
        canManageShifts?: boolean
        franchisorStatus?: string | null
        businessType?: string | null
    }
}
