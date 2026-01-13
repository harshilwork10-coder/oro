'use client'

import { SessionProvider } from "next-auth/react"

import BrandProvider from "@/components/providers/BrandProvider"
import { AccountContextProvider } from "@/contexts/AccountContext"
import { ToastProvider } from "@/components/providers/ToastProvider"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <BrandProvider>
                <AccountContextProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </AccountContextProvider>
            </BrandProvider>
        </SessionProvider>
    )
}

