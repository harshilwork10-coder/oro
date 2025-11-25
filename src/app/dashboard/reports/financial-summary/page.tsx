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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-6 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-stone-100">$295,100</p>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-stone-100">$218,400</p>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-orange-500">
                    <p className="text-sm text-stone-500 mb-1">Net Profit</p>
                    <p className="text-2xl font-bold text-stone-100">$76,700</p>
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
