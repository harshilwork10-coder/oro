'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { DollarSign } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function RoyaltyRevenueReportPage() {
    return (
        <ReportPageLayout
            title="Royalty Revenue Report"
            description="Track royalty fees collected from all franchisees across the network."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <DollarSign className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Royalty Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Royalty revenue will appear here once franchisee transactions are recorded.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedRoyaltyReport() {
    return (
        <WithReportPermission reportType="financial">
            <RoyaltyRevenueReportPage />
        </WithReportPermission>
    )
}
