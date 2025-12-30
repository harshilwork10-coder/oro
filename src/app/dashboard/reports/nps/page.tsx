'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Activity } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function NPSReportPage() {
    return (
        <ReportPageLayout
            title="Net Promoter Score (NPS)"
            description="Customer satisfaction and loyalty metrics."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <Activity className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No NPS Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Net Promoter Score data will appear here once customer feedback is collected.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedNPSReport() {
    return (
        <WithReportPermission reportType="operational">
            <NPSReportPage />
        </WithReportPermission>
    )
}

