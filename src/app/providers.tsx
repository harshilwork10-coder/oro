'use client'

import { SessionProvider } from "next-auth/react"

import BrandProvider from "@/components/providers/BrandProvider"
import { AccountContextProvider } from "@/contexts/AccountContext"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <BrandProvider>
                <AccountContextProvider>
                    {children}
                </AccountContextProvider>
            </BrandProvider>
        </SessionProvider>
    )
}

