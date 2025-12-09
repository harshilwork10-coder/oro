'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { DollarSign } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function FinancialSummaryPage() {
    return (
        <ReportPageLayout
            title="Financial Summary"
            description="Comprehensive financial overview across all metrics."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <DollarSign className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Financial Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Financial summary will appear here once revenue and expense data is recorded.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedFinancialSummary() {
    return (
        <WithReportPermission reportType="financial">
            <FinancialSummaryPage />
        </WithReportPermission>
    )
}
