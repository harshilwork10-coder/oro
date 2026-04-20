'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import FranchisorCommandCenter from "@/components/dashboard/FranchisorCommandCenter"

export default function BrandDashboardPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-accent)' }} />
            </div>
        )
    }

    return <FranchisorCommandCenter />
}
