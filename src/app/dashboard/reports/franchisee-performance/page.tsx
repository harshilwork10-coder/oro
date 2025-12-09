'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Users } from "lucide-react"

export default function FranchiseePerformancePage() {
    return (
        <ReportPageLayout
            title="Franchisee Performance"
            description="Evaluate franchisee portfolio performance to identify expansion candidates and support needs."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <Users className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Franchisee Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Franchisee performance data will appear here once franchisees are onboarded and have transaction data.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}
