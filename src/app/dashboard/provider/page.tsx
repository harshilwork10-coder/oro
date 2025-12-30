'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import ProviderMetrics from "@/components/dashboard/ProviderMetrics"
import Analytics from "@/components/dashboard/Analytics"
import ActivityFeed from "@/components/dashboard/ActivityFeed"

export default function ProviderDashboardView() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100">
                    Platform Overview 🚀
                </h1>
                <p className="text-stone-400 mt-2">Manage your business empire from one place</p>
            </div>

            {/* Metrics Component */}
            <ProviderMetrics />

            {/* Analytics and Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Analytics />
                </div>
                <div>
                    <ActivityFeed />
                </div>
            </div>
        </div>
    )
}

