'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { DollarSign } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function RevenueReportPage() {
    return (
        <ReportPageLayout
            title="Revenue by Location"
            description="Compare sales performance across all locations with daily, weekly, and monthly breakdowns."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <DollarSign className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Revenue Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Revenue metrics will appear here once transactions are processed across your locations.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedRevenueReport() {
    return (
        <WithReportPermission reportType="financial">
            <RevenueReportPage />
        </WithReportPermission>
    )
}

